/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Download, Printer, Map, Loader2, AlertCircle, Filter, MousePointer, X, FileSpreadsheet, FileJson, Layers } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { MapAddressSearch } from "@/components/MapAddressSearch";

interface LandWithFarmer {
  id: string;
  nama_lahan: string;
  lokasi: string | null;
  koordinat: string | null;
  luas: number | null;
  petani_id: string | null;
  is_organic: boolean | null;
  petani?: {
    nama: string;
    kode_petani: string;
    is_organic: boolean | null;
  } | null;
  parsedCoord?: { lat: number; lng: number };
}

type MapStyle = "roadmap" | "satellite" | "hybrid" | "terrain";
type OrganicFilter = "all" | "organic" | "conventional";

const parseCoordinate = (koordinat: string): { lat: number; lng: number; isValid: boolean } => {
  if (!koordinat) return { lat: 0, lng: 0, isValid: false };
  const cleaned = koordinat.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/^(-?\d+\.?\d*)\s*[, ]\s*(-?\d+\.?\d*)$/);
  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, isValid: true };
    }
  }
  return { lat: 0, lng: 0, isValid: false };
};

const mapStyleLabels: Record<MapStyle, string> = {
  roadmap: "Jalan",
  satellite: "Satelit",
  hybrid: "Hybrid",
  terrain: "Terrain",
};

