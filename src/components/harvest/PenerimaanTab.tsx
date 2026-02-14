import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, Eye, Trash2, ChevronDown, ChevronRight, Leaf, Factory, Users, ArrowDownToLine, Wand2, Tag } from "lucide-react";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { usePengepul } from "@/hooks/use-pengepul";
import { useBatchPanen, BatchStatus, QualityGrade } from "@/hooks/use-batch-panen";
import { useFarmers } from "@/hooks/use-farmers";
import { BatchPenerimaanForm } from "@/components/harvest/BatchPenerimaanForm";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<BatchStatus, string> = {
  penerimaan: "bg-blue-100 text-blue-800 border-blue-200",
  pengeringan: "bg-orange-100 text-orange-800 border-orange-200",
  penyimpanan: "bg-purple-100 text-purple-800 border-purple-200",
  pengolahan: "bg-yellow-100 text-yellow-800 border-yellow-200",
  penjualan: "bg-green-100 text-green-800 border-green-200",
  selesai: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<BatchStatus, string> = {
  penerimaan: "Penerimaan",
  pengeringan: "Pengeringan",
  penyimpanan: "Penyimpanan",
  pengolahan: "Pengolahan",
  penjualan: "Penjualan",
  selesai: "Selesai",
};

const qualityLabels: Record<QualityGrade, string> = {
  premium: "Premium",
  grade_a: "Grade A",
  grade_b: "Grade B",
  grade_c: "Grade C",
};

interface PenerimaanTabProps {
  onAddBatch: (
    data: {
      petani_id: string;
      lahan_id: string | null;
      tanggal_penerimaan: string;
      jumlah_kg: number;
      warna_produk: string | null;
      kualitas: QualityGrade;
      harga_per_kg: number | null;
      kondisi: string | null;
      pengepul_ids: string[] | null;
      is_organic: boolean;
      detail_petani: Array<{
        petani_id: string;
        petani_nama: string;
        petani_kode: string;
        jumlah_kg: number;
        is_organic: boolean;
        daily_values?: number[];
        daily_dates?: string[];
        product_codes?: ProductCodeEntry[];
      }>;
    },
    pengambilanIds: string[]
  ) => Promise<void>;
}

interface ProductCodeEntry {
  date: string;
  value: number;
  code: string;
}

interface FarmerDetailItem {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  jumlah_kg: number;
  is_organic: boolean;
  daily_values?: number[];
  daily_dates?: string[];
  product_codes?: ProductCodeEntry[];
}

export const PenerimaanTab = ({ onAddBatch }: PenerimaanTabProps) => {
  const { pengambilanList, loading: pengambilanLoading, refetch: refetchPengambilan } = usePengambilanKoperasi();
  const { batches, loading: batchLoading, deleteBatch, refetch: refetchBatches } = useBatchPanen();
  const { pengepulList } = usePengepul();
  const { farmers } = useFarmers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [filterPengepul, setFilterPengepul] = useState<string>("all");

  // Wrap onAddBatch to refetch local data after successful addition
  const handleAddBatch = async (data: Parameters<typeof onAddBatch>[0], pengambilanIds: string[]) => {
    await onAddBatch(data, pengambilanIds);
    await Promise.all([refetchBatches(), refetchPengambilan()]);
  };

  // Pending items: pengambilan_koperasi without batch_id
  const pendingItems = useMemo(() => {
    const items = pengambilanList.filter(p => !p.batch_id);
    
    // Group by pengepul
    const grouped = new Map<string, {
      pengepulId: string;
      pengepulNama: string;
      pengepulKode: string;
      items: typeof items;
      totalKg: number;
      organicKg: number;
      conventionalKg: number;
      farmerIds: Set<string>;
    }>();

    items.forEach(item => {
      const pengepul = pengepulList.find(p => p.id === item.pengepul_id);
      if (!grouped.has(item.pengepul_id)) {
        grouped.set(item.pengepul_id, {
          pengepulId: item.pengepul_id,
          pengepulNama: pengepul?.nama || item.pengepul?.nama || 'Unknown',
          pengepulKode: pengepul?.kode_pengepul || item.pengepul?.kode_pengepul || '-',
          items: [],
          totalKg: 0,
          organicKg: 0,
          conventionalKg: 0,
          farmerIds: new Set(),
        });
      }
      const group = grouped.get(item.pengepul_id)!;
      group.items.push(item);
      group.totalKg += Number(item.jumlah_kg);
      if (item.is_organic !== false) {
        group.organicKg += Number(item.jumlah_kg);
      } else {
        group.conventionalKg += Number(item.jumlah_kg);
      }
      // Extract farmer IDs from detail_petani
      const detail = item.detail_petani as FarmerDetailItem[] | null;
      if (Array.isArray(detail)) {
        detail.forEach(f => group.farmerIds.add(f.petani_id));
      }
    });

    return Array.from(grouped.values());
  }, [pengambilanList, pengepulList]);

  // Filter batches by pengepul
  const filteredBatches = useMemo(() => {
    if (filterPengepul === "all") return batches;
    return batches.filter(b => b.pengepul_ids?.includes(filterPengepul));
  }, [batches, filterPengepul]);

  // Get pengepul names for a batch
  const getPengepulNames = (pengepulIds: string[] | null) => {
    if (!pengepulIds || pengepulIds.length === 0) return "-";
    return pengepulIds
      .map(id => pengepulList.find(p => p.id === id)?.nama || "Unknown")
      .join(", ");
  };

  // Get farmer details from batch
  const getBatchFarmerDetails = (batch: typeof batches[0]): FarmerDetailItem[] => {
    const detail = batch.detail_petani as FarmerDetailItem[] | null;
    if (Array.isArray(detail)) return detail;
    return [];
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  // Unique pengepul list for filter
  const pengepulOptions = useMemo(() => {
    const ids = new Set<string>();
    batches.forEach(b => b.pengepul_ids?.forEach(id => ids.add(id)));
    pendingItems.forEach(p => ids.add(p.pengepulId));
    return Array.from(ids).map(id => {
      const p = pengepulList.find(pe => pe.id === id);
      return { id, nama: p?.nama || 'Unknown', kode: p?.kode_pengepul || '-' };
    });
  }, [batches, pendingItems, pengepulList]);

  return (
    <div className="space-y-6">
      {/* Pending from Barang Keluar */}
      {pendingItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-amber-600" />
                Data Masuk dari Pengepul (Belum Diproses)
              </CardTitle>
              <CardDescription>
                Data barang keluar pengepul yang siap diterima di gudang. Klik "Tambah Batch" untuk memproses.
              </CardDescription>
            </div>
            <BatchPenerimaanForm
              onSubmit={handleAddBatch}
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
            />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {pendingItems.map(group => (
                <div key={group.pengepulId} className="border rounded-lg p-4 bg-background">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 p-2 rounded-lg">
                        <Package className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="font-medium">{group.pengepulNama} <span className="text-muted-foreground text-sm">({group.pengepulKode})</span></p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {group.farmerIds.size} petani
                          </Badge>
                          {group.organicKg > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                              <Leaf className="h-3 w-3 mr-1" />
                              {Math.round(group.organicKg).toLocaleString()} Kg
                            </Badge>
                          )}
                          {group.conventionalKg > 0 && (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                              <Factory className="h-3 w-3 mr-1" />
                              {Math.round(group.conventionalKg).toLocaleString()} Kg
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{Math.round(group.totalKg).toLocaleString()} Kg</p>
                      <p className="text-xs text-muted-foreground">{group.items.length} pengambilan</p>
                    </div>
                  </div>
                  
                  {/* Show farmer details from pending items */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="mt-2 text-xs">
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Lihat Detail Petani
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Kode</TableHead>
                              <TableHead className="text-xs">Nama Petani</TableHead>
                              <TableHead className="text-xs">Identitas Produk</TableHead>
                              <TableHead className="text-xs">Tipe</TableHead>
                              <TableHead className="text-xs text-right">Jumlah (Kg)</TableHead>
                              <TableHead className="text-xs">Tgl Keluar</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.flatMap(item => {
                              const detail = item.detail_petani as FarmerDetailItem[] | null;
                              if (!Array.isArray(detail)) return [];
                              return detail.map((f, idx) => (
                                <TableRow key={`${item.id}-${idx}`}>
                                  <TableCell className="text-xs font-mono">{f.petani_kode}</TableCell>
                                  <TableCell className="text-xs">{f.petani_nama}</TableCell>
                                  <TableCell className="text-xs">
                                    {Array.isArray(f.product_codes) && f.product_codes.length > 0 ? (
                                      <TooltipProvider>
                                        <div className="flex flex-wrap gap-1">
                                          {f.product_codes.map((pc: ProductCodeEntry) => (
                                            <Tooltip key={pc.code}>
                                              <TooltipTrigger asChild>
                                                <Badge variant="outline" className="text-xs cursor-help bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                                  {pc.code}
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <div className="text-xs">
                                                  <p className="font-medium">{f.petani_nama}</p>
                                                  <p>Tanggal: {pc.date ? format(new Date(pc.date), "dd MMM yyyy", { locale: localeId }) : '-'}</p>
                                                  <p>Berat: {pc.value} Kg</p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          ))}
                                        </div>
                                      </TooltipProvider>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {item.is_organic !== false ? (
                                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                        <Leaf className="h-2 w-2 mr-1" />Organik
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                                        <Factory className="h-2 w-2 mr-1" />Konv.
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-medium">{Number(f.jumlah_kg).toLocaleString()}</TableCell>
                                  <TableCell className="text-xs">{format(new Date(item.tanggal_ambil), "dd MMM yyyy", { locale: localeId })}</TableCell>
                                </TableRow>
                              ));
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processed Batches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Batch Penerimaan Gudang</CardTitle>
            <CardDescription>Data batch yang telah diterima dari pengepul</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            {pengepulOptions.length > 0 && (
              <Select value={filterPengepul} onValueChange={setFilterPengepul}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter pengepul" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pengepul</SelectItem>
                  {pengepulOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nama} ({p.kode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {pendingItems.length === 0 && (
              <BatchPenerimaanForm
                onSubmit={handleAddBatch}
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {batchLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada data batch penerimaan</p>
              {pendingItems.length > 0 && (
                <p className="text-sm mt-1">Proses data dari pengepul di atas untuk membuat batch</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBatches.map(batch => {
                const farmerDetails = getBatchFarmerDetails(batch);
                const isExpanded = expandedBatches.has(batch.id);

                return (
                  <Collapsible key={batch.id} open={isExpanded} onOpenChange={() => toggleBatch(batch.id)}>
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer">
                          <div className="flex items-center gap-4 flex-1">
                            <Button variant="ghost" size="sm" className="p-0 h-auto">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-sm">{batch.batch_number}</span>
                                <Badge className={statusColors[batch.status]}>{statusLabels[batch.status]}</Badge>
                                {batch.is_organic !== false ? (
                                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <Leaf className="h-3 w-3 mr-1" />Organik
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                                    <Factory className="h-3 w-3 mr-1" />Konv.
                                  </Badge>
                                )}
                                <Badge variant="outline">{qualityLabels[batch.kualitas]}</Badge>
                              </div>
                              <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                                <span>Pengepul: {getPengepulNames(batch.pengepul_ids)}</span>
                                <span>Tgl: {format(new Date(batch.tanggal_penerimaan), "dd MMM yyyy", { locale: localeId })}</span>
                                {farmerDetails.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {farmerDetails.length} petani
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-bold">{Number(batch.jumlah_kg).toLocaleString()} Kg</p>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/admin/batch/${batch.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Batch?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Batch {batch.batch_number} akan dihapus beserta semua data terkait.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteBatch(batch.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        {farmerDetails.length > 0 ? (
                          <div className="border-t px-4 py-3 bg-muted/20">
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Detail Petani yang Masuk
                            </p>
                             <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Kode</TableHead>
                                  <TableHead className="text-xs">Nama Petani</TableHead>
                                  <TableHead className="text-xs">Identitas Produk</TableHead>
                                  <TableHead className="text-xs">Tipe</TableHead>
                                  <TableHead className="text-xs text-right">Jumlah (Kg)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {farmerDetails.map((f, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-xs font-mono">{f.petani_kode}</TableCell>
                                    <TableCell className="text-xs">{f.petani_nama}</TableCell>
                                    <TableCell className="text-xs">
                                      {Array.isArray((f as any).product_codes) && (f as any).product_codes.length > 0 ? (
                                        <TooltipProvider>
                                          <div className="flex flex-wrap gap-1">
                                            {(f as any).product_codes.map((pc: ProductCodeEntry) => (
                                              <Tooltip key={pc.code}>
                                                <TooltipTrigger asChild>
                                                  <Badge variant="outline" className="text-xs cursor-help bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                                    <Tag className="h-2.5 w-2.5 mr-1" />
                                                    {pc.code}
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <div className="text-xs">
                                                    <p className="font-medium">{f.petani_nama}</p>
                                                    <p>Tanggal: {pc.date ? format(new Date(pc.date), "dd MMM yyyy", { locale: localeId }) : '-'}</p>
                                                    <p>Berat: {pc.value} Kg</p>
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            ))}
                                          </div>
                                        </TooltipProvider>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {f.is_organic !== false ? (
                                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                          <Leaf className="h-2 w-2 mr-1" />Organik
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                                          <Factory className="h-2 w-2 mr-1" />Konv.
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-medium">{Number(f.jumlah_kg).toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-muted/50">
                                  <TableCell colSpan={4} className="text-xs font-bold">Total</TableCell>
                                  <TableCell className="text-xs text-right font-bold">
                                    {farmerDetails.reduce((sum, f) => sum + Number(f.jumlah_kg), 0).toLocaleString()} Kg
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="border-t px-4 py-3 bg-muted/20 text-sm text-muted-foreground">
                            Tidak ada detail petani tersimpan untuk batch ini
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
