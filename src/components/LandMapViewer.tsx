import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, Printer, Map, Satellite, Globe, Loader2, AlertCircle, Filter, MousePointer, Leaf, X, FileSpreadsheet, FileJson } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useFarmers } from "@/hooks/use-farmers";

interface LandWithFarmer {
  id: string;
  nama_lahan: string;
  lokasi: string | null;
  koordinat: string | null;
  luas: number | null;
  petani_id: string | null;
  petani?: {
    nama: string;
    kode_petani: string;
    is_organic: boolean | null;
  } | null;
  parsedCoord?: {
    lat: number;
    lng: number;
  };
}

interface LandMapViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MapStyle = "streets" | "satellite" | "hybrid";
type OrganicFilter = "all" | "organic" | "conventional";

const parseCoordinate = (koordinat: string): { lat: number; lng: number; isValid: boolean } => {
  if (!koordinat) return { lat: 0, lng: 0, isValid: false };

  const cleaned = koordinat.replace(/\s+/g, " ").trim();
  
  const commaMatch = cleaned.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (commaMatch) {
    const lat = parseFloat(commaMatch[1]);
    const lng = parseFloat(commaMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, isValid: true };
    }
  }

  const spaceMatch = cleaned.match(/^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/);
  if (spaceMatch) {
    const lat = parseFloat(spaceMatch[1]);
    const lng = parseFloat(spaceMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, isValid: true };
    }
  }

  return { lat: 0, lng: 0, isValid: false };
};

const mapStyles: Record<MapStyle, string> = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-v9",
  hybrid: "mapbox://styles/mapbox/satellite-streets-v12",
};

