import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, Printer, Map, Satellite, Globe, Loader2, AlertCircle } from "lucide-react";
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
  petani?: {
    nama: string;
    kode_petani: string;
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

const parseCoordinate = (koordinat: string): { lat: number; lng: number; isValid: boolean } => {
  if (!koordinat) return { lat: 0, lng: 0, isValid: false };

  const cleaned = koordinat.replace(/\s+/g, " ").trim();
  
  // Try comma-separated format: "-6.123, 106.456" or "-6.123,106.456"
  const commaMatch = cleaned.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (commaMatch) {
    const lat = parseFloat(commaMatch[1]);
    const lng = parseFloat(commaMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, isValid: true };
    }
  }

  // Try space-separated: "-6.123 106.456"
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
  
  const [lands, setLands] = useState<LandWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("streets");
  const [downloading, setDownloading] = useState(false);
  
  const { profile } = useCompanyProfile();

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
          petani:petani_id (
            nama,
            kode_petani
          )
        `)
        .not("koordinat", "is", null);

      if (fetchError) throw fetchError;

      // Parse coordinates and filter valid ones
      const landsWithCoords = (data || [])
        .map((land: any) => {
          const parsed = parseCoordinate(land.koordinat || "");
          return {
            ...land,
            parsedCoord: parsed.isValid ? { lat: parsed.lat, lng: parsed.lng } : undefined,
          };
        })
        .filter((land) => land.parsedCoord);

      setLands(landsWithCoords);
    } catch (err) {
      console.error("Error fetching lands:", err);
      setError("Gagal memuat data lahan");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Mapbox token and initialize map
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current || lands.length === 0) return;

    try {
      setMapLoading(true);
      
      // Fetch token from edge function
      const { data, error: funcError } = await supabase.functions.invoke("get-mapbox-token");
      
      if (funcError || !data?.token) {
        throw new Error(data?.error || "Gagal mendapatkan token Mapbox");
      }

      mapboxgl.accessToken = data.token;

      // Calculate center from all coordinates
      const validLands = lands.filter((l) => l.parsedCoord);
      const avgLat = validLands.reduce((sum, l) => sum + l.parsedCoord!.lat, 0) / validLands.length;
      const avgLng = validLands.reduce((sum, l) => sum + l.parsedCoord!.lng, 0) / validLands.length;

      // Clear existing map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyles[mapStyle],
        center: [avgLng, avgLat],
        zoom: 10,
        preserveDrawingBuffer: true, // Required for html2canvas
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");

      // Wait for map to load
      await new Promise<void>((resolve) => {
        map.current!.on("load", () => resolve());
      });

      // Clear existing markers
      markers.current.forEach((m) => m.remove());
      markers.current = [];

      // Add markers for each land
      validLands.forEach((land, index) => {
        const el = document.createElement("div");
        el.className = "land-marker";
        el.innerHTML = `<div style="
          background: linear-gradient(135deg, hsl(142, 76%, 36%), hsl(142, 71%, 45%));
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

      // Fit bounds to show all markers
      if (validLands.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        validLands.forEach((land) => {
          bounds.extend([land.parsedCoord!.lng, land.parsedCoord!.lat]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }

    } catch (err: any) {
      console.error("Error initializing map:", err);
      setError(err.message || "Gagal memuat peta");
    } finally {
      setMapLoading(false);
    }
  }, [lands, mapStyle]);

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

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Peta Lahan - ${profile?.nama_perusahaan || "Petani"}`,
  });

  // Effects
  useEffect(() => {
    if (open) {
      fetchLands();
    }
  }, [open, fetchLands]);

  useEffect(() => {
    if (open && lands.length > 0) {
      initializeMap();
    }
    
    return () => {
      if (!open && map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [open, lands, initializeMap]);

  // Reinitialize map when style changes
  useEffect(() => {
    if (map.current && lands.length > 0) {
      map.current.setStyle(mapStyles[mapStyle]);
    }
  }, [mapStyle, lands.length]);

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Peta Lokasi Lahan
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b flex-shrink-0">
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading || loading || lands.length === 0}
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
            disabled={loading || lands.length === 0}
          >
            <Printer className="h-4 w-4 mr-1" />
            Cetak
          </Button>
        </div>

        {/* Map & Legend Container */}
        <div className="flex-1 overflow-auto">
          <div ref={printRef} className="bg-background">
            {/* Print Header - only visible in print */}
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
            ) : lands.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Map className="h-8 w-8 mx-auto mb-2" />
                  <p>Tidak ada lahan dengan koordinat valid</p>
                </div>
              </div>
            ) : (
              <>
                {mapLoading && (
                  <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <div ref={mapContainer} className="h-[400px] rounded-lg border" />
              </>
            )}

            {/* Legend */}
            {lands.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2 text-foreground">
                  Daftar Lokasi Lahan ({lands.length} lokasi)
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">No</th>
                        <th className="px-3 py-2 text-left font-medium">Nama Lahan</th>
                        <th className="px-3 py-2 text-left font-medium">Petani</th>
                        <th className="px-3 py-2 text-left font-medium">Lokasi</th>
                        <th className="px-3 py-2 text-left font-medium">Koordinat</th>
                        <th className="px-3 py-2 text-left font-medium">Luas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lands.map((land, index) => (
                        <tr 
                          key={land.id} 
                          className="border-t hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            if (map.current && land.parsedCoord) {
                              map.current.flyTo({
                                center: [land.parsedCoord.lng, land.parsedCoord.lat],
                                zoom: 15,
                              });
                              // Open popup
                              markers.current[index]?.togglePopup();
                            }
                          }}
                        >
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium">{land.nama_lahan}</td>
                          <td className="px-3 py-2">
                            {land.petani ? `${land.petani.nama} (${land.petani.kode_petani})` : "-"}
                          </td>
                          <td className="px-3 py-2 max-w-[200px] truncate">{land.lokasi || "-"}</td>
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

            {/* Print Footer - only visible in print */}
            <div className="hidden print:block mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
              <p>Dokumen ini dicetak untuk keperluan perdata petani dan lahan.</p>
              <p>© {profile?.nama_perusahaan || ""} - {currentDate}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
