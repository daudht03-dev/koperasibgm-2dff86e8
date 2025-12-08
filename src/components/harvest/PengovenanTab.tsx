import { useState, useEffect, useMemo } from "react";
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
import { Plus, Flame, Leaf, Factory, ChevronDown, ChevronRight, Users, Calculator, Package } from "lucide-react";
import { useProsesPengeringan, useBatchPanen, useGudangStok, ProsesPengeringan, PetaniDetailPengeringan } from "@/hooks/use-batch-panen";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { format, startOfWeek, getWeek, getYear } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface LotOption {
  lotNumber: string;
  weekNumber: number;
  year: number;
  isOrganic: boolean;
  pickupDate: string;
  totalKg: number;
  items: Array<{
    id: string;
    pengepul_id: string;
    pengepul_nama: string;
    jumlah_kg: number;
    detail_petani: Array<{
      petani_id: string;
      petani_nama: string;
      petani_kode: string;
      jumlah_kg: number;
    }>;
  }>;
}

export const PengovenanTab = () => {
  const { proses, loading, addProses, updateProses, refetch } = useProsesPengeringan();
  const { batches } = useBatchPanen();
  const { pengambilanList } = usePengambilanKoperasi();
  const { addStok } = useGudangStok();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<LotOption | null>(null);
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [form, setForm] = useState({
    batch_id: "",
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

  // Generate lot options from pengambilan_koperasi
  const lotOptions = useMemo(() => {
    const lots: LotOption[] = [];
    const lotMap = new Map<string, LotOption>();

    pengambilanList.forEach(item => {
      const pickupDate = new Date(item.tanggal_ambil);
      const weekStart = startOfWeek(pickupDate, { weekStartsOn: 1 });
      const weekNumber = getWeek(pickupDate, { weekStartsOn: 1 });
      const year = getYear(pickupDate);
      const isOrganic = item.is_organic ?? true;
      
      const lotKey = `LOT-${year}-W${String(weekNumber).padStart(2, '0')}-${isOrganic ? 'ORG' : 'CONV'}`;
      
      const detailPetani = Array.isArray(item.detail_petani) 
        ? item.detail_petani as Array<{petani_id: string; petani_nama: string; petani_kode: string; jumlah_kg: number}>
        : [];
      
      if (lotMap.has(lotKey)) {
        const existing = lotMap.get(lotKey)!;
        existing.totalKg += Number(item.jumlah_kg);
        existing.items.push({
          id: item.id,
          pengepul_id: item.pengepul_id,
          pengepul_nama: item.pengepul?.nama || 'Unknown',
          jumlah_kg: Number(item.jumlah_kg),
          detail_petani: detailPetani,
        });
      } else {
        lotMap.set(lotKey, {
          lotNumber: lotKey,
          weekNumber,
          year,
          isOrganic,
          pickupDate: item.tanggal_ambil,
          totalKg: Number(item.jumlah_kg),
          items: [{
            id: item.id,
            pengepul_id: item.pengepul_id,
            pengepul_nama: item.pengepul?.nama || 'Unknown',
            jumlah_kg: Number(item.jumlah_kg),
            detail_petani: detailPetani,
          }],
        });
      }
    });

    return Array.from(lotMap.values()).sort((a, b) => b.lotNumber.localeCompare(a.lotNumber));
  }, [pengambilanList]);

  // Get all farmers from selected lot
  const allFarmersFromLot = useMemo(() => {
    if (!selectedLot) return [];
    
    const farmerMap = new Map<string, { petani_id: string; petani_nama: string; petani_kode: string; jumlah_kg: number }>();
    
    selectedLot.items.forEach(item => {
      item.detail_petani.forEach(farmer => {
        if (farmerMap.has(farmer.petani_id)) {
          const existing = farmerMap.get(farmer.petani_id)!;
          existing.jumlah_kg += farmer.jumlah_kg;
        } else {
          farmerMap.set(farmer.petani_id, { ...farmer });
        }
      });
    });
    
    return Array.from(farmerMap.values());
  }, [selectedLot]);

  // Calculate totals from selected farmers
  const selectedTotalKg = useMemo(() => {
    return allFarmersFromLot
      .filter(f => selectedFarmers.has(f.petani_id))
      .reduce((sum, f) => sum + f.jumlah_kg, 0);
  }, [allFarmersFromLot, selectedFarmers]);

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

  const handleLotChange = (lotNumber: string) => {
    const lot = lotOptions.find(l => l.lotNumber === lotNumber);
    setSelectedLot(lot || null);
    setSelectedFarmers(new Set());
    
    if (lot) {
      // Auto-populate jumlah_kg_sebelum
      setForm(prev => ({
        ...prev,
        jumlah_kg_sebelum: lot.totalKg.toString(),
      }));
      // Select all farmers by default
      const allFarmerIds = new Set<string>();
      lot.items.forEach(item => {
        item.detail_petani.forEach(f => allFarmerIds.add(f.petani_id));
      });
      setSelectedFarmers(allFarmerIds);
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
    if (selectedFarmers.size === allFarmersFromLot.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(allFarmersFromLot.map(f => f.petani_id)));
    }
  };

  const resetForm = () => {
    setForm({
      batch_id: "",
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
    setSelectedLot(null);
    setSelectedFarmers(new Set());
  };

  const handleSubmit = async () => {
    if (!form.batch_id || !selectedLot) {
      toast({
        title: "Error",
        description: "Pilih batch dan lot terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const susutCalc = calculateSusut();
    
    // Prepare farmer details
    const farmerDetails: PetaniDetailPengeringan[] = allFarmersFromLot
      .filter(f => selectedFarmers.has(f.petani_id))
      .map(f => ({
        petani_id: f.petani_id,
        petani_nama: f.petani_nama,
        petani_kode: f.petani_kode,
        jumlah_kg: f.jumlah_kg,
        is_organic: selectedLot.isOrganic,
      }));

    await addProses({
      batch_id: form.batch_id,
      lot_number: selectedLot.lotNumber,
      tanggal_mulai: new Date().toISOString(),
      tanggal_selesai: null,
      suhu_oven: form.suhu_oven ? parseFloat(form.suhu_oven) : null,
      durasi_jam: form.durasi_jam ? parseFloat(form.durasi_jam) : null,
      kadar_air_awal: form.kadar_air_awal ? parseFloat(form.kadar_air_awal) : null,
      kadar_air_akhir: form.kadar_air_akhir ? parseFloat(form.kadar_air_akhir) : null,
      jumlah_kg_sebelum: parseFloat(form.jumlah_kg_sebelum),
      jumlah_kg_sesudah: form.jumlah_kg_sesudah ? parseFloat(form.jumlah_kg_sesudah) : null,
      qc_off: form.qc_off ? parseFloat(form.qc_off) : null,
      is_organic: selectedLot.isOrganic,
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
            <CardDescription>Kelola proses pengeringan dengan lot number dan perhitungan susut</CardDescription>
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
                <DialogDescription>Pilih lot dan petani untuk proses pengeringan</DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* Batch Selection */}
                  <div>
                    <Label>Batch Penerimaan *</Label>
                    <Select value={form.batch_id} onValueChange={(value) => setForm(prev => ({ ...prev, batch_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches
                          .filter(b => b.status === 'penerimaan')
                          .map(batch => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.batch_number} - {batch.petani?.nama} ({batch.jumlah_kg} Kg)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lot Selection */}
                  <div>
                    <Label>Pilih Lot *</Label>
                    <Select value={selectedLot?.lotNumber || ""} onValueChange={handleLotChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih lot" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotOptions.map(lot => (
                          <SelectItem key={lot.lotNumber} value={lot.lotNumber}>
                            <div className="flex items-center gap-2">
                              {lot.isOrganic ? (
                                <Leaf className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Factory className="h-4 w-4 text-slate-600" />
                              )}
                              <span>{lot.lotNumber}</span>
                              <Badge variant="outline" className="ml-2">{lot.totalKg.toLocaleString()} Kg</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Farmer Selection */}
                  {selectedLot && allFarmersFromLot.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Pilih Petani untuk Dioven
                        </Label>
                        <Button variant="outline" size="sm" onClick={selectAllFarmers}>
                          {selectedFarmers.size === allFarmersFromLot.length ? "Batalkan Semua" : "Pilih Semua"}
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
                            {allFarmersFromLot.map(farmer => (
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
                      <Label>Suhu Oven (°C)</Label>
                      <Input
                        type="number"
                        value={form.suhu_oven}
                        onChange={(e) => setForm(prev => ({ ...prev, suhu_oven: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Kadar Air Awal (%)</Label>
                      <Input
                        type="number"
                        value={form.kadar_air_awal}
                        onChange={(e) => setForm(prev => ({ ...prev, kadar_air_awal: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Durasi (Jam)</Label>
                      <Input
                        type="number"
                        value={form.durasi_jam}
                        onChange={(e) => setForm(prev => ({ ...prev, durasi_jam: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Jumlah Sesudah (Kg)</Label>
                      <Input
                        type="number"
                        value={form.jumlah_kg_sesudah}
                        onChange={(e) => setForm(prev => ({ ...prev, jumlah_kg_sesudah: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Kadar Air Akhir (%)</Label>
                      <Input
                        type="number"
                        value={form.kadar_air_akhir}
                        onChange={(e) => setForm(prev => ({ ...prev, kadar_air_akhir: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>QC Off (Kg)</Label>
                      <Input
                        type="number"
                        value={form.qc_off}
                        onChange={(e) => setForm(prev => ({ ...prev, qc_off: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Auto-calculated Susut Display */}
                  {(form.jumlah_kg_sebelum && form.jumlah_kg_sesudah) && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Calculator className="h-4 w-4" />
                        <Label className="font-medium">Perhitungan Susut (Otomatis)</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Penyusutan:</span>
                          <span className="font-medium ml-2">{calculateSusut().penyusutan_kg.toFixed(2)} Kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Susut (%):</span>
                          <span className="font-medium ml-2">{calculateSusut().susut_persen.toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Kering:</span>
                          <span className="font-medium ml-2">{calculateSusut().total_kering?.toFixed(2)} Kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Kering Packing:</span>
                          <span className="font-medium ml-2">{calculateSusut().total_kering_packing?.toFixed(2)} Kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Operator</Label>
                      <Input
                        value={form.operator}
                        onChange={(e) => setForm(prev => ({ ...prev, operator: e.target.value }))}
                        placeholder="Nama operator"
                      />
                    </div>
                    <div>
                      <Label>Catatan</Label>
                      <Textarea
                        value={form.catatan}
                        onChange={(e) => setForm(prev => ({ ...prev, catatan: e.target.value }))}
                        placeholder="Catatan tambahan"
                        rows={1}
                      />
                    </div>
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
                  disabled={!form.batch_id || !selectedLot || !form.jumlah_kg_sebelum}
                >
                  Simpan Proses
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {proses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada proses pengovenan</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Sebelum (Kg)</TableHead>
                <TableHead>Sesudah (Kg)</TableHead>
                <TableHead>Susut (%)</TableHead>
                <TableHead>QC Off</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proses.map(p => {
                const detailPetani = getDetailPetani(p);
                const isExpanded = expandedRows.has(p.id);
                
                return (
                  <Collapsible key={p.id} asChild open={isExpanded}>
                    <>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => toggleRow(p.id)}>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {p.lot_number || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.is_organic ? (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-700">
                              <Leaf className="h-3 w-3 mr-1" />
                              Organik
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-500 text-slate-700">
                              <Factory className="h-3 w-3 mr-1" />
                              Konvensional
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{Number(p.jumlah_kg_sebelum).toLocaleString()}</TableCell>
                        <TableCell>{p.jumlah_kg_sesudah ? Number(p.jumlah_kg_sesudah).toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          {p.susut_persen ? (
                            <Badge variant={Number(p.susut_persen) > 15 ? "destructive" : "secondary"}>
                              {Number(p.susut_persen).toFixed(1)}%
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{p.qc_off ? `${Number(p.qc_off).toLocaleString()} Kg` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'selesai' ? 'default' : 'secondary'}>
                            {p.status === 'selesai' ? 'Selesai' : 'Proses'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.status !== 'selesai' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteDrying(p)}
                            >
                              Selesaikan
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Suhu Oven:</span>
                                  <span className="font-medium ml-2">{p.suhu_oven ? `${p.suhu_oven}°C` : '-'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Durasi:</span>
                                  <span className="font-medium ml-2">{p.durasi_jam ? `${p.durasi_jam} jam` : '-'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Kadar Air Awal:</span>
                                  <span className="font-medium ml-2">{p.kadar_air_awal ? `${p.kadar_air_awal}%` : '-'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Kadar Air Akhir:</span>
                                  <span className="font-medium ml-2">{p.kadar_air_akhir ? `${p.kadar_air_akhir}%` : '-'}</span>
                                </div>
                              </div>
                              
                              {detailPetani.length > 0 && (
                                <div>
                                  <Label className="text-sm mb-2 block">Detail Petani:</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {detailPetani.map((f, idx) => (
                                      <div key={idx} className="flex items-center gap-2 p-2 bg-background rounded-md text-sm">
                                        <span className="font-medium">{f.petani_nama}</span>
                                        <span className="text-muted-foreground">({f.petani_kode})</span>
                                        <Badge variant="outline" className="ml-auto">{f.jumlah_kg} Kg</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {p.catatan && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Catatan:</span>
                                  <span className="ml-2">{p.catatan}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
