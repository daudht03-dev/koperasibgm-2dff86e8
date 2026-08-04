/** Gallery of saved GPS-watermarked land photos with download & delete. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Search, Trash2, Images, FileArchive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import JSZip from "jszip";

interface Photo {
  id: string;
  tipe: string;
  kode: string | null;
  nama_petani: string | null;
  judul: string | null;
  alamat: string | null;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
  file_path: string;
  taken_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const LandPhotoGallery = ({ open, onOpenChange }: Props) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [zipping, setZipping] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("foto_lahan")
      .select("id,tipe,kode,nama_petani,judul,alamat,koordinat_lat,koordinat_lng,file_path,taken_at")
      .order("taken_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Gagal memuat foto", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data || []) as Photo[];
    setPhotos(rows);
    if (rows.length) {
      const { data: signed } = await supabase.storage
        .from("foto-lahan")
        .createSignedUrls(rows.map((r) => r.file_path), 60 * 60);
      const map: Record<string, string> = {};
      (signed || []).forEach((s, i) => {
        if (s.signedUrl) map[rows[i].id] = s.signedUrl;
      });
      setUrls(map);
    } else {
      setUrls({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchPhotos();
  }, [open, fetchPhotos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter((p) =>
      [p.kode, p.nama_petani, p.judul, p.alamat].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }, [photos, search]);

  const fileNameFor = (p: Photo) =>
    `${(p.kode || "foto").replace(/[^A-Za-z0-9_-]/g, "_")}-${new Date(p.taken_at)
      .toISOString()
      .slice(0, 10)}.jpg`;

  const downloadOne = async (p: Photo) => {
    const url = urls[p.id];
    if (!url) return;
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileNameFor(p);
    a.click();
    URL.revokeObjectURL(objectUrl);
  };

  const downloadAll = async () => {
    if (!filtered.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const p of filtered) {
        const url = urls[p.id];
        if (!url) continue;
        const res = await fetch(url);
        zip.file(fileNameFor(p), await res.blob());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `dokumentasi-lahan-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      toast({ title: "Gagal membuat ZIP", description: e.message, variant: "destructive" });
    } finally {
      setZipping(false);
    }
  };

  const remove = async (p: Photo) => {
    const { error } = await supabase.from("foto_lahan").delete().eq("id", p.id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.storage.from("foto-lahan").remove([p.file_path]);
    toast({ title: "Foto dihapus" });
    fetchPhotos();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" /> Galeri Dokumentasi Lahan
          </DialogTitle>
          <DialogDescription>Foto ber-watermark yang tersimpan di database.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Cari kode petani / lahan / alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={downloadAll} disabled={zipping || !filtered.length}>
            {zipping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileArchive className="h-4 w-4 mr-2" />}
            Unduh Semua (ZIP)
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Belum ada foto tersimpan.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-md border overflow-hidden bg-card">
                {urls[p.id] ? (
                  <img src={urls[p.id]} alt={`Dokumentasi ${p.kode || "lahan"}`} loading="lazy" className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-muted" />
                )}
                <div className="p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">{p.kode || "-"}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{p.nama_petani}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.alamat || "-"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(p.taken_at).toLocaleString("id-ID")}
                  </p>
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => downloadOne(p)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Unduh
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LandPhotoGallery;
