/**
 * GPS Map Camera style photo capture with editable automatic watermark.
 * Photo + metadata overlay is composited on canvas, then stored in
 * the `foto-lahan` bucket and the `foto_lahan` table.
 *
 * Field staff can also create new farmers / lands inline and push the captured
 * coordinates straight back into the master data.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Crosshair,
  UserPlus,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { renderPhotoOverlay, canvasToBlob, OverlayData } from "@/lib/photo-overlay";
import { evaluateCoordinate } from "@/lib/coordinate-accuracy";
import CoordinateAccuracyIndicator from "@/components/CoordinateAccuracyIndicator";
import MiniMapPicker from "@/components/MiniMapPicker";
import { cacheTile, enqueue, readTile, tileKey } from "@/lib/offline-queue";


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

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const prefixOf = (code: string) => (code.match(/^[A-Za-z]+/)?.[0] || "").toUpperCase();

export const GPSMapCamera = ({ open, onOpenChange, onSaved, defaultLandId, defaultFarmerId }: Props) => {
  const { profile } = useCompanyProfile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [lands, setLands] = useState<LandOption[]>([]);
  const [villages, setVillages] = useState<{ code: string; name: string }[]>([]);
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
  const [showTime, setShowTime] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [syncMaster, setSyncMaster] = useState(true);

  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline creation dialogs
  const [newFarmerOpen, setNewFarmerOpen] = useState(false);
  const [newLandOpen, setNewLandOpen] = useState(false);
  const [nfKode, setNfKode] = useState("");
  const [nfNama, setNfNama] = useState("");
  const [nfTelepon, setNfTelepon] = useState("");
  const [nfAlamat, setNfAlamat] = useState("");
  const [nlNama, setNlNama] = useState("");
  const [nlLuas, setNlLuas] = useState("");
  const [nlLokasi, setNlLokasi] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedFarmer = useMemo(() => farmers.find((f) => f.id === farmerId) || null, [farmers, farmerId]);
  const selectedLand = useMemo(() => lands.find((l) => l.id === landId) || null, [lands, landId]);
  const farmerLands = useMemo(
    () =>
      lands
        .filter((l) => !farmerId || l.petani_id === farmerId)
        .sort((a, b) => naturalSort(a.nama_lahan, b.nama_lahan)),
    [lands, farmerId],
  );

  const subject = useMemo(() => {
    if (!selectedFarmer) return "";
    const code = tipe === "lahan" && selectedLand ? selectedLand.nama_lahan : selectedFarmer.kode_petani;
    return `${selectedFarmer.nama} (${code})`;
  }, [selectedFarmer, selectedLand, tipe]);

  const activeCode =
    tipe === "lahan" && selectedLand ? selectedLand.nama_lahan : selectedFarmer?.kode_petani || "";

  const expectedVillage = useMemo(() => {
    const p = prefixOf(activeCode);
    return villages.find((v) => v.code.toUpperCase() === p)?.name || null;
  }, [activeCode, villages]);

  const loadReference = useCallback(async () => {
    const [{ data: p }, { data: l }, { data: v }] = await Promise.all([
      supabase.from("petani").select("id,kode_petani,nama,alamat_rumah,koordinat_lat,koordinat_lng").limit(5000),
      supabase.from("lahan").select("id,petani_id,nama_lahan,lokasi,koordinat").limit(10000),
      supabase.from("village_prefixes").select("code,name").limit(500),
    ]);
    setFarmers(((p || []) as FarmerOption[]).sort((a, b) => naturalSort(a.kode_petani, b.kode_petani)));
    setLands((l || []) as LandOption[]);
    setVillages((v || []) as { code: string; name: string }[]);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadReference();
  }, [open, loadReference]);

  // Reset when closing
  useEffect(() => {
    if (open) {
      setTakenAt(new Date());
      return;
    }
    setPhotoSrc(null);
    setMapThumb(null);
    setSaving(false);
    setGpsAccuracy(null);
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
    const key = tileKey(la, ln, 15);
    const cached = await readTile(key);
    if (cached) setMapThumb(cached);
    if (!navigator.onLine) return;
    const { data, error } = await supabase.functions.invoke("static-map", {
      body: { lat: la, lng: ln, zoom: 15, size: "300x300" },
    });
    const dataUrl = (data as any)?.dataUrl as string | undefined;
    if (error || !dataUrl) {
      if (!cached) setMapThumb(null);
      if (error) console.error("static-map failed", error);
      return;
    }
    setMapThumb(dataUrl);
    cacheTile(key, dataUrl);
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
        setGpsAccuracy(pos.coords.accuracy ?? null);
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

  const accuracy = useMemo(
    () =>
      evaluateCoordinate({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        gpsAccuracyMeters: gpsAccuracy,
        geocodedAddress: address,
        expectedVillage,
        referencePoint:
          tipe === "lahan" && selectedFarmer?.koordinat_lat != null && selectedFarmer?.koordinat_lng != null
            ? {
                lat: Number(selectedFarmer.koordinat_lat),
                lng: Number(selectedFarmer.koordinat_lng),
                label: `rumah ${selectedFarmer.kode_petani}`,
              }
            : null,
      }),
    [lat, lng, gpsAccuracy, address, expectedVillage, tipe, selectedFarmer],
  );

  const overlayData = useMemo<OverlayData>(
    () => ({
      heading: heading || "-",
      address: address || "-",
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      note,
      subject,
      timestamp: showTime ? formatStamp(takenAt) : "",
    }),
    [heading, address, lat, lng, note, subject, takenAt, showTime],
  );

  // Live canvas preview (debounced so typing never blocks the UI thread)
  useEffect(() => {
    if (!photoSrc || !canvasRef.current) return;
    let cancelled = false;
    const timer = setTimeout(() => {
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
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [photoSrc, overlayData, mapThumb, profile?.logo_url]);

  /**
   * Camera photos on Android are often 12MP+. Keeping the raw data URL in state
   * crashes the WebView, so the image is downscaled to a safe size first.
   */
  const downscaleImage = (file: File, maxSide = 1600): Promise<string> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          if (!ctx) throw new Error("Canvas tidak didukung perangkat ini");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.9));
        } catch (e) {
          reject(e);
        } finally {
          URL.revokeObjectURL(url);
          img.src = "";
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Gagal membaca foto"));
      };
      img.src = url;
    });

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast({ title: "Ukuran foto maksimal 30MB", variant: "destructive" });
      return;
    }
    try {
      const dataUrl = await downscaleImage(file);
      setPhotoSrc(dataUrl);
      setTakenAt(new Date());
      if (!lat || !lng) locateMe();
    } catch (e: any) {
      console.error("photo load failed", e);
      toast({ title: "Gagal memuat foto", description: e?.message, variant: "destructive" });
    }
  };


  // ---- inline master data creation -------------------------------------
  const createFarmer = async () => {
    if (!nfKode.trim() || !nfNama.trim()) {
      toast({ title: "Kode dan nama petani wajib diisi", variant: "destructive" });
      return;
    }
    setCreating(true);
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    const { data, error } = await supabase
      .from("petani")
      .insert({
        kode_petani: nfKode.trim().toUpperCase(),
        nama: nfNama.trim(),
        no_telepon: nfTelepon.trim() || null,
        alamat_rumah: (nfAlamat || address).trim() || null,
        alamat: (nfAlamat || address).trim() || null,
        koordinat_lat: Number.isFinite(la) ? la : null,
        koordinat_lng: Number.isFinite(ln) ? ln : null,
        status: "aktif",
        tanggal_bergabung: new Date().toISOString().slice(0, 10),
      })
      .select("id,kode_petani,nama,alamat_rumah,koordinat_lat,koordinat_lng")
      .single();
    setCreating(false);
    if (error) {
      toast({ title: "Gagal menambah petani", description: error.message, variant: "destructive" });
      return;
    }
    setFarmers((prev) => [...prev, data as FarmerOption].sort((a, b) => naturalSort(a.kode_petani, b.kode_petani)));
    setFarmerId(data.id);
    setLandId("");
    setNewFarmerOpen(false);
    setNfKode("");
    setNfNama("");
    setNfTelepon("");
    setNfAlamat("");
    toast({ title: "Petani baru tersimpan", description: `${data.kode_petani} — ${data.nama}` });
  };

  const createLand = async () => {
    if (!farmerId) {
      toast({ title: "Pilih petani dulu", variant: "destructive" });
      return;
    }
    if (!nlNama.trim()) {
      toast({ title: "Kode/nama lahan wajib diisi", variant: "destructive" });
      return;
    }
    setCreating(true);
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    const { data, error } = await supabase
      .from("lahan")
      .insert({
        petani_id: farmerId,
        nama_lahan: nlNama.trim().toUpperCase(),
        luas: nlLuas ? parseFloat(nlLuas) : null,
        lokasi: (nlLokasi || address).trim() || null,
        koordinat: Number.isFinite(la) && Number.isFinite(ln) ? `${la.toFixed(6)}, ${ln.toFixed(6)}` : null,
        status: "aktif",
      })
      .select("id,petani_id,nama_lahan,lokasi,koordinat")
      .single();
    setCreating(false);
    if (error) {
      toast({ title: "Gagal menambah lahan", description: error.message, variant: "destructive" });
      return;
    }
    setLands((prev) => [...prev, data as LandOption]);
    setLandId(data.id);
    setNewLandOpen(false);
    setNlNama("");
    setNlLuas("");
    setNlLokasi("");
    toast({ title: "Lahan baru tersimpan", description: data.nama_lahan });
  };

  const syncMasterCoordinates = async (la: number, ln: number) => {
    try {
      if (tipe === "lahan" && landId) {
        await supabase
          .from("lahan")
          .update({ koordinat: `${la.toFixed(6)}, ${ln.toFixed(6)}`, lokasi: address || null })
          .eq("id", landId);
      } else if (farmerId) {
        await supabase
          .from("petani")
          .update({ koordinat_lat: la, koordinat_lng: ln, alamat_rumah: address || null })
          .eq("id", farmerId);
      }
    } catch (e) {
      console.error("sync master coordinates failed", e);
    }
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
    const code = tipe === "lahan" && selectedLand ? selectedLand.nama_lahan : selectedFarmer?.kode_petani || "foto";
    const photoRow = {
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
      taken_at: takenAt.toISOString(),
      tampilkan_waktu: showTime,
      akurasi_meter: gpsAccuracy,
      akurasi_skor: accuracy.score,
      akurasi_catatan: accuracy.summary,
    };
    try {
      const blob = await canvasToBlob(canvasRef.current);

      // Offline: queue the whole record and replay it once the signal returns.
      if (!navigator.onLine) {
        await enqueue({
          kind: "photo",
          payload: {
            blob,
            row: photoRow,
            code,
            syncMaster: syncMaster
              ? tipe === "lahan" && landId
                ? { type: "lahan", id: landId, lat: laNum, lng: lnNum, alamat: address }
                : { type: "petani", id: farmerId, lat: laNum, lng: lnNum, alamat: address }
              : null,
          },
        } as any);
        toast({
          title: "Tersimpan offline",
          description: `Dokumentasi ${code} akan otomatis diunggah saat sinyal kembali.`,
        });
        onSaved?.();
        onOpenChange(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const safeCode = code.replace(/[^A-Za-z0-9_-]/g, "");
      const path = `${uid}/${safeCode}-${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("foto-lahan")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;


      const { data: signed } = await supabase.storage.from("foto-lahan").createSignedUrl(path, 60 * 60 * 24 * 365);

      const { error: insErr } = await supabase.from("foto_lahan").insert({
        ...photoRow,
        file_path: path,
        file_url: signed?.signedUrl || path,
        created_by: uid ?? null,
      });

      if (insErr) throw insErr;

      if (syncMaster) await syncMasterCoordinates(laNum, lnNum);

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
    <>
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
                  {locating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Crosshair className="h-4 w-4 mr-2" />
                  )}
                  Lokasi Saya
                </Button>
                {photoSrc && (
                  <Button size="sm" variant="ghost" onClick={handleDownloadPreview}>
                    Unduh Pratinjau
                  </Button>
                )}
              </div>

              <MiniMapPicker
                lat={Number.isFinite(parseFloat(lat)) ? parseFloat(lat) : null}
                lng={Number.isFinite(parseFloat(lng)) ? parseFloat(lng) : null}
                onChange={(la, ln) => {
                  setGpsAccuracy(null);
                  applyCoordinates(la, ln);
                }}
                height={190}
              />

              <CoordinateAccuracyIndicator result={accuracy} />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f); }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f); }}
              />
            </div>

            {/* Editor */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipe Lokasi</Label>
                  <Select value={tipe} onValueChange={(v) => setTipe(v as "lahan" | "rumah")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lahan">Lahan Petani</SelectItem>
                      <SelectItem value="rumah">Alamat Petani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Petani</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => setNewFarmerOpen(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Baru
                    </Button>
                  </div>
                  <SearchableSelect
                    options={farmers.map((f) => ({
                      value: f.id,
                      label: `${f.kode_petani} — ${f.nama}`,
                      hint: f.alamat_rumah || undefined,
                      keywords: f.kode_petani,
                    }))}
                    value={farmerId}
                    onChange={(v) => {
                      setFarmerId(v);
                      setLandId("");
                    }}
                    placeholder="Pilih petani..."
                    searchPlaceholder="Cari kode / nama petani..."
                  />
                </div>
              </div>

              {tipe === "lahan" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Lahan</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => setNewLandOpen(true)}
                      disabled={!farmerId}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Lahan Baru
                    </Button>
                  </div>
                  <SearchableSelect
                    options={farmerLands.map((l) => ({
                      value: l.id,
                      label: l.nama_lahan,
                      hint: l.lokasi || undefined,
                    }))}
                    value={landId}
                    onChange={setLandId}
                    disabled={!farmerId}
                    placeholder={farmerId ? "Pilih lahan..." : "Pilih petani dulu"}
                    searchPlaceholder="Cari kode lahan..."
                  />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Waktu Pengambilan</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(takenAt)}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) setTakenAt(d);
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center justify-between w-full rounded-md border px-3 h-10">
                    <Label className="text-sm font-normal">Tampilkan waktu di foto</Label>
                    <Switch checked={showTime} onCheckedChange={setShowTime} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Catatan Overlay</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 h-10">
                <Label className="text-sm font-normal">
                  Perbarui koordinat {tipe === "lahan" ? "lahan" : "rumah petani"} dari titik ini
                </Label>
                <Switch checked={syncMaster} onCheckedChange={setSyncMaster} />
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Teks watermark:{" "}
                <span className="font-medium">{subject || "(pilih petani)"}</span>
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

      {/* New farmer */}
      <Dialog open={newFarmerOpen} onOpenChange={setNewFarmerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Petani Baru</DialogTitle>
            <DialogDescription>Data langsung tersimpan dan tersinkron ke peta serta daftar petani.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode Petani</Label>
                <Input value={nfKode} onChange={(e) => setNfKode(e.target.value.toUpperCase())} placeholder="MT24" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>No. Telepon</Label>
                <Input value={nfTelepon} onChange={(e) => setNfTelepon(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Petani</Label>
              <Input value={nfNama} onChange={(e) => setNfNama(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alamat Rumah</Label>
              <Textarea rows={2} value={nfAlamat} onChange={(e) => setNfAlamat(e.target.value)} placeholder={address || "Alamat rumah petani"} />
            </div>
            <p className="text-xs text-muted-foreground">
              Koordinat saat ini ({lat || "-"}, {lng || "-"}) akan disimpan sebagai koordinat rumah.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFarmerOpen(false)} disabled={creating}>
              Batal
            </Button>
            <Button onClick={createFarmer} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan Petani
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New land */}
      <Dialog open={newLandOpen} onOpenChange={setNewLandOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Lahan Baru</DialogTitle>
            <DialogDescription>
              Untuk petani {selectedFarmer ? `${selectedFarmer.kode_petani} — ${selectedFarmer.nama}` : "-"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode / Nama Lahan</Label>
                <Input
                  value={nlNama}
                  onChange={(e) => setNlNama(e.target.value.toUpperCase())}
                  placeholder={selectedFarmer ? `${selectedFarmer.kode_petani}A` : "MT23A"}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Luas (ha)</Label>
                <Input value={nlLuas} onChange={(e) => setNlLuas(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lokasi / Alamat Lahan</Label>
              <Textarea rows={2} value={nlLokasi} onChange={(e) => setNlLokasi(e.target.value)} placeholder={address || "Alamat lahan"} />
            </div>
            <p className="text-xs text-muted-foreground">
              Koordinat saat ini ({lat || "-"}, {lng || "-"}) akan disimpan sebagai titik lahan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLandOpen(false)} disabled={creating}>
              Batal
            </Button>
            <Button onClick={createLand} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan Lahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GPSMapCamera;
