import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Warehouse, Leaf, Factory, Package, Flame, ArrowDownToLine, ArrowUpFromLine, RefreshCw, ShoppingCart, ChevronDown, ChevronRight, Users, Tag } from "lucide-react";
import { useGudangStok, useBatchPanen, useProsesPengeringan, usePenjualan, GudangStok } from "@/hooks/use-batch-panen";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { OvenReportDialog } from "./OvenReportDialog";
import { BarangKeluarGudangDialog } from "./BarangKeluarGudangDialog";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { generateProductCode } from "@/lib/product-code";

interface ProductCodeEntry {
  date: string;
  value: number;
  code: string;
}

interface FarmerDetail {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  jumlah_kg: number;
  is_organic: boolean;
  daily_values?: number[];
  daily_dates?: string[];
  product_codes?: ProductCodeEntry[];
}

/**
 * Ensure product_codes exist for a farmer detail item.
 * If missing but daily_values/daily_dates exist, generate them on-the-fly.
 */
const ensureProductCodes = (f: FarmerDetail): ProductCodeEntry[] => {
  if (Array.isArray(f.product_codes) && f.product_codes.length > 0) {
    return f.product_codes;
  }
  if (Array.isArray(f.daily_values) && Array.isArray(f.daily_dates) && f.daily_dates.length > 0) {
    let seq = 1;
    const codes: ProductCodeEntry[] = [];
    for (let i = 0; i < f.daily_values.length; i++) {
      const val = f.daily_values[i];
      if (val <= 0) continue;
      const dateStr = f.daily_dates[i];
      if (!dateStr) continue;
      codes.push({
        date: dateStr,
        value: Math.round(val * 10) / 10,
        code: generateProductCode(f.petani_kode, dateStr, seq++),
      });
    }
    if (codes.length > 0) return codes;
  }
  if (f.jumlah_kg > 0 && f.petani_kode) {
    return [{
      date: '',
      value: Math.round(f.jumlah_kg * 10) / 10,
      code: `${f.petani_kode}-BULK`,
    }];
  }
  return [];
};

