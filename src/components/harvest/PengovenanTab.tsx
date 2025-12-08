import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Flame, Leaf, Factory, ChevronDown, ChevronRight, Users, AlertCircle, Package } from "lucide-react";
import { useProsesPengeringan, useBatchPanen, useGudangStok, ProsesPengeringan, PetaniDetailPengeringan } from "@/hooks/use-batch-panen";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface FarmerDetail {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  jumlah_kg: number;
  is_organic?: boolean;
}

export const PengovenanTab = () => {
  const { proses, loading, addProses, updateProses, refetch } = useProsesPengeringan();
  const { batches, refetch: refetchBatches } = useBatchPanen();
  const { addStok } = useGudangStok();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [form, setForm] = useState({
    suhu_oven: "",
    durasi_jam: "",
    kadar_air_awal: "",
    kadar_air_akhir: "",
    jumlah_kg_sebelum: "",
    jumlah_kg_sesudah: "",
    qc_off: "",
    operator: "",
    catatan: "",
  });

  // Get batches that are in penerimaan status (ready for drying)
  const availableBatches = useMemo(() => 
    batches.filter(b => b.status === 'penerimaan'),
    [batches]
  );

  // Get selected batch details
  const selectedBatch = useMemo(() => 
    batches.find(b => b.id === selectedBatchId),
    [batches, selectedBatchId]
  );

  // Get detail_petani from selected batch
  const batchFarmers = useMemo((): FarmerDetail[] => {
    if (!selectedBatch) return [];
    
    const detailPetani = (selectedBatch as any).detail_petani;
    if (!detailPetani || !Array.isArray(detailPetani)) return [];
    
    return detailPetani.map((f: any) => ({
      petani_id: f.petani_id || f.id || '',
      petani_nama: f.petani_nama || f.name || 'Unknown',
      petani_kode: f.petani_kode || f.code || '-',
      jumlah_kg: f.jumlah_kg || f.kg || 0,
      is_organic: f.is_organic ?? f.isOrganic ?? true,
    }));
  }, [selectedBatch]);

  // Calculate totals from selected farmers
  const selectedTotalKg = useMemo(() => {
    return batchFarmers
      .filter(f => selectedFarmers.has(f.petani_id))
      .reduce((sum, f) => sum + f.jumlah_kg, 0);
  }, [batchFarmers, selectedFarmers]);

  // Auto-calculate susut values
  const calculateSusut = () => {
    const sebelum = parseFloat(form.jumlah_kg_sebelum) || 0;
    const sesudah = parseFloat(form.jumlah_kg_sesudah) || 0;
    const qcOff = parseFloat(form.qc_off) || 0;
    
    const susutKg = sebelum - sesudah;
    const susutPersen = sebelum > 0 ? (susutKg / sebelum) * 100 : 0;
    const totalKering = sesudah;
    const totalKeringPacking = sesudah - qcOff;
    const susutQcOffPersen = sesudah > 0 ? (qcOff / sesudah) * 100 : 0;
    
    return {
      penyusutan_kg: susutKg,
      susut_persen: susutPersen,
      total_kering: totalKering,
      total_kering_packing: totalKeringPacking,
      susut_qc_off_persen: susutQcOffPersen,
    };
  };

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    setSelectedFarmers(new Set());
    
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      // Auto-populate jumlah_kg_sebelum from batch
      setForm(prev => ({
        ...prev,
        jumlah_kg_sebelum: String(batch.jumlah_kg),
      }));
      
      // Auto-select all farmers
      const detailPetani = (batch as any).detail_petani;
      if (detailPetani && Array.isArray(detailPetani)) {
        const farmerIds = new Set<string>();
        detailPetani.forEach((f: any) => {
          const id = f.petani_id || f.id;
          if (id) farmerIds.add(id);
        });
        setSelectedFarmers(farmerIds);
      }
    }
  };

  const toggleFarmer = (farmerId: string) => {
    setSelectedFarmers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(farmerId)) {
        newSet.delete(farmerId);
      } else {
        newSet.add(farmerId);
      }
      return newSet;
    });
  };

  const selectAllFarmers = () => {
    if (selectedFarmers.size === batchFarmers.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(batchFarmers.map(f => f.petani_id)));
    }
  };

  const resetForm = () => {
    setForm({
      suhu_oven: "",
      durasi_jam: "",
      kadar_air_awal: "",
      kadar_air_akhir: "",
      jumlah_kg_sebelum: "",
      jumlah_kg_sesudah: "",
      qc_off: "",
      operator: "",
      catatan: "",
    });
    setSelectedBatchId("");
    setSelectedFarmers(new Set());
  };

  const handleSubmit = async () => {
    if (!selectedBatchId || !selectedBatch) {
      toast({
        title: "Error",
        description: "Pilih batch terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const susutCalc = calculateSusut();
    const isOrganic = selectedBatch.is_organic ?? true;
    
    // Prepare farmer details
    const farmerDetails: PetaniDetailPengeringan[] = batchFarmers
      .filter(f => selectedFarmers.has(f.petani_id))
      .map(f => ({
        petani_id: f.petani_id,
        petani_nama: f.petani_nama,
        petani_kode: f.petani_kode,
        jumlah_kg: f.jumlah_kg,
        is_organic: isOrganic,
      }));

    // Generate lot number
    const today = format(new Date(), "yyyyMMdd");
    const existingLotsToday = proses.filter(p => p.lot_number?.startsWith(`OVEN-${today}`)).length;
    const lotNumber = `OVEN-${today}-${String(existingLotsToday + 1).padStart(3, '0')}`;

    await addProses({
      batch_id: selectedBatchId,
      lot_number: lotNumber,
      tanggal_mulai: new Date().toISOString(),
      tanggal_selesai: null,
      suhu_oven: form.suhu_oven ? parseFloat(form.suhu_oven) : null,
      durasi_jam: form.durasi_jam ? parseFloat(form.durasi_jam) : null,
      kadar_air_awal: form.kadar_air_awal ? parseFloat(form.kadar_air_awal) : null,
      kadar_air_akhir: form.kadar_air_akhir ? parseFloat(form.kadar_air_akhir) : null,
      jumlah_kg_sebelum: parseFloat(form.jumlah_kg_sebelum),
      jumlah_kg_sesudah: form.jumlah_kg_sesudah ? parseFloat(form.jumlah_kg_sesudah) : null,
      qc_off: form.qc_off ? parseFloat(form.qc_off) : null,
      is_organic: isOrganic,
      detail_petani: farmerDetails,
      operator: form.operator || null,
      catatan: form.catatan || null,
      status: "proses",
      ...susutCalc,
    });

    resetForm();
    setDialogOpen(false);
    refetch();
  };

  const handleCompleteDrying = async (prosesItem: ProsesPengeringan) => {
    // Mark drying as complete
    await updateProses(prosesItem.id, {
      status: "selesai",
      tanggal_selesai: new Date().toISOString(),
    });
    
    // Auto-insert to gudang as "produk_jadi"
    const totalKeringPacking = prosesItem.total_kering_packing || prosesItem.jumlah_kg_sesudah || prosesItem.jumlah_kg_sebelum;
    
    await addStok({
      batch_id: prosesItem.batch_id,
      lokasi_gudang: "Gudang Utama",
      rak_posisi: null,
      tanggal_masuk: new Date().toISOString().split('T')[0],
      tanggal_keluar: null,
      jumlah_kg: Number(totalKeringPacking),
      kondisi_penyimpanan: null,
      suhu_gudang: null,
      kelembaban: null,
      tipe_stok: "produk_jadi",
      is_organic: prosesItem.is_organic ?? true,
      catatan: `Dari pengovenan lot ${prosesItem.lot_number || '-'}`,
      status: "tersimpan",
    });
    
    toast({
      title: "Berhasil",
      description: `Pengovenan selesai. ${Number(totalKeringPacking).toLocaleString()} Kg produk jadi ditambahkan ke gudang.`,
    });
    
    refetch();
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get detail_petani as typed array
  const getDetailPetani = (p: ProsesPengeringan): PetaniDetailPengeringan[] => {
    if (Array.isArray(p.detail_petani)) {
      return p.detail_petani as PetaniDetailPengeringan[];
    }
    return [];
  };

  if (loading) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  return (
    <Card className="border-organic-light/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Proses Pengovenan
            </CardTitle>
            <CardDescription>Kelola proses pengeringan dengan perhitungan susut</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-organic">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Proses
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Tambah Proses Pengovenan</DialogTitle>
                <DialogDescription>Pilih batch dan petani untuk proses pengeringan</DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* Batch Selection */}
                  <div>
                    <Label>Pilih Batch Penerimaan *</Label>
                    {availableBatches.length === 0 ? (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Tidak ada batch dengan status "penerimaan". Buat batch baru di tab Penerimaan terlebih dahulu.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Select value={selectedBatchId} onValueChange={handleBatchChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBatches.map(batch => (
                            <SelectItem key={batch.id} value={batch.id}>
                              <div className="flex items-center gap-2">
                                {batch.is_organic ? (
                                  <Leaf className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Factory className="h-4 w-4 text-orange-500" />
                                )}
                                <span>{batch.batch_number}</span>
                                <span className="text-muted-foreground">- {batch.petani?.nama}</span>
                                <Badge variant="outline" className="ml-2">{batch.jumlah_kg} Kg</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Selected Batch Info */}
                  {selectedBatch && (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">{selectedBatch.batch_number}</span>
                        <Badge className={selectedBatch.is_organic ? 'bg-green-600' : 'bg-orange-500'}>
                          {selectedBatch.is_organic ? 'Organik' : 'Konvensional'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Petani: {selectedBatch.petani?.nama} | 
                        Total: {selectedBatch.jumlah_kg} Kg | 
                        Tanggal: {format(new Date(selectedBatch.tanggal_penerimaan), "dd MMM yyyy", { locale: localeId })}
                      </div>
                    </div>
                  )}

                  {/* Farmer Selection from Batch */}
                  {selectedBatchId && batchFarmers.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Pilih Petani untuk Dioven ({batchFarmers.length} petani)
                        </Label>
                        <Button variant="outline" size="sm" onClick={selectAllFarmers}>
                          {selectedFarmers.size === batchFarmers.length ? "Batalkan Semua" : "Pilih Semua"}
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-40 border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Petani</TableHead>
                              <TableHead>Kode</TableHead>
                              <TableHead>Jumlah (Kg)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batchFarmers.map(farmer => (
                              <TableRow 
                                key={farmer.petani_id}
                                className={selectedFarmers.has(farmer.petani_id) ? "bg-primary/5" : ""}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedFarmers.has(farmer.petani_id)}
                                    onCheckedChange={() => toggleFarmer(farmer.petani_id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{farmer.petani_nama}</TableCell>
                                <TableCell>{farmer.petani_kode}</TableCell>
                                <TableCell>{farmer.jumlah_kg.toLocaleString()} Kg</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      
                      <div className="mt-3 p-3 bg-primary/5 rounded-md flex items-center justify-between">
                        <span className="text-sm">
                          <strong>{selectedFarmers.size}</strong> petani dipilih
                        </span>
                        <Badge variant="secondary" className="text-lg">
                          Total: {selectedTotalKg.toLocaleString()} Kg
                        </Badge>
                      </div>
                    </div>
                  )}

                  {selectedBatchId && batchFarmers.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Batch ini tidak memiliki data detail petani. Pastikan batch dibuat dari Barang Keluar yang memiliki data petani.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Drying Parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Jumlah Sebelum (Kg) *</Label>
                      <Input
                        type="number"
                        value={form.jumlah_kg_sebelum}
                        onChange={(e) => setForm(prev => ({ ...prev, jumlah_kg_sebelum: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Jumlah Sesudah (Kg)</Label>
                      <Input
                        type="number"
                        value={form.jumlah_kg_sesudah}
                        onChange={(e) => setForm(prev => ({ ...prev, jumlah_kg_sesudah: e.target.value }))}
                        placeholder="Diisi setelah proses selesai"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Suhu Oven (°C)</Label>
                      <Input
                        type="number"
                        value={form.suhu_oven}
                        onChange={(e) => setForm(prev => ({ ...prev, suhu_oven: e.target.value }))}
                        placeholder="70"
                      />
                    </div>
                    <div>
                      <Label>Durasi (Jam)</Label>
                      <Input
                        type="number"
                        value={form.durasi_jam}
                        onChange={(e) => setForm(prev => ({ ...prev, durasi_jam: e.target.value }))}
                        placeholder="24"
                      />
                    </div>
                    <div>
                      <Label>Kadar Air Awal (%)</Label>
                      <Input
                        type="number"
                        value={form.kadar_air_awal}
                        onChange={(e) => setForm(prev => ({ ...prev, kadar_air_awal: e.target.value }))}
                        placeholder="40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>QC Off (Kg)</Label>
                      <Input
                        type="number"
                        value={form.qc_off}
                        onChange={(e) => setForm(prev => ({ ...prev, qc_off: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Operator</Label>
                      <Input
                        value={form.operator}
                        onChange={(e) => setForm(prev => ({ ...prev, operator: e.target.value }))}
                        placeholder="Nama operator"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Catatan</Label>
                    <Textarea
                      value={form.catatan}
                      onChange={(e) => setForm(prev => ({ ...prev, catatan: e.target.value }))}
                      placeholder="Catatan tambahan..."
                    />
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Batal
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="bg-gradient-organic"
                  disabled={!selectedBatchId || !form.jumlah_kg_sebelum}
                >
                  Mulai Pengovenan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {proses.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Belum ada proses pengovenan</p>
            <p className="text-sm text-muted-foreground mt-1">Klik "Tambah Proses" untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proses.map((p) => {
              const isExpanded = expandedRows.has(p.id);
              const detailPetani = getDetailPetani(p);
              const susutCalc = {
                penyusutan: p.penyusutan_kg ?? 0,
                susutPersen: p.susut_persen ?? 0,
                totalKering: p.total_kering ?? p.jumlah_kg_sesudah ?? 0,
                totalKeringPacking: p.total_kering_packing ?? 0,
              };

              return (
                <Collapsible key={p.id} open={isExpanded} onOpenChange={() => toggleRow(p.id)}>
                  <Card className={`border-l-4 ${p.is_organic ? 'border-l-green-500' : 'border-l-orange-500'}`}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div className="text-left">
                              <CardTitle className="text-base flex items-center gap-2">
                                {p.lot_number || 'LOT-???'}
                                <Badge className={p.is_organic ? 'bg-green-600' : 'bg-orange-500'}>
                                  {p.is_organic ? <Leaf className="h-3 w-3 mr-1" /> : <Factory className="h-3 w-3 mr-1" />}
                                  {p.is_organic ? 'Organik' : 'Konvensional'}
                                </Badge>
                                <Badge variant={p.status === 'selesai' ? 'default' : 'secondary'}>
                                  {p.status === 'selesai' ? 'Selesai' : 'Proses'}
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                Mulai: {format(new Date(p.tanggal_mulai), "dd MMM yyyy HH:mm", { locale: localeId })}
                                {p.tanggal_selesai && ` | Selesai: ${format(new Date(p.tanggal_selesai), "dd MMM yyyy HH:mm", { locale: localeId })}`}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{Number(p.jumlah_kg_sebelum).toLocaleString()} Kg</p>
                            <p className="text-sm text-muted-foreground">
                              {p.jumlah_kg_sesudah ? `→ ${Number(p.jumlah_kg_sesudah).toLocaleString()} Kg` : 'Belum selesai'}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        {/* Drying Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Suhu Oven</p>
                            <p className="font-medium">{p.suhu_oven ?? '-'} °C</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Durasi</p>
                            <p className="font-medium">{p.durasi_jam ?? '-'} Jam</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Kadar Air Awal</p>
                            <p className="font-medium">{p.kadar_air_awal ?? '-'}%</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Kadar Air Akhir</p>
                            <p className="font-medium">{p.kadar_air_akhir ?? '-'}%</p>
                          </div>
                        </div>

                        {/* Shrinkage Calculation */}
                        {p.jumlah_kg_sesudah && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                              <p className="text-xs text-orange-600">Penyusutan</p>
                              <p className="font-medium">{Number(susutCalc.penyusutan).toLocaleString()} Kg ({Number(susutCalc.susutPersen).toFixed(1)}%)</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                              <p className="text-xs text-blue-600">Total Kering</p>
                              <p className="font-medium">{Number(susutCalc.totalKering).toLocaleString()} Kg</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                              <p className="text-xs text-purple-600">QC Off</p>
                              <p className="font-medium">{Number(p.qc_off ?? 0).toLocaleString()} Kg ({Number(p.susut_qc_off_persen ?? 0).toFixed(1)}%)</p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                              <p className="text-xs text-green-600">Total Kering Packing</p>
                              <p className="font-medium">{Number(susutCalc.totalKeringPacking).toLocaleString()} Kg</p>
                            </div>
                          </div>
                        )}

                        {/* Farmer Details */}
                        {detailPetani.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Detail Petani ({detailPetani.length})
                            </p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Petani</TableHead>
                                  <TableHead>Kode</TableHead>
                                  <TableHead>Tipe</TableHead>
                                  <TableHead>Jumlah (Kg)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {detailPetani.map((farmer, idx) => (
                                  <TableRow key={`${farmer.petani_id}-${idx}`}>
                                    <TableCell className="font-medium">{farmer.petani_nama}</TableCell>
                                    <TableCell>{farmer.petani_kode}</TableCell>
                                    <TableCell>
                                      {farmer.is_organic ? (
                                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">O</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">K</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>{farmer.jumlah_kg.toLocaleString()} Kg</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Actions */}
                        {p.status !== 'selesai' && (
                          <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              onClick={() => handleCompleteDrying(p)}
                              disabled={!p.jumlah_kg_sesudah}
                            >
                              <Flame className="h-4 w-4 mr-2" />
                              Selesaikan Pengovenan
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
