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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Flame, Leaf, Factory, ChevronDown, ChevronRight, Users, AlertCircle, Calendar, Check, Pencil, Package, Trash2, Tag } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useProsesPengeringan, useBatchPanen, useGudangStok, ProsesPengeringan, PetaniDetailPengeringan, BatchStatus, BatchPanen } from "@/hooks/use-batch-panen";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  product_codes?: ProductCodeEntry[];
}

interface PendingBatchOption {
  batchId: string;
  batchNumber: string;
  isOrganic: boolean;
  farmers: FarmerDetail[];
  totalKg: number;
  tanggalPenerimaan: string;
}

export const PengovenanTab = () => {
  const { proses, loading, addProses, updateProses, deleteProses, refetch } = useProsesPengeringan();
  const { batches, addBatch, updateBatch, refetch: refetchBatches } = useBatchPanen();
  const { stok: gudangStok, addStok, refetch: refetchGudang } = useGudangStok();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProses, setEditingProses] = useState<ProsesPengeringan | null>(null);
  const [editForm, setEditForm] = useState({
    susut_persen: "",
    susut_qc_off_persen: "",
    operator: "",
  });
  
  const [form, setForm] = useState({
    susut_persen: "",
    susut_qc_off_persen: "",
    operator: "",
    catatan: "",
  });

  // Get batches with status 'penerimaan' (from PenerimaanTab) that haven't been dried yet
  const pendingBatches = useMemo((): PendingBatchOption[] => {
    // Get batch IDs already in proses_pengeringan
    const processedBatchIds = new Set(proses.map(p => p.batch_id));

    return batches
      .filter(b => b.status === 'penerimaan' && !processedBatchIds.has(b.id))
      .map(b => {
        const detailPetani = Array.isArray(b.detail_petani) ? (b.detail_petani as FarmerDetail[]) : [];
        return {
          batchId: b.id,
          batchNumber: b.batch_number,
          isOrganic: b.is_organic !== false,
        farmers: detailPetani.map(f => ({
            petani_id: f.petani_id,
            petani_nama: f.petani_nama,
            petani_kode: f.petani_kode,
            jumlah_kg: Number(f.jumlah_kg) || 0,
            is_organic: f.is_organic,
            product_codes: (f as any).product_codes || [],
          })),
          totalKg: Number(b.jumlah_kg),
          tanggalPenerimaan: b.tanggal_penerimaan,
        };
      });
  }, [batches, proses]);

  // Get selected batch details
  const selectedBatchOption = useMemo(() => 
    pendingBatches.find(b => b.batchId === selectedBatch),
    [pendingBatches, selectedBatch]
  );

  // Calculate totals from selected farmers
  const selectedTotalKg = useMemo(() => {
    if (!selectedBatchOption) return 0;
    return selectedBatchOption.farmers
      .filter(f => selectedFarmers.has(f.petani_id))
      .reduce((sum, f) => sum + f.jumlah_kg, 0);
  }, [selectedBatchOption, selectedFarmers]);

  // Auto-calculate with new formulas:
  // total_kering = bahan_masuk - (bahan_masuk * susut_persen / 100)
  // qc_off = total_kering * susut_qc_off_persen / 100
  // total_kering_packing = total_kering - qc_off
  const calculateResults = useMemo(() => {
    const bahanMasuk = selectedTotalKg;
    const susutPersen = parseFloat(form.susut_persen) || 0;
    const susutQcOffPersen = parseFloat(form.susut_qc_off_persen) || 0;
    
    const totalKering = bahanMasuk - (bahanMasuk * susutPersen / 100);
    const qcOff = totalKering * susutQcOffPersen / 100;
    const totalKeringPacking = totalKering - qcOff;
    const penyusutanKg = bahanMasuk - totalKering;
    
    return {
      bahan_masuk: bahanMasuk,
      susut_persen: susutPersen,
      penyusutan_kg: penyusutanKg,
      total_kering: totalKering,
      qc_off: qcOff,
      susut_qc_off_persen: susutQcOffPersen,
      total_kering_packing: totalKeringPacking,
    };
  }, [selectedTotalKg, form.susut_persen, form.susut_qc_off_persen]);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatch(batchId);
    setSelectedFarmers(new Set());
    
    const batch = pendingBatches.find(b => b.batchId === batchId);
    if (batch) {
      // Auto-select all farmers
      setSelectedFarmers(new Set(batch.farmers.map(f => f.petani_id)));
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
    if (!selectedBatchOption) return;
    if (selectedFarmers.size === selectedBatchOption.farmers.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(selectedBatchOption.farmers.map(f => f.petani_id)));
    }
  };

  const resetForm = () => {
    setForm({
      susut_persen: "",
      susut_qc_off_persen: "",
      operator: "",
      catatan: "",
    });
    setSelectedBatch("");
    setSelectedFarmers(new Set());
  };

  const handleSubmit = async () => {
    if (!selectedBatchOption || selectedFarmers.size === 0) {
      toast({
        title: "Error",
        description: "Pilih batch dan petani terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const results = calculateResults;
    
    // Prepare farmer details
    const farmerDetails: PetaniDetailPengeringan[] = selectedBatchOption.farmers
      .filter(f => selectedFarmers.has(f.petani_id))
      .map(f => ({
        petani_id: f.petani_id,
        petani_nama: f.petani_nama,
        petani_kode: f.petani_kode,
        jumlah_kg: f.jumlah_kg,
        is_organic: selectedBatchOption.isOrganic,
        product_codes: f.product_codes || [],
      } as any));

    // Generate lot number
    await refetch();
    const today = format(new Date(), "yyyyMMdd");
    
    const { data: existingProses } = await supabase
      .from("proses_pengeringan")
      .select("lot_number")
      .like("lot_number", `OVEN-${today}%`);
    
    const existingLotsToday = existingProses?.length || 0;
    const lotNumber = `OVEN-${today}-${String(existingLotsToday + 1).padStart(3, '0')}`;

    // Use the existing batch from Penerimaan, update its status to 'pengeringan'
    const batchId = selectedBatchOption.batchId;
    await updateBatch(batchId, { status: 'pengeringan' as BatchStatus });

    await addProses({
      batch_id: batchId,
      lot_number: lotNumber,
      tanggal_mulai: new Date().toISOString(),
      tanggal_selesai: null,
      suhu_oven: null,
      durasi_jam: null,
      kadar_air_awal: null,
      kadar_air_akhir: null,
      jumlah_kg_sebelum: results.bahan_masuk,
      jumlah_kg_sesudah: results.total_kering,
      qc_off: results.qc_off,
      is_organic: selectedBatchOption.isOrganic,
      detail_petani: farmerDetails,
      operator: form.operator || null,
      catatan: form.catatan || `Pengovenan dari batch ${selectedBatchOption.batchNumber} (${selectedBatchOption.isOrganic ? 'Organik' : 'Konvensional'})`,
      status: "proses",
      susut_persen: results.susut_persen,
      total_kering: results.total_kering,
      total_kering_packing: results.total_kering_packing,
      susut_qc_off_persen: results.susut_qc_off_persen,
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
    
    const newStok = await addStok({
      batch_id: prosesItem.batch_id,
      lokasi_gudang: "Gudang Utama",
      rak_posisi: null,
      tanggal_masuk: new Date().toISOString().split('T')[0],
      tanggal_keluar: null,
      jumlah_kg: Number(totalKeringPacking),
      kondisi_penyimpanan: "Baik",
      suhu_gudang: null,
      kelembaban: null,
      tipe_stok: "produk_jadi",
      is_organic: prosesItem.is_organic ?? true,
      catatan: `Dari pengovenan lot ${prosesItem.lot_number || '-'} | Susut: ${prosesItem.susut_persen || 0}% | QC Off: ${prosesItem.qc_off || 0} Kg`,
      status: "tersimpan",
    });
    
    if (newStok) {
      toast({
        title: "Berhasil",
        description: `Pengovenan selesai. ${Number(totalKeringPacking).toLocaleString()} Kg produk jadi ditambahkan ke gudang.`,
      });
    }
    
    refetch();
    refetchGudang();
  };

  // Edit functions
  const openEditDialog = (prosesItem: ProsesPengeringan) => {
    setEditingProses(prosesItem);
    setEditForm({
      susut_persen: prosesItem.susut_persen?.toString() || "",
      susut_qc_off_persen: prosesItem.susut_qc_off_persen?.toString() || "",
      operator: prosesItem.operator || "",
    });
    setEditDialogOpen(true);
  };

  // Calculate edit results
  const editCalculateResults = useMemo(() => {
    if (!editingProses) return null;
    
    const bahanMasuk = Number(editingProses.jumlah_kg_sebelum);
    const susutPersen = parseFloat(editForm.susut_persen) || 0;
    const susutQcOffPersen = parseFloat(editForm.susut_qc_off_persen) || 0;
    
    const totalKering = bahanMasuk - (bahanMasuk * susutPersen / 100);
    const qcOff = totalKering * susutQcOffPersen / 100;
    const totalKeringPacking = totalKering - qcOff;
    const penyusutanKg = bahanMasuk - totalKering;
    
    return {
      bahan_masuk: bahanMasuk,
      susut_persen: susutPersen,
      penyusutan_kg: penyusutanKg,
      total_kering: totalKering,
      qc_off: qcOff,
      susut_qc_off_persen: susutQcOffPersen,
      total_kering_packing: totalKeringPacking,
    };
  }, [editingProses, editForm.susut_persen, editForm.susut_qc_off_persen]);

  const handleEditSubmit = async () => {
    if (!editingProses || !editCalculateResults) return;
    
    await updateProses(editingProses.id, {
      susut_persen: editCalculateResults.susut_persen,
      susut_qc_off_persen: editCalculateResults.susut_qc_off_persen,
      total_kering: editCalculateResults.total_kering,
      qc_off: editCalculateResults.qc_off,
      total_kering_packing: editCalculateResults.total_kering_packing,
      jumlah_kg_sesudah: editCalculateResults.total_kering,
      operator: editForm.operator || null,
    });
    
    toast({
      title: "Berhasil",
      description: `Data pengovenan ${editingProses.lot_number} berhasil diupdate`,
    });
    
    setEditDialogOpen(false);
    setEditingProses(null);
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

  const handleDeleteProses = async (prosesItem: ProsesPengeringan) => {
    // Delete proses and its associated batch
    const success = await deleteProses(prosesItem.id, prosesItem.batch_id);
    if (success) {
      refetch();
      refetchBatches();
    }
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

  const availableBatches = pendingBatches;

  // Render farmer selection table
  const renderFarmerSelectionTable = () => {
    if (!selectedBatchOption || selectedBatchOption.farmers.length === 0) return null;

    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pilih Petani untuk Dioven ({selectedBatchOption.farmers.length} petani)
          </Label>
          <Button variant="outline" size="sm" onClick={selectAllFarmers}>
            {selectedFarmers.size === selectedBatchOption.farmers.length ? "Batalkan Semua" : "Pilih Semua"}
          </Button>
        </div>
        
        <div className="max-h-48 overflow-y-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 sticky top-0 bg-background"></TableHead>
                <TableHead className="sticky top-0 bg-background">Nama Petani</TableHead>
                <TableHead className="sticky top-0 bg-background">Kode</TableHead>
                <TableHead className="sticky top-0 bg-background">Identitas Produk</TableHead>
                <TableHead className="text-right sticky top-0 bg-background">Total (Kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedBatchOption.farmers.map(farmer => (
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
                  <TableCell>
                    {Array.isArray(farmer.product_codes) && farmer.product_codes.length > 0 ? (
                      <TooltipProvider>
                        <div className="flex flex-wrap gap-1">
                          {farmer.product_codes.map((pc: ProductCodeEntry) => (
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
                  <TableCell className="text-right font-bold">{farmer.jumlah_kg.toLocaleString()} Kg</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell></TableCell>
                <TableCell colSpan={3} className="font-bold">Total Dipilih</TableCell>
                <TableCell className="text-right font-bold">{selectedTotalKg.toLocaleString()} Kg</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
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
            <CardDescription>Pilih batch penerimaan untuk proses pengeringan</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-organic">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Proses
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Proses Pengovenan</DialogTitle>
                <DialogDescription>Pilih batch dari Penerimaan yang belum diproses pengeringan</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Batch Selection */}
                <div>
                  <Label>Pilih Batch Penerimaan *</Label>
                  {availableBatches.length === 0 ? (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Tidak ada batch penerimaan yang tersedia. Pastikan data sudah diterima di tab Penerimaan terlebih dahulu.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedBatch} onValueChange={handleBatchChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih batch penerimaan" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBatches.map(batch => (
                          <SelectItem key={batch.batchId} value={batch.batchId}>
                            <div className="flex items-center gap-2">
                              {batch.isOrganic ? (
                                <Leaf className="h-4 w-4 text-green-600" />
                              ) : (
                                <Factory className="h-4 w-4 text-orange-500" />
                              )}
                              <span>{batch.batchNumber}</span>
                              <Badge variant={batch.isOrganic ? "default" : "secondary"} className={batch.isOrganic ? "bg-green-600" : "bg-orange-500"}>
                                {batch.isOrganic ? 'Organik' : 'Konvensional'}
                              </Badge>
                              <span className="text-muted-foreground">
                                ({batch.farmers.length} petani, {batch.totalKg.toLocaleString()} Kg)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Selected Batch Info */}
                {selectedBatchOption && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">{selectedBatchOption.batchNumber}</span>
                      <Badge className={selectedBatchOption.isOrganic ? 'bg-green-600' : 'bg-orange-500'}>
                        {selectedBatchOption.isOrganic ? 'Organik' : 'Konvensional'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                      <div><span className="font-medium">Tanggal Penerimaan:</span> {format(new Date(selectedBatchOption.tanggalPenerimaan), "dd MMM yyyy", { locale: localeId })}</div>
                      <div><span className="font-medium">Total:</span> {selectedBatchOption.totalKg.toLocaleString()} Kg ({selectedBatchOption.farmers.length} petani)</div>
                    </div>
                  </div>
                )}

                {/* Farmer Selection */}
                {renderFarmerSelectionTable()}

                {/* Parameters - New formulas */}
                {selectedFarmers.size > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Jumlah Bahan Baku (Kg)</Label>
                        <Input
                          type="number"
                          value={selectedTotalKg}
                          readOnly
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Dari total petani yang dipilih</p>
                      </div>
                      <div>
                        <Label>Susut % *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={form.susut_persen}
                          onChange={(e) => setForm(prev => ({ ...prev, susut_persen: e.target.value }))}
                          placeholder="Contoh: 15"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Total Kering (Kg)</Label>
                        <Input
                          type="number"
                          value={calculateResults.total_kering.toFixed(1)}
                          readOnly
                          className="bg-muted font-bold"
                        />
                        <p className="text-xs text-muted-foreground mt-1">= Bahan Baku - (Bahan Baku × Susut%)</p>
                      </div>
                      <div>
                        <Label>Susut QC Off % *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={form.susut_qc_off_persen}
                          onChange={(e) => setForm(prev => ({ ...prev, susut_qc_off_persen: e.target.value }))}
                          placeholder="Contoh: 5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>QC Off (Kg)</Label>
                        <Input
                          type="number"
                          value={calculateResults.qc_off.toFixed(1)}
                          readOnly
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">= Total Kering × Susut QC Off%</p>
                      </div>
                      <div>
                        <Label>Total Kering Packing (Kg)</Label>
                        <Input
                          type="number"
                          value={calculateResults.total_kering_packing.toFixed(1)}
                          readOnly
                          className="bg-muted font-bold text-green-600"
                        />
                        <p className="text-xs text-muted-foreground mt-1">= Total Kering - QC Off (Hasil akhir ke gudang)</p>
                      </div>
                    </div>

                    {/* Summary */}
                    {form.susut_persen && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h4 className="font-medium mb-2 text-orange-800 dark:text-orange-200">Ringkasan Perhitungan</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          <div>Bahan Baku:</div>
                          <div className="font-medium">{calculateResults.bahan_masuk.toLocaleString()} Kg</div>
                          <div className="hidden md:block"></div>
                          
                          <div>Penyusutan:</div>
                          <div className="font-medium">{calculateResults.penyusutan_kg.toFixed(1)} Kg ({calculateResults.susut_persen}%)</div>
                          <div className="hidden md:block"></div>
                          
                          <div>Total Kering:</div>
                          <div className="font-medium">{calculateResults.total_kering.toFixed(1)} Kg</div>
                          <div className="hidden md:block"></div>
                          
                          <div>QC Off:</div>
                          <div className="font-medium">{calculateResults.qc_off.toFixed(1)} Kg ({calculateResults.susut_qc_off_persen}%)</div>
                          <div className="hidden md:block"></div>
                          
                          <div className="font-bold text-green-700 dark:text-green-400">Total Kering Packing:</div>
                          <div className="font-bold text-green-700 dark:text-green-400">{calculateResults.total_kering_packing.toFixed(1)} Kg</div>
                        </div>
                      </div>
                    )}
                  </>
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
                  disabled={!selectedBatch || selectedFarmers.size === 0 || !form.susut_persen}
                >
                  Mulai Proses Pengovenan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Pending Batches Summary */}
        {pendingBatches.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingBatches.map(batch => (
              <div 
                key={batch.batchId}
                className="p-3 rounded-lg border bg-muted/30 border-muted-foreground/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  {batch.isOrganic ? (
                    <Leaf className="h-4 w-4 text-green-600" />
                  ) : (
                    <Factory className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="font-medium text-sm">{batch.batchNumber}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>Tgl: {format(new Date(batch.tanggalPenerimaan), "dd MMM yyyy", { locale: localeId })}</div>
                  <span>{batch.farmers.length} petani | {batch.totalKg.toLocaleString()} Kg</span>
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
                <TableHead>Bahan Baku</TableHead>
                <TableHead>Total Kering</TableHead>
                <TableHead>QC Off</TableHead>
                <TableHead>Total Kering Packing</TableHead>
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
                        <TableCell>{Number(p.jumlah_kg_sebelum).toFixed(1)} Kg</TableCell>
                        <TableCell>{p.total_kering ? `${Number(p.total_kering).toFixed(1)} Kg` : '-'}</TableCell>
                        <TableCell>{p.qc_off ? `${Number(p.qc_off).toFixed(1)} Kg` : '-'}</TableCell>
                        <TableCell className="font-bold text-green-600">{p.total_kering_packing ? `${Number(p.total_kering_packing).toFixed(1)} Kg` : '-'}</TableCell>
                        <TableCell>
                          {p.susut_persen ? `${Number(p.susut_persen).toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'selesai' ? 'default' : 'secondary'}>
                            {p.status === 'selesai' ? 'Selesai' : 'Proses'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {p.status === 'proses' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCompleteDrying(p)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Selesai
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus Proses Pengovenan?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Proses pengovenan <strong>{p.lot_number}</strong> akan dihapus beserta batch terkait.
                                        Tindakan ini tidak dapat dibatalkan.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteProses(p)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={11}>
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
                                    <TableHead>Identitas Produk</TableHead>
                                    <TableHead className="text-right">Jumlah (Kg)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {detailPetani.map((farmer, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{farmer.petani_nama}</TableCell>
                                      <TableCell>{farmer.petani_kode}</TableCell>
                                      <TableCell>
                                        {Array.isArray((farmer as any).product_codes) && (farmer as any).product_codes.length > 0 ? (
                                          <TooltipProvider>
                                            <div className="flex flex-wrap gap-1">
                                              {(farmer as any).product_codes.map((pc: ProductCodeEntry) => (
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Data Pengovenan</DialogTitle>
            <DialogDescription>
              {editingProses && (
                <span>
                  Lot: <strong>{editingProses.lot_number}</strong> | 
                  Bahan Baku: <strong>{Number(editingProses.jumlah_kg_sebelum).toLocaleString()} Kg</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {editingProses && editCalculateResults && (
            <div className="space-y-4">
              {/* Susut Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Susut % *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editForm.susut_persen}
                    onChange={(e) => setEditForm(prev => ({ ...prev, susut_persen: e.target.value }))}
                    placeholder="Contoh: 15"
                  />
                </div>
                <div>
                  <Label>Susut QC Off %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editForm.susut_qc_off_persen}
                    onChange={(e) => setEditForm(prev => ({ ...prev, susut_qc_off_persen: e.target.value }))}
                    placeholder="Contoh: 5"
                  />
                </div>
              </div>

              {/* Calculated Results */}
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="font-medium mb-3 text-orange-800 dark:text-orange-200">Hasil Perhitungan</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Bahan Baku:</div>
                  <div className="font-medium">{editCalculateResults.bahan_masuk.toLocaleString()} Kg</div>
                  
                   <div>Penyusutan:</div>
                  <div className="font-medium">{editCalculateResults.penyusutan_kg.toFixed(1)} Kg ({editCalculateResults.susut_persen}%)</div>
                  
                  <div>Total Kering:</div>
                  <div className="font-medium">{editCalculateResults.total_kering.toFixed(1)} Kg</div>
                  
                  <div>QC Off:</div>
                  <div className="font-medium">{editCalculateResults.qc_off.toFixed(1)} Kg ({editCalculateResults.susut_qc_off_persen}%)</div>
                  
                  <div className="font-bold text-green-700 dark:text-green-400">Total Kering Packing:</div>
                  <div className="font-bold text-green-700 dark:text-green-400">{editCalculateResults.total_kering_packing.toFixed(1)} Kg</div>
                </div>
              </div>

              <div>
                <Label>Operator</Label>
                <Input
                  value={editForm.operator}
                  onChange={(e) => setEditForm(prev => ({ ...prev, operator: e.target.value }))}
                  placeholder="Nama operator"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleEditSubmit} 
                  className="flex-1"
                  disabled={!editForm.susut_persen}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
