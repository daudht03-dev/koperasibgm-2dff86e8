/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, AlertCircle } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

interface Coordinate {
  lat: number;
  lng: number;
  label: string;
  lokasi?: string;
}

interface LandMapPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: Coordinate[];
}

export const LandMapPreview = ({
  open,
  onOpenChange,
  coordinates,
}: LandMapPreviewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validCoords = coordinates.filter((c) => !isNaN(c.lat) && !isNaN(c.lng));

  useEffect(() => {
    if (!open || !mapContainer.current || validCoords.length === 0) return;

    let cancelled = false;
    setError(null);

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapContainer.current) return;

        // Cleanup previous
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        infoRef.current?.close();

        const bounds = new google.maps.LatLngBounds();
        validCoords.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));

        mapRef.current = new google.maps.Map(mapContainer.current, {
          center: bounds.getCenter(),
          zoom: 10,
          mapTypeId: google.maps.MapTypeId.HYBRID,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        infoRef.current = new google.maps.InfoWindow();

        validCoords.forEach((coord, index) => {
          const marker = new google.maps.Marker({
            position: { lat: coord.lat, lng: coord.lng },
            map: mapRef.current!,
            label: {
              text: String(index + 1),
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: "12px",
            },
            title: coord.label,
          });

          marker.addListener("click", () => {
            const div = document.createElement("div");
            div.style.cssText = "padding: 4px; font-family: system-ui, sans-serif;";
            const t = document.createElement("p");
            t.style.cssText = "font-weight: 700; font-size: 13px; margin: 0 0 3px;";
            t.textContent = coord.label;
            div.appendChild(t);
            if (coord.lokasi) {
              const l = document.createElement("p");
              l.style.cssText = "font-size: 12px; color: #4b5563; margin: 0 0 3px;";
              l.textContent = coord.lokasi;
              div.appendChild(l);
            }
            const c = document.createElement("p");
            c.style.cssText = "font-size: 11px; color: #6b7280; margin: 0;";
            c.textContent = `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`;
            div.appendChild(c);
            infoRef.current!.setContent(div);
            infoRef.current!.open({ map: mapRef.current!, anchor: marker });
          });

          markersRef.current.push(marker);
        });

        if (validCoords.length > 1) {
          mapRef.current.fitBounds(bounds, 50);
        }
      })
      .catch((err) => {
        console.error("Google Maps load error:", err);
        if (!cancelled) setError(err.message || "Gagal memuat Google Maps");
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      infoRef.current?.close();
      infoRef.current = null;
      mapRef.current = null;
    };
  }, [open, coordinates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Preview Lokasi Lahan ({validCoords.length} lokasi)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="flex flex-col items-center justify-center h-[400px] bg-muted rounded-lg">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center">{error}</p>
            </div>
          ) : validCoords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] bg-muted rounded-lg">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Tidak ada koordinat valid untuk ditampilkan</p>
            </div>
          ) : (
            <div ref={mapContainer} className="w-full h-[400px] rounded-lg overflow-hidden" />
          )}

          {validCoords.length > 0 && !error && (
            <div className="max-h-[150px] overflow-auto border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium mb-2">Daftar Lokasi:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {validCoords.map((coord, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 bg-primary rounded-full text-primary-foreground font-bold text-xs">
                      {index + 1}
                    </span>
                    <span className="truncate">{coord.label}</span>
                    <span className="text-muted-foreground">
                      ({coord.lat.toFixed(4)}, {coord.lng.toFixed(4)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to parse and validate coordinates
export const parseCoordinate = (koordinat: string): { lat: number; lng: number; isValid: boolean; error?: string } => {
  if (!koordinat || koordinat.trim() === "") {
    return { lat: 0, lng: 0, isValid: true };
  }

  const trimmed = koordinat.trim();
  let lat: number | null = null;
  let lng: number | null = null;

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts.length === 2) {
      lat = parseFloat(parts[0].replace(/[^0-9.-]/g, ""));
      lng = parseFloat(parts[1].replace(/[^0-9.-]/g, ""));
    }
  } else if (trimmed.includes(" ")) {
    const parts = trimmed.split(/\s+/).map((p) => p.trim());
    if (parts.length === 2) {
      lat = parseFloat(parts[0].replace(/[^0-9.-]/g, ""));
      lng = parseFloat(parts[1].replace(/[^0-9.-]/g, ""));
    }
  } else {
    return { lat: 0, lng: 0, isValid: false, error: "Format koordinat tidak valid. Gunakan format: lat,lng" };
  }

  if (lat === null || isNaN(lat) || lat < -90 || lat > 90) {
    return { lat: 0, lng: 0, isValid: false, error: `Latitude tidak valid (${lat})` };
  }
  if (lng === null || isNaN(lng) || lng < -180 || lng > 180) {
    return { lat: 0, lng: 0, isValid: false, error: `Longitude tidak valid (${lng})` };
  }
  return { lat, lng, isValid: true };
};
