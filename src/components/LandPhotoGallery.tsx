/** Gallery of saved GPS-watermarked land photos with filters, editor, download & delete. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Search, Trash2, Images, FileArchive, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useVillagePrefixes } from "@/hooks/use-village-prefixes";
import JSZip from "jszip";
import LandPhotoEditor, { EditablePhoto } from "@/components/LandPhotoEditor";

interface Photo extends EditablePhoto {
  catatan: string | null;
  petani_id: string | null;
  lahan_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const extractPrefix = (code?: string | null) => (code || "").match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || "";

/** Haversine distance in km */
const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export const LandPhotoGallery = ({ open, onOpenChange }: Props) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [tipeFilter, setTipeFilter] = useState<string>("all");
  const [villageFilter, setVillageFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [areaLat, setAreaLat] = useState("");
  const [areaLng, setAreaLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("2");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Photo | null>(null);

  const { map: villagePrefixMap } = useVillagePrefixes();

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("foto_lahan")
      .select(
        "id,tipe,kode,nama_petani,judul,alamat,catatan,petani_id,lahan_id,koordinat_lat,koordinat_lng,file_path,taken_at",
      )
      .order("taken_at", { ascending: false })
      .limit(1000);
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

  const villages = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => {
      const pref = extractPrefix(p.kode);
      if (pref) set.add(pref);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [photos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    const cLat = parseFloat(areaLat);
    const cLng = parseFloat(areaLng);
    const rad = parseFloat(radiusKm);
    const useArea = Number.isFinite(cLat) && Number.isFinite(cLng) && Number.isFinite(rad) && rad > 0;

    return photos.filter((p) => {
      if (q && ![p.kode, p.nama_petani, p.judul, p.alamat].some((v) => (v || "").toLowerCase().includes(q)))
        return false;
      if (tipeFilter !== "all" && p.tipe !== tipeFilter) return false;
      if (villageFilter !== "all" && extractPrefix(p.kode) !== villageFilter) return false;
      const t = new Date(p.taken_at).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      if (useArea) {
        if (p.koordinat_lat == null || p.koordinat_lng == null) return false;
        if (distanceKm(cLat, cLng, p.koordinat_lat, p.koordinat_lng) > rad) return false;
      }
      return true;
    });
  }, [photos, search, tipeFilter, villageFilter, dateFrom, dateTo, areaLat, areaLng, radiusKm]);

  const resetFilters = () => {
    setSearch("");
    setTipeFilter("all");
    setVillageFilter("all");
    setDateFrom("");
    setDateTo("");
    setAreaLat("");
    setAreaLng("");
    setRadiusKm("2");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolokasi tidak didukung", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAreaLat(pos.coords.latitude.toFixed(6));
        setAreaLng(pos.coords.longitude.toFixed(6));
      },
      (err) => toast({ title: "Gagal mendapatkan lokasi", description: err.message, variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Images className="h-5 w-5" /> Galeri Dokumentasi Lahan
            </DialogTitle>
            <DialogDescription>Foto ber-watermark yang tersimpan di database.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Cari kode petani / kode lahan / nama / alamat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={tipeFilter} onValueChange={setTipeFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tipe</SelectItem>
                  <SelectItem value="lahan">Lahan</SelectItem>
                  <SelectItem value="rumah">Rumah petani</SelectItem>
                </SelectContent>
              </Select>
              <Select value={villageFilter} onValueChange={setVillageFilter}>
                <SelectTrigger className="w-[190px]"><SelectValue placeholder="Desa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua desa</SelectItem>
                  {villages.map((v) => (
                    <SelectItem key={v} value={v}>
                      {villagePrefixMap?.[v] ? `${villagePrefixMap[v]} (${v})` : v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Dari tanggal</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sampai tanggal</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Lat area</Label>
                <Input placeholder="-7.4000" value={areaLat} onChange={(e) => setAreaLat(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Long area</Label>
                <Input placeholder="109.2000" value={areaLng} onChange={(e) => setAreaLng(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Radius (km)</Label>
                <Input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} className="font-mono" />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="w-full" onClick={useMyLocation}>
                  Lokasi saya
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {filtered.length} dari {photos.length} foto
              </span>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Reset filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={downloadAll}
                disabled={zipping || !filtered.length}
              >
                {zipping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileArchive className="h-4 w-4 mr-2" />}
                Unduh Semua (ZIP)
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Tidak ada foto yang cocok.</p>
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
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditing(p);
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
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

      <LandPhotoEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        photo={editing}
        imageUrl={editing ? urls[editing.id] : undefined}
        onSaved={fetchPhotos}
      />
    </>
  );
};

export default LandPhotoGallery;
