/** Compact "Foto" table cell: thumbnail stack + count, opens a viewer with download links. */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ImageOff } from "lucide-react";
import { EntityPhoto, photoFileName } from "@/hooks/use-entity-photos";

interface Props {
  photos?: EntityPhoto[];
  title?: string;
}

export const PhotoCell = ({ photos = [], title = "Foto" }: Props) => {
  const [open, setOpen] = useState(false);

  const download = async (p: EntityPhoto) => {
    if (!p.url) return;
    const blob = await (await fetch(p.url)).blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = photoFileName(p);
    a.click();
    URL.revokeObjectURL(objectUrl);
  };

  if (!photos.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ImageOff className="h-3.5 w-3.5" /> —
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md hover:opacity-80 transition-opacity"
        title={`Lihat ${photos.length} foto`}
      >
        <span className="flex -space-x-2">
          {photos.slice(0, 3).map((p) => (
            <img
              key={p.id}
              src={p.url}
              alt={p.judul || p.kode || "Foto lahan"}
              loading="lazy"
              className="h-9 w-9 rounded-md border-2 border-background object-cover bg-muted"
            />
          ))}
        </span>
        <Badge variant="secondary" className="text-[11px]">{photos.length}</Badge>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="border rounded-lg overflow-hidden">
                <img src={p.url} alt={p.judul || p.kode || "Foto"} className="w-full object-cover" loading="lazy" />
                <div className="p-2 space-y-2">
                  <p className="text-xs font-medium truncate">{p.kode || p.judul || "-"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.tipe === "rumah" ? "Alamat rumah" : "Lahan"} ·{" "}
                    {new Date(p.taken_at).toLocaleDateString("id-ID")}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => download(p)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Unduh
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={p.url} target="_blank" rel="noreferrer">Buka</a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoCell;
