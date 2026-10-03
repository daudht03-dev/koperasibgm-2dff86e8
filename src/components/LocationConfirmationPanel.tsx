import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CloudOff, Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import {
  flushQueue,
  listQueue,
  needsLocationConfirmation,
  updateQueueItem,
  type QueueItem,
} from "@/lib/offline-queue";
import { toast } from "@/hooks/use-toast";

const DEFAULT_CENTER = { lat: -2.5, lng: 118 };

const parseKoordinat = (v: unknown): { lat: number; lng: number } | null => {
  if (typeof v !== "string") return null;
  const [a, b] = v.split(",").map((x) => parseFloat(x.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { lat: a, lng: b };
};

const itemKoordinat = (item: QueueItem) =>
  item.kind === "lahan-update"
    ? item.payload.fields.koordinat
    : item.kind === "land-create"
      ? item.payload.koordinat
      : null;

const itemName = (item: QueueItem) => {
  if (item.kind === "lahan-update") {
    const n = item.payload.fields.nama_lahan;
    return typeof n === "string" && n ? n : `Lahan ${item.payload.id.slice(0, 8)}`;
  }
  if (item.kind === "land-create") return item.payload.nama_lahan || "Lahan baru";
  return "Lahan";
};

/** Hook: queue items waiting for location confirmation, live-updated. */
export const usePendingLocationConfirmations = () => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const refresh = useCallback(async () => {
    try {
      setItems((await listQueue()).filter(needsLocationConfirmation));
    } catch {
      setItems([]);
    }
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener("offline-queue-changed", refresh);
    return () => window.removeEventListener("offline-queue-changed", refresh);
  }, [refresh]);
  return { items, refresh };
};

const useOnline = () => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
};

const ConfirmMapDialog = ({ item, onClose }: { item: QueueItem | null; onClose: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setLoading(true);
    const init = async () => {
      let start = parseKoordinat(itemKoordinat(item));
      if (!start && navigator.geolocation) {
        start = await new Promise((res) =>
          navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => res(null),
            { enableHighAccuracy: true, timeout: 8000 },
          ),
        );
      }
      const center = start || DEFAULT_CENTER;
      // Wait for the dialog container to have a size.
      for (let i = 0; i < 20 && (!containerRef.current || containerRef.current.clientHeight === 0); i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (cancelled || !containerRef.current) return;
      const g = await loadGoogleMaps();
      if (cancelled || !containerRef.current) return;
      const map = new g.maps.Map(containerRef.current, {
        center,
        zoom: start ? 18 : 5,
        mapTypeId: "hybrid",
        streetViewControl: false,
        fullscreenControl: false,
      });
      const marker = new g.maps.Marker({ position: center, map, draggable: true });
      markerRef.current = marker;
      setPos(center);
      marker.addListener("dragend", () => {
        const p = marker.getPosition();
        if (p) setPos({ lat: p.lat(), lng: p.lng() });
      });
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        setPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      setLoading(false);
    };
    init().catch(() => {
      if (!cancelled) {
        setLoading(false);
        toast({ title: "Gagal memuat peta", variant: "destructive" });
      }
    });
    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      setPos(null);
    };
  }, [item]);

  const confirm = async () => {
    if (!item || !pos) return;
    setSaving(true);
    const koordinat = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
    try {
      let updated: QueueItem;
      if (item.kind === "lahan-update") {
        const { koordinat_perlu_konfirmasi: _f, ...rest } = item.payload;
        updated = { ...item, payload: { ...rest, fields: { ...rest.fields, koordinat } } };
      } else if (item.kind === "land-create") {
        const { koordinat_perlu_konfirmasi: _f, ...rest } = item.payload as typeof item.payload & {
          koordinat_perlu_konfirmasi?: boolean;
        };
        updated = { ...item, payload: { ...rest, koordinat } };
      } else return;
      await updateQueueItem(updated);
      const res = await flushQueue();
      toast({
        title: "Lokasi dikonfirmasi",
        description: res.failed > 0 ? "Akan dicoba sinkron lagi nanti." : "Data lahan sudah tersinkron.",
      });
      onClose();
    } catch {
      toast({ title: "Gagal menyimpan konfirmasi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Konfirmasi Lokasi — {item ? itemName(item) : ""}</DialogTitle>
          <DialogDescription>Geser pin atau ketuk peta untuk menentukan titik lahan yang tepat.</DialogDescription>
        </DialogHeader>
        <div className="relative h-[60vh] min-h-[320px] w-full overflow-hidden rounded-md border">
          <div ref={containerRef} className="absolute inset-0" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-mono text-foreground">
            {pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : "—"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
            <Button onClick={confirm} disabled={!pos || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi Lokasi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Lists queue items flagged koordinat_perlu_konfirmasi and lets the user pin them on a map. */
export const LocationConfirmationPanel = () => {
  const online = useOnline();
  const { items } = usePendingLocationConfirmations();
  const [active, setActive] = useState<QueueItem | null>(null);

  if (!online) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-foreground">
        <CloudOff className="h-8 w-8" />
        <p>Perlu koneksi internet untuk membuka peta</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="py-6 text-center text-sm text-foreground">Tidak ada lokasi yang perlu dikonfirmasi.</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{itemName(item)}</p>
            <p className="text-xs text-foreground/70">
              {item.kind === "land-create" ? "Lahan baru" : "Perubahan lahan"} ·{" "}
              {new Date(item.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
          <Button size="sm" onClick={() => setActive(item)}>
            <MapPin className="mr-1 h-4 w-4" /> Konfirmasi Lokasi
          </Button>
        </div>
      ))}
      <ConfirmMapDialog item={active} onClose={() => setActive(null)} />
    </div>
  );
};

/** Dashboard badge: only renders when items need confirmation; opens the panel in a dialog. */
export const LocationConfirmationBadge = () => {
  const { items } = usePendingLocationConfirmations();
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <>
      <Badge
        variant="destructive"
        className="cursor-pointer gap-1"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        <MapPin className="h-3 w-3" /> {items.length} lokasi perlu konfirmasi
      </Badge>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Konfirmasi Lokasi Draft</DialogTitle>
            <DialogDescription>Lahan yang koordinatnya diisi manual saat offline.</DialogDescription>
          </DialogHeader>
          <LocationConfirmationPanel />
        </DialogContent>
      </Dialog>
    </>
  );
};
