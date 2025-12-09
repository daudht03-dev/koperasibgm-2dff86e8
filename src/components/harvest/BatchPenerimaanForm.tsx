import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Package, Users, AlertCircle, Leaf, Factory, Calendar } from "lucide-react";
import { usePengambilanKoperasi, PengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { useFarmers } from "@/hooks/use-farmers";
import { useLands } from "@/hooks/use-lands";
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

interface WeekOption {
  key: string;
  estimationName: string;
  weekLabel: string;
  weekIndex: number;
  startDate: string;
  endDate: string;
  pickupDate: string; // Day 8 = tanggal penerimaan
  isOrganic: boolean;
  pengambilanIds: string[];
  farmers: FarmerDetail[];
  totalKg: number;
}

interface FarmerDetail {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  total_kg: number;
  daily_values: number[];
  pengepul_nama: string;
  pengepul_kode: string;
  is_organic: boolean;
}

export const BatchPenerimaanForm = ({ onSubmit, dialogOpen, setDialogOpen }: BatchPenerimaanFormProps) => {
  const { pengambilanList, loading: pengambilanLoading } = usePengambilanKoperasi();
  const { farmers } = useFarmers();
  const { lands } = useLands();

  const [selectedWeek, setSelectedWeek] = useState<string>("");

  const [form, setForm] = useState({
    petani_id: "",
    lahan_id: "",
    warna_produk: "",
    kualitas: "grade_a" as QualityGrade,
    harga_per_kg: "",
    kondisi: "",
  });

  // Group pengambilan by week (like Barang Keluar)
  const weekOptions = useMemo((): WeekOption[] => {
    const weekMap = new Map<string, {
      estimationName: string;
      weekLabel: string;
      weekIndex: number;
      isOrganic: boolean;
      pickupDate: string;
      pengambilanIds: string[];
      farmers: FarmerDetail[];
    }>();

    // Filter unprocessed (no batch_id)
    const unprocessed = pengambilanList.filter(p => !p.batch_id);

    unprocessed.forEach(item => {
      const match = item.catatan?.match(/Auto-generated dari estimasi: (.+?) - (Minggu (\d+)) \((Organik|Konvensional)\)/);
      if (!match) return;

      const [, estName, weekLabel, weekNum, type] = match;
      const isOrganic = type === 'Organik';
      const key = `${estName}-${weekLabel}-${type}`;

      if (!weekMap.has(key)) {
        weekMap.set(key, {
          estimationName: estName,
          weekLabel,
          weekIndex: parseInt(weekNum) - 1,
          isOrganic,
          pickupDate: item.tanggal_ambil,
          pengambilanIds: [],
          farmers: [],
        });
      }

      const weekData = weekMap.get(key)!;
      weekData.pengambilanIds.push(item.id);

      // Extract farmer details
      const detailPetani = (item as any).detail_petani;
      if (Array.isArray(detailPetani)) {
        detailPetani.forEach((f: any) => {
          const farmerId = f.petani_id || f.id || '';
          const existing = weekData.farmers.find(ef => ef.petani_id === farmerId);
          
          if (!existing) {
            weekData.farmers.push({
              petani_id: farmerId,
              petani_nama: f.petani_nama || f.name || 'Unknown',
              petani_kode: f.petani_kode || f.code || '-',
              total_kg: f.jumlah_kg || f.kg || 0,
              daily_values: f.daily_values || [0, 0, 0, 0, 0, 0, 0],
              pengepul_nama: item.pengepul?.nama || 'Unknown',
              pengepul_kode: item.pengepul?.kode_pengepul || '-',
              is_organic: isOrganic,
            });
          } else {
            existing.total_kg += (f.jumlah_kg || f.kg || 0);
          }
        });
      }
    });

    return Array.from(weekMap.entries()).map(([key, data]) => {
      // Calculate startDate and endDate from pickupDate (pickupDate = day 8 = endDate + 1)
      const pickup = new Date(data.pickupDate);
      const endDate = addDays(pickup, -1);
      const startDate = addDays(endDate, -6);

      return {
        key,
        estimationName: data.estimationName,
        weekLabel: data.weekLabel,
        weekIndex: data.weekIndex,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        pickupDate: data.pickupDate,
        isOrganic: data.isOrganic,
        pengambilanIds: data.pengambilanIds,
        farmers: data.farmers,
        totalKg: data.farmers.reduce((sum, f) => sum + f.total_kg, 0),
      };
    }).sort((a, b) => {
      if (a.estimationName !== b.estimationName) return a.estimationName.localeCompare(b.estimationName);
      if (a.weekIndex !== b.weekIndex) return a.weekIndex - b.weekIndex;
      return a.isOrganic ? -1 : 1;
    });
  }, [pengambilanList]);

  const selectedWeekData = useMemo(() => 
    weekOptions.find(w => w.key === selectedWeek),
    [weekOptions, selectedWeek]
  );

  // Filter lands by selected petani
  const filteredLands = useMemo(() => 
    lands.filter(land => !form.petani_id || land.petani_id === form.petani_id),
    [lands, form.petani_id]
  );

  // Auto-set first farmer as petani_id when week is selected
  useEffect(() => {
    if (selectedWeekData && selectedWeekData.farmers.length > 0 && !form.petani_id) {
      setForm(prev => ({
        ...prev,
        petani_id: selectedWeekData.farmers[0].petani_id,
      }));
    }
  }, [selectedWeekData]);

  const handleWeekChange = (weekKey: string) => {
    setSelectedWeek(weekKey);
    setForm(prev => ({
      ...prev,
      petani_id: "",
      lahan_id: "",
    }));
  };

  const resetForm = () => {
    setSelectedWeek("");
    setForm({
      petani_id: "",
      lahan_id: "",
      warna_produk: "",
      kualitas: "grade_a",
      harga_per_kg: "",
      kondisi: "",
    });
  };

  const handleSubmit = async () => {
    if (!selectedWeekData) return;
    if (!form.petani_id) return;

    // Prepare detail_petani for batch
    const detailPetaniForBatch = selectedWeekData.farmers.map(f => ({
      petani_id: f.petani_id,
      petani_nama: f.petani_nama,
      petani_kode: f.petani_kode,
      jumlah_kg: f.total_kg,
      is_organic: f.is_organic,
      daily_values: f.daily_values,
    }));

    // Get unique pengepul IDs
    const pengepulIds = [...new Set(
      pengambilanList
        .filter(p => selectedWeekData.pengambilanIds.includes(p.id))
        .map(p => p.pengepul_id)
    )];

    await onSubmit({
      petani_id: form.petani_id,
      lahan_id: form.lahan_id || null,
      tanggal_penerimaan: selectedWeekData.pickupDate, // Auto-fill tanggal penerimaan = hari ke-8
      jumlah_kg: selectedWeekData.totalKg,
      warna_produk: form.warna_produk || null,
      kualitas: form.kualitas,
      harga_per_kg: form.harga_per_kg ? parseFloat(form.harga_per_kg) : null,
      kondisi: form.kondisi || null,
      pengepul_ids: pengepulIds.length > 0 ? pengepulIds : null,
      is_organic: selectedWeekData.isOrganic,
      detail_petani: detailPetaniForBatch,
    }, selectedWeekData.pengambilanIds);

    resetForm();
    setDialogOpen(false);
  };

  // Render farmer table with daily values
  const renderFarmerTable = () => {
    if (!selectedWeekData || selectedWeekData.farmers.length === 0) return null;

    return (
      <div className="border rounded-lg p-4">
        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" />
          Detail Petani ({selectedWeekData.farmers.length} petani)
        </Label>
        
        <ScrollArea className="max-h-64 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Petani</TableHead>
                <TableHead>Kode</TableHead>
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <TableHead key={d} className="text-center w-12">H{d}</TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedWeekData.farmers.map(farmer => (
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
                <TableCell className="text-right font-bold">{selectedWeekData.totalKg.toLocaleString()} Kg</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

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
          <DialogDescription>Pilih minggu dari Barang Keluar untuk membuat batch penerimaan</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Week Selection */}
          <div className="border rounded-lg p-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              Pilih Minggu *
            </Label>
            
            {weekOptions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada data Barang Keluar yang belum diproses. Tambahkan data di tab Barang Keluar terlebih dahulu.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedWeek} onValueChange={handleWeekChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih minggu" />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map(week => (
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
                          ({week.farmers.length} petani, {week.totalKg.toLocaleString()} Kg)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Week Info */}
          {selectedWeekData && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{selectedWeekData.estimationName} - {selectedWeekData.weekLabel}</span>
                <Badge className={selectedWeekData.isOrganic ? 'bg-green-600' : 'bg-orange-500'}>
                  {selectedWeekData.isOrganic ? 'Organik' : 'Konvensional'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Periode:</span>{' '}
                  {format(new Date(selectedWeekData.startDate), "dd MMM", { locale: localeId })} - {format(new Date(selectedWeekData.endDate), "dd MMM yyyy", { locale: localeId })}
                </div>
                <div>
                  <span className="font-medium">Tanggal Penerimaan (H8):</span>{' '}
                  <Badge variant="outline" className="ml-1">
                    {format(new Date(selectedWeekData.pickupDate), "dd MMM yyyy", { locale: localeId })}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Petani:</span> {selectedWeekData.farmers.length}
                </div>
                <div>
                  <span className="font-medium">Total:</span>{' '}
                  <Badge variant="secondary">{selectedWeekData.totalKg.toLocaleString()} Kg</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Farmer Table with Daily Values */}
          {renderFarmerTable()}

          {/* Form Fields */}
          {selectedWeekData && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Petani Utama *</Label>
                  <Select
                    value={form.petani_id}
                    onValueChange={(value) => setForm(prev => ({ ...prev, petani_id: value, lahan_id: "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih petani utama" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedWeekData.farmers.map(f => (
                        <SelectItem key={f.petani_id} value={f.petani_id}>
                          {f.petani_nama} ({f.petani_kode}) - {f.total_kg.toLocaleString()} Kg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lahan</Label>
                  <Select
                    value={form.lahan_id}
                    onValueChange={(value) => setForm(prev => ({ ...prev, lahan_id: value }))}
                    disabled={!form.petani_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih lahan (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLands.map(land => (
                        <SelectItem key={land.id} value={land.id}>
                          {land.nama_lahan} - {land.lokasi || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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

              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={!selectedWeek || !form.petani_id}
              >
                Buat Batch Penerimaan
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
