/**
 * GPS Map Camera style photo capture with editable automatic watermark.
 * Photo + metadata overlay is composited on canvas, then stored in
 * the `foto-lahan` bucket and the `foto_lahan` table.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Image as ImageIcon, Loader2, MapPin, RefreshCw, Save, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { renderPhotoOverlay, canvasToBlob, OverlayData } from "@/lib/photo-overlay";

interface FarmerOption {
  id: string;
  kode_petani: string;
  nama: string;
  alamat_rumah: string | null;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
}
interface LandOption {
  id: string;
  petani_id: string | null;
  nama_lahan: string;
  lokasi: string | null;
  koordinat: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
  /** Optional preselection */
  defaultLandId?: string;
  defaultFarmerId?: string;
}

const parseCoordinate = (koordinat: string | null): { lat: number; lng: number } | null => {
  if (!koordinat) return null;
  const m = koordinat.replace(/\s+/g, " ").trim().match(/^(-?\d+\.?\d*)\s*[, ]\s*(-?\d+\.?\d*)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  return null;
};

const naturalSort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const formatStamp = (d: Date) =>
  d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

export const GPSMapCamera = ({ open, onOpenChange, onSaved, defaultLandId, defaultFarmerId }: Props) => {
  const { profile } = useCompanyProfile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [lands, setLands] = useState<LandOption[]>([]);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [mapThumb, setMapThumb] = useState<string | null>(null);

  const [tipe, setTipe] = useState<"lahan" | "rumah">("lahan");
  const [farmerId, setFarmerId] = useState<string>(defaultFarmerId || "");
  const [landId, setLandId] = useState<string>(defaultLandId || "");
  const [heading, setHeading] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [note, setNote] = useState("Lahan Petani");
  const [takenAt, setTakenAt] = useState<Date>(new Date());

  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedFarmer = useMemo(() => farmers.find((f) => f.id === farmerId) || null, [farmers, farmerId]);
  const selectedLand = useMemo(() => lands.find((l) => l.id === landId) || null, [lands, landId]);
  const farmerLands = useMemo(
    () => lands.filter((l) => !farmerId || l.petani_id === farmerId).sort((a, b) => naturalSort(a.nama_lahan, b.nama_lahan)),
    [lands, farmerId],
  );

  const subject = useMemo(() => {
    if (!selectedFarmer) return "";
    const code = tipe === "lahan" && selectedLand ? selectedLand.nama_lahan : selectedFarmer.kode_petani;
    return `${selectedFarmer.nama} (${code})`;
  }, [selectedFarmer, selectedLand, tipe]);

  // Load reference data
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from("petani").select("id,kode_petani,nama,alamat_rumah,koordinat_lat,koordinat_lng").limit(5000),
        supabase.from("lahan").select("id,petani_id,nama_lahan,lokasi,koordinat").limit(10000),
      ]);
      setFarmers(((p || []) as FarmerOption[]).sort((a, b) => naturalSort(a.kode_petani, b.kode_petani)));
      setLands((l || []) as LandOption[]);
    })();
  }, [open]);

  // Reset when closing
  useEffect(() => {
    if (open) {
      setTakenAt(new Date());
      return;
    }
    setPhotoSrc(null);
    setMapThumb(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    setNote(tipe === "lahan" ? "Lahan Petani" : "Alamat Petani");
  }, [tipe]);

  const reverseGeocode = useCallback(async (la: number, ln: number) => {
    setGeocoding(true);
    const { data, error } = await supabase.functions.invoke("reverse-geocode", { body: { lat: la, lng: ln } });
    setGeocoding(false);
    if (error) return;
    const d = data as any;
    if (d?.address) setAddress(d.address);
    const comps: any[] = d?.results?.[0]?.address_components ?? [];
    const pick = (type: string) => comps.find((c) => c.types?.includes(type))?.long_name;
    const area =
      pick("administrative_area_level_3") || pick("administrative_area_level_2") || pick("locality") || "";
    const province = pick("administrative_area_level_1") || "";
    const h = [area, province].filter(Boolean).join(", ");
    if (h) setHeading(h);
  }, []);

  const fetchMapThumb = useCallback(async (la: number, ln: number) => {
    const { data, error } = await supabase.functions.invoke("static-map", {
      body: { lat: la, lng: ln, zoom: 15, size: "300x300" },
    });
    if (error) {
      setMapThumb(null);
      return;
    }
    setMapThumb((data as any)?.dataUrl ?? null);
  }, []);

  const applyCoordinates = useCallback(
    async (la: number, ln: number, geocode = true) => {
      setLat(la.toFixed(6));
      setLng(ln.toFixed(6));
      fetchMapThumb(la, ln);
      if (geocode) await reverseGeocode(la, ln);
    },
    [fetchMapThumb, reverseGeocode],
  );

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Geolokasi tidak didukung perangkat ini", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        applyCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        toast({ title: "Gagal mendapatkan lokasi", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [applyCoordinates]);

  // Prefill coordinates from selected land/farmer
  useEffect(() => {
    if (!open) return;
    if (tipe === "lahan" && selectedLand) {
      const c = parseCoordinate(selectedLand.koordinat);
      if (c) applyCoordinates(c.lat, c.lng, !address);
      if (selectedLand.lokasi && !address) setAddress(selectedLand.lokasi);
    } else if (tipe === "rumah" && selectedFarmer?.koordinat_lat != null && selectedFarmer?.koordinat_lng != null) {
      applyCoordinates(selectedFarmer.koordinat_lat, selectedFarmer.koordinat_lng, !address);
      if (selectedFarmer.alamat_rumah && !address) setAddress(selectedFarmer.alamat_rumah);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLand?.id, selectedFarmer?.id, tipe, open]);

  const overlayData = useMemo<OverlayData>(
    () => ({
      heading: heading || "-",
      address: address || "-",
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      note,
      subject,
      timestamp: formatStamp(takenAt),
    }),
    [heading, address, lat, lng, note, subject, takenAt],
  );

  // Live canvas preview
  useEffect(() => {
    if (!photoSrc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        if (cancelled || !canvasRef.current) return;
        await renderPhotoOverlay(canvasRef.current, {
          photoSrc,
          data: overlayData,
          mapThumbSrc: mapThumb,
          logoSrc: profile?.logo_url || null,
        });
      } catch (e: any) {
        console.error("overlay render failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoSrc, overlayData, mapThumb, profile?.logo_url]);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Ukuran foto maksimal 15MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoSrc(reader.result as string);
      setTakenAt(new Date());
      if (!lat || !lng) locateMe();
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!photoSrc || !canvasRef.current) {
      toast({ title: "Ambil atau pilih foto dulu", variant: "destructive" });
      return;
    }
    if (!farmerId) {
      toast({ title: "Pilih petani terlebih dahulu", variant: "destructive" });
      return;
    }
    const laNum = parseFloat(lat);
    const lnNum = parseFloat(lng);
    if (!Number.isFinite(laNum) || !Number.isFinite(lnNum)) {
      toast({ title: "Koordinat belum valid", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const code = tipe === "lahan" && selectedLand ? selectedLand.nama_lahan : selectedFarmer?.kode_petani || "foto";
      const safeCode = code.replace(/[^A-Za-z0-9_-]/g, "");
      const path = `${uid}/${safeCode}-${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("foto-lahan")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage.from("foto-lahan").createSignedUrl(path, 60 * 60 * 24 * 365);

      const { error: insErr } = await supabase.from("foto_lahan").insert({
        petani_id: farmerId,
        lahan_id: tipe === "lahan" ? landId || null : null,
        tipe,
        nama_petani: selectedFarmer?.nama || null,
        kode: code,
        judul: heading || null,
        alamat: address || null,
        koordinat_lat: laNum,
        koordinat_lng: lnNum,
        catatan: note || null,
        file_path: path,
        file_url: signed?.signedUrl || path,
        taken_at: takenAt.toISOString(),
        created_by: uid ?? null,
      });
      if (insErr) throw insErr;

      toast({ title: "Foto tersimpan", description: `Dokumentasi ${code} berhasil disimpan.` });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error("save photo failed", e);
      toast({ title: "Gagal menyimpan foto", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPreview = async () => {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(subject || "foto").replace(/[^A-Za-z0-9_-]/g, "_")}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Kamera Peta — Dokumentasi Lahan
          </DialogTitle>
          <DialogDescription>
            Foto otomatis diberi watermark berisi nama petani, kode, alamat, koordinat, dan peta mini.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Preview */}
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 min-h-[260px] flex items-center justify-center overflow-hidden">
              {photoSrc ? (
                <canvas ref={canvasRef} className="w-full h-auto" />
              ) : (
                <div className="text-center text-sm text-muted-foreground p-8 space-y-3">
                  <ImageIcon className="h-10 w-10 mx-auto opacity-50" />
                  <p>Belum ada foto. Ambil dari kamera atau pilih dari galeri.</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" /> Ambil Foto
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4 mr-2" /> Pilih dari Galeri
              </Button>
              <Button size="sm" variant="outline" onClick={locateMe} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crosshair className="h-4 w-4 mr-2" />}
                Lokasi Saya
              </Button>
              {photoSrc && (
                <Button size="sm" variant="ghost" onClick={handleDownloadPreview}>
                  Unduh Pratinjau
                </Button>
              )}
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {/* Editor */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe Lokasi</Label>
                <Select value={tipe} onValueChange={(v) => setTipe(v as "lahan" | "rumah")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lahan">Lahan Petani</SelectItem>
                    <SelectItem value="rumah">Alamat Petani</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Petani</Label>
                <Select value={farmerId} onValueChange={(v) => { setFarmerId(v); setLandId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih petani..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {farmers.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.kode_petani} — {f.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tipe === "lahan" && (
              <div className="space-y-1.5">
                <Label>Lahan</Label>
                <Select value={landId} onValueChange={setLandId} disabled={!farmerId}>
                  <SelectTrigger><SelectValue placeholder={farmerId ? "Pilih lahan..." : "Pilih petani dulu"} /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {farmerLands.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nama_lahan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Judul / Wilayah</Label>
              <Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Kecamatan, Provinsi" />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                Alamat Lengkap
                {geocoding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </Label>
              <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-7.123456" />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="109.123456" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const la = parseFloat(lat);
                  const ln = parseFloat(lng);
                  if (Number.isFinite(la) && Number.isFinite(ln)) applyCoordinates(la, ln);
                }}
                disabled={geocoding}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Perbarui Alamat & Peta Mini
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan Overlay</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Teks watermark: <span className="font-medium">{subject || "(pilih petani)"}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || !photoSrc}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan Foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GPSMapCamera;
