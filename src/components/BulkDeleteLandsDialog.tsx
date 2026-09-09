import { useEffect, useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react";
import {
  chunked,
  countBy,
  downloadBlob,
  fetchRows,
  timestampSuffix,
  toCsv,
} from "@/lib/bulk-delete-utils";

export interface LandRef {
  id: string;
  nama_lahan: string;
  kode?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lands: LandRef[];
  onDeleted: () => void;
}

interface Counts {
  lahan: number;
  panen: number;
  batch_panen: number;
  foto_lahan: number;
}

const emptyCounts: Counts = { lahan: 0, panen: 0, batch_panen: 0, foto_lahan: 0 };

export const BulkDeleteLandsDialog = ({ open, onOpenChange, lands, onDeleted }: Props) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [backupDone, setBackupDone] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const ids = lands.map((l) => l.id);

  useEffect(() => {
    if (!open) return;
    setBackupDone(false);
    setConfirmText("");
    setReason("");
    setCountError(null);

    let cancelled = false;
    const run = async () => {
      setCountLoading(true);
      try {
        const [panen, batch, foto] = await Promise.all([
          countBy("panen", "lahan_id", ids),
          countBy("batch_panen", "lahan_id", ids),
          countBy("foto_lahan", "lahan_id", ids),
        ]);
        if (cancelled) return;
        setCounts({ lahan: lands.length, panen, batch_panen: batch, foto_lahan: foto });
      } catch (e: any) {
        if (!cancelled) setCountError(e?.message ?? "Gagal menghitung data terkait");
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lands]);

  const handleBackup = async () => {
    setBackupBusy(true);
    try {
      const lahanRows = await fetchRows("lahan", "id", ids);
      const panenRows = await fetchRows("panen", "lahan_id", ids);
      const batchRows = await fetchRows("batch_panen", "lahan_id", ids);

      const zip = new JSZip();
      zip.file("lahan.csv", toCsv(lahanRows));
      zip.file("panen.csv", toCsv(panenRows));
      zip.file("batch_panen.csv", toCsv(batchRows));

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `backup-lahan-${timestampSuffix()}.zip`);

      setBackupDone(true);
      toast({ title: "Backup diunduh", description: "File ZIP berisi 3 CSV telah disimpan." });
    } catch (e: any) {
      toast({ title: "Gagal membuat backup", description: e?.message, variant: "destructive" });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const snapshot = lands.map((l) => ({
        id: l.id,
        kode: l.kode ?? null,
        nama_lahan: l.nama_lahan,
      }));
      const ringkasan = { ...counts };

      for (const part of chunked(ids)) {
        const { error } = await supabase.from("lahan").delete().in("id", part);
        if (error) throw error;
      }

      const { error: logError } = await supabase.from("log_penghapusan_batch").insert({
        tipe: "lahan",
        jumlah_dihapus: lands.length,
        ringkasan_cascade: ringkasan as any,
        daftar_terhapus: snapshot as any,
        dihapus_oleh: user?.id ?? null,
        alasan: reason.trim() || null,
      });
      if (logError) console.error("Gagal mencatat riwayat penghapusan:", logError);

      toast({
        title: "Penghapusan selesai",
        description: `${lands.length} lahan berhasil dihapus permanen`,
      });
      onOpenChange(false);
      onDeleted();
    } catch (e: any) {
      toast({ title: "Gagal menghapus", description: e?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = !deleting && !countLoading && backupDone && confirmText.trim() === "HAPUS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Hapus {lands.length} lahan secara permanen
          </DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. Periksa dampaknya di bawah ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            {countLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Menghitung data terkait...
              </div>
            ) : countError ? (
              <p className="text-destructive">{countError}</p>
            ) : (
              <>
                <p className="font-medium text-foreground">
                  {counts.lahan} lahan akan terhapus permanen.
                </p>
                <p className="mt-2 text-muted-foreground">
                  {counts.panen} data panen, {counts.batch_panen} batch panen, dan {counts.foto_lahan} foto
                  akan tetap ada, tapi tautannya ke lahan ini dilepas.
                </p>
              </>
            )}
          </div>

          <div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleBackup}
              disabled={backupBusy || countLoading}
            >
              {backupBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {backupDone ? "Unduh Ulang Backup CSV (ZIP)" : "Unduh Backup CSV (ZIP)"}
            </Button>
            {!backupDone && (
              <p className="mt-1 text-xs text-muted-foreground">
                Backup wajib diunduh sebelum penghapusan dapat dijalankan.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="alasan-hapus-lahan">Alasan penghapusan (opsional)</Label>
            <Textarea
              id="alasan-hapus-lahan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: data duplikat hasil impor"
            />
          </div>

          <div>
            <Label htmlFor="konfirmasi-hapus-lahan">
              Ketik <span className="font-semibold">HAPUS</span> untuk mengaktifkan tombol
            </Label>
            <Input
              id="konfirmasi-hapus-lahan"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="HAPUS"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Batal
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!canDelete}
            onClick={handleDelete}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Hapus Permanen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteLandsDialog;
