import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Warehouse, Leaf, Factory, Package, Flame, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useGudangStok, useBatchPanen, useProsesPengeringan, GudangStok } from "@/hooks/use-batch-panen";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const GudangTab = () => {
  const { stok, loading, addStok, refetch } = useGudangStok();
  const { batches } = useBatchPanen();
  const { proses } = useProsesPengeringan();
  
  const [activeSubTab, setActiveSubTab] = useState("hasil-oven");

  // Separate stok by type and organic status
  const categorizedStok = useMemo(() => {
    return {
      bahanBakuOrganik: stok.filter(s => s.tipe_stok === 'bahan_baku' && s.is_organic === true),
      bahanBakuKonvensional: stok.filter(s => s.tipe_stok === 'bahan_baku' && s.is_organic === false),
      produkOvenOrganik: stok.filter(s => s.tipe_stok === 'produk_jadi' && s.is_organic === true),
      produkOvenKonvensional: stok.filter(s => s.tipe_stok === 'produk_jadi' && s.is_organic === false),
    };
  }, [stok]);

  // Calculate summary stats
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

  // Get oven process data with detailed info
  const ovenProcessData = useMemo(() => {
    return proses.filter(p => p.status === 'selesai').map(p => {
      const batch = batches.find(b => b.id === p.batch_id);
      const stokEntry = stok.find(s => s.batch_id === p.batch_id && s.tipe_stok === 'produk_jadi');
      return {
        ...p,
        batch,
        stokEntry,
      };
    });
  }, [proses, batches, stok]);

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lot Number</TableHead>
            <TableHead>Tanggal Selesai</TableHead>
            <TableHead>Bahan Masuk</TableHead>
            <TableHead>Susut (%)</TableHead>
            <TableHead>Total Kering</TableHead>
            <TableHead>QC Off</TableHead>
            <TableHead>Hasil Packing</TableHead>
            <TableHead>Status Gudang</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {completedProses.map((item) => {
            const stokEntry = stok.find(s => s.batch_id === item.batch_id && s.tipe_stok === 'produk_jadi');
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-mono font-medium">{item.lot_number || "-"}</p>
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
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {item.tanggal_selesai 
                    ? format(new Date(item.tanggal_selesai), "dd MMM yyyy HH:mm", { locale: localeId })
                    : "-"
                  }
                </TableCell>
                <TableCell className="font-medium">{Number(item.jumlah_kg_sebelum).toLocaleString()} Kg</TableCell>
                <TableCell>
                  <span className="text-orange-600">{item.susut_persen || 0}%</span>
                </TableCell>
                <TableCell className="font-medium">{Number(item.total_kering || 0).toLocaleString()} Kg</TableCell>
                <TableCell>
                  <span className="text-red-600">{Number(item.qc_off || 0).toLocaleString()} Kg</span>
                  {item.susut_qc_off_persen && (
                    <span className="text-xs text-muted-foreground ml-1">({item.susut_qc_off_persen}%)</span>
                  )}
                </TableCell>
                <TableCell className="font-bold text-emerald-600">
                  {Number(item.total_kering_packing || 0).toLocaleString()} Kg
                </TableCell>
                <TableCell>
                  {stokEntry ? (
                    <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      <Package className="h-3 w-3 mr-1" />
                      Di Gudang
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Belum Masuk</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderSummaryCard = (title: string, icon: React.ReactNode, stats: { total: number; tersimpan: number; keluar: number }, isOrganic: boolean) => (
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
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <ArrowDownToLine className="h-3 w-3" /> Tersimpan:
            </span>
            <span className="font-medium text-emerald-600">{stats.tersimpan.toLocaleString()} Kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <ArrowUpFromLine className="h-3 w-3" /> Keluar:
            </span>
            <span className="font-medium text-orange-600">{stats.keluar.toLocaleString()} Kg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderSummaryCard(
          "Bahan Baku Organik",
          <div className="p-2 rounded-lg bg-emerald-100">
            <Package className="h-4 w-4 text-emerald-600" />
          </div>,
          summary.bahanBakuOrganik,
          true
        )}
        {renderSummaryCard(
          "Bahan Baku Konvensional",
          <div className="p-2 rounded-lg bg-slate-100">
            <Package className="h-4 w-4 text-slate-600" />
          </div>,
          summary.bahanBakuKonvensional,
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
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid grid-cols-5 w-full mb-4">
              <TabsTrigger value="hasil-oven" className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-600" />
                <span className="hidden sm:inline">Hasil</span> Oven
              </TabsTrigger>
              <TabsTrigger value="bahan-baku-organik" className="flex items-center gap-1">
                <Leaf className="h-3 w-3 text-emerald-600" />
                <span className="hidden sm:inline">BB</span> Organik
              </TabsTrigger>
              <TabsTrigger value="bahan-baku-konv" className="flex items-center gap-1">
                <Factory className="h-3 w-3 text-slate-600" />
                <span className="hidden sm:inline">BB</span> Konv.
              </TabsTrigger>
              <TabsTrigger value="produk-organik" className="flex items-center gap-1">
                <Leaf className="h-3 w-3 text-emerald-600" />
                <span className="hidden sm:inline">Produk</span> Org.
              </TabsTrigger>
              <TabsTrigger value="produk-konv" className="flex items-center gap-1">
                <Factory className="h-3 w-3 text-slate-600" />
                <span className="hidden sm:inline">Produk</span> Konv.
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hasil-oven">
              {renderOvenResultsTable()}
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

            <TabsContent value="produk-organik">
              {renderStokTable(
                categorizedStok.produkOvenOrganik,
                "Belum ada data produk oven organik di gudang"
              )}
            </TabsContent>

            <TabsContent value="produk-konv">
              {renderStokTable(
                categorizedStok.produkOvenKonvensional,
                "Belum ada data produk oven konvensional di gudang"
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
