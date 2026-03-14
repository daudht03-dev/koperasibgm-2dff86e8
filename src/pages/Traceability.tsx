import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, ArrowLeft, Tag, Package, Flame, Warehouse, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Circle, MapPin, Leaf, Factory } from "lucide-react";
import { usePenjualanPetani } from "@/hooks/use-penjualan-petani";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { useBatchPanen, useProsesPengeringan, useGudangStok } from "@/hooks/use-batch-panen";
import { useFarmers } from "@/hooks/use-farmers";
import { usePengepul } from "@/hooks/use-pengepul";
import { generateProductCode } from "@/lib/product-code";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Link } from "react-router-dom";

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
  is_organic?: boolean;
  daily_values?: number[];
  daily_dates?: string[];
  product_codes?: ProductCodeEntry[];
}

interface TraceStage {
  stage: string;
  label: string;
  icon: React.ReactNode;
  date: string | null;
  details: string;
  weight: number | null;
  found: boolean;
  extra?: Record<string, string>;
}

const ensureProductCodes = (f: FarmerDetail): ProductCodeEntry[] => {
  if (Array.isArray(f.product_codes) && f.product_codes.length > 0) return f.product_codes;
  if (Array.isArray(f.daily_values) && Array.isArray(f.daily_dates) && f.daily_dates.length > 0) {
    let seq = 1;
    const codes: ProductCodeEntry[] = [];
    for (let i = 0; i < f.daily_values.length; i++) {
      const val = f.daily_values[i];
      if (val <= 0) continue;
      const dateStr = f.daily_dates[i];
      if (!dateStr) continue;
      codes.push({ date: dateStr, value: Math.round(val * 10) / 10, code: generateProductCode(f.petani_kode, dateStr, seq++) });
    }
    if (codes.length > 0) return codes;
  }
  if (f.jumlah_kg > 0 && f.petani_kode) {
    return [{ date: '', value: Math.round(f.jumlah_kg * 10) / 10, code: `${f.petani_kode}-BULK` }];
  }
  return [];
};

// Collect all product codes from JSON detail_petani
const extractCodesFromDetail = (detail: unknown): ProductCodeEntry[] => {
  if (!Array.isArray(detail)) return [];
  const codes: ProductCodeEntry[] = [];
  for (const f of detail as FarmerDetail[]) {
    codes.push(...ensureProductCodes(f));
  }
  return codes;
};

