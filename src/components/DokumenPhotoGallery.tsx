import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { FileImage, Images, Loader2, Search } from "lucide-react";

type DocumentPhotoType = "ktp" | "pelatihan";

interface DocumentPhoto {
  id: string;
  tipe: DocumentPhotoType;
  kode: string | null;
  nama_petani: string | null;
  file_path: string;
  taken_at: string;
  url?: string;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeLabel: Record<DocumentPhotoType, string> = {
  ktp: "Foto KTP Petani",
  pelatihan: "Foto Pelatihan Petani",
};

export const DokumenPhotoGallery = ({ active = true, embedded = false }: { active?: boolean; embedded?: boolean }) => {
  const [photos, setPhotos] = useState<DocumentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"semua" | DocumentPhotoType>("semua");
  const [selected, setSelected] = useState<DocumentPhoto | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("foto_lahan")
      .select("id,tipe,kode,nama_petani,file_path,taken_at")
      .in("tipe", ["ktp", "pelatihan"])
      .order("taken_at", { ascending: false })
      .limit(2000);

    if (error) {
      toast({ title: "Galeri dokumen tidak dapat dimuat", description: error.message, variant: "destructive" });
      setPhotos([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as DocumentPhoto[];
    if (rows.length > 0) {
      const { data: signedUrls, error: urlError } = await supabase.storage
        .from("foto-lahan")
        .createSignedUrls(rows.map((photo) => photo.file_path), 60 * 60);
      if (urlError) {
        toast({ title: "Foto tidak dapat dibuka", description: urlError.message, variant: "destructive" });
      }
      (signedUrls || []).forEach((item, index) => {
        if (item.signedUrl) rows[index].url = item.signedUrl;
      });
    }

    setPhotos(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (active) void loadPhotos();
  }, [active, loadPhotos]);

  const visiblePhotos = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return photos.filter((photo) => {
      if (typeFilter !== "semua" && photo.tipe !== typeFilter) return false;
      if (!query) return true;
      return `${photo.kode || ""} ${photo.nama_petani || ""}`.toLocaleLowerCase("id-ID").includes(query);
    });
  }, [photos, search, typeFilter]);

  return (
    <>
      <Card className={embedded ? "border-0 bg-transparent shadow-none" : undefined}>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Images className="h-5 w-5" /> Galeri Dokumen Petani</CardTitle>
            <CardDescription>{photos.length.toLocaleString("id-ID")} foto KTP dan pelatihan</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Cari petani di galeri dokumen"
                placeholder="Cari petani atau kode…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-8 sm:w-56"
              />
            </div>
            <Tabs value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="semua">Semua</TabsTrigger>
                <TabsTrigger value="ktp">KTP</TabsTrigger>
                <TabsTrigger value="pelatihan">Pelatihan</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat foto dokumen…
            </div>
          ) : visiblePhotos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <FileImage className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {photos.length === 0 ? "Belum ada foto KTP atau pelatihan." : "Tidak ada foto yang cocok."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visiblePhotos.map((photo) => (
                <Button
                  key={photo.id}
                  variant="ghost"
                  className="h-auto min-w-0 flex-col items-stretch whitespace-normal p-0 text-left"
                  onClick={() => setSelected(photo)}
                  aria-label={`Buka ${typeLabel[photo.tipe]} ${photo.kode || ""}`}
                >
                  {photo.url ? (
                    <img src={photo.url} alt={typeLabel[photo.tipe]} className="aspect-[4/3] w-full rounded-md border object-contain bg-muted" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border bg-muted text-muted-foreground">
                      <FileImage className="h-8 w-8" />
                    </div>
                  )}
                  <span className="w-full space-y-1 px-1 py-2">
                    <span className="block truncate text-sm font-medium">{photo.nama_petani || "Petani"} · {photo.kode || "—"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {typeLabel[photo.tipe]} · {new Date(photo.taken_at).toLocaleDateString("id-ID")}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? typeLabel[selected.tipe] : "Foto dokumen"}</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.nama_petani || "Petani"} · ${selected.kode || "—"} · ${new Date(selected.taken_at).toLocaleString("id-ID")}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected?.url ? (
            <img src={selected.url} alt={typeLabel[selected.tipe]} className="mx-auto max-h-[70vh] max-w-full rounded-md object-contain" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-muted text-muted-foreground">
              Foto tidak tersedia
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export const DokumenPhotoGalleryDialog = ({ open, onOpenChange }: DialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
      <DokumenPhotoGallery active={open} embedded />
    </DialogContent>
  </Dialog>
);