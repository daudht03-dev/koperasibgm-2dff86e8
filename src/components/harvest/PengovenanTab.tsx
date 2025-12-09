import { useState, useMemo, useEffect } from "react";
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
import { Plus, Flame, Leaf, Factory, ChevronDown, ChevronRight, Users, AlertCircle, Calendar, Check } from "lucide-react";
import { useProsesPengeringan, useBatchPanen, useGudangStok, ProsesPengeringan, PetaniDetailPengeringan } from "@/hooks/use-batch-panen";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FarmerDetail {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  jumlah_kg: number;
  daily_values?: number[];
}

interface WeekOption {
  key: string;
  estimationName: string;
  weekLabel: string;
  isOrganic: boolean;
  farmers: FarmerDetail[];
  totalKg: number;
  processedFarmerIds: Set<string>;
  remainingFarmers: FarmerDetail[];
  remainingKg: number;
  isFullyProcessed: boolean;
  pickupDate: string;
}

export const PengovenanTab = () => {
  const { proses, loading, addProses, updateProses, refetch } = useProsesPengeringan();
  const { batches, refetch: refetchBatches } = useBatchPanen();
  const { pengambilanList } = usePengambilanKoperasi();
  const { addStok } = useGudangStok();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
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

  // Process weeks from pengambilan_koperasi (barang keluar)
  const weekOptions = useMemo((): WeekOption[] => {
    const options: WeekOption[] = [];

    // Get processed farmer IDs from existing proses_pengeringan
    const processedByWeek = new Map<string, Set<string>>();
    proses.forEach(p => {
      if (p.catatan) {
        const match = p.catatan.match(/dari estimasi: (.+?) - (Minggu \d+) \((Organik|Konvensional)\)/);
        if (match && p.detail_petani) {
          const [, estName, weekLabel, type] = match;
          const key = `${estName}-${weekLabel}-${type}`;
          if (!processedByWeek.has(key)) {
            processedByWeek.set(key, new Set());
          }
          const detailPetani = p.detail_petani as PetaniDetailPengeringan[];
          detailPetani.forEach(f => {
            processedByWeek.get(key)!.add(f.petani_id);
          });
        }
      }
    });

    // Group pengambilan by estimation + week + organic type
    const weekMap = new Map<string, {
      estimationName: string;
      weekLabel: string;
      isOrganic: boolean;
      farmers: FarmerDetail[];
      pickupDate: string;
    }>();

    pengambilanList.forEach(item => {
      const match = item.catatan?.match(/Auto-generated dari estimasi: (.+?) - (Minggu \d+) \((Organik|Konvensional)\)/);
      if (!match) return;

      const [, estName, weekLabel, type] = match;
      const isOrganic = type === 'Organik';
      const key = `${estName}-${weekLabel}-${type}`;

      // Get farmer details from item
      const detailPetani = (item as any).detail_petani;
      if (!Array.isArray(detailPetani)) return;

      if (!weekMap.has(key)) {
        weekMap.set(key, {
          estimationName: estName,
          weekLabel,
          isOrganic,
          farmers: [],
          pickupDate: item.tanggal_ambil,
        });
      }

      const weekData = weekMap.get(key)!;

      // Add farmers from this pengambilan entry
      detailPetani.forEach((f: any) => {
        const farmerId = f.petani_id || f.id;
        // Check if farmer already exists (avoid duplicates from multiple pengepul)
        const existingFarmer = weekData.farmers.find(ef => ef.petani_id === farmerId);
        if (!existingFarmer) {
          weekData.farmers.push({
            petani_id: farmerId,
            petani_nama: f.petani_nama || f.name,
            petani_kode: f.petani_kode || f.code,
            jumlah_kg: f.jumlah_kg || f.kg || 0,
            daily_values: f.daily_values || [],
          });
        } else {
          // Aggregate kg if same farmer from different pengepul
          existingFarmer.jumlah_kg += (f.jumlah_kg || f.kg || 0);
        }
      });
    });

    // Convert map to options array
    weekMap.forEach((data, key) => {
      const processedFarmerIds = processedByWeek.get(key) || new Set<string>();
      const remainingFarmers = data.farmers.filter(f => !processedFarmerIds.has(f.petani_id));
      const remainingKg = remainingFarmers.reduce((sum, f) => sum + f.jumlah_kg, 0);

      options.push({
        key,
        estimationName: data.estimationName,
        weekLabel: data.weekLabel,
        isOrganic: data.isOrganic,
        farmers: data.farmers,
        totalKg: data.farmers.reduce((sum, f) => sum + f.jumlah_kg, 0),
        processedFarmerIds,
        remainingFarmers,
        remainingKg,
        isFullyProcessed: remainingFarmers.length === 0,
        pickupDate: data.pickupDate,
      });
    });

    // Sort by estimation name, week, then organic status
    return options.sort((a, b) => {
      if (a.estimationName !== b.estimationName) return a.estimationName.localeCompare(b.estimationName);
      const weekA = parseInt(a.weekLabel.replace('Minggu ', ''));
      const weekB = parseInt(b.weekLabel.replace('Minggu ', ''));
      if (weekA !== weekB) return weekA - weekB;
      return a.isOrganic ? -1 : 1;
    });
  }, [pengambilanList, proses]);

  // Get selected week details
  const selectedWeekOption = useMemo(() => 
    weekOptions.find(w => w.key === selectedWeek),
    [weekOptions, selectedWeek]
  );

  // Calculate totals from selected farmers
  const selectedTotalKg = useMemo(() => {
    if (!selectedWeekOption) return 0;
    return selectedWeekOption.remainingFarmers
      .filter(f => selectedFarmers.has(f.petani_id))
      .reduce((sum, f) => sum + f.jumlah_kg, 0);
  }, [selectedWeekOption, selectedFarmers]);

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

  const handleWeekChange = (weekKey: string) => {
    setSelectedWeek(weekKey);
    setSelectedFarmers(new Set());
    
    const week = weekOptions.find(w => w.key === weekKey);
    if (week) {
      // Auto-populate jumlah_kg_sebelum from remaining farmers
      setForm(prev => ({
        ...prev,
        jumlah_kg_sebelum: String(week.remainingKg),
      }));
      
      // Auto-select all remaining farmers
      setSelectedFarmers(new Set(week.remainingFarmers.map(f => f.petani_id)));
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
    if (!selectedWeekOption) return;
    if (selectedFarmers.size === selectedWeekOption.remainingFarmers.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(selectedWeekOption.remainingFarmers.map(f => f.petani_id)));
    }
  };

  // Update jumlah_kg_sebelum when farmer selection changes
  useEffect(() => {
    if (selectedWeekOption) {
      const total = selectedWeekOption.remainingFarmers
        .filter(f => selectedFarmers.has(f.petani_id))
        .reduce((sum, f) => sum + f.jumlah_kg, 0);
      setForm(prev => ({ ...prev, jumlah_kg_sebelum: String(total) }));
    }
  }, [selectedFarmers, selectedWeekOption]);

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
    setSelectedWeek("");
    setSelectedFarmers(new Set());
  };

  const handleSubmit = async () => {
    if (!selectedWeekOption || selectedFarmers.size === 0) {
      toast({
        title: "Error",
        description: "Pilih minggu dan petani terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const susutCalc = calculateSusut();
    
    // Prepare farmer details
    const farmerDetails: PetaniDetailPengeringan[] = selectedWeekOption.remainingFarmers
      .filter(f => selectedFarmers.has(f.petani_id))
      .map(f => ({
        petani_id: f.petani_id,
        petani_nama: f.petani_nama,
        petani_kode: f.petani_kode,
        jumlah_kg: f.jumlah_kg,
        is_organic: selectedWeekOption.isOrganic,
      }));

    // Generate lot number
    const today = format(new Date(), "yyyyMMdd");
    const existingLotsToday = proses.filter(p => p.lot_number?.startsWith(`OVEN-${today}`)).length;
    const lotNumber = `OVEN-${today}-${String(existingLotsToday + 1).padStart(3, '0')}`;

    // Get or create batch for this week
    let batchId = '';
    const existingBatch = batches.find(b => 
      b.is_organic === selectedWeekOption.isOrganic &&
      b.status === 'penerimaan'
    );

    if (existingBatch) {
      batchId = existingBatch.id;
    } else {
      // Create a simple batch record
      const { data: batchData, error: batchError } = await supabase.rpc('generate_batch_number');
      if (batchError) {
        toast({
          title: "Error",
          description: "Gagal membuat batch number",
          variant: "destructive",
        });
        return;
      }

      const { data: newBatch, error: insertError } = await supabase
        .from('batch_panen')
        .insert([{
          batch_number: batchData,
          petani_id: farmerDetails[0]?.petani_id || '',
          tanggal_penerimaan: format(new Date(), 'yyyy-MM-dd'),
          jumlah_kg: selectedTotalKg,
          is_organic: selectedWeekOption.isOrganic,
          status: 'pengeringan' as const,
          detail_petani: farmerDetails as any,
        }])
        .select()
        .single();

      if (insertError || !newBatch) {
        toast({
          title: "Error",
          description: "Gagal membuat batch",
          variant: "destructive",
        });
        return;
      }
      batchId = newBatch.id;
    }

    await addProses({
      batch_id: batchId,
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
      is_organic: selectedWeekOption.isOrganic,
      detail_petani: farmerDetails,
      operator: form.operator || null,
      catatan: `Pengovenan dari estimasi: ${selectedWeekOption.estimationName} - ${selectedWeekOption.weekLabel} (${selectedWeekOption.isOrganic ? 'Organik' : 'Konvensional'})`,
      status: "proses",
      ...susutCalc,
    });

    toast({
      title: "Berhasil",
      description: `Proses pengovenan ${lotNumber} berhasil ditambahkan`,
    });

    resetForm();
    setDialogOpen(false);
    refetch();
    refetchBatches();
  };

  const handleCompleteDrying = async (prosesItem: ProsesPengeringan) => {
    await updateProses(prosesItem.id, {
      status: "selesai",
      tanggal_selesai: new Date().toISOString(),
    });
    
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

  const getDetailPetani = (p: ProsesPengeringan): PetaniDetailPengeringan[] => {
    if (Array.isArray(p.detail_petani)) {
      return p.detail_petani as PetaniDetailPengeringan[];
    }
    return [];
  };

  if (loading) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  const availableWeeks = weekOptions.filter(w => !w.isFullyProcessed);

  // Render farmer table with daily values (same format as Barang Masuk/Keluar)
  const renderFarmerSelectionTable = () => {
    if (!selectedWeekOption || selectedWeekOption.remainingFarmers.length === 0) return null;

    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pilih Petani untuk Dioven ({selectedWeekOption.remainingFarmers.length} tersisa)
          </Label>
          <Button variant="outline" size="sm" onClick={selectAllFarmers}>
            {selectedFarmers.size === selectedWeekOption.remainingFarmers.length ? "Batalkan Semua" : "Pilih Semua"}
          </Button>
        </div>
        
        <ScrollArea className="max-h-64 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nama Petani</TableHead>
                <TableHead>Kode</TableHead>
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <TableHead key={d} className="text-center w-12">H{d}</TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedWeekOption.remainingFarmers.map(farmer => (
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
                  {(farmer.daily_values || [0, 0, 0, 0, 0, 0, 0]).slice(0, 7).map((val, idx) => (
                    <TableCell key={idx} className="text-center text-sm">
                      {val > 0 ? val.toLocaleString() : '-'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">{farmer.jumlah_kg.toLocaleString()} Kg</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell></TableCell>
                <TableCell colSpan={9} className="font-bold">Total Dipilih</TableCell>
                <TableCell className="text-right font-bold">{selectedTotalKg.toLocaleString()} Kg</TableCell>
              </TableRow>
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
    );
  };

  return (
    <Card className="border-organic-light/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Proses Pengovenan
            </CardTitle>
            <CardDescription>Pilih minggu dan petani untuk proses pengeringan dari data Barang Keluar</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-organic">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Proses
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Tambah Proses Pengovenan</DialogTitle>
                <DialogDescription>Pilih minggu dari Barang Keluar dan petani untuk proses pengeringan</DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* Week Selection */}
                  <div>
                    <Label>Pilih Minggu *</Label>
                    {availableWeeks.length === 0 ? (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Tidak ada minggu yang tersedia. Pastikan Barang Keluar sudah di-generate terlebih dahulu.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Select value={selectedWeek} onValueChange={handleWeekChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih minggu" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableWeeks.map(week => (
                            <SelectItem key={week.key} value={week.key}>
                              <div className="flex items-center gap-2">
                                {week.isOrganic ? (
                                  <Leaf className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Factory className="h-4 w-4 text-orange-500" />
                                )}
                                <span>{week.estimationName} - {week.weekLabel}</span>
                                <Badge variant={week.isOrganic ? "default" : "secondary"} className={week.isOrganic ? "bg-green-600" : "bg-orange-500"}>
                                  {week.isOrganic ? 'Organik' : 'Konvensional'}
                                </Badge>
                                <span className="text-muted-foreground">
                                  ({week.remainingFarmers.length} petani, {week.remainingKg.toLocaleString()} Kg)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Selected Week Info */}
                  {selectedWeekOption && (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{selectedWeekOption.estimationName} - {selectedWeekOption.weekLabel}</span>
                        <Badge className={selectedWeekOption.isOrganic ? 'bg-green-600' : 'bg-orange-500'}>
                          {selectedWeekOption.isOrganic ? 'Organik' : 'Konvensional'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tanggal Pengambilan: {format(new Date(selectedWeekOption.pickupDate), "dd MMM yyyy", { locale: localeId })} | 
                        Total: {selectedWeekOption.totalKg.toLocaleString()} Kg | 
                        Sudah diproses: {selectedWeekOption.processedFarmerIds.size} petani | 
                        Tersisa: {selectedWeekOption.remainingFarmers.length} petani ({selectedWeekOption.remainingKg.toLocaleString()} Kg)
                      </div>
                    </div>
                  )}

                  {/* Farmer Selection with Daily Values */}
                  {renderFarmerSelectionTable()}

                  {/* Drying Parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Jumlah Sebelum (Kg) *</Label>
                      <Input
                        type="number"
                        value={form.jumlah_kg_sebelum}
                        onChange={(e) => setForm(prev => ({ ...prev, jumlah_kg_sebelum: e.target.value }))}
                        placeholder="0"
                        readOnly
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
                      <Label>Kadar Air Akhir (%)</Label>
                      <Input
                        type="number"
                        value={form.kadar_air_akhir}
                        onChange={(e) => setForm(prev => ({ ...prev, kadar_air_akhir: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Shrinkage Preview */}
                  {form.jumlah_kg_sebelum && form.jumlah_kg_sesudah && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <h4 className="font-medium mb-2 text-orange-800 dark:text-orange-200">Perhitungan Susut</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Penyusutan:</div>
                        <div className="font-medium">{calculateSusut().penyusutan_kg.toFixed(2)} Kg ({calculateSusut().susut_persen.toFixed(1)}%)</div>
                        <div>Total Kering:</div>
                        <div className="font-medium">{calculateSusut().total_kering.toFixed(2)} Kg</div>
                        <div>Total Kering Packing:</div>
                        <div className="font-medium">{calculateSusut().total_kering_packing.toFixed(2)} Kg</div>
                      </div>
                    </div>
                  )}

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
                    />
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full"
                    disabled={!selectedWeek || selectedFarmers.size === 0}
                  >
                    Mulai Proses Pengovenan
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Week Status Summary */}
        {weekOptions.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {weekOptions.slice(0, 6).map(week => (
              <div 
                key={week.key}
                className={`p-3 rounded-lg border ${
                  week.isFullyProcessed 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-muted/30 border-muted-foreground/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {week.isOrganic ? (
                    <Leaf className="h-4 w-4 text-green-600" />
                  ) : (
                    <Factory className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="font-medium text-sm">{week.estimationName} - {week.weekLabel}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {week.isFullyProcessed ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Semua petani sudah diproses
                    </span>
                  ) : (
                    <span>
                      {week.processedFarmerIds.size}/{week.farmers.length} petani diproses | 
                      Tersisa: {week.remainingKg.toLocaleString()} Kg
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {proses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flame className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Belum ada proses pengovenan</p>
            <p className="text-sm">Klik "Tambah Proses" untuk memulai</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Sebelum</TableHead>
                <TableHead>Sesudah</TableHead>
                <TableHead>Susut</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proses.map((p) => {
                const isExpanded = expandedRows.has(p.id);
                const detailPetani = getDetailPetani(p);

                return (
                  <Collapsible key={p.id} open={isExpanded} onOpenChange={() => toggleRow(p.id)} asChild>
                    <>
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">{p.lot_number || '-'}</TableCell>
                        <TableCell>
                          <Badge className={p.is_organic ? 'bg-green-600' : 'bg-orange-500'}>
                            {p.is_organic ? 'Organik' : 'Konvensional'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(p.tanggal_mulai), "dd MMM yyyy", { locale: localeId })}</TableCell>
                        <TableCell>{Number(p.jumlah_kg_sebelum).toLocaleString()} Kg</TableCell>
                        <TableCell>{p.jumlah_kg_sesudah ? `${Number(p.jumlah_kg_sesudah).toLocaleString()} Kg` : '-'}</TableCell>
                        <TableCell>
                          {p.susut_persen ? `${Number(p.susut_persen).toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'selesai' ? 'default' : 'secondary'}>
                            {p.status === 'selesai' ? 'Selesai' : 'Proses'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.status === 'proses' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCompleteDrying(p)}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Selesai
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9}>
                            <div className="p-4">
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Detail Petani ({detailPetani.length} petani)
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nama Petani</TableHead>
                                    <TableHead>Kode</TableHead>
                                    <TableHead className="text-right">Jumlah (Kg)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {detailPetani.map((farmer, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{farmer.petani_nama}</TableCell>
                                      <TableCell>{farmer.petani_kode}</TableCell>
                                      <TableCell className="text-right">{farmer.jumlah_kg.toLocaleString()} Kg</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
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
