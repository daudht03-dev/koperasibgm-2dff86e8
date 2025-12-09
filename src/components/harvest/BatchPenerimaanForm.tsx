import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Package, Users, AlertCircle, Leaf, Factory, Calendar, User } from "lucide-react";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { usePengepul } from "@/hooks/use-pengepul";
import { QualityGrade } from "@/hooks/use-batch-panen";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BatchPenerimaanFormProps {
  onSubmit: (data: {
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
    }>;
  }, pengambilanIds: string[]) => Promise<void>;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

interface WeekData {
  estimationName: string;
  weekLabel: string;
  weekIndex: number;
  startDate: string;
  endDate: string;
  pickupDate: string;
  pengambilanIds: string[];
  organicFarmers: FarmerDetail[];
  conventionalFarmers: FarmerDetail[];
  totalOrganicKg: number;
  totalConventionalKg: number;
}

interface FarmerDetail {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  total_kg: number;
  daily_values: number[];
  is_organic: boolean;
}

interface PengepulWeekData {
  pengepulId: string;
  pengepulNama: string;
  pengepulKode: string;
  weeks: WeekData[];
}

export const BatchPenerimaanForm = ({ onSubmit, dialogOpen, setDialogOpen }: BatchPenerimaanFormProps) => {
  const { pengambilanList, loading: pengambilanLoading } = usePengambilanKoperasi();
  const { pengepulList } = usePengepul();

  const [selectedPengepul, setSelectedPengepul] = useState<string>("");
  const [selectedEstimation, setSelectedEstimation] = useState<string>("all");

  const [form, setForm] = useState({
    warna_produk: "",
    kualitas: "grade_a" as QualityGrade,
    harga_per_kg: "",
    kondisi: "",
  });

  // Group pengambilan by pengepul -> weeks -> organic/conventional
  const pengepulData = useMemo((): PengepulWeekData[] => {
    const pengepulMap = new Map<string, PengepulWeekData>();

    // Filter unprocessed (no batch_id)
    const unprocessed = pengambilanList.filter(p => !p.batch_id);

    unprocessed.forEach(item => {
      const match = item.catatan?.match(/Auto-generated dari estimasi: (.+?) - (Minggu (\d+)) \((Organik|Konvensional)\)/);
      if (!match) return;

      const [, estName, weekLabel, weekNum, type] = match;
      const isOrganic = type === 'Organik';
      const pengepulId = item.pengepul_id;

      // Initialize pengepul if not exists
      if (!pengepulMap.has(pengepulId)) {
        const pengepul = pengepulList.find(p => p.id === pengepulId);
        pengepulMap.set(pengepulId, {
          pengepulId,
          pengepulNama: pengepul?.nama || item.pengepul?.nama || 'Unknown',
          pengepulKode: pengepul?.kode_pengepul || item.pengepul?.kode_pengepul || '-',
          weeks: [],
        });
      }

      const pengepulEntry = pengepulMap.get(pengepulId)!;
      
      // Find or create week
      const weekKey = `${estName}-${weekLabel}`;
      let weekEntry = pengepulEntry.weeks.find(w => 
        w.estimationName === estName && w.weekLabel === weekLabel
      );

      if (!weekEntry) {
        const pickup = new Date(item.tanggal_ambil);
        const endDate = addDays(pickup, -1);
        const startDate = addDays(endDate, -6);

        weekEntry = {
          estimationName: estName,
          weekLabel,
          weekIndex: parseInt(weekNum) - 1,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
          pickupDate: item.tanggal_ambil,
          pengambilanIds: [],
          organicFarmers: [],
          conventionalFarmers: [],
          totalOrganicKg: 0,
          totalConventionalKg: 0,
        };
        pengepulEntry.weeks.push(weekEntry);
      }

      weekEntry.pengambilanIds.push(item.id);

      // Extract farmer details
      const detailPetani = (item as any).detail_petani;
      if (Array.isArray(detailPetani)) {
        detailPetani.forEach((f: any) => {
          const farmerId = f.petani_id || f.id || '';
          const farmerData: FarmerDetail = {
            petani_id: farmerId,
            petani_nama: f.petani_nama || f.name || 'Unknown',
            petani_kode: f.petani_kode || f.code || '-',
            total_kg: f.jumlah_kg || f.kg || 0,
            daily_values: f.daily_values || [0, 0, 0, 0, 0, 0, 0],
            is_organic: isOrganic,
          };

          if (isOrganic) {
            const existing = weekEntry!.organicFarmers.find(ef => ef.petani_id === farmerId);
            if (!existing) {
              weekEntry!.organicFarmers.push(farmerData);
              weekEntry!.totalOrganicKg += farmerData.total_kg;
            } else {
              existing.total_kg += farmerData.total_kg;
              weekEntry!.totalOrganicKg += farmerData.total_kg;
            }
          } else {
            const existing = weekEntry!.conventionalFarmers.find(ef => ef.petani_id === farmerId);
            if (!existing) {
              weekEntry!.conventionalFarmers.push(farmerData);
              weekEntry!.totalConventionalKg += farmerData.total_kg;
            } else {
              existing.total_kg += farmerData.total_kg;
              weekEntry!.totalConventionalKg += farmerData.total_kg;
            }
          }
        });
      }
    });

    // Sort weeks within each pengepul
    pengepulMap.forEach(entry => {
      entry.weeks.sort((a, b) => {
        if (a.estimationName !== b.estimationName) return a.estimationName.localeCompare(b.estimationName);
        return a.weekIndex - b.weekIndex;
      });
    });

    return Array.from(pengepulMap.values()).sort((a, b) => a.pengepulNama.localeCompare(b.pengepulNama));
  }, [pengambilanList, pengepulList]);

  const selectedPengepulData = useMemo(() => 
    pengepulData.find(p => p.pengepulId === selectedPengepul),
    [pengepulData, selectedPengepul]
  );

  // Get unique estimations from selected pengepul
  const availableEstimations = useMemo(() => {
    if (!selectedPengepulData) return [];
    const estimations = new Set<string>();
    selectedPengepulData.weeks.forEach(week => {
      estimations.add(week.estimationName);
    });
    return Array.from(estimations).sort();
  }, [selectedPengepulData]);

  // Filter weeks by selected estimation
  const filteredPengepulData = useMemo(() => {
    if (!selectedPengepulData) return null;
    if (selectedEstimation === "all") return selectedPengepulData;
    
    return {
      ...selectedPengepulData,
      weeks: selectedPengepulData.weeks.filter(w => w.estimationName === selectedEstimation),
    };
  }, [selectedPengepulData, selectedEstimation]);

  // Calculate totals for filtered pengepul data
  const totals = useMemo(() => {
    if (!filteredPengepulData) return { organic: 0, conventional: 0, total: 0 };
    
    const organic = filteredPengepulData.weeks.reduce((sum, w) => sum + w.totalOrganicKg, 0);
    const conventional = filteredPengepulData.weeks.reduce((sum, w) => sum + w.totalConventionalKg, 0);
    
    return { organic, conventional, total: organic + conventional };
  }, [filteredPengepulData]);

  const handlePengepulChange = (pengepulId: string) => {
    setSelectedPengepul(pengepulId);
    setSelectedEstimation("all"); // Reset estimation filter when pengepul changes
  };

  const resetForm = () => {
    setSelectedPengepul("");
    setSelectedEstimation("all");
    setForm({
      warna_produk: "",
      kualitas: "grade_a",
      harga_per_kg: "",
      kondisi: "",
    });
  };

  const handleSubmit = async (isOrganic: boolean) => {
    if (!filteredPengepulData) return;

    // Get all weeks data from filtered data
    const allPengambilanIds: string[] = [];
    const allFarmers: FarmerDetail[] = [];
    let totalKg = 0;
    let pickupDate = "";

    filteredPengepulData.weeks.forEach(week => {
      allPengambilanIds.push(...week.pengambilanIds);
      if (!pickupDate) pickupDate = week.pickupDate;
      
      const farmers = isOrganic ? week.organicFarmers : week.conventionalFarmers;
      farmers.forEach(f => {
        const existing = allFarmers.find(ef => ef.petani_id === f.petani_id);
        if (!existing) {
          allFarmers.push({ ...f });
        } else {
          existing.total_kg += f.total_kg;
        }
      });
      
      totalKg += isOrganic ? week.totalOrganicKg : week.totalConventionalKg;
    });

    if (allFarmers.length === 0) {
      return;
    }

    // Prepare detail_petani for batch
    const detailPetaniForBatch = allFarmers.map(f => ({
      petani_id: f.petani_id,
      petani_nama: f.petani_nama,
      petani_kode: f.petani_kode,
      jumlah_kg: f.total_kg,
      is_organic: isOrganic,
      daily_values: f.daily_values,
    }));

    await onSubmit({
      petani_id: allFarmers[0].petani_id, // Use first farmer as primary
      lahan_id: null,
      tanggal_penerimaan: pickupDate,
      jumlah_kg: totalKg,
      warna_produk: form.warna_produk || null,
      kualitas: form.kualitas,
      harga_per_kg: form.harga_per_kg ? parseFloat(form.harga_per_kg) : null,
      kondisi: form.kondisi || null,
      pengepul_ids: [selectedPengepul],
      is_organic: isOrganic,
      detail_petani: detailPetaniForBatch,
    }, allPengambilanIds.filter(id => {
      // Only include pengambilan IDs that match the organic type
      const item = pengambilanList.find(p => p.id === id);
      if (!item?.catatan) return false;
      const isOrganicItem = item.catatan.includes('(Organik)');
      return isOrganicItem === isOrganic;
    }));

    resetForm();
    setDialogOpen(false);
  };

  // Render farmer table for a type
  const renderFarmerTable = (farmers: FarmerDetail[], title: string, icon: React.ReactNode, colorClass: string, pengepulNama?: string) => {
    if (farmers.length === 0) return null;
    const total = farmers.reduce((sum, f) => sum + f.total_kg, 0);

    return (
      <div className="border rounded-lg p-4">
        <div className={`flex items-center gap-2 mb-3 ${colorClass}`}>
          {icon}
          <Label className="text-sm font-medium">
            {pengepulNama ? `Pengepul ${pengepulNama} - ` : ""}{title} ({farmers.length} petani)
          </Label>
          <Badge variant="secondary">{total.toLocaleString()} Kg</Badge>
        </div>
        
        <div className="max-h-48 overflow-y-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">Nama Petani</TableHead>
                <TableHead className="sticky top-0 bg-background">Kode</TableHead>
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <TableHead key={d} className="text-center w-12 sticky top-0 bg-background">H{d}</TableHead>
                ))}
                <TableHead className="text-right sticky top-0 bg-background">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmers.map(farmer => (
                <TableRow key={farmer.petani_id}>
                  <TableCell className="font-medium">{farmer.petani_nama}</TableCell>
                  <TableCell>{farmer.petani_kode}</TableCell>
                  {(farmer.daily_values || [0, 0, 0, 0, 0, 0, 0]).slice(0, 7).map((val, idx) => (
                    <TableCell key={idx} className="text-center text-sm">
                      {val > 0 ? val.toLocaleString() : '-'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">{farmer.total_kg.toLocaleString()} Kg</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={9} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{total.toLocaleString()} Kg</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Aggregate all farmers across weeks for display (using filtered data)
  const aggregatedFarmers = useMemo(() => {
    if (!filteredPengepulData) return { organic: [], conventional: [] };

    const organicMap = new Map<string, FarmerDetail>();
    const conventionalMap = new Map<string, FarmerDetail>();

    filteredPengepulData.weeks.forEach(week => {
      week.organicFarmers.forEach(f => {
        if (organicMap.has(f.petani_id)) {
          organicMap.get(f.petani_id)!.total_kg += f.total_kg;
        } else {
          organicMap.set(f.petani_id, { ...f });
        }
      });

      week.conventionalFarmers.forEach(f => {
        if (conventionalMap.has(f.petani_id)) {
          conventionalMap.get(f.petani_id)!.total_kg += f.total_kg;
        } else {
          conventionalMap.set(f.petani_id, { ...f });
        }
      });
    });

    return {
      organic: Array.from(organicMap.values()),
      conventional: Array.from(conventionalMap.values()),
    };
  }, [filteredPengepulData]);

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-organic">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Batch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Batch Penerimaan</DialogTitle>
          <DialogDescription>Pilih pengepul untuk melihat data penerimaan per minggu</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Pengepul Selection */}
          <div className="border rounded-lg p-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <User className="h-4 w-4" />
              Pilih Pengepul *
            </Label>
            
            {pengepulData.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada data Barang Keluar yang belum diproses. Tambahkan data di tab Barang Keluar terlebih dahulu.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedPengepul} onValueChange={handlePengepulChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pengepul" />
                </SelectTrigger>
                <SelectContent>
                  {pengepulData.map(pengepul => {
                    const totalKg = pengepul.weeks.reduce((sum, w) => 
                      sum + w.totalOrganicKg + w.totalConventionalKg, 0
                    );
                    const weekCount = pengepul.weeks.length;
                    
                    return (
                      <SelectItem key={pengepul.pengepulId} value={pengepul.pengepulId}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pengepul.pengepulNama}</span>
                          <span className="text-muted-foreground">({pengepul.pengepulKode})</span>
                          <Badge variant="outline">{weekCount} periode</Badge>
                          <Badge variant="secondary">{totalKg.toLocaleString()} Kg</Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Pengepul Info with Estimation Filter */}
          {selectedPengepulData && (
            <>
              {/* Estimation Filter */}
              {availableEstimations.length > 1 && (
                <div className="border rounded-lg p-4">
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4" />
                    Filter Berdasarkan Estimasi
                  </Label>
                  <Select value={selectedEstimation} onValueChange={setSelectedEstimation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih estimasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Estimasi ({availableEstimations.length})</SelectItem>
                      {availableEstimations.map(estName => {
                        const estWeeks = selectedPengepulData.weeks.filter(w => w.estimationName === estName);
                        const estTotal = estWeeks.reduce((sum, w) => sum + w.totalOrganicKg + w.totalConventionalKg, 0);
                        return (
                          <SelectItem key={estName} value={estName}>
                            <div className="flex items-center gap-2">
                              <span>{estName}</span>
                              <Badge variant="outline">{estWeeks.length} minggu</Badge>
                              <Badge variant="secondary">{estTotal.toLocaleString()} Kg</Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{selectedPengepulData.pengepulNama}</span>
                  <span className="text-muted-foreground">({selectedPengepulData.pengepulKode})</span>
                  {selectedEstimation !== "all" && (
                    <Badge variant="outline">Filter: {selectedEstimation}</Badge>
                  )}
                </div>
                
                {/* Week Summary - Show filtered weeks */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                  {filteredPengepulData?.weeks.map((week, idx) => (
                    <div key={idx} className="p-2 bg-background rounded border text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">{week.estimationName} - {week.weekLabel}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(week.startDate), "dd MMM", { locale: localeId })} - {format(new Date(week.endDate), "dd MMM", { locale: localeId })}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {week.totalOrganicKg > 0 && (
                          <Badge className="bg-green-600 text-xs">
                            <Leaf className="h-3 w-3 mr-1" />
                            {week.totalOrganicKg.toLocaleString()} Kg
                          </Badge>
                        )}
                        {week.totalConventionalKg > 0 && (
                          <Badge className="bg-orange-500 text-xs">
                            <Factory className="h-3 w-3 mr-1" />
                            {week.totalConventionalKg.toLocaleString()} Kg
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-600" />
                    <span>Organik: <strong>{totals.organic.toLocaleString()} Kg</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-orange-500" />
                    <span>Konvensional: <strong>{totals.conventional.toLocaleString()} Kg</strong></span>
                  </div>
                  <div>
                    <span>Total: <strong>{totals.total.toLocaleString()} Kg</strong></span>
                  </div>
                </div>
              </div>

              {/* Organic Farmers Table - with pengepul name in title */}
              {renderFarmerTable(
                aggregatedFarmers.organic,
                "Produk Organik",
                <Leaf className="h-4 w-4" />,
                "text-green-600",
                selectedPengepulData.pengepulNama
              )}

              {/* Conventional Farmers Table - with pengepul name in title */}
              {renderFarmerTable(
                aggregatedFarmers.conventional,
                "Produk Konvensional",
                <Factory className="h-4 w-4" />,
                "text-orange-500",
                selectedPengepulData.pengepulNama
              )}

              {/* Form Fields */}
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Kualitas</Label>
                    <Select
                      value={form.kualitas}
                      onValueChange={(value) => setForm(prev => ({ ...prev, kualitas: value as QualityGrade }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="grade_a">Grade A</SelectItem>
                        <SelectItem value="grade_b">Grade B</SelectItem>
                        <SelectItem value="grade_c">Grade C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Harga per Kg</Label>
                    <Input
                      type="number"
                      value={form.harga_per_kg}
                      onChange={(e) => setForm(prev => ({ ...prev, harga_per_kg: e.target.value }))}
                      placeholder="Rp"
                    />
                  </div>
                  <div>
                    <Label>Warna Produk</Label>
                    <Input
                      value={form.warna_produk}
                      onChange={(e) => setForm(prev => ({ ...prev, warna_produk: e.target.value }))}
                      placeholder="Warna produk"
                    />
                  </div>
                </div>

                <div>
                  <Label>Kondisi</Label>
                  <Input
                    value={form.kondisi}
                    onChange={(e) => setForm(prev => ({ ...prev, kondisi: e.target.value }))}
                    placeholder="Kondisi produk"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {totals.organic > 0 && (
                    <Button 
                      onClick={() => handleSubmit(true)} 
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Leaf className="h-4 w-4 mr-2" />
                      Buat Batch Organik ({totals.organic.toLocaleString()} Kg)
                    </Button>
                  )}
                  {totals.conventional > 0 && (
                    <Button 
                      onClick={() => handleSubmit(false)} 
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Factory className="h-4 w-4 mr-2" />
                      Buat Batch Konvensional ({totals.conventional.toLocaleString()} Kg)
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
