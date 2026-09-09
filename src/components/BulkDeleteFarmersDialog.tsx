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


export interface FarmerRef {
  id: string;
  kode_petani: string;
  nama: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmers: FarmerRef[];
  onDeleted: () => void;
}

interface Counts {
  petani: number;
  lahan: number;
  batch_panen: number;
  panen: number;
  penjualan_petani: number;
  label_settings: number;
  foto_lahan: number;
}

const emptyCounts: Counts = {
  petani: 0,
  lahan: 0,
  batch_panen: 0,
  panen: 0,
  penjualan_petani: 0,
  label_settings: 0,
  foto_lahan: 0,
};




export const BulkDeleteFarmersDialog = ({ open, onOpenChange, farmers, onDeleted }: Props) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [backupDone, setBackupDone] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const ids = farmers.map((f) => f.id);

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
        const [lahanRows, lahan, batch, panen, penjualan, label] = await Promise.all([
          (async () => {
            const rows: string[] = [];
            for (const part of chunked(ids)) {
              const { data, error } = await supabase.from("lahan").select("id").in("petani_id", part);
              if (error) throw error;
              rows.push(...(data ?? []).map((r) => r.id));
            }
            return rows;
          })(),
          countBy("lahan", "petani_id", ids),
          countBy("batch_panen", "petani_id", ids),
          countBy("panen", "petani_id", ids),
          countBy("penjualan_petani", "petani_id", ids),
          countBy("label_settings", "petani_id", ids),
        ]);

        const fotoIds = new Set<string>();
        for (const part of chunked(ids)) {
          const { data, error } = await supabase.from("foto_lahan").select("id").in("petani_id", part);
          if (error) throw error;
          (data ?? []).forEach((r) => fotoIds.add(r.id));
        }
        for (const part of chunked(lahanRows)) {
          const { data, error } = await supabase.from("foto_lahan").select("id").in("lahan_id", part);
          if (error) throw error;
          (data ?? []).forEach((r) => fotoIds.add(r.id));
        }

        if (cancelled) return;
        setCounts({
          petani: farmers.length,
          lahan,
          batch_panen: batch,
          panen,
          penjualan_petani: penjualan,
          label_settings: label,
          foto_lahan: fotoIds.size,
        });
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
  }, [open, farmers]);

  const handleBackup = async () => {
    setBackupBusy(true);
    try {
      const petaniRows = await fetchRows("petani", "id", ids);
      const lahanRows = await fetchRows("lahan", "petani_id", ids);
      const panenRows = await fetchRows("panen", "petani_id", ids);
      const batchRows = await fetchRows("batch_panen", "petani_id", ids);
      const penjualanRows = await fetchRows("penjualan_petani", "petani_id", ids);

      const zip = new JSZip();
      zip.file("petani.csv", toCsv(petaniRows));
      zip.file("lahan.csv", toCsv(lahanRows));
      zip.file("panen.csv", toCsv(panenRows));
      zip.file("batch_panen.csv", toCsv(batchRows));
      zip.file("penjualan_petani.csv", toCsv(penjualanRows));

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `backup-petani-${timestampSuffix()}.zip`);


      setBackupDone(true);
      toast({ title: "Backup diunduh", description: "File ZIP berisi 5 CSV telah disimpan." });
    } catch (e: any) {
      toast({ title: "Gagal membuat backup", description: e?.message, variant: "destructive" });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const snapshot = farmers.map((f) => ({ id: f.id, kode_petani: f.kode_petani, nama: f.nama }));
      const ringkasan = { ...counts };

      for (const part of chunked(ids)) {
        const { error } = await supabase.from("petani").delete().in("id", part);
        if (error) throw error;
      }

      const { error: logError } = await supabase.from("log_penghapusan_batch").insert({
        tipe: "petani",
        jumlah_dihapus: farmers.length,
        ringkasan_cascade: ringkasan as any,
        daftar_terhapus: snapshot as any,
        dihapus_oleh: user?.id ?? null,
        alasan: reason.trim() || null,
      });
      if (logError) console.error("Gagal mencatat riwayat penghapusan:", logError);

      toast({
        title: "Penghapusan selesai",
        description: `${farmers.length} petani berhasil dihapus permanen`,
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
            Hapus {farmers.length} petani secara permanen
          </DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. Periksa daftar data yang ikut terhapus di bawah ini.
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
                <p className="font-medium text-foreground">Akan terhapus permanen:</p>
                <ul className="mt-1 list-disc pl-5 text-foreground">
                  <li>{counts.petani} petani</li>
                  <li>{counts.lahan} lahan</li>
                  <li>{counts.batch_panen} batch panen</li>
                  <li>{counts.panen} data panen</li>
                  <li>{counts.penjualan_petani} penjualan petani</li>
                  <li>{counts.label_settings} pengaturan label</li>
                </ul>
                <p className="mt-2 text-muted-foreground">
                  {counts.foto_lahan} foto akan tetap ada, tetapi tautannya ke petani/lahan dilepas.
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
            <Label htmlFor="alasan-hapus">Alasan penghapusan (opsional)</Label>
            <Textarea
              id="alasan-hapus"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: data duplikat hasil impor"
            />
          </div>

          <div>
            <Label htmlFor="konfirmasi-hapus">
              Ketik <span className="font-semibold">HAPUS</span> untuk mengaktifkan tombol
            </Label>
            <Input
              id="konfirmasi-hapus"
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

export default BulkDeleteFarmersDialog;
