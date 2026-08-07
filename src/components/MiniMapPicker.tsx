/**
 * Small interactive Google map used inside photo capture / edit dialogs.
 * The marker is draggable and the map recentres whenever coordinates change.
 */
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { Loader2, MapPin } from "lucide-react";

interface Props {
  lat: number | null;
  lng: number | null;
  onChange?: (lat: number, lng: number) => void;
  height?: number;
  zoom?: number;
  className?: string;
}

export const MiniMapPicker = ({ lat, lng, onChange, height = 200, zoom = 17, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;
        const center = { lat: lat ?? -7.4, lng: lng ?? 109.2 };
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: lat != null && lng != null ? zoom : 9,
          mapTypeId: "hybrid",
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        markerRef.current = new google.maps.Marker({
          position: center,
          map: mapRef.current,
          draggable: !!onChangeRef.current,
        });
        markerRef.current.addListener("dragend", () => {
          const p = markerRef.current?.getPosition();
          if (p) onChangeRef.current?.(p.lat(), p.lng());
        });
        mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng || !onChangeRef.current) return;
          onChangeRef.current(e.latLng.lat(), e.latLng.lng());
        });
        setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Gagal memuat peta");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || lat == null || lng == null || !mapRef.current) return;
    const pos = { lat, lng };
    mapRef.current.setCenter(pos);
    if (mapRef.current.getZoom()! < 14) mapRef.current.setZoom(zoom);
    markerRef.current?.setPosition(pos);
  }, [lat, lng, ready, zoom]);

  return (
    <div className={className}>
      <div className="relative rounded-md overflow-hidden border" style={{ height }}>
        <div ref={containerRef} className="w-full h-full" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground p-3 text-center">
            {error}
          </div>
        )}
      </div>
      {onChange && (
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Klik peta atau geser pin untuk mengoreksi titik.
        </p>
      )}
    </div>
  );
};

export default MiniMapPicker;
