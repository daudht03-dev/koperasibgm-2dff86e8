import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { DocumentPhoto, documentMetadata } from "@/lib/document-photo";
import { buildPhotoPath, resolvePhotoFileUrl } from "@/lib/photo-path";
import { canvasToBlob, renderPhotoOverlay } from "@/lib/photo-overlay";

type Farmer = { id: string; nama: string; kode_petani: string };
const localTime = (value: string) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function DokumenPhotoEditor({ photo, onClose, onSaved }: {
  photo: DocumentPhoto; onClose: () => void; onSaved: () => void;
}) {
  const { profile } = useCompanyProfile();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [farmerId, setFarmerId] = useState(photo.petani_id || "");
  const [note, setNote] = useState(photo.catatan || (photo.tipe === "ktp" ? "Foto KTP" : "Pelatihan Petani"));
  const [takenAt, setTakenAt] = useState(localTime(photo.taken_at));
  const [showTime, setShowTime] = useState(photo.tampilkan_waktu !== false);
  const [source, setSource] = useState(photo.url || "");
  const [replacement, setReplacement] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const farmer = farmers.find((row) => row.id === farmerId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows: Farmer[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("petani").select("id,nama,kode_petani").order("id").range(offset, offset + 499);
        if (cancelled) return;
        if (error) { toast({ title: "Daftar petani tidak dapat dimuat", variant: "destructive" }); return; }
        rows.push(...(data || []));
        if ((data || []).length < 500) break;
      }
      rows.sort((a, b) => a.kode_petani.localeCompare(b.kode_petani, "id", { numeric: true }));
      setFarmers(rows);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setPreviewError("");
    void (async () => {
      try {
        const canvas = document.createElement("canvas");
        const date = new Date(takenAt);
        if (!Number.isFinite(date.getTime())) throw new Error("Waktu pengambilan belum valid.");
        if (!source) throw new Error("Foto belum tersedia. Pilih foto pengganti.");
        await renderPhotoOverlay(canvas, {
          photoSrc: source, layout: "strip", restamp: !replacement,
          logoSrc: profile?.logo_url,
          data: { heading: "", address: "", lat: 0, lng: 0, note,
            subject: `${farmer?.nama || photo.nama_petani || ""} (${farmer?.kode_petani || photo.kode || ""})`,
            timestamp: showTime ? date.toLocaleString("id-ID") : "" },
        });
        if (cancelled || !canvasRef.current) return;
        canvasRef.current.width = canvas.width;
        canvasRef.current.height = canvas.height;
        canvasRef.current.getContext("2d")?.drawImage(canvas, 0, 0);
        setReady(true);
      } catch (error) {
        if (!cancelled) setPreviewError(error instanceof Error ? error.message : "Foto tidak dapat dimuat.");
      }
    })();
    return () => { cancelled = true; };
  }, [source, replacement, farmer, note, takenAt, showTime, photo, profile?.logo_url]);

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Pilih file gambar", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => { setSource(String(reader.result)); setReplacement(true); };
    reader.onerror = () => toast({ title: "File tidak dapat dibaca", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!farmer || !ready || !canvasRef.current) return;
    if (!navigator.onLine) { toast({ title: "Edit dokumen memerlukan koneksi internet", variant: "destructive" }); return; }
    setBusy(true);
    let uploadedPath: string | undefined;
    let committed = false;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Silakan masuk kembali.");
      const path = buildPhotoPath(photo.tipe, auth.user.id, farmer.kode_petani);
      const blob = await canvasToBlob(canvasRef.current);
      const { error: uploadError } = await supabase.storage.from("foto-lahan").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = path;
      const fileUrl = await resolvePhotoFileUrl(photo.tipe, path, async () => {
        const { data, error } = await supabase.storage.from("foto-lahan").createSignedUrl(path, 3600);
        if (error) throw error;
        return data?.signedUrl;
      });
      const { data, error } = await supabase.from("foto_lahan").update({
        ...documentMetadata(farmer, note, new Date(takenAt).toISOString(), showTime),
        file_path: path, file_url: fileUrl,
      }).eq("id", photo.id).eq("file_path", photo.file_path).in("tipe", ["ktp", "pelatihan"]).select("id").single();
      if (error || !data) throw error || new Error("Dokumen berubah atau akses ditolak. Muat ulang galeri.");
      committed = true;
      toast({ title: "Dokumen berhasil diperbarui" });
      onSaved();
    } catch (error) {
      if (uploadedPath && !committed) await supabase.storage.from("foto-lahan").remove([uploadedPath]);
      toast({ title: "Gagal memperbarui dokumen", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto" onInteractOutside={(e) => { if (busy) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>Edit {photo.tipe === "ktp" ? "Foto KTP Petani" : "Foto Pelatihan Petani"}</DialogTitle></DialogHeader>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <canvas ref={canvasRef} className="h-auto w-full rounded-md border bg-muted" aria-label="Pratinjau dokumen yang diedit" />
          {previewError && <p role="alert" className="text-sm text-destructive">{previewError}</p>}
          {!ready && !previewError && <Loader2 className="h-5 w-5 animate-spin" />}
          <Input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="File dokumen pengganti" onChange={(e) => chooseFile(e.target.files?.[0])} disabled={busy} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Ganti Foto</Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Petani</Label><SearchableSelect options={farmers.map((f) => ({ value: f.id, label: `${f.kode_petani} · ${f.nama}` }))} value={farmerId} onChange={setFarmerId} placeholder="Pilih petani" disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="document-note">Catatan Overlay</Label><Input id="document-note" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="document-time">Waktu Pengambilan</Label><Input id="document-time" type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} disabled={busy} /></div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="document-show-time">Tampilkan waktu</Label><Switch id="document-show-time" checked={showTime} onCheckedChange={setShowTime} disabled={busy} /></div>
        </div>
      </div>
      <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={save} disabled={busy || !ready || !farmer}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan Perubahan</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}