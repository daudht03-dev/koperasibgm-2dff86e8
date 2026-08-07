/**
 * Overlay editor for photos that are already stored in the `foto_lahan` table.
 * Lets the user correct farmer name / land code / address / coordinates, then
 * either update the metadata only, or re-stamp the watermark and save a new version.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, Save, FilePlus2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { renderPhotoOverlay, canvasToBlob, OverlayData } from "@/lib/photo-overlay";
import { evaluateCoordinate } from "@/lib/coordinate-accuracy";
import CoordinateAccuracyIndicator from "@/components/CoordinateAccuracyIndicator";
import MiniMapPicker from "@/components/MiniMapPicker";
import PhotoVersionHistory from "@/components/PhotoVersionHistory";

export interface EditablePhoto {
  id: string;
  tipe: string;
  kode: string | null;
  nama_petani: string | null;
  judul: string | null;
  alamat: string | null;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
  catatan?: string | null;
  petani_id?: string | null;
  lahan_id?: string | null;
  file_path: string;
  taken_at: string;
  tampilkan_waktu?: boolean | null;
  akurasi_meter?: number | null;
}


interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo: EditablePhoto | null;
  /** Signed URL of the stored image */
  imageUrl?: string;
  onSaved?: () => void;
}

const formatStamp = (d: Date) =>
  d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

