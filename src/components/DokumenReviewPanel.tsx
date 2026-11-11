import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { toast } from "@/hooks/use-toast";
import {
  FileCheck2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Search,
} from "lucide-react";

export interface FotoDokumen {
  id: string;
  tipe: string;
  kode: string | null;
  nama_petani: string | null;
  file_path: string;
  taken_at: string;
  url?: string;
}

export interface HasilReview {
  jenis_dokumen: string;
  verdict: string;
  ringkasan: string;
  kelengkapan: { aspek: string; status: string; catatan: string }[];
  keterbacaan: { skor: number; masalah: string[] };
  temuan: string[];
  tindak_lanjut: { prioritas: string; aksi: string }[];
}

export interface ReviewRow {
  id: string;
  foto_id: string;
  hasil: HasilReview;
  verdict: string | null;
  model: string | null;
  created_at: string;
}

const VERDICT_LABEL: Record<string, string> = {
  lengkap: "Lengkap & Terbaca",
  perlu_perbaikan: "Perlu Perbaikan",
  tidak_layak: "Tidak Layak",
};

const TIPE_LABEL: Record<string, string> = {
  ktp: "Foto KTP",
  pelatihan: "Foto Pelatihan",
};

const VerdictBadge = ({ verdict }: { verdict: string | null }) => {
  if (!verdict) return <Badge variant="outline">Belum ditinjau</Badge>;
  if (verdict === "lengkap") return <Badge className="bg-emerald-600 text-white">{VERDICT_LABEL[verdict]}</Badge>;
  if (verdict === "perlu_perbaikan") return <Badge className="bg-amber-500 text-white">Perlu Perbaikan</Badge>;
  return <Badge variant="destructive">Tidak Layak</Badge>;
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "ada") return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
  if (status === "hilang") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
};