export const GudangTab = () => {
  const { stok, loading, refetch } = useGudangStok();
  const { batches, loading: batchesLoading } = useBatchPanen();
  const { proses, refetch: refetchProses } = useProsesPengeringan();
  const { penjualan, refetch: refetchPenjualan } = usePenjualan();
  const { profile } = useCompanyProfile();
  
  const [activeSubTab, setActiveSubTab] = useState("bahan-masuk");
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const toggleBatchExpanded = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  // Filter stok tersedia (status tersimpan dan jumlah > 0)
  const stokTersedia = useMemo(() => {
    return stok.filter(s => s.status === 'tersimpan' && Number(s.jumlah_kg) > 0);
  }, [stok]);

  // Separate batches by organic status (from penerimaan/batch_panen)
  const categorizedBatches = useMemo(() => {
    return {
      organik: batches.filter(b => b.is_organic === true),
      konvensional: batches.filter(b => b.is_organic === false),
    };
  }, [batches]);

  // Separate stok by type and organic status
  const categorizedStok = useMemo(() => {
    return {
      bahanBakuOrganik: stok.filter(s => s.tipe_stok === 'bahan_baku' && s.is_organic === true),
      bahanBakuKonvensional: stok.filter(s => s.tipe_stok === 'bahan_baku' && s.is_organic === false),
      produkOvenOrganik: stok.filter(s => s.tipe_stok === 'produk_jadi' && s.is_organic === true),
      produkOvenKonvensional: stok.filter(s => s.tipe_stok === 'produk_jadi' && s.is_organic === false),
    };
  }, [stok]);

  // Calculate summary stats from batches (penerimaan)
  const batchSummary = useMemo(() => {
    const calcTotal = (items: typeof batches) => items.reduce((sum, b) => sum + Number(b.jumlah_kg), 0);
    
    return {
      organik: {
        total: calcTotal(categorizedBatches.organik),
        count: categorizedBatches.organik.length,
      },
      konvensional: {
        total: calcTotal(categorizedBatches.konvensional),
        count: categorizedBatches.konvensional.length,
      },
    };
  }, [categorizedBatches]);

  // Calculate summary stats from gudang stok
  const summary = useMemo(() => {
    const calcTotal = (items: GudangStok[]) => items.reduce((sum, s) => sum + Number(s.jumlah_kg), 0);
    const calcTersimpan = (items: GudangStok[]) => 
      items.filter(s => s.status === 'tersimpan').reduce((sum, s) => sum + Number(s.jumlah_kg), 0);
    const calcKeluar = (items: GudangStok[]) => 
      items.filter(s => s.status === 'keluar').reduce((sum, s) => sum + Number(s.jumlah_kg), 0);

    return {
      bahanBakuOrganik: {
        total: calcTotal(categorizedStok.bahanBakuOrganik),
        tersimpan: calcTersimpan(categorizedStok.bahanBakuOrganik),
        keluar: calcKeluar(categorizedStok.bahanBakuOrganik),
      },
      bahanBakuKonvensional: {
        total: calcTotal(categorizedStok.bahanBakuKonvensional),
        tersimpan: calcTersimpan(categorizedStok.bahanBakuKonvensional),
        keluar: calcKeluar(categorizedStok.bahanBakuKonvensional),
      },
      produkOvenOrganik: {
        total: calcTotal(categorizedStok.produkOvenOrganik),
        tersimpan: calcTersimpan(categorizedStok.produkOvenOrganik),
        keluar: calcKeluar(categorizedStok.produkOvenOrganik),
      },
      produkOvenKonvensional: {
        total: calcTotal(categorizedStok.produkOvenKonvensional),
        tersimpan: calcTersimpan(categorizedStok.produkOvenKonvensional),
        keluar: calcKeluar(categorizedStok.produkOvenKonvensional),
      },
    };
  }, [categorizedStok]);

  // Render batch penerimaan table with farmer details
  const renderBatchTable = (batchList: typeof batches, emptyMessage: string) => {
    if (batchList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {batchList.map((batch) => {
          const isExpanded = expandedBatches.has(batch.id);
          const detailPetani = (batch.detail_petani as FarmerDetail[] | null) || [];
          const hasDetails = detailPetani.length > 0;

          return (
            <Collapsible key={batch.id} open={isExpanded} onOpenChange={() => toggleBatchExpanded(batch.id)}>
              <Card className="border">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasDetails && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                      <div>
                        <p className="font-mono font-medium">{batch.batch_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(batch.tanggal_penerimaan), "dd MMM yyyy", { locale: localeId })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg">{Number(batch.jumlah_kg).toLocaleString()} Kg</p>
                        {hasDetails && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Users className="h-3 w-3" />
                            {detailPetani.length} petani
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {batch.is_organic ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Leaf className="h-3 w-3 mr-1" />
                            Organik
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                            <Factory className="h-3 w-3 mr-1" />
                            Konvensional
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {batch.kualitas?.replace('_', ' ').toUpperCase() || 'Grade A'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                {hasDetails && (
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4">
                      <p className="text-sm font-medium py-2 text-muted-foreground">Detail Petani:</p>
                      <div className="max-h-64 overflow-y-auto border rounded-md">
                       <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky top-0 bg-background">Nama Petani</TableHead>
                              <TableHead className="sticky top-0 bg-background">Kode</TableHead>
                              <TableHead className="sticky top-0 bg-background">Identitas Produk</TableHead>
                              <TableHead className="sticky top-0 bg-background text-right">Jumlah (Kg)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailPetani.map((farmer, idx) => {
                              const productCodes = ensureProductCodes(farmer);
                              return (
                              <TableRow key={`${batch.id}-${farmer.petani_id}-${idx}`}>
                                <TableCell className="font-medium">{farmer.petani_nama}</TableCell>
                                <TableCell className="font-mono">{farmer.petani_kode}</TableCell>
                                <TableCell>
                                  {productCodes.length > 0 ? (
                                    <TooltipProvider>
                                      <div className="flex flex-wrap gap-1">
                                        {productCodes.map((pc) => (
                                          <Tooltip key={pc.code}>
                                            <TooltipTrigger asChild>
                                              <Badge variant="outline" className="text-xs cursor-help bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                                <Tag className="h-2.5 w-2.5 mr-1" />
                                                {pc.code}
                                                <span className="mx-1 text-muted-foreground">·</span>
                                                <span>{pc.value} Kg</span>
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <div className="text-xs">
                                                <p className="font-medium">{farmer.petani_nama}</p>
                                                <p>Tanggal: {pc.date ? format(new Date(pc.date), "dd MMM yyyy", { locale: localeId }) : '-'}</p>
                                                <p>Berat: {pc.value} Kg</p>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        ))}
                                      </div>
                                    </TooltipProvider>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {Number(farmer.jumlah_kg).toLocaleString()} Kg
                                </TableCell>
                              </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={3} className="font-bold">Total</TableCell>
                              <TableCell className="text-right font-bold">
                                {detailPetani.reduce((sum, f) => sum + Number(f.jumlah_kg), 0).toLocaleString()} Kg
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CollapsibleContent>
                )}
              </Card>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  const renderStokTable = (items: GudangStok[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch/Lot</TableHead>
            <TableHead>Lokasi</TableHead>
            <TableHead>Tanggal Masuk</TableHead>
            <TableHead>Jumlah (Kg)</TableHead>
            <TableHead>Kondisi</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const batch = batches.find(b => b.id === item.batch_id);
            const ovenProses = proses.find(p => p.batch_id === item.batch_id);
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-mono font-medium">{batch?.batch_number || "-"}</p>
                    {ovenProses?.lot_number && (
                      <p className="text-xs text-muted-foreground font-mono">{ovenProses.lot_number}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {item.is_organic ? (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Leaf className="h-3 w-3 mr-1" />
                          Organik
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                          <Factory className="h-3 w-3 mr-1" />
                          Konvensional
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {item.tipe_stok === 'produk_jadi' ? 'Produk Jadi' : 'Bahan Baku'}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p>{item.lokasi_gudang}</p>
                    {item.rak_posisi && <p className="text-sm text-muted-foreground">Rak: {item.rak_posisi}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(item.tanggal_masuk), "dd MMM yyyy", { locale: localeId })}
                </TableCell>
                <TableCell className="font-medium">{Number(item.jumlah_kg).toLocaleString()} Kg</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {item.kondisi_penyimpanan || "-"}
                    {item.suhu_gudang && (
                      <p className="text-xs text-muted-foreground">{item.suhu_gudang}°C / {item.kelembaban || "-"}%</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={item.status === 'tersimpan' ? 'default' : 'secondary'}
                    className={item.status === 'keluar' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                  >
                    {item.status === 'tersimpan' ? 'Tersimpan' : item.status === 'keluar' ? 'Keluar' : item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderOvenResultsTable = () => {
    const completedProses = proses.filter(p => p.status === 'selesai');
    
    if (completedProses.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Belum ada hasil pengovenan yang selesai
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {completedProses.map((item) => {
          const stokEntry = stok.find(s => s.batch_id === item.batch_id && s.tipe_stok === 'produk_jadi');
          const detailPetani = Array.isArray(item.detail_petani) ? (item.detail_petani as FarmerDetail[]) : [];
          const isExpanded = expandedBatches.has(`oven-${item.id}`);

          return (
            <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleBatchExpanded(`oven-${item.id}`)}>
              <Card className="border">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {detailPetani.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                      <div>
                        <p className="font-mono font-medium">{item.lot_number || "-"}</p>
                        <p className="text-sm text-muted-foreground">
                          Selesai: {item.tanggal_selesai 
                            ? format(new Date(item.tanggal_selesai), "dd MMM yyyy HH:mm", { locale: localeId })
                            : "-"
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="flex gap-3">
                          <span>Masuk: <strong>{Number(item.jumlah_kg_sebelum).toLocaleString()} Kg</strong></span>
                          <span className="text-orange-600">Susut: {item.susut_persen || 0}%</span>
                          <span>Kering: <strong>{Number(item.total_kering || 0).toLocaleString()} Kg</strong></span>
                          <span className="text-destructive">QC Off: {Number(item.qc_off || 0).toLocaleString()} Kg</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-emerald-600">{Number(item.total_kering_packing || 0).toLocaleString()} Kg</p>
                        <p className="text-xs text-muted-foreground">Hasil Packing</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {item.is_organic ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Leaf className="h-3 w-3 mr-1" />Organik
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                            <Factory className="h-3 w-3 mr-1" />Konv.
                          </Badge>
                        )}
                        {stokEntry ? (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                            <Package className="h-3 w-3 mr-1" />Di Gudang
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Belum Masuk</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {detailPetani.length > 0 && (
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4">
                      <p className="text-sm font-medium py-2 text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Detail Petani ({detailPetani.length} petani) — Traceability
                      </p>
                      <div className="max-h-64 overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky top-0 bg-background">Nama Petani</TableHead>
                              <TableHead className="sticky top-0 bg-background">Kode</TableHead>
                              <TableHead className="sticky top-0 bg-background">Identitas Produk</TableHead>
                              <TableHead className="sticky top-0 bg-background text-right">Jumlah (Kg)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailPetani.map((farmer, idx) => {
                              const productCodes = ensureProductCodes(farmer);
                              return (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{farmer.petani_nama}</TableCell>
                                  <TableCell className="font-mono">{farmer.petani_kode}</TableCell>
                                  <TableCell>
                                    {productCodes.length > 0 ? (
                                      <TooltipProvider>
                                        <div className="flex flex-wrap gap-1">
                                          {productCodes.map((pc) => (
                                            <Tooltip key={pc.code}>
                                              <TooltipTrigger asChild>
                                                <Badge variant="outline" className="text-xs cursor-help bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                                  {pc.code}
                                                  <span className="mx-1 text-muted-foreground">·</span>
                                                  <span>{pc.value} Kg</span>
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <div className="text-xs">
                                                  <p className="font-medium">{farmer.petani_nama}</p>
                                                  <p>Tanggal: {pc.date ? format(new Date(pc.date), "dd MMM yyyy", { locale: localeId }) : '-'}</p>
                                                  <p>Berat: {pc.value} Kg</p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          ))}
                                        </div>
                                      </TooltipProvider>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{Number(farmer.jumlah_kg).toLocaleString()} Kg</TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={3} className="font-bold">Total</TableCell>
                              <TableCell className="text-right font-bold">
                                {detailPetani.reduce((sum, f) => sum + Number(f.jumlah_kg), 0).toLocaleString()} Kg
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CollapsibleContent>
                )}
              </Card>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  // Render penjualan/barang keluar history
  const renderPenjualanTable = () => {
    if (penjualan.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Belum ada data barang keluar/penjualan
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Invoice</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Pembeli</TableHead>
            <TableHead>Jumlah</TableHead>
            <TableHead>Harga/Kg</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {penjualan.map((item) => {
            const batch = batches.find(b => b.id === item.batch_id);
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-mono font-medium">{item.nomor_invoice}</p>
                    {batch && (
                      <p className="text-xs text-muted-foreground">{batch.batch_number}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(item.tanggal_penjualan), "dd MMM yyyy", { locale: localeId })}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.pembeli}</p>
                    {item.alamat_pembeli && (
                      <p className="text-xs text-muted-foreground">{item.alamat_pembeli}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{Number(item.jumlah_kg).toLocaleString()} Kg</TableCell>
                <TableCell>Rp {Number(item.harga_per_kg).toLocaleString()}</TableCell>
                <TableCell className="font-bold text-primary">
                  Rp {Number(item.total_harga || item.jumlah_kg * item.harga_per_kg).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={item.status_pembayaran === 'lunas' ? 'default' : 'secondary'}
                    className={item.status_pembayaran === 'pending' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                  >
                    {item.status_pembayaran === 'lunas' ? 'Lunas' : item.status_pembayaran === 'pending' ? 'Pending' : item.status_pembayaran}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderSummaryCard = (title: string, icon: React.ReactNode, stats: { total: number; tersimpan?: number; keluar?: number; count?: number }, isOrganic: boolean, showStokDetails: boolean = true) => (
    <Card className={`border ${isOrganic ? 'border-emerald-200/50' : 'border-slate-200/50'}`}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{stats.total.toLocaleString()} Kg</span>
          </div>
          {stats.count !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Batch:</span>
              <span className="font-medium">{stats.count}</span>
            </div>
          )}
          {showStokDetails && stats.tersimpan !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowDownToLine className="h-3 w-3" /> Tersimpan:
              </span>
              <span className="font-medium text-emerald-600">{stats.tersimpan.toLocaleString()} Kg</span>
            </div>
          )}
          {showStokDetails && stats.keluar !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowUpFromLine className="h-3 w-3" /> Keluar:
              </span>
              <span className="font-medium text-orange-600">{stats.keluar.toLocaleString()} Kg</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading || batchesLoading) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderSummaryCard(
          "Bahan Masuk Organik",
          <div className="p-2 rounded-lg bg-emerald-100">
            <Package className="h-4 w-4 text-emerald-600" />
          </div>,
          { ...batchSummary.organik },
          true,
          false
        )}
        {renderSummaryCard(
          "Bahan Masuk Konvensional",
          <div className="p-2 rounded-lg bg-slate-100">
            <Package className="h-4 w-4 text-slate-600" />
          </div>,
          { ...batchSummary.konvensional },
          false,
          false
        )}
        {renderSummaryCard(
          "Produk Oven Organik",
          <div className="p-2 rounded-lg bg-emerald-100">
            <Flame className="h-4 w-4 text-emerald-600" />
          </div>,
          summary.produkOvenOrganik,
          true
        )}
        {renderSummaryCard(
          "Produk Oven Konvensional",
          <div className="p-2 rounded-lg bg-slate-100">
            <Flame className="h-4 w-4 text-slate-600" />
          </div>,
          summary.produkOvenKonvensional,
          false
        )}
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Stok Gudang
              </CardTitle>
              <CardDescription>Kelola stok bahan baku dan produk jadi di gudang</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { refetch(); refetchProses(); refetchPenjualan(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <BarangKeluarGudangDialog 
                stokTersedia={stokTersedia}
                onSuccess={() => { refetch(); refetchPenjualan(); }}
              />
              <OvenReportDialog 
                proses={proses} 
                companyName={profile?.nama_perusahaan || "Kelapa Organik"} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid grid-cols-6 w-full mb-4">
              <TabsTrigger value="bahan-masuk" className="flex items-center gap-1">
                <Package className="h-3 w-3 text-blue-600" />
                <span className="hidden sm:inline">Bahan</span> Masuk
              </TabsTrigger>
              <TabsTrigger value="hasil-oven" className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-600" />
                <span className="hidden sm:inline">Hasil</span> Oven
              </TabsTrigger>
              <TabsTrigger value="barang-keluar" className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3 text-blue-600" />
                <span className="hidden sm:inline">Brg</span> Keluar
              </TabsTrigger>
              <TabsTrigger value="bahan-baku-organik" className="flex items-center gap-1">
                <Leaf className="h-3 w-3 text-emerald-600" />
                <span className="hidden sm:inline">BB</span> Org
              </TabsTrigger>
              <TabsTrigger value="bahan-baku-konv" className="flex items-center gap-1">
                <Factory className="h-3 w-3 text-slate-600" />
                <span className="hidden sm:inline">BB</span> Konv
              </TabsTrigger>
              <TabsTrigger value="produk-jadi" className="flex items-center gap-1">
                <Package className="h-3 w-3 text-purple-600" />
                <span className="hidden sm:inline">Produk</span> Jadi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bahan-masuk">
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Leaf className="h-3 w-3 mr-1" />
                    Organik: {batchSummary.organik.total.toLocaleString()} Kg ({batchSummary.organik.count} batch)
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    <Factory className="h-3 w-3 mr-1" />
                    Konvensional: {batchSummary.konvensional.total.toLocaleString()} Kg ({batchSummary.konvensional.count} batch)
                  </Badge>
                </div>
                
                {batches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada data bahan masuk dari penerimaan
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Organic Section */}
                    {categorizedBatches.organik.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-emerald-700">
                          <Leaf className="h-4 w-4" />
                          Bahan Baku Organik ({categorizedBatches.organik.length} batch)
                        </h3>
                        {renderBatchTable(categorizedBatches.organik, "Tidak ada data")}
                      </div>
                    )}
                    
                    {/* Conventional Section */}
                    {categorizedBatches.konvensional.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-slate-700">
                          <Factory className="h-4 w-4" />
                          Bahan Baku Konvensional ({categorizedBatches.konvensional.length} batch)
                        </h3>
                        {renderBatchTable(categorizedBatches.konvensional, "Tidak ada data")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="hasil-oven">
              {renderOvenResultsTable()}
            </TabsContent>

            <TabsContent value="barang-keluar">
              {renderPenjualanTable()}
            </TabsContent>

            <TabsContent value="bahan-baku-organik">
              {renderStokTable(
                categorizedStok.bahanBakuOrganik,
                "Belum ada data bahan baku organik di gudang"
              )}
            </TabsContent>

            <TabsContent value="bahan-baku-konv">
              {renderStokTable(
                categorizedStok.bahanBakuKonvensional,
                "Belum ada data bahan baku konvensional di gudang"
              )}
            </TabsContent>

            <TabsContent value="produk-jadi">
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Leaf className="h-3 w-3 mr-1" />
                    Organik: {summary.produkOvenOrganik.tersimpan.toLocaleString()} Kg
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    <Factory className="h-3 w-3 mr-1" />
                    Konvensional: {summary.produkOvenKonvensional.tersimpan.toLocaleString()} Kg
                  </Badge>
                </div>
                {renderStokTable(
                  [...categorizedStok.produkOvenOrganik, ...categorizedStok.produkOvenKonvensional],
                  "Belum ada data produk jadi di gudang"
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