export const LandMapTab: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const clickMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const searchMarkerRef = useRef<google.maps.Marker | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const [allLands, setAllLands] = useState<LandWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("hybrid");
  const [downloading, setDownloading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);

  const [farmerFilter, setFarmerFilter] = useState<string>("all");
  const [organicFilter, setOrganicFilter] = useState<OrganicFilter>("all");

  const [editMode, setEditMode] = useState(false);
  const [selectedLandForEdit, setSelectedLandForEdit] = useState<LandWithFarmer | null>(null);
  const [newCoordinates, setNewCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { profile } = useCompanyProfile();

  const filteredLands = useMemo(() => {
    let result = allLands.filter((land) => land.parsedCoord);
    if (farmerFilter !== "all") result = result.filter((l) => l.petani_id === farmerFilter);
    if (organicFilter !== "all") {
      result = result.filter((l) => {
        const isOrganic = l.is_organic ?? l.petani?.is_organic;
        return organicFilter === "organic" ? isOrganic : !isOrganic;
      });
    }
    return result;
  }, [allLands, farmerFilter, organicFilter]);

  const uniqueFarmers = useMemo(() => {
    const map: Record<string, { id: string; nama: string }> = {};
    allLands.forEach((l) => {
      if (l.petani_id && l.petani) map[l.petani_id] = { id: l.petani_id, nama: l.petani.nama };
    });
    return Object.values(map);
  }, [allLands]);

  const fetchLands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("lahan")
        .select(`id, nama_lahan, lokasi, koordinat, luas, petani_id, is_organic,
          petani:petani_id ( nama, kode_petani, is_organic )`)
        .limit(500);
      if (fetchError) throw fetchError;
      const lands = (data || []).map((land: any) => {
        const parsed = parseCoordinate(land.koordinat || "");
        return { ...land, parsedCoord: parsed.isValid ? { lat: parsed.lat, lng: parsed.lng } : undefined };
      });
      setAllLands(lands);
    } catch (err) {
      console.error("Error fetching lands:", err);
      setError("Gagal memuat data lahan");
    } finally {
      setLoading(false);
    }
  }, []);

  // Build markers from filtered lands
  const buildMarkers = useCallback(() => {
    if (!mapRef.current || !(window as any).google?.maps) return;
    const google = (window as any).google;

    // Clear existing
    clustererRef.current?.clearMarkers();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    filteredLands.forEach((land) => {
      const isOrganic = land.is_organic ?? land.petani?.is_organic ?? false;
      const color = isOrganic ? "#16a34a" : "#ea580c";
      const marker = new google.maps.Marker({
        position: { lat: land.parsedCoord!.lat, lng: land.parsedCoord!.lng },
        title: land.nama_lahan,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        if (editMode || !mapRef.current) return;
        const div = document.createElement("div");
        div.style.cssText = "padding: 6px; font-family: system-ui, sans-serif; max-width: 260px;";
        const title = document.createElement("h3");
        title.style.cssText = "font-weight: 600; font-size: 14px; margin: 0 0 6px; color: #166534;";
        title.textContent = land.nama_lahan || "N/A";
        div.appendChild(title);
        if (land.petani?.nama) {
          const p = document.createElement("p");
          p.style.cssText = "margin: 3px 0; font-size: 13px; color: #374151;";
          p.innerHTML = `<strong>Petani:</strong> `;
          p.appendChild(document.createTextNode(land.petani.nama));
          div.appendChild(p);
          const b = document.createElement("span");
          b.style.cssText = `background:${color};color:#fff;padding:2px 6px;border-radius:9999px;font-size:11px;`;
          b.textContent = isOrganic ? "🌿 Organik" : "🏭 Konvensional";
          div.appendChild(b);
        }
        if (land.lokasi) {
          const p = document.createElement("p");
          p.style.cssText = "margin: 3px 0; font-size: 12px; color: #374151;";
          p.innerHTML = `<strong>Lokasi:</strong> `;
          p.appendChild(document.createTextNode(land.lokasi));
          div.appendChild(p);
        }
        if (land.luas) {
          const p = document.createElement("p");
          p.style.cssText = "margin: 3px 0; font-size: 12px; color: #374151;";
          p.textContent = `Luas: ${land.luas} ha`;
          div.appendChild(p);
        }
        infoRef.current!.setContent(div);
        infoRef.current!.open({ map: mapRef.current!, anchor: marker });
      });

      markersRef.current.push(marker);
      bounds.extend(marker.getPosition()!);
    });

    if (clusteringEnabled) {
      clustererRef.current = new MarkerClusterer({ map: mapRef.current, markers: markersRef.current });
    } else {
      markersRef.current.forEach((m) => m.setMap(mapRef.current!));
    }

    if (filteredLands.length > 0) {
      mapRef.current.fitBounds(bounds, 60);
      // Cap max zoom
      const listener = google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
        if (mapRef.current && mapRef.current.getZoom()! > 15) mapRef.current.setZoom(15);
      });
      void listener;
    }
  }, [filteredLands, clusteringEnabled, editMode]);

  // Initialize map once
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current || mapRef.current) return;
    try {
      setMapLoading(true);
      const google = await loadGoogleMaps();

      mapRef.current = new google.maps.Map(mapContainer.current, {
        center: { lat: -6.2088, lng: 106.8456 },
        zoom: 8,
        mapTypeId: mapStyle,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      infoRef.current = new google.maps.InfoWindow();

      google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
        setMapReady(true);
        setMapLoading(false);
      });
    } catch (err: any) {
      console.error("Error initializing map:", err);
      setError(err.message || "Gagal memuat peta");
      setMapLoading(false);
    }
  }, [mapStyle]);

  const updateMapStyle = useCallback((newStyle: MapStyle) => {
    setMapStyle(newStyle);
    if (mapRef.current) mapRef.current.setMapTypeId(newStyle);
  }, []);

  // Edit-mode click handler
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    clickListenerRef.current?.remove();
    clickListenerRef.current = mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!editMode || !selectedLandForEdit || !e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setNewCoordinates({ lat, lng });
      const google = (window as any).google;
      clickMarkerRef.current?.setMap(null);
      clickMarkerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      setEditDialogOpen(true);
    });
    return () => {
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
    };
  }, [mapReady, editMode, selectedLandForEdit]);

  useEffect(() => { fetchLands(); }, [fetchLands]);

  useEffect(() => {
    if (!loading && !mapRef.current) initializeMap();
  }, [loading, initializeMap]);

  useEffect(() => {
    if (mapReady) {
      const t = setTimeout(() => buildMarkers(), 100);
      return () => clearTimeout(t);
    }
  }, [filteredLands, mapReady, clusteringEnabled, buildMarkers]);

  useEffect(() => {
    return () => {
      clickListenerRef.current?.remove();
      clustererRef.current?.clearMarkers();
      markersRef.current.forEach((m) => m.setMap(null));
      clickMarkerRef.current?.setMap(null);
      searchMarkerRef.current?.setMap(null);
      infoRef.current?.close();
      mapRef.current = null;
    };
  }, []);

  const handleSaveCoordinates = async () => {
    if (!selectedLandForEdit || !newCoordinates) return;
    try {
      setSaving(true);
      const koordinat = `${newCoordinates.lat.toFixed(6)}, ${newCoordinates.lng.toFixed(6)}`;
      const { error: updateError } = await supabase.from("lahan").update({ koordinat }).eq("id", selectedLandForEdit.id);
      if (updateError) throw updateError;
      toast({ title: "Berhasil", description: `Koordinat lahan "${selectedLandForEdit.nama_lahan}" diperbarui` });
      await fetchLands();
      setEditDialogOpen(false);
      setEditMode(false);
      setSelectedLandForEdit(null);
      setNewCoordinates(null);
      clickMarkerRef.current?.setMap(null);
      clickMarkerRef.current = null;
    } catch (err) {
      console.error(err);
      toast({ title: "Gagal", description: "Gagal menyimpan koordinat", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setNewCoordinates(null);
    clickMarkerRef.current?.setMap(null);
    clickMarkerRef.current = null;
  };

  const handleExitEditMode = () => {
    setEditMode(false);
    setSelectedLandForEdit(null);
    setNewCoordinates(null);
    clickMarkerRef.current?.setMap(null);
    clickMarkerRef.current = null;
  };

  const handleExportCSV = () => {
    if (filteredLands.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada lahan untuk diekspor", variant: "destructive" });
      return;
    }
    const headers = ["No", "Nama Lahan", "Petani", "Kode Petani", "Status", "Lokasi", "Latitude", "Longitude", "Luas (ha)"];
    const rows = filteredLands.map((land, i) => [
      i + 1,
      `"${(land.nama_lahan || "").replace(/"/g, '""')}"`,
      `"${(land.petani?.nama || "-").replace(/"/g, '""')}"`,
      land.petani?.kode_petani || "-",
      (land.is_organic ?? land.petani?.is_organic) ? "Organik" : "Konvensional",
      `"${(land.lokasi || "-").replace(/"/g, '""')}"`,
      land.parsedCoord?.lat.toFixed(6) || "",
      land.parsedCoord?.lng.toFixed(6) || "",
      land.luas || "-",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `data-lahan-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Berhasil", description: `${filteredLands.length} lahan diekspor` });
  };

  const handleExportGeoJSON = () => {
    if (filteredLands.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada lahan untuk diekspor", variant: "destructive" });
      return;
    }
    const geojson = {
      type: "FeatureCollection",
      features: filteredLands.map((land, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [land.parsedCoord!.lng, land.parsedCoord!.lat] },
        properties: {
          id: land.id, number: i + 1, nama_lahan: land.nama_lahan, lokasi: land.lokasi,
          luas_ha: land.luas, petani_nama: land.petani?.nama, petani_kode: land.petani?.kode_petani,
          is_organic: land.is_organic ?? land.petani?.is_organic ?? null,
          latitude: land.parsedCoord!.lat, longitude: land.parsedCoord!.lng,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `data-lahan-${new Date().toISOString().split("T")[0]}.geojson`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Berhasil", description: `${filteredLands.length} lahan diekspor` });
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(printRef.current, { useCORS: true, allowTaint: true, backgroundColor: "#ffffff", scale: 2 });
      const a = document.createElement("a");
      a.download = `peta-lahan-${new Date().toISOString().split("T")[0]}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      toast({ title: "Berhasil", description: "Peta diunduh" });
    } catch (err) {
      console.error(err);
      toast({ title: "Gagal", description: "Gagal mengunduh peta", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = useReactToPrint({
    // @ts-ignore
    contentRef: printRef,
    documentTitle: `Peta Lahan - ${profile?.nama_perusahaan || ""}`,
  });
  const handleAddressSelect = useCallback(({ lat, lng, address }: { lat: number; lng: number; address: string }) => {
    if (!mapRef.current || !(window as any).google?.maps) return;
    const google = (window as any).google;
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(16);

    searchMarkerRef.current?.setMap(null);
    searchMarkerRef.current = new google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 11,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      title: address,
    });

    if (infoRef.current) {
      const div = document.createElement("div");
      div.style.cssText = "padding: 6px; font-family: system-ui, sans-serif; max-width: 260px;";
      const t = document.createElement("p");
      t.style.cssText = "font-weight: 600; font-size: 13px; margin: 0 0 4px;";
      t.textContent = address;
      div.appendChild(t);
      const c = document.createElement("p");
      c.style.cssText = "font-size: 11px; color: #6b7280; margin: 0;";
      c.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      div.appendChild(c);
      infoRef.current.setContent(div);
      infoRef.current.open({ map: mapRef.current, anchor: searchMarkerRef.current });
    }

    if (editMode && selectedLandForEdit) {
      setNewCoordinates({ lat, lng });
      clickMarkerRef.current?.setMap(null);
      clickMarkerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      setEditDialogOpen(true);
    }
  }, [editMode, selectedLandForEdit]);


  if (loading) {
    return (
      <Card className="shadow-gentle">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Memuat data lahan...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !mapReady) {
    return (
      <Card className="shadow-gentle">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchLands} variant="outline">Coba Lagi</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-gentle">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Select value={mapStyle} onValueChange={(v) => updateMapStyle(v as MapStyle)}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(mapStyleLabels) as MapStyle[]).map((s) => (
                    <SelectItem key={s} value={s}>{mapStyleLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MapAddressSearch onSelect={handleAddressSelect} className="w-full sm:w-[280px]" />

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={farmerFilter} onValueChange={setFarmerFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Petani" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Petani</SelectItem>
                  {uniqueFarmers.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nama}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <Select value={organicFilter} onValueChange={(v) => setOrganicFilter(v as OrganicFilter)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="organic">🌿 Organik</SelectItem>
                <SelectItem value="conventional">🏭 Konvensional</SelectItem>
              </SelectContent>
            </Select>

            <Button variant={clusteringEnabled ? "default" : "outline"} size="sm" onClick={() => setClusteringEnabled(!clusteringEnabled)} className="gap-2">
              <Layers className="h-4 w-4" />Cluster
            </Button>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />Export CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportGeoJSON}><FileJson className="h-4 w-4 mr-2" />Export GeoJSON</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload} disabled={downloading}><Download className="h-4 w-4 mr-2" />Download Gambar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4 mr-2" />Print
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-gentle overflow-hidden">
        <div ref={printRef}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />Peta Lahan (Google Maps)
                </CardTitle>
                <CardDescription>{filteredLands.length} lahan ditampilkan</CardDescription>
              </div>

              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <MousePointer className="h-4 w-4 mr-2" />Edit Koordinat
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={selectedLandForEdit?.id || ""} onValueChange={(id) => {
                    const l = allLands.find((x) => x.id === id);
                    setSelectedLandForEdit(l || null);
                  }}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pilih lahan..." /></SelectTrigger>
                    <SelectContent>
                      {allLands.map((l) => (<SelectItem key={l.id} value={l.id}>{l.nama_lahan}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={handleExitEditMode}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            {editMode && selectedLandForEdit && (
              <p className="text-sm text-muted-foreground mt-2">
                Klik pada peta untuk memilih koordinat baru untuk "{selectedLandForEdit.nama_lahan}"
              </p>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="relative">
              <div ref={mapContainer} className="w-full h-[500px] bg-muted" style={{ minHeight: "400px" }} />
              {mapLoading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat peta...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>

      <Card className="shadow-gentle">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium">Legenda:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-600" /><span className="text-sm">Organik</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500" /><span className="text-sm">Konvensional</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredLands.length > 0 && (
        <Card className="shadow-gentle">
          <CardHeader><CardTitle className="text-base">Daftar Lahan</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">No</th>
                    <th className="text-left py-2 px-3">Nama Lahan</th>
                    <th className="text-left py-2 px-3">Petani</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Luas</th>
                    <th className="text-left py-2 px-3">Koordinat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLands.slice(0, 50).map((land, idx) => {
                    const isOrganic = land.is_organic ?? land.petani?.is_organic;
                    return (
                      <tr key={land.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium">{land.nama_lahan}</td>
                        <td className="py-2 px-3">{land.petani?.nama || "-"}</td>
                        <td className="py-2 px-3">
                          <Badge variant={isOrganic ? "default" : "secondary"} className="text-xs">
                            {isOrganic ? "Organik" : "Konvensional"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{land.luas ? `${land.luas} ha` : "-"}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {land.parsedCoord ? `${land.parsedCoord.lat.toFixed(4)}, ${land.parsedCoord.lng.toFixed(4)}` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLands.length > 50 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Menampilkan 50 dari {filteredLands.length} lahan
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Koordinat Baru</DialogTitle>
            <DialogDescription>
              Anda akan mengubah koordinat lahan "{selectedLandForEdit?.nama_lahan}"
            </DialogDescription>
          </DialogHeader>
          {newCoordinates && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Latitude</Label>
                  <p className="font-mono">{newCoordinates.lat.toFixed(6)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Longitude</Label>
                  <p className="font-mono">{newCoordinates.lng.toFixed(6)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>Batal</Button>
            <Button onClick={handleSaveCoordinates} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandMapTab;
