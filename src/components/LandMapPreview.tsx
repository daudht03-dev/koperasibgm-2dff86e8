import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (error) throw error;
        setMapboxToken(data?.token);
      } catch (err) {
        console.error("Error fetching Mapbox token:", err);
        setError("Mapbox token tidak ditemukan. Pastikan MAPBOX_PUBLIC_TOKEN sudah dikonfigurasi.");
      }
    };

    if (open) {
      fetchToken();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mapContainer.current || !mapboxToken || coordinates.length === 0) return;

    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Initialize map
    mapboxgl.accessToken = mapboxToken;

    // Calculate bounds
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coord => {
      bounds.extend([coord.lng, coord.lat]);
    });

    // Get center from bounds
    const center = bounds.getCenter();

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [center.lng, center.lat],
      zoom: 10,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add markers for each coordinate
    map.current.on("load", () => {
      coordinates.forEach((coord, index) => {
        // Create custom marker element
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.innerHTML = `
          <div class="flex items-center justify-center w-8 h-8 bg-primary rounded-full text-primary-foreground font-bold text-sm shadow-lg border-2 border-white">
            ${index + 1}
          </div>
        `;

        // Create popup using DOM elements to prevent XSS
        const popupDiv = document.createElement("div");
        popupDiv.className = "p-2";
        
        const labelEl = document.createElement("p");
        labelEl.className = "font-bold text-sm";
        labelEl.textContent = coord.label;
        popupDiv.appendChild(labelEl);
        
        if (coord.lokasi) {
          const lokasiEl = document.createElement("p");
          lokasiEl.className = "text-xs text-gray-600";
          lokasiEl.textContent = coord.lokasi;
          popupDiv.appendChild(lokasiEl);
        }
        
        const coordsEl = document.createElement("p");
        coordsEl.className = "text-xs text-gray-500";
        coordsEl.textContent = `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`;
        popupDiv.appendChild(coordsEl);
        
        const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupDiv);

        // Add marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([coord.lng, coord.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Fit bounds with padding
      if (coordinates.length > 1) {
        map.current?.fitBounds(bounds, { padding: 50 });
      }
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [open, mapboxToken, coordinates]);

  const validCoords = coordinates.filter(c => !isNaN(c.lat) && !isNaN(c.lng));

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

          {/* Legend */}
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
    return { lat: 0, lng: 0, isValid: true }; // Empty is valid (optional field)
  }

  const trimmed = koordinat.trim();
  
  // Try different formats:
  // Format 1: "-6.123,106.456" or "-6.123, 106.456"
  // Format 2: "-6.123 106.456"
  // Format 3: "lat: -6.123, lng: 106.456"
  
  let lat: number | null = null;
  let lng: number | null = null;

  // Try comma separated
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map(p => p.trim());
    if (parts.length === 2) {
      lat = parseFloat(parts[0].replace(/[^0-9.-]/g, ""));
      lng = parseFloat(parts[1].replace(/[^0-9.-]/g, ""));
    }
  } 
  // Try space separated
  else if (trimmed.includes(" ")) {
    const parts = trimmed.split(/\s+/).map(p => p.trim());
    if (parts.length === 2) {
      lat = parseFloat(parts[0].replace(/[^0-9.-]/g, ""));
      lng = parseFloat(parts[1].replace(/[^0-9.-]/g, ""));
    }
  }
  // Try single number (invalid)
  else {
    return { 
      lat: 0, 
      lng: 0, 
      isValid: false, 
      error: "Format koordinat tidak valid. Gunakan format: lat,lng (contoh: -6.123,106.456)" 
    };
  }

  // Validate latitude (-90 to 90)
  if (lat === null || isNaN(lat) || lat < -90 || lat > 90) {
    return { 
      lat: 0, 
      lng: 0, 
      isValid: false, 
      error: `Latitude tidak valid (${lat}). Harus antara -90 dan 90` 
    };
  }

  // Validate longitude (-180 to 180)
  if (lng === null || isNaN(lng) || lng < -180 || lng > 180) {
    return { 
      lat: 0, 
      lng: 0, 
      isValid: false, 
      error: `Longitude tidak valid (${lng}). Harus antara -180 dan 180` 
    };
  }

  return { lat, lng, isValid: true };
};