const Traceability = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const { penjualanList: penjualanPetani } = usePenjualanPetani();
  const { pengambilanList: pengambilan } = usePengambilanKoperasi();
  const { batches } = useBatchPanen();
  const { proses } = useProsesPengeringan();
  const { stok } = useGudangStok();
  const { farmers } = useFarmers();
  const { pengepulList } = usePengepul();

  // Build index: code → appearances across all stages
  const allCodes = useMemo(() => {
    const codeSet = new Map<string, { farmerName: string; farmerCode: string; isOrganic: boolean; weight: number }>();

    // From penjualan_petani (barang masuk) – codes generated from farmer daily sales
    for (const sale of penjualanPetani) {
      const farmer = farmers.find(f => f.id === sale.petani_id);
      if (!farmer) continue;
      const code = generateProductCode(farmer.kode_petani, sale.tanggal_jual, 1);
      if (!codeSet.has(code)) {
        codeSet.set(code, {
          farmerName: farmer.nama,
          farmerCode: farmer.kode_petani,
          isOrganic: sale.is_organic ?? true,
          weight: sale.jumlah_kg,
        });
      }
    }

    // From pengambilan_koperasi (barang keluar) detail_petani
    for (const pk of pengambilan) {
      const codes = extractCodesFromDetail(pk.detail_petani);
      for (const c of codes) {
        if (!codeSet.has(c.code)) {
          codeSet.set(c.code, { farmerName: '', farmerCode: c.code.split('-')[0] || '', isOrganic: pk.is_organic ?? true, weight: c.value });
        }
      }
    }

    // From batch_panen (penerimaan) detail_petani
    for (const batch of batches) {
      const codes = extractCodesFromDetail(batch.detail_petani);
      for (const c of codes) {
        if (!codeSet.has(c.code)) {
          codeSet.set(c.code, { farmerName: '', farmerCode: c.code.split('-')[0] || '', isOrganic: batch.is_organic ?? true, weight: c.value });
        }
      }
    }

    // From proses_pengeringan detail_petani
    for (const p of proses) {
      const codes = extractCodesFromDetail(p.detail_petani);
      for (const c of codes) {
        if (!codeSet.has(c.code)) {
          codeSet.set(c.code, { farmerName: '', farmerCode: c.code.split('-')[0] || '', isOrganic: p.is_organic ?? true, weight: c.value });
        }
      }
    }

    return codeSet;
  }, [penjualanPetani, pengambilan, batches, proses, farmers]);

  // Filter codes by search
  const filteredCodes = useMemo(() => {
    if (!searchQuery.trim()) return Array.from(allCodes.entries()).slice(0, 50);
    const q = searchQuery.toLowerCase();
    return Array.from(allCodes.entries()).filter(([code, info]) =>
      code.toLowerCase().includes(q) || info.farmerName.toLowerCase().includes(q) || info.farmerCode.toLowerCase().includes(q)
    );
  }, [allCodes, searchQuery]);

  // Build timeline for selected code
  const timeline = useMemo((): TraceStage[] | null => {
    if (!selectedCode) return null;

    const stages: TraceStage[] = [];
    const codeInfo = allCodes.get(selectedCode);
    const farmerCode = selectedCode.split('-')[0] || '';

    // 1. Barang Masuk (penjualan_petani)
    const matchingSale = penjualanPetani.find(sale => {
      const farmer = farmers.find(f => f.id === sale.petani_id);
      if (!farmer) return false;
      return generateProductCode(farmer.kode_petani, sale.tanggal_jual, 1) === selectedCode;
    });
    const salefarmer = matchingSale ? farmers.find(f => f.id === matchingSale.petani_id) : null;
    stages.push({
      stage: "barang_masuk",
      label: "Barang Masuk",
      icon: <ArrowDownToLine className="h-5 w-5" />,
      date: matchingSale ? matchingSale.tanggal_jual : null,
      details: matchingSale && salefarmer ? `${salefarmer.nama} → Pengepul` : "Belum tercatat",
      weight: matchingSale ? matchingSale.jumlah_kg : null,
      found: !!matchingSale,
      extra: matchingSale ? { kualitas: matchingSale.kualitas || '-' } : undefined,
    });

    // 2. Barang Keluar (pengambilan_koperasi)
    const matchingPK = pengambilan.find(pk => {
      const codes = extractCodesFromDetail(pk.detail_petani);
      return codes.some(c => c.code === selectedCode);
    });
    const matchingPKCode = matchingPK ? extractCodesFromDetail(matchingPK.detail_petani).find(c => c.code === selectedCode) : null;
    stages.push({
      stage: "barang_keluar",
      label: "Barang Keluar",
      icon: <ArrowUpFromLine className="h-5 w-5" />,
      date: matchingPK ? matchingPK.tanggal_ambil : null,
      details: matchingPK ? `Lot: ${matchingPK.lot_number || '-'}` : "Belum diproses",
      weight: matchingPKCode ? matchingPKCode.value : null,
      found: !!matchingPK,
      extra: matchingPK ? { lot: matchingPK.lot_number || '-' } : undefined,
    });

    // 3. Penerimaan (batch_panen)
    const matchingBatch = batches.find(b => {
      const codes = extractCodesFromDetail(b.detail_petani);
      return codes.some(c => c.code === selectedCode);
    });
    const matchingBatchCode = matchingBatch ? extractCodesFromDetail(matchingBatch.detail_petani).find(c => c.code === selectedCode) : null;
    stages.push({
      stage: "penerimaan",
      label: "Penerimaan",
      icon: <Package className="h-5 w-5" />,
      date: matchingBatch ? matchingBatch.tanggal_penerimaan : null,
      details: matchingBatch ? `Batch: ${matchingBatch.batch_number}` : "Belum diterima",
      weight: matchingBatchCode ? matchingBatchCode.value : null,
      found: !!matchingBatch,
      extra: matchingBatch ? { batch: matchingBatch.batch_number, status: matchingBatch.status || '-' } : undefined,
    });

    // 4. Pengovenan (proses_pengeringan)
    const matchingOven = proses.find(p => {
      const codes = extractCodesFromDetail(p.detail_petani);
      return codes.some(c => c.code === selectedCode);
    });
    const matchingOvenCode = matchingOven ? extractCodesFromDetail(matchingOven.detail_petani).find(c => c.code === selectedCode) : null;
    stages.push({
      stage: "pengovenan",
      label: "Pengovenan",
      icon: <Flame className="h-5 w-5" />,
      date: matchingOven ? matchingOven.tanggal_mulai : null,
      details: matchingOven ? `Lot: ${matchingOven.lot_number || '-'} · ${matchingOven.status || '-'}` : "Belum dioven",
      weight: matchingOvenCode ? matchingOvenCode.value : null,
      found: !!matchingOven,
      extra: matchingOven ? {
        lot: matchingOven.lot_number || '-',
        operator: matchingOven.operator || '-',
        status: matchingOven.status || '-',
        suhu: matchingOven.suhu_oven ? `${matchingOven.suhu_oven}°C` : '-',
      } : undefined,
    });

    // 5. Gudang (gudang_stok) – match via batch_id
    const relatedBatchId = matchingBatch?.id || matchingOven?.batch_id;
    const matchingGudang = relatedBatchId ? stok.find(s => s.batch_id === relatedBatchId) : null;
    stages.push({
      stage: "gudang",
      label: "Gudang",
      icon: <Warehouse className="h-5 w-5" />,
      date: matchingGudang ? matchingGudang.tanggal_masuk : null,
      details: matchingGudang ? `${matchingGudang.lokasi_gudang} · Rak: ${matchingGudang.rak_posisi || '-'}` : "Belum masuk gudang",
      weight: matchingGudang ? matchingGudang.jumlah_kg : null,
      found: !!matchingGudang,
      extra: matchingGudang ? {
        lokasi: matchingGudang.lokasi_gudang,
        rak: matchingGudang.rak_posisi || '-',
        status: matchingGudang.status || '-',
        tipe: matchingGudang.tipe_stok === 'produk_jadi' ? 'Produk Jadi' : 'Bahan Baku',
      } : undefined,
    });

    return stages;
  }, [selectedCode, allCodes, penjualanPetani, pengambilan, batches, proses, stok, farmers]);

  const completedStages = timeline?.filter(s => s.found).length || 0;
  const totalStages = timeline?.length || 5;
  const codeInfo = selectedCode ? allCodes.get(selectedCode) : null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'd MMM yyyy', { locale: localeId });
    } catch {
      return dateStr;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-natural">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/admin/harvest-management">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Traceability</h1>
              <p className="text-sm text-muted-foreground">Lacak perjalanan produk dari petani hingga gudang</p>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kode produk (contoh: BN6-100326-001) atau nama petani..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedCode(null);
                  }}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Code list */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kode Produk</CardTitle>
                <CardDescription>{filteredCodes.length} kode ditemukan</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1 px-4 pb-4">
                    {filteredCodes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {searchQuery ? "Tidak ditemukan" : "Belum ada data traceability"}
                      </p>
                    ) : (
                      filteredCodes.map(([code, info]) => (
                        <button
                          key={code}
                          onClick={() => setSelectedCode(code)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                            selectedCode === code
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-mono font-medium truncate">{code}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-5.5">
                            {info.isOrganic ? (
                              <Leaf className="h-3 w-3 text-green-600" />
                            ) : (
                              <Factory className="h-3 w-3 text-amber-600" />
                            )}
                            <span className={`text-xs ${selectedCode === code ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {info.farmerName || info.farmerCode} · {info.weight.toFixed(1)} Kg
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {selectedCode ? (
                        <span className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          <span className="font-mono">{selectedCode}</span>
                        </span>
                      ) : (
                        "Timeline Produk"
                      )}
                    </CardTitle>
                    {selectedCode && codeInfo && (
                      <CardDescription className="mt-1 flex items-center gap-2">
                        {codeInfo.isOrganic ? (
                          <Badge variant="secondary" className="text-xs">
                            <Leaf className="h-3 w-3 mr-1" /> Organik
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Factory className="h-3 w-3 mr-1" /> Konvensional
                          </Badge>
                        )}
                        <span>{codeInfo.farmerName || codeInfo.farmerCode}</span>
                        <span>· {codeInfo.weight.toFixed(1)} Kg</span>
                      </CardDescription>
                    )}
                  </div>
                  {selectedCode && (
                    <Badge variant="outline" className="text-xs">
                      {completedStages}/{totalStages} tahap
                    </Badge>
                  )}
                </div>
                {/* Progress bar */}
                {selectedCode && (
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(completedStages / totalStages) * 100}%` }}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedCode ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <MapPin className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">Pilih kode produk untuk melihat timeline</p>
                  </div>
                ) : timeline ? (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-border" />

                    <div className="space-y-1">
                      {timeline.map((stage, idx) => (
                        <div key={stage.stage} className="relative flex gap-4 py-4">
                          {/* Node */}
                          <div className={`relative z-10 flex items-center justify-center w-11 h-11 rounded-full border-2 shrink-0 transition-all ${
                            stage.found
                              ? "bg-primary border-primary text-primary-foreground shadow-md"
                              : "bg-muted border-border text-muted-foreground"
                          }`}>
                            {stage.found ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              stage.icon
                            )}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 rounded-lg border p-4 transition-all ${
                            stage.found
                              ? "bg-card border-primary/20 shadow-sm"
                              : "bg-muted/30 border-dashed border-border"
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {stage.icon}
                                <span className={`font-semibold text-sm ${stage.found ? "text-foreground" : "text-muted-foreground"}`}>
                                  {stage.label}
                                </span>
                              </div>
                              {stage.found && (
                                <Badge variant="default" className="text-xs">
                                  ✓ Tercatat
                                </Badge>
                              )}
                            </div>

                            <p className={`text-sm ${stage.found ? "text-foreground" : "text-muted-foreground"}`}>
                              {stage.details}
                            </p>

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {stage.date && (
                                <span>📅 {formatDate(stage.date)}</span>
                              )}
                              {stage.weight !== null && (
                                <span>⚖️ {stage.weight.toFixed(1)} Kg</span>
                              )}
                            </div>

                            {/* Extra details */}
                            {stage.found && stage.extra && (
                              <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {Object.entries(stage.extra).map(([key, val]) => (
                                  <span key={key} className="capitalize">{key}: <strong className="text-foreground">{val}</strong></span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Traceability;
