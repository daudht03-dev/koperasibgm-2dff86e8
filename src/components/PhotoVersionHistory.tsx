/** Version history & audit trail for a stored land photo. */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, History, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VersionRow {
  id: string;
  versi: number;
  aksi: string;
  snapshot: Record<string, any>;
  perubahan: Record<string, { dari: any; ke: any }> | null;
  changed_by_email: string | null;
  changed_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  nama_petani: "Nama petani",
  kode: "Kode",
  judul: "Judul/Wilayah",
  alamat: "Alamat",
  catatan: "Catatan",
  koordinat_lat: "Latitude",
  koordinat_lng: "Longitude",
  taken_at: "Waktu pengambilan",
  tampilkan_waktu: "Tampilkan waktu",
  akurasi_skor: "Skor akurasi",
  akurasi_meter: "Akurasi GPS (m)",
  akurasi_catatan: "Catatan akurasi",
  file_path: "Berkas foto",
  file_url: "URL foto",
  tipe: "Tipe lokasi",
  petani_id: "Petani",
  lahan_id: "Lahan",
};

const fmt = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

interface Props {
  photoId: string | null;
  /** Restore a previous snapshot into the editor form */
  onRestore?: (snapshot: Record<string, any>) => void;
  refreshKey?: number;
}

export const PhotoVersionHistory = ({ photoId, onRestore, refreshKey = 0 }: Props) => {
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!photoId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("foto_lahan_riwayat")
      .select("id,versi,aksi,snapshot,perubahan,changed_by_email,changed_at")
      .eq("foto_id", photoId)
      .order("versi", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) {
      toast({ title: "Gagal memuat riwayat", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data || []) as unknown as VersionRow[]);
  }, [photoId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!photoId) return null;

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
        <History className="h-4 w-4" />
        <span className="text-sm font-medium">Riwayat Versi & Log Audit</span>
        <Badge variant="secondary" className="ml-auto">{rows.length}</Badge>
      </div>
      <div className="max-h-[280px] overflow-y-auto divide-y">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground text-center">Belum ada perubahan tercatat.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[11px]">v{r.versi}</Badge>
                <Badge
                  variant={r.aksi === "create" ? "default" : r.aksi === "delete" ? "destructive" : "secondary"}
                  className="text-[11px]"
                >
                  {r.aksi === "create" ? "Dibuat" : r.aksi === "delete" ? "Dihapus" : "Diubah"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(r.changed_at).toLocaleString("id-ID")}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  oleh {r.changed_by_email || "sistem"}
                </span>
                {onRestore && r.aksi !== "delete" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 px-2 text-[11px]"
                    onClick={() => onRestore(r.snapshot)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Pakai versi ini
                  </Button>
                )}
              </div>
              {r.perubahan && Object.keys(r.perubahan).length > 0 ? (
                <ul className="space-y-0.5">
                  {Object.entries(r.perubahan).map(([field, v]) => (
                    <li key={field} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{FIELD_LABELS[field] || field}:</span>{" "}
                      <span className="line-through">{fmt(v.dari)}</span> → <span>{fmt(v.ke)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {fmt(r.snapshot?.kode)} · {fmt(r.snapshot?.nama_petani)}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PhotoVersionHistory;