export const LandPhotoEditor = ({ open, onOpenChange, photo, imageUrl, onSaved }: Props) => {
  const { profile } = useCompanyProfile();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [namaPetani, setNamaPetani] = useState("");
  const [kode, setKode] = useState("");
  const [heading, setHeading] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [mapThumb, setMapThumb] = useState<string | null>(null);
  const [baseSrc, setBaseSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Hydrate form when a photo is opened
  useEffect(() => {
    if (!open || !photo) return;
    setNamaPetani(photo.nama_petani || "");
    setKode(photo.kode || "");
    setHeading(photo.judul || "");
    setAddress(photo.alamat || "");
    setNote(photo.catatan || (photo.tipe === "lahan" ? "Lahan Petani" : "Alamat Petani"));
    setLat(photo.koordinat_lat != null ? String(photo.koordinat_lat) : "");
    setLng(photo.koordinat_lng != null ? String(photo.koordinat_lng) : "");
    setMapThumb(null);
  }, [open, photo?.id]);

  // Load the stored image as a data URL so the canvas stays untainted
  useEffect(() => {
    if (!open || !imageUrl) {
      setBaseSrc(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          if (!cancelled) setBaseSrc(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch {
        if (!cancelled) setBaseSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, imageUrl]);

  const fetchMapThumb = useCallback(async (la: number, ln: number) => {
    const { data, error } = await supabase.functions.invoke("static-map", {
      body: { lat: la, lng: ln, zoom: 15, size: "300x300" },
    });
    if (error) return;
    setMapThumb((data as any)?.dataUrl ?? null);
  }, []);

  useEffect(() => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!open || !Number.isFinite(la) || !Number.isFinite(ln)) return;
    const t = setTimeout(() => fetchMapThumb(la, ln), 500);
    return () => clearTimeout(t);
  }, [open, lat, lng, fetchMapThumb]);

  const refreshAddress = async () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      toast({ title: "Koordinat belum valid", variant: "destructive" });
      return;
    }
    setGeocoding(true);
    const { data, error } = await supabase.functions.invoke("reverse-geocode", { body: { lat: la, lng: ln } });
    setGeocoding(false);
    if (error) {
      toast({ title: "Gagal mengambil alamat", variant: "destructive" });
      return;
    }
    const d = data as any;
    if (d?.address) setAddress(d.address);
    const comps: any[] = d?.results?.[0]?.address_components ?? [];
    const pick = (type: string) => comps.find((c) => c.types?.includes(type))?.long_name;
    const h = [
      pick("administrative_area_level_3") || pick("administrative_area_level_2") || pick("locality") || "",
      pick("administrative_area_level_1") || "",
    ]
      .filter(Boolean)
      .join(", ");
    if (h) setHeading(h);
  };

  const overlayData = useMemo<OverlayData>(
    () => ({
      heading: heading || "-",
      address: address || "-",
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      note,
      subject: [namaPetani, kode ? `(${kode})` : ""].filter(Boolean).join(" "),
      timestamp: formatStamp(photo ? new Date(photo.taken_at) : new Date()),
    }),
    [heading, address, lat, lng, note, namaPetani, kode, photo?.taken_at],
  );

  // Live preview: re-stamp overlay on top of the stored photo
  useEffect(() => {
    if (!open || !baseSrc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        if (cancelled || !canvasRef.current) return;
        await renderPhotoOverlay(canvasRef.current, {
          photoSrc: baseSrc,
          data: overlayData,
          mapThumbSrc: mapThumb,
          logoSrc: profile?.logo_url || null,
          solidPanel: true,
        });
      } catch (e) {
        console.error("overlay re-render failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, baseSrc, overlayData, mapThumb, profile?.logo_url]);

  const metadataPayload = () => ({
    nama_petani: namaPetani || null,
    kode: kode || null,
    judul: heading || null,
    alamat: address || null,
    catatan: note || null,
    koordinat_lat: Number.isFinite(parseFloat(lat)) ? parseFloat(lat) : null,
    koordinat_lng: Number.isFinite(parseFloat(lng)) ? parseFloat(lng) : null,
  });

  const handleUpdateMetadata = async () => {
    if (!photo) return;
    setBusy(true);
    const { error } = await supabase.from("foto_lahan").update(metadataPayload()).eq("id", photo.id);
    setBusy(false);
    if (error) {
      toast({ title: "Gagal memperbarui data", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Metadata diperbarui" });
    onSaved?.();
    onOpenChange(false);
  };

  const handleSaveNewVersion = async () => {
    if (!photo || !canvasRef.current) return;
    setBusy(true);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const safeCode = (kode || "foto").replace(/[^A-Za-z0-9_-]/g, "");
      const path = `${uid}/${safeCode}-${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("foto-lahan")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("foto-lahan")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const { error: insErr } = await supabase.from("foto_lahan").insert({
        ...metadataPayload(),
        petani_id: photo.petani_id ?? null,
        lahan_id: photo.lahan_id ?? null,
        tipe: photo.tipe,
        file_path: path,
        file_url: signed?.signedUrl || path,
        taken_at: photo.taken_at,
        created_by: uid ?? null,
      });
      if (insErr) throw insErr;

      toast({ title: "Versi baru tersimpan", description: `Dokumentasi ${kode || ""} berhasil disimpan.` });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Gagal menyimpan versi baru", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" /> Edit Overlay Foto
          </DialogTitle>
          <DialogDescription>
            Koreksi nama petani, kode lahan, alamat, dan koordinat. Simpan metadata saja, atau buat versi
            baru dengan watermark yang diperbarui.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border overflow-hidden bg-muted/40 flex items-center justify-center min-h-[220px]">
            {baseSrc ? (
              <canvas ref={canvasRef} className="w-full h-auto" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nama Petani</Label>
                <Input value={namaPetani} onChange={(e) => setNamaPetani(e.target.value)} />
              </div>
              <div>
                <Label>Kode Petani / Lahan</Label>
                <Input value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Judul / Wilayah</Label>
              <Input value={heading} onChange={(e) => setHeading(e.target.value)} />
            </div>
            <div>
              <Label>Alamat</Label>
              <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={refreshAddress} disabled={geocoding}>
              {geocoding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Ambil ulang alamat dari koordinat
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Batal
          </Button>
          <Button variant="secondary" onClick={handleUpdateMetadata} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Perbarui Metadata
          </Button>
          <Button onClick={handleSaveNewVersion} disabled={busy || !baseSrc}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FilePlus2 className="h-4 w-4 mr-2" />}
            Simpan Versi Baru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LandPhotoEditor;
