import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Download, Printer, Map, Satellite, Globe, Loader2, AlertCircle, Filter, MousePointer, Leaf, X, FileSpreadsheet, FileJson, Layers } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";

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
  parsedCoord?: {
    lat: number;
    lng: number;
  };
}

type MapStyle = "streets" | "satellite" | "hybrid" | "outdoors";
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
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
};

const mapStyleLabels: Record<MapStyle, string> = {
  streets: "Jalan",
  satellite: "Satelit",
  hybrid: "Hybrid",
  outdoors: "Outdoor",
};

export const LandMapTab: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const clickMarker = useRef<mapboxgl.Marker | null>(null);
  const mapInitialized = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  
  const [allLands, setAllLands] = useState<LandWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("hybrid");
  const [downloading, setDownloading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  
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

  // Memoized filtered lands
  const filteredLands = useMemo(() => {
    let result = allLands.filter(land => land.parsedCoord);

    if (farmerFilter !== "all") {
      result = result.filter(land => land.petani_id === farmerFilter);
    }

    if (organicFilter !== "all") {
      result = result.filter(land => {
        const isOrganic = land.is_organic ?? land.petani?.is_organic;
        return organicFilter === "organic" ? isOrganic : !isOrganic;
      });
    }

    return result;
  }, [allLands, farmerFilter, organicFilter]);

  // Unique farmers for filter dropdown
  const uniqueFarmers = useMemo(() => {
    const farmersMap: Record<string, { id: string; nama: string }> = {};
    allLands.forEach(land => {
      if (land.petani_id && land.petani) {
        farmersMap[land.petani_id] = { id: land.petani_id, nama: land.petani.nama };
      }
    });
    return Object.values(farmersMap);
  }, [allLands]);

  // Generate GeoJSON from filtered lands
  const generateGeoJSON = useCallback(() => {
    return {
      type: "FeatureCollection" as const,
      features: filteredLands.map((land) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [land.parsedCoord!.lng, land.parsedCoord!.lat],
        },
        properties: {
          id: land.id,
          nama_lahan: land.nama_lahan,
          lokasi: land.lokasi || "",
          luas: land.luas || 0,
          petani_nama: land.petani?.nama || "",
          petani_kode: land.petani?.kode_petani || "",
          is_organic: land.is_organic ?? land.petani?.is_organic ?? false,
        },
      })),
    };
  }, [filteredLands]);

  // Fetch lands with farmer data - only once
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
          is_organic,
          petani:petani_id (
            nama,
            kode_petani,
            is_organic
          )
        `)
        .limit(500);

      if (fetchError) throw fetchError;

      const landsWithCoords = (data || []).map((land: any) => {
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

  // Get Mapbox token once
  const getMapboxToken = useCallback(async () => {
    if (tokenRef.current) return tokenRef.current;
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke("get-mapbox-token");
      
      if (funcError || !data?.token) {
        throw new Error(data?.error || "Gagal mendapatkan token Mapbox");
      }
      
      tokenRef.current = data.token;
      return data.token;
    } catch (err) {
      console.error("Error getting token:", err);
      throw err;
    }
  }, []);

  // Add clustering layers to map
  const addClusterLayers = useCallback(() => {
    if (!map.current) return;

    // Remove existing layers and source if they exist
    const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point', 'unclustered-point-label'];
    layersToRemove.forEach(layer => {
      if (map.current?.getLayer(layer)) {
        map.current.removeLayer(layer);
      }
    });
    if (map.current.getSource('lands')) {
      map.current.removeSource('lands');
    }

    const geojson = generateGeoJSON();

    // Add source with clustering
    map.current.addSource('lands', {
      type: 'geojson',
      data: geojson,
      cluster: clusteringEnabled,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Cluster circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'lands',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#16a34a', // green for small clusters
          10, '#eab308', // yellow for medium
          30, '#ea580c', // orange for large
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10, 25,
          30, 35,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Cluster count labels
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'lands',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Unclustered points
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'lands',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'case',
          ['get', 'is_organic'],
          '#16a34a',
          '#ea580c',
        ],
        'circle-radius': 10,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

  }, [generateGeoJSON, clusteringEnabled]);

  // Initialize map only once
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current || mapInitialized.current) return;

    try {
      setMapLoading(true);
      
      const token = await getMapboxToken();
      mapboxgl.accessToken = token;

      // Default center (Indonesia)
      const center: [number, number] = [106.8456, -6.2088];

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyles[mapStyle],
        center,
        zoom: 8,
        preserveDrawingBuffer: true,
        trackResize: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");
      map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

      map.current.on("load", () => {
        mapInitialized.current = true;
        setMapReady(true);
        setMapLoading(false);
        addClusterLayers();
      });

      // Click on cluster to zoom
      map.current.on('click', 'clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId) {
          (map.current!.getSource('lands') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
              if (err) return;
              map.current!.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom: zoom!,
              });
            }
          );
        }
      });

      // Click on unclustered point to show popup
      map.current.on('click', 'unclustered-point', (e) => {
        if (editMode) return;
        
        const feature = e.features?.[0];
        if (!feature) return;

        const coords = (feature.geometry as any).coordinates.slice();
        const props = feature.properties;
        const isOrganic = props?.is_organic;

        if (popupRef.current) popupRef.current.remove();

        // Create popup using DOM elements to prevent XSS
        const popupDiv = document.createElement("div");
        popupDiv.style.cssText = "padding: 6px; font-family: system-ui, sans-serif;";
        
        const titleEl = document.createElement("h3");
        titleEl.style.cssText = "font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #166534;";
        titleEl.textContent = props?.nama_lahan || 'N/A';
        popupDiv.appendChild(titleEl);
        
        if (props?.petani_nama) {
          const petaniEl = document.createElement("p");
          petaniEl.style.cssText = "margin: 3px 0; color: #374151; font-size: 13px;";
          const strongEl = document.createElement("strong");
          strongEl.textContent = "Petani: ";
          petaniEl.appendChild(strongEl);
          petaniEl.appendChild(document.createTextNode(props.petani_nama));
          popupDiv.appendChild(petaniEl);
          
          const badgeEl = document.createElement("span");
          badgeEl.style.cssText = `background: ${isOrganic ? '#16a34a' : '#ea580c'}; color: white; padding: 2px 6px; border-radius: 9999px; font-size: 11px;`;
          badgeEl.textContent = isOrganic ? '🌿 Organik' : '🏭 Konvensional';
          popupDiv.appendChild(badgeEl);
        }
        
        if (props?.lokasi) {
          const lokasiEl = document.createElement("p");
          lokasiEl.style.cssText = "margin: 3px 0; color: #374151; font-size: 12px;";
          const strongLokasi = document.createElement("strong");
          strongLokasi.textContent = "Lokasi: ";
          lokasiEl.appendChild(strongLokasi);
          lokasiEl.appendChild(document.createTextNode(props.lokasi));
          popupDiv.appendChild(lokasiEl);
        }
        
        if (props?.luas) {
          const luasEl = document.createElement("p");
          luasEl.style.cssText = "margin: 3px 0; color: #374151; font-size: 12px;";
          const strongLuas = document.createElement("strong");
          strongLuas.textContent = "Luas: ";
          luasEl.appendChild(strongLuas);
          luasEl.appendChild(document.createTextNode(`${props.luas} ha`));
          popupDiv.appendChild(luasEl);
        }
        
        popupRef.current = new mapboxgl.Popup({ offset: 15, maxWidth: '280px' })
          .setLngLat(coords)
          .setDOMContent(popupDiv)
          .addTo(map.current!);
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
      map.current.on('mouseenter', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      map.current.on("error", (e) => {
        console.error("Map error:", e);
      });

    } catch (err: any) {
      console.error("Error initializing map:", err);
      setError(err.message || "Gagal memuat peta");
      setMapLoading(false);
    }
  }, [getMapboxToken, mapStyle, addClusterLayers, editMode]);

  // Update map style without reinitializing
  const updateMapStyle = useCallback((newStyle: MapStyle) => {
    if (map.current && mapReady) {
      map.current.setStyle(mapStyles[newStyle]);
      setMapStyle(newStyle);
      // Re-add layers after style change
      map.current.once('style.load', () => {
        addClusterLayers();
        fitBoundsToLands();
      });
    }
  }, [mapReady, addClusterLayers]);

  // Fit bounds to lands
  const fitBoundsToLands = useCallback(() => {
    if (!map.current || filteredLands.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    filteredLands.forEach((land) => {
      bounds.extend([land.parsedCoord!.lng, land.parsedCoord!.lat]);
    });
    map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  }, [filteredLands]);

  // Update cluster data when filters change
  const updateClusterData = useCallback(() => {
    if (!map.current || !mapReady) return;
    
    // Re-add layers to apply clustering change or filter update
    addClusterLayers();
    fitBoundsToLands();
  }, [mapReady, addClusterLayers, fitBoundsToLands]);

  // Setup click handler for edit mode
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (editMode && selectedLandForEdit) {
        const { lat, lng } = e.lngLat;
        setNewCoordinates({ lat, lng });
        
        if (clickMarker.current) {
          clickMarker.current.remove();
        }
        
        const el = document.createElement("div");
        el.innerHTML = `<div style="
          background: hsl(0, 84%, 60%);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">📍</div>`;
        
        clickMarker.current = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);
          
        setEditDialogOpen(true);
      }
    };

    map.current.on("click", handleClick);
    return () => {
      map.current?.off("click", handleClick);
    };
  }, [mapReady, editMode, selectedLandForEdit]);

  // Initial data fetch
  useEffect(() => {
    fetchLands();
  }, [fetchLands]);

  // Initialize map after data is loaded
  useEffect(() => {
    if (!loading && allLands.length >= 0 && !mapInitialized.current) {
      initializeMap();
    }
  }, [loading, allLands.length, initializeMap]);

  // Update cluster data when filtered lands change
  useEffect(() => {
    if (mapReady) {
      const timer = setTimeout(() => {
        updateClusterData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filteredLands, mapReady, updateClusterData, clusteringEnabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      popupRef.current?.remove();
      clickMarker.current?.remove();
      map.current?.remove();
      map.current = null;
      mapInitialized.current = false;
    };
  }, []);

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

      await fetchLands();
      
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

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setNewCoordinates(null);
    if (clickMarker.current) {
      clickMarker.current.remove();
      clickMarker.current = null;
    }
  };

  const handleExitEditMode = () => {
    setEditMode(false);
    setSelectedLandForEdit(null);
    setNewCoordinates(null);
    if (clickMarker.current) {
      clickMarker.current.remove();
      clickMarker.current = null;
    }
  };

  const handleExportCSV = () => {
    const validLands = filteredLands;
    if (validLands.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada lahan dengan koordinat untuk diekspor",
        variant: "destructive",
      });
      return;
    }

    const headers = ["No", "Nama Lahan", "Petani", "Kode Petani", "Status", "Lokasi", "Latitude", "Longitude", "Luas (ha)"];
    
    const rows = validLands.map((land, index) => [
      index + 1,
      `"${(land.nama_lahan || "").replace(/"/g, '""')}"`,
      `"${(land.petani?.nama || "-").replace(/"/g, '""')}"`,
      land.petani?.kode_petani || "-",
      (land.is_organic ?? land.petani?.is_organic) ? "Organik" : "Konvensional",
      `"${(land.lokasi || "-").replace(/"/g, '""')}"`,
      land.parsedCoord?.lat.toFixed(6) || "",
      land.parsedCoord?.lng.toFixed(6) || "",
      land.luas || "-",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

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

  const handleExportGeoJSON = () => {
    const validLands = filteredLands;
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
          is_organic: land.is_organic ?? land.petani?.is_organic ?? null,
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
    // @ts-ignore - react-to-print types issue
    contentRef: printRef,
    documentTitle: `Peta Lahan - ${profile?.nama_perusahaan || ""}`,
  });

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
            <Button onClick={fetchLands} variant="outline">
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="shadow-gentle">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Map Style Selector */}
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Select value={mapStyle} onValueChange={(v) => updateMapStyle(v as MapStyle)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(mapStyles) as MapStyle[]).map((style) => (
                    <SelectItem key={style} value={style}>
                      {mapStyleLabels[style]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Farmer Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={farmerFilter} onValueChange={setFarmerFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Semua Petani" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Petani</SelectItem>
                  {uniqueFarmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Organic Filter */}
            <Select value={organicFilter} onValueChange={(v) => setOrganicFilter(v as OrganicFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="organic">🌿 Organik</SelectItem>
                <SelectItem value="conventional">🏭 Konvensional</SelectItem>
              </SelectContent>
            </Select>

            {/* Clustering Toggle */}
            <Button
              variant={clusteringEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setClusteringEnabled(!clusteringEnabled)}
              className="gap-2"
            >
              <Layers className="h-4 w-4" />
              Cluster
            </Button>

            <div className="flex-1" />

            {/* Export Buttons */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportGeoJSON}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export GeoJSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Gambar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card className="shadow-gentle overflow-hidden">
        <div ref={printRef}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Peta Lahan
                </CardTitle>
                <CardDescription>
                  {filteredLands.length} lahan ditampilkan
                </CardDescription>
              </div>
              
              {/* Edit Mode Toggle */}
              {!editMode ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <MousePointer className="h-4 w-4 mr-2" />
                  Edit Koordinat
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedLandForEdit?.id || ""} 
                    onValueChange={(id) => {
                      const land = allLands.find(l => l.id === id);
                      setSelectedLandForEdit(land || null);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Pilih lahan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allLands.map((land) => (
                        <SelectItem key={land.id} value={land.id}>
                          {land.nama_lahan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={handleExitEditMode}>
                    <X className="h-4 w-4" />
                  </Button>
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
              <div 
                ref={mapContainer} 
                className="w-full h-[500px] bg-muted"
                style={{ minHeight: "400px" }}
              />
              
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

      {/* Legend */}
      <Card className="shadow-gentle">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium">Legenda:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-600" />
              <span className="text-sm">Organik</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500" />
              <span className="text-sm">Konvensional</span>
            </div>
            {clusteringEnabled && (
              <>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">Cluster:</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-[10px] text-white font-medium">5</div>
                  <span className="text-sm text-muted-foreground">&lt;10</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] text-white font-medium">15</div>
                  <span className="text-sm text-muted-foreground">10-30</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs text-white font-medium">50</div>
                  <span className="text-sm text-muted-foreground">&gt;30</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Land List */}
      {filteredLands.length > 0 && (
        <Card className="shadow-gentle">
          <CardHeader>
            <CardTitle className="text-base">Daftar Lahan</CardTitle>
          </CardHeader>
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

      {/* Edit Dialog */}
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
            <Button variant="outline" onClick={handleCancelEdit}>
              Batal
            </Button>
            <Button onClick={handleSaveCoordinates} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandMapTab;