export const LandMapViewer: React.FC<LandMapViewerProps> = ({ open, onOpenChange }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const clickMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [allLands, setAllLands] = useState<LandWithFarmer[]>([]);
  const [filteredLands, setFilteredLands] = useState<LandWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("streets");
  const [downloading, setDownloading] = useState(false);
  
  // Filters
  const [farmerFilter, setFarmerFilter] = useState<string>("all");
  const [organicFilter, setOrganicFilter] = useState<OrganicFilter>("all");
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [selectedLandForEdit, setSelectedLandForEdit] = useState<LandWithFarmer | null>(null);
  const [newCoordinates, setNewCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { profile } = useCompanyProfile();
  const { farmers } = useFarmers();

  // Fetch lands with farmer data
  const fetchLands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from("lahan")
        .select(`
          id,
          nama_lahan,
          lokasi,
          koordinat,
          luas,
          petani_id,
          petani:petani_id (
            nama,
            kode_petani,
            is_organic
          )
        `);

      if (fetchError) throw fetchError;

      const landsWithCoords = (data || [])
        .map((land: any) => {
          const parsed = parseCoordinate(land.koordinat || "");
          return {
            ...land,
            parsedCoord: parsed.isValid ? { lat: parsed.lat, lng: parsed.lng } : undefined,
          };
        });

      setAllLands(landsWithCoords);
    } catch (err) {
      console.error("Error fetching lands:", err);
      setError("Gagal memuat data lahan");
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters
  useEffect(() => {
    let result = allLands.filter(land => land.parsedCoord);

    if (farmerFilter !== "all") {
      result = result.filter(land => land.petani_id === farmerFilter);
    }

    if (organicFilter !== "all") {
      result = result.filter(land => {
        if (!land.petani) return false;
        return organicFilter === "organic" ? land.petani.is_organic : !land.petani.is_organic;
      });
    }

    setFilteredLands(result);
  }, [allLands, farmerFilter, organicFilter]);

  // Initialize map
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current) return;

    try {
      setMapLoading(true);
      
      const { data, error: funcError } = await supabase.functions.invoke("get-mapbox-token");
      
      if (funcError || !data?.token) {
        throw new Error(data?.error || "Gagal mendapatkan token Mapbox");
      }

      mapboxgl.accessToken = data.token;

      // Calculate center
      const validLands = filteredLands.filter((l) => l.parsedCoord);
      let center: [number, number] = [106.8456, -6.2088]; // Default: Jakarta
      let zoom = 10;

      if (validLands.length > 0) {
        const avgLat = validLands.reduce((sum, l) => sum + l.parsedCoord!.lat, 0) / validLands.length;
        const avgLng = validLands.reduce((sum, l) => sum + l.parsedCoord!.lng, 0) / validLands.length;
        center = [avgLng, avgLat];
      }

      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyles[mapStyle],
        center,
        zoom,
        preserveDrawingBuffer: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");

      await new Promise<void>((resolve) => {
        map.current!.on("load", () => resolve());
      });

      // Add markers
      updateMarkers();

      // Fit bounds
      if (validLands.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        validLands.forEach((land) => {
          bounds.extend([land.parsedCoord!.lng, land.parsedCoord!.lat]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }

      // Click handler for edit mode
      map.current.on("click", (e) => {
        if (editMode && selectedLandForEdit) {
          const { lat, lng } = e.lngLat;
          setNewCoordinates({ lat, lng });
          
          // Show click marker
          if (clickMarker.current) {
            clickMarker.current.remove();
          }
          
          const el = document.createElement("div");
          el.innerHTML = `<div style="
            background: hsl(0, 84%, 60%);
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          ">📍</div>`;
          
          clickMarker.current = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .addTo(map.current!);
            
          setEditDialogOpen(true);
        }
      });

    } catch (err: any) {
      console.error("Error initializing map:", err);
      setError(err.message || "Gagal memuat peta");
    } finally {
      setMapLoading(false);
    }
  }, [mapStyle, editMode, selectedLandForEdit]);

  // Update markers when filtered lands change
  const updateMarkers = useCallback(() => {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    const validLands = filteredLands.filter((l) => l.parsedCoord);

    validLands.forEach((land, index) => {
      const isOrganic = land.petani?.is_organic;
      const bgColor = isOrganic 
        ? "linear-gradient(135deg, hsl(142, 76%, 36%), hsl(142, 71%, 45%))"
        : "linear-gradient(135deg, hsl(25, 95%, 53%), hsl(21, 90%, 48%))";

      const el = document.createElement("div");
      el.className = "land-marker";
      el.innerHTML = `<div style="
        background: ${bgColor};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      ">${index + 1}</div>`;

      const popup = new mapboxgl.Popup({ offset: 25, maxWidth: "300px" }).setHTML(`
        <div style="padding: 8px; font-family: system-ui, sans-serif;">
          <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #166534;">
            ${land.nama_lahan}
          </h3>
          ${land.petani ? `
            <p style="margin: 4px 0; color: #374151;">
              <strong>Petani:</strong> ${land.petani.nama} (${land.petani.kode_petani})
            </p>
            <p style="margin: 4px 0;">
              <span style="background: ${isOrganic ? '#16a34a' : '#ea580c'}; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 12px;">
                ${isOrganic ? '🌿 Organik' : '🏭 Konvensional'}
              </span>
            </p>
          ` : ""}
          ${land.lokasi ? `
            <p style="margin: 4px 0; color: #374151;">
              <strong>Lokasi:</strong> ${land.lokasi}
            </p>
          ` : ""}
          ${land.luas ? `
            <p style="margin: 4px 0; color: #374151;">
              <strong>Luas:</strong> ${land.luas} ha
            </p>
          ` : ""}
          <p style="margin: 4px 0; color: #6B7280; font-size: 12px;">
            <strong>Koordinat:</strong> ${land.parsedCoord?.lat.toFixed(6)}, ${land.parsedCoord?.lng.toFixed(6)}
          </p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([land.parsedCoord!.lng, land.parsedCoord!.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });
  }, [filteredLands]);

  // Save new coordinates
  const handleSaveCoordinates = async () => {
    if (!selectedLandForEdit || !newCoordinates) return;

    try {
      setSaving(true);
      
      const koordinat = `${newCoordinates.lat.toFixed(6)}, ${newCoordinates.lng.toFixed(6)}`;
      
      const { error: updateError } = await supabase
        .from("lahan")
        .update({ koordinat })
        .eq("id", selectedLandForEdit.id);

      if (updateError) throw updateError;

      toast({
        title: "Berhasil",
        description: `Koordinat lahan "${selectedLandForEdit.nama_lahan}" berhasil diperbarui`,
      });

      // Refresh data
      await fetchLands();
      
      // Reset edit state
      setEditDialogOpen(false);
      setEditMode(false);
      setSelectedLandForEdit(null);
      setNewCoordinates(null);
      if (clickMarker.current) {
        clickMarker.current.remove();
        clickMarker.current = null;
      }
    } catch (err) {
      console.error("Error saving coordinates:", err);
      toast({
        title: "Gagal",
        description: "Gagal menyimpan koordinat",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setNewCoordinates(null);
    if (clickMarker.current) {
      clickMarker.current.remove();
      clickMarker.current = null;
    }
  };

  // Exit edit mode
  const handleExitEditMode = () => {
    setEditMode(false);
    setSelectedLandForEdit(null);
    setNewCoordinates(null);
    if (clickMarker.current) {
      clickMarker.current.remove();
      clickMarker.current = null;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const validLands = filteredLands.filter(l => l.parsedCoord);
    if (validLands.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada lahan dengan koordinat untuk diekspor",
        variant: "destructive",
      });
      return;
    }

    // CSV Header
    const headers = ["No", "Nama Lahan", "Petani", "Kode Petani", "Status", "Lokasi", "Latitude", "Longitude", "Luas (ha)"];
    
    // CSV Rows
    const rows = validLands.map((land, index) => [
      index + 1,
      `"${(land.nama_lahan || "").replace(/"/g, '""')}"`,
      `"${(land.petani?.nama || "-").replace(/"/g, '""')}"`,
      land.petani?.kode_petani || "-",
      land.petani?.is_organic ? "Organik" : "Konvensional",
      `"${(land.lokasi || "-").replace(/"/g, '""')}"`,
      land.parsedCoord?.lat.toFixed(6) || "",
      land.parsedCoord?.lng.toFixed(6) || "",
      land.luas || "-",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    // Add BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `data-lahan-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Berhasil",
      description: `${validLands.length} data lahan berhasil diekspor ke CSV`,
    });
  };

  // Export to GeoJSON
  const handleExportGeoJSON = () => {
    const validLands = filteredLands.filter(l => l.parsedCoord);
    if (validLands.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada lahan dengan koordinat untuk diekspor",
        variant: "destructive",
      });
      return;
    }

    const geojson = {
      type: "FeatureCollection",
      features: validLands.map((land, index) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [land.parsedCoord!.lng, land.parsedCoord!.lat],
        },
        properties: {
          id: land.id,
          number: index + 1,
          nama_lahan: land.nama_lahan,
          lokasi: land.lokasi || null,
          luas_ha: land.luas || null,
          petani_nama: land.petani?.nama || null,
          petani_kode: land.petani?.kode_petani || null,
          is_organic: land.petani?.is_organic ?? null,
          latitude: land.parsedCoord!.lat,
          longitude: land.parsedCoord!.lng,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `data-lahan-${new Date().toISOString().split("T")[0]}.geojson`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Berhasil",
      description: `${validLands.length} data lahan berhasil diekspor ke GeoJSON`,
    });
  };

  // Download map as PNG
  const handleDownload = async () => {
    if (!printRef.current) return;
    
    try {
      setDownloading(true);
      
      const canvas = await html2canvas(printRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `peta-lahan-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({
        title: "Berhasil",
        description: "Peta berhasil diunduh",
      });
    } catch (err) {
      console.error("Error downloading map:", err);
      toast({
        title: "Gagal",
        description: "Gagal mengunduh peta",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Peta Lahan - ${profile?.nama_perusahaan || "Petani"}`,
  });

  // Effects
  useEffect(() => {
    if (open) {
      fetchLands();
    } else {
      handleExitEditMode();
    }
  }, [open, fetchLands]);

  useEffect(() => {
    if (open && !loading) {
      initializeMap();
    }
    
    return () => {
      if (!open && map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [open, loading, initializeMap]);

  // Update markers when filters change
  useEffect(() => {
    if (map.current && !loading) {
      updateMarkers();
      
      // Fit bounds to filtered lands
      const validLands = filteredLands.filter((l) => l.parsedCoord);
      if (validLands.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        validLands.forEach((land) => {
          bounds.extend([land.parsedCoord!.lng, land.parsedCoord!.lat]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      } else if (validLands.length === 1) {
        map.current.flyTo({
          center: [validLands[0].parsedCoord!.lng, validLands[0].parsedCoord!.lat],
          zoom: 14,
        });
      }
    }
  }, [filteredLands, updateMarkers, loading]);

  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyles[mapStyle]);
    }
  }, [mapStyle]);

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Get unique farmers for filter
  const farmerOptions = allLands
    .filter(l => l.petani)
    .reduce((acc, land) => {
      if (land.petani && !acc.find(f => f.id === land.petani_id)) {
        acc.push({ id: land.petani_id!, nama: land.petani.nama, kode: land.petani.kode_petani });
      }
      return acc;
    }, [] as { id: string; nama: string; kode: string }[]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Peta Lokasi Lahan
              {editMode && (
                <Badge variant="destructive" className="ml-2">
                  Mode Edit Koordinat
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b flex-shrink-0">
            {/* Map Style Buttons */}
            <div className="flex gap-1">
              <Button
                variant={mapStyle === "streets" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapStyle("streets")}
              >
                <Map className="h-4 w-4 mr-1" />
                Streets
              </Button>
              <Button
                variant={mapStyle === "satellite" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapStyle("satellite")}
              >
                <Satellite className="h-4 w-4 mr-1" />
                Satellite
              </Button>
              <Button
                variant={mapStyle === "hybrid" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapStyle("hybrid")}
              >
                <Globe className="h-4 w-4 mr-1" />
                Hybrid
              </Button>
            </div>
            
            <div className="flex-1" />

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || filteredLands.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export ke CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportGeoJSON}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export ke GeoJSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading || loading || filteredLands.length === 0}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Download PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              disabled={loading || filteredLands.length === 0}
            >
              <Printer className="h-4 w-4 mr-1" />
              Cetak
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            
            {/* Farmer Filter */}
            <Select value={farmerFilter} onValueChange={setFarmerFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Semua Petani" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Petani</SelectItem>
                {farmerOptions.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.nama} ({farmer.kode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Organic Filter */}
            <Select value={organicFilter} onValueChange={(v) => setOrganicFilter(v as OrganicFilter)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="organic">
                  <span className="flex items-center gap-1">
                    <Leaf className="h-3 w-3 text-green-600" />
                    Organik
                  </span>
                </SelectItem>
                <SelectItem value="conventional">Konvensional</SelectItem>
              </SelectContent>
            </Select>

            {(farmerFilter !== "all" || organicFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFarmerFilter("all");
                  setOrganicFilter("all");
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}

            <div className="flex-1" />

            {/* Edit Mode Toggle */}
            {editMode ? (
              <Button variant="destructive" size="sm" onClick={handleExitEditMode}>
                <X className="h-4 w-4 mr-1" />
                Keluar Mode Edit
              </Button>
            ) : (
              <Select
                value=""
                onValueChange={(landId) => {
                  const land = allLands.find(l => l.id === landId);
                  if (land) {
                    setSelectedLandForEdit(land);
                    setEditMode(true);
                    toast({
                      title: "Mode Edit Aktif",
                      description: `Klik pada peta untuk mengatur koordinat baru untuk "${land.nama_lahan}"`,
                    });
                  }
                }}
              >
                <SelectTrigger className="w-[200px] h-9">
                  <div className="flex items-center gap-1">
                    <MousePointer className="h-4 w-4" />
                    <span>Edit Koordinat...</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {allLands
                    .filter((land) => land.id && land.id.trim() !== "")
                    .map((land) => (
                      <SelectItem key={land.id} value={land.id}>
                        {land.nama_lahan} {land.parsedCoord ? "" : "(belum ada koordinat)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Edit Mode Instructions */}
          {editMode && selectedLandForEdit && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-3 flex-shrink-0">
              <MousePointer className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Klik pada peta untuk memilih lokasi baru untuk: <strong>{selectedLandForEdit.nama_lahan}</strong>
                </p>
                {selectedLandForEdit.parsedCoord && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Koordinat saat ini: {selectedLandForEdit.parsedCoord.lat.toFixed(6)}, {selectedLandForEdit.parsedCoord.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Map & Legend Container */}
          <div className="flex-1 overflow-auto">
            <div ref={printRef} className="bg-background">
              {/* Print Header */}
              <div className="hidden print:block mb-4 text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-foreground">PETA LAHAN PETANI</h1>
                <p className="text-lg text-muted-foreground">{profile?.nama_perusahaan || ""}</p>
                <p className="text-sm text-muted-foreground">Tanggal: {currentDate}</p>
              </div>

              {/* Loading / Error / Map */}
              {loading ? (
                <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Memuat data lahan...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center text-destructive">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>{error}</p>
                  </div>
                </div>
              ) : (
                <>
                  {mapLoading && (
                    <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  <div 
                    ref={mapContainer} 
                    className={`h-[400px] rounded-lg border ${editMode ? 'cursor-crosshair' : ''}`}
                  />
                </>
              )}

              {/* Legend */}
              {filteredLands.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">
                      Daftar Lokasi Lahan ({filteredLands.length} lokasi)
                    </h3>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-green-600" />
                        Organik
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-orange-500" />
                        Konvensional
                      </span>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">No</th>
                          <th className="px-3 py-2 text-left font-medium">Nama Lahan</th>
                          <th className="px-3 py-2 text-left font-medium">Petani</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Koordinat</th>
                          <th className="px-3 py-2 text-left font-medium">Luas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLands.map((land, index) => (
                          <tr 
                            key={land.id} 
                            className="border-t hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              if (map.current && land.parsedCoord) {
                                map.current.flyTo({
                                  center: [land.parsedCoord.lng, land.parsedCoord.lat],
                                  zoom: 15,
                                });
                                markers.current[index]?.togglePopup();
                              }
                            }}
                          >
                            <td className="px-3 py-2">
                              <span 
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                                style={{ 
                                  background: land.petani?.is_organic 
                                    ? 'linear-gradient(135deg, hsl(142, 76%, 36%), hsl(142, 71%, 45%))'
                                    : 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(21, 90%, 48%))'
                                }}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium">{land.nama_lahan}</td>
                            <td className="px-3 py-2">
                              {land.petani ? `${land.petani.nama} (${land.petani.kode_petani})` : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {land.petani && (
                                <Badge variant={land.petani.is_organic ? "default" : "secondary"} className="text-xs">
                                  {land.petani.is_organic ? "🌿 Organik" : "Konvensional"}
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {land.parsedCoord?.lat.toFixed(6)}, {land.parsedCoord?.lng.toFixed(6)}
                            </td>
                            <td className="px-3 py-2">{land.luas ? `${land.luas} ha` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {filteredLands.length === 0 && !loading && (
                <div className="mt-4 text-center text-muted-foreground py-8 border rounded-lg">
                  <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada lahan yang sesuai dengan filter</p>
                </div>
              )}

              {/* Print Footer */}
              <div className="hidden print:block mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
                <p>Dokumen ini dicetak untuk keperluan perdata petani dan lahan.</p>
                <p>© {profile?.nama_perusahaan || ""} - {currentDate}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Edit Coordinates Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Koordinat Baru</DialogTitle>
            <DialogDescription>
              Anda akan mengubah koordinat lahan "{selectedLandForEdit?.nama_lahan}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input 
                  value={newCoordinates?.lat.toFixed(6) || ""} 
                  readOnly 
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input 
                  value={newCoordinates?.lng.toFixed(6) || ""} 
                  readOnly 
                  className="font-mono"
                />
              </div>
            </div>
            
            {selectedLandForEdit?.parsedCoord && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                <strong>Koordinat sebelumnya:</strong><br />
                {selectedLandForEdit.parsedCoord.lat.toFixed(6)}, {selectedLandForEdit.parsedCoord.lng.toFixed(6)}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSaveCoordinates} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Koordinat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