const ReviewResult = ({ hasil }: { hasil: HasilReview }) => (
  <div className="space-y-4">
    {hasil.ringkasan && <p className="text-sm text-foreground/90">{hasil.ringkasan}</p>}

    <div>
      <p className="mb-1 text-sm font-medium">Keterbacaan: {hasil.keterbacaan?.skor ?? "-"}/100</p>
      <Progress value={Math.max(0, Math.min(100, hasil.keterbacaan?.skor ?? 0))} className="h-2" />
      {hasil.keterbacaan?.masalah?.length ? (
        <ul className="mt-2 space-y-1">
          {hasil.keterbacaan.masalah.map((m, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
              {m}
            </li>
          ))}
        </ul>
      ) : null}
    </div>

    {hasil.kelengkapan?.length ? (
      <div>
        <p className="mb-1 text-sm font-medium">Kelengkapan</p>
        <ul className="space-y-1.5">
          {hasil.kelengkapan.map((k, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <StatusIcon status={k.status} />
              <span>
                <span className="font-medium">{k.aspek}</span>
                {k.catatan ? <span className="text-muted-foreground"> — {k.catatan}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {hasil.temuan?.length ? (
      <div>
        <p className="mb-1 text-sm font-medium">Temuan</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {hasil.temuan.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {hasil.tindak_lanjut?.length ? (
      <div>
        <p className="mb-1 text-sm font-medium">Tindak Lanjut</p>
        <ul className="space-y-1.5">
          {hasil.tindak_lanjut.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Badge
                variant={t.prioritas === "tinggi" ? "destructive" : t.prioritas === "sedang" ? "secondary" : "outline"}
                className="shrink-0"
              >
                {t.prioritas}
              </Badge>
              <span>{t.aksi}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
);

export const DokumenReviewPanel = () => {
  const [photos, setPhotos] = useState<FotoDokumen[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipeFilter, setTipeFilter] = useState<"semua" | "ktp" | "pelatihan">("semua");
  const [selected, setSelected] = useState<FotoDokumen | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: photoRows, error: photoErr }, { data: reviewRows, error: reviewErr }] = await Promise.all([
      supabase
        .from("foto_lahan")
        .select("id,tipe,kode,nama_petani,petani_id,file_path,taken_at")
        .in("tipe", ["ktp", "pelatihan"])
        .order("taken_at", { ascending: false })
        .limit(2000),
      supabase
        .from("dokumen_review")
        .select("id,foto_id,hasil,verdict,model,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    if (photoErr) {
      toast({ title: "Gagal memuat foto dokumen", description: photoErr.message, variant: "destructive" });
      setPhotos([]);
      setLoading(false);
      return;
    }
    const rows = (photoRows || []) as FotoDokumen[];
    if (rows.length) {
      const { data: signed } = await supabase.storage
        .from("foto-lahan")
        .createSignedUrls(rows.map((r) => r.file_path), 60 * 60);
      (signed || []).forEach((s, i) => {
        if (s.signedUrl) rows[i].url = s.signedUrl;
      });
    }
    setPhotos(rows);

    if (reviewErr) {
      console.error("failed to load reviews", reviewErr.message);
    } else {
      const latest: Record<string, ReviewRow> = {};
      for (const r of (reviewRows || []) as unknown as ReviewRow[]) {
        if (!latest[r.foto_id]) latest[r.foto_id] = r;
      }
      setReviews(latest);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runReview = async (foto: FotoDokumen) => {
    setReviewing(true);
    const { data, error } = await supabase.functions.invoke("dokumen-review", { body: { fotoId: foto.id } });
    setReviewing(false);
    if (error || !data?.review) {
      const msg = (data as { error?: string } | null)?.error || error?.message || "Tinjauan gagal";
      toast({ title: "Tinjauan AI gagal", description: msg, variant: "destructive" });
      return;
    }
    const row = data.review as ReviewRow;
    setReviews((prev) => ({ ...prev, [row.foto_id]: row }));
    toast({ title: "Tinjauan AI selesai", description: "Hasil tinjauan tersimpan." });
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photos.filter((p) => {
      if (tipeFilter !== "semua" && p.tipe !== tipeFilter) return false;
      if (!q) return true;
      return `${p.kode || ""} ${p.nama_petani || ""}`.toLowerCase().includes(q);
    });
  }, [photos, search, tipeFilter]);

  const selectedReview = selected ? reviews[selected.id] : undefined;
  const reviewedCount = photos.filter((p) => reviews[p.id]).length;

  return (
    <Card className="shadow-gentle border-border/50">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-foreground">Tinjauan Dokumen Petani</CardTitle>
          <CardDescription>
            {photos.length} foto dokumen (KTP / pelatihan) — {reviewedCount} sudah ditinjau AI
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari petani…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full sm:w-56"
            />
          </div>
          <Select value={tipeFilter} onValueChange={(v) => setTipeFilter(v as typeof tipeFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Tipe</SelectItem>
              <SelectItem value="ktp">Foto KTP</SelectItem>
              <SelectItem value="pelatihan">Foto Pelatihan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton rows={6} columns={3} />
        ) : visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <FileCheck2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Belum ada foto dokumen{search || tipeFilter !== "semua" ? " yang cocok dengan filter" : ""}.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => {
              const review = reviews[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setSelected(p)}
                >
                  {p.url ? (
                    <img src={p.url} alt={TIPE_LABEL[p.tipe] || p.tipe} className="h-14 w-14 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-muted shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.kode || "—"} · {p.nama_petani || "Petani"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TIPE_LABEL[p.tipe] || p.tipe} · {new Date(p.taken_at).toLocaleDateString("id-ID")}
                    </p>
                    <div className="mt-1">
                      <VerdictBadge verdict={review?.verdict ?? null} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected ? `${TIPE_LABEL[selected.tipe] || selected.tipe} — ${selected.kode || ""} ${selected.nama_petani || ""}` : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedReview
                ? `Tinjauan terakhir: ${new Date(selectedReview.created_at).toLocaleString("id-ID")}`
                : "Foto ini belum pernah ditinjau AI."}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {selected.url ? (
                  <img src={selected.url} alt="Foto dokumen" className="w-full rounded-lg border border-border/50" />
                ) : (
                  <div className="aspect-[4/3] rounded-lg bg-muted" />
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => runReview(selected)}
                    disabled={reviewing}
                    className="flex-1"
                  >
                    {reviewing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI sedang meninjau…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {selectedReview ? "Tinjau Ulang dengan AI" : "Tinjau dengan AI"}
                      </>
                    )}
                  </Button>
                  {selected.url && (
                    <Button variant="outline" asChild>
                      <a href={selected.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Penuh
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI memeriksa kelengkapan & keterbacaan dokumen. Data pribadi di dalam foto tidak digunakan dalam hasil tinjauan.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                {selectedReview ? (
                  <ReviewResult hasil={selectedReview.hasil} />
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <FileCheck2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    Belum ada hasil tinjauan. Jalankan tinjauan AI untuk melihat temuan dan saran tindak lanjut.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
