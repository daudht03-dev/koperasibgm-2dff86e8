import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Package, Users, AlertCircle } from "lucide-react";
import { usePengambilanKoperasi, PengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { usePenjualanPetani } from "@/hooks/use-penjualan-petani";
import { useFarmers } from "@/hooks/use-farmers";
import { useLands } from "@/hooks/use-lands";
import { QualityGrade } from "@/hooks/use-batch-panen";
import { format, subDays } from "date-fns";
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
  }, pengambilanIds: string[]) => Promise<void>;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

interface PetaniDetail {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  total_kg: number;
  pengepul_nama: string;
  pengepul_kode: string;
  warna_produk: string | null;
  kualitas: string;
}

export const BatchPenerimaanForm = ({ onSubmit, dialogOpen, setDialogOpen }: BatchPenerimaanFormProps) => {
  const { pengambilanList, loading: pengambilanLoading } = usePengambilanKoperasi();
  const { penjualanList, getPenjualanByDateRange } = usePenjualanPetani();
  const { farmers } = useFarmers();
  const { lands } = useLands();

  const [selectedPengambilan, setSelectedPengambilan] = useState<string[]>([]);
  const [petaniDetails, setPetaniDetails] = useState<PetaniDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [form, setForm] = useState({
    petani_id: "",
    lahan_id: "",
    tanggal_penerimaan: format(new Date(), "yyyy-MM-dd"),
    warna_produk: "",
    kualitas: "grade_a" as QualityGrade,
    harga_per_kg: "",
    kondisi: "",
  });

  // Filter pengambilan yang belum diproses (batch_id = null)
  const unprocessedPengambilan = pengambilanList.filter(p => !p.batch_id);

  // Calculate total kg from selected pengambilan
  const totalKg = unprocessedPengambilan
    .filter(p => selectedPengambilan.includes(p.id))
    .reduce((sum, p) => sum + Number(p.jumlah_kg), 0);

  // Get unique pengepul IDs from selected pengambilan
  const selectedPengepulIds = [...new Set(
    unprocessedPengambilan
      .filter(p => selectedPengambilan.includes(p.id))
      .map(p => p.pengepul_id)
  )];

  // Load petani details when pengambilan is selected
  useEffect(() => {
    const loadPetaniDetails = async () => {
      if (selectedPengambilan.length === 0) {
        setPetaniDetails([]);
        return;
      }

      setLoadingDetails(true);
      try {
        // Get the date range from selected pengambilan
        const selectedItems = unprocessedPengambilan.filter(p => selectedPengambilan.includes(p.id));
        const dates = selectedItems.map(p => p.tanggal_ambil);
        const pengepulIds = [...new Set(selectedItems.map(p => p.pengepul_id))];

        // Calculate barang masuk date range (7 days before pengambilan date)
        const details: PetaniDetail[] = [];
        
        for (const item of selectedItems) {
          const pengambilanDate = new Date(item.tanggal_ambil);
          const startDate = format(subDays(pengambilanDate, 7), "yyyy-MM-dd");
          const endDate = format(subDays(pengambilanDate, 1), "yyyy-MM-dd");
          
          const penjualanData = await getPenjualanByDateRange(startDate, endDate, item.pengepul_id);
          
          // Group by petani
          const petaniMap = new Map<string, PetaniDetail>();
          for (const p of penjualanData) {
            const key = p.petani_id;
            if (petaniMap.has(key)) {
              const existing = petaniMap.get(key)!;
              existing.total_kg += Number(p.jumlah_kg);
            } else {
              petaniMap.set(key, {
                petani_id: p.petani_id,
                petani_nama: p.petani?.nama || "Unknown",
                petani_kode: p.petani?.kode_petani || "-",
                total_kg: Number(p.jumlah_kg),
                pengepul_nama: p.pengepul?.nama || "Unknown",
                pengepul_kode: p.pengepul?.kode_pengepul || "-",
                warna_produk: p.warna_produk,
                kualitas: p.kualitas,
              });
            }
          }
          
          details.push(...petaniMap.values());
        }
        
        // Merge duplicate petani entries
        const mergedDetails = new Map<string, PetaniDetail>();
        for (const detail of details) {
          if (mergedDetails.has(detail.petani_id)) {
            const existing = mergedDetails.get(detail.petani_id)!;
            existing.total_kg += detail.total_kg;
          } else {
            mergedDetails.set(detail.petani_id, { ...detail });
          }
        }
        
        setPetaniDetails(Array.from(mergedDetails.values()));
      } catch (error) {
        console.error("Error loading petani details:", error);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadPetaniDetails();
  }, [selectedPengambilan, unprocessedPengambilan]);

  // Auto-select first petani from details
  useEffect(() => {
    if (petaniDetails.length > 0 && !form.petani_id) {
      const firstPetani = petaniDetails[0];
      setForm(prev => ({
        ...prev,
        petani_id: firstPetani.petani_id,
        warna_produk: firstPetani.warna_produk || "",
        kualitas: (firstPetani.kualitas as QualityGrade) || "grade_a",
      }));
    }
  }, [petaniDetails]);

  // Filter lands by selected petani
  const filteredLands = lands.filter(land => 
    !form.petani_id || land.petani_id === form.petani_id
  );

  const handlePengambilanToggle = (id: string) => {
    setSelectedPengambilan(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPengambilan.length === unprocessedPengambilan.length) {
      setSelectedPengambilan([]);
    } else {
      setSelectedPengambilan(unprocessedPengambilan.map(p => p.id));
    }
  };

  const resetForm = () => {
    setSelectedPengambilan([]);
    setPetaniDetails([]);
    setForm({
      petani_id: "",
      lahan_id: "",
      tanggal_penerimaan: format(new Date(), "yyyy-MM-dd"),
      warna_produk: "",
      kualitas: "grade_a",
      harga_per_kg: "",
      kondisi: "",
    });
  };

  const handleSubmit = async () => {
    if (selectedPengambilan.length === 0) return;
    if (!form.petani_id) return;

    await onSubmit({
      petani_id: form.petani_id,
      lahan_id: form.lahan_id || null,
      tanggal_penerimaan: form.tanggal_penerimaan,
      jumlah_kg: totalKg,
      warna_produk: form.warna_produk || null,
      kualitas: form.kualitas,
      harga_per_kg: form.harga_per_kg ? parseFloat(form.harga_per_kg) : null,
      kondisi: form.kondisi || null,
      pengepul_ids: selectedPengepulIds.length > 0 ? selectedPengepulIds : null,
    }, selectedPengambilan);

    resetForm();
    setDialogOpen(false);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Batch Penerimaan</DialogTitle>
          <DialogDescription>Pilih data pengambilan koperasi yang akan diproses menjadi batch</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Pengambilan Selection */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Pilih Pengambilan Koperasi *
              </Label>
              {unprocessedPengambilan.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedPengambilan.length === unprocessedPengambilan.length ? "Batalkan Semua" : "Pilih Semua"}
                </Button>
              )}
            </div>
            
            {unprocessedPengambilan.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada data pengambilan koperasi yang belum diproses. Tambahkan data di tab Barang Keluar terlebih dahulu.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-40 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Pengepul</TableHead>
                      <TableHead>Jumlah (Kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unprocessedPengambilan.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={selectedPengambilan.includes(item.id) ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedPengambilan.includes(item.id)}
                            onCheckedChange={() => handlePengambilanToggle(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.tanggal_ambil), "dd MMM yyyy", { locale: localeId })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.pengepul?.nama}</p>
                            <p className="text-xs text-muted-foreground">{item.pengepul?.kode_pengepul}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{Number(item.jumlah_kg).toLocaleString()} Kg</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
            
            {selectedPengambilan.length > 0 && (
              <div className="mt-3 p-3 bg-primary/5 rounded-md flex items-center justify-between">
                <span className="text-sm">
                  <strong>{selectedPengambilan.length}</strong> pengambilan dipilih
                </span>
                <Badge variant="secondary" className="text-lg">
                  Total: {totalKg.toLocaleString()} Kg
                </Badge>
              </div>
            )}
          </div>

          {/* Petani Details from Barang Masuk */}
          {selectedPengambilan.length > 0 && (
            <div className="border rounded-lg p-4">
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                Detail Petani (dari Barang Masuk 7 hari sebelumnya)
              </Label>
              
              {loadingDetails ? (
                <div className="text-center py-4 text-muted-foreground">
                  Memuat detail petani...
                </div>
              ) : petaniDetails.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tidak ditemukan data barang masuk untuk periode 7 hari sebelum tanggal pengambilan.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-32 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Petani</TableHead>
                        <TableHead>Pengepul</TableHead>
                        <TableHead>Total (Kg)</TableHead>
                        <TableHead>Warna</TableHead>
                        <TableHead>Kualitas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {petaniDetails.map((detail, idx) => (
                        <TableRow key={`${detail.petani_id}-${idx}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{detail.petani_nama}</p>
                              <p className="text-xs text-muted-foreground">{detail.petani_kode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{detail.pengepul_nama}</p>
                              <p className="text-xs text-muted-foreground">{detail.pengepul_kode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{detail.total_kg.toLocaleString()} Kg</TableCell>
                          <TableCell>{detail.warna_produk || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{detail.kualitas}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Form Fields */}
          {selectedPengambilan.length > 0 && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Petani Utama *</Label>
                  <Select
                    value={form.petani_id}
                    onValueChange={(value) => setForm(prev => ({ ...prev, petani_id: value, lahan_id: "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih petani" />
                    </SelectTrigger>
                    <SelectContent>
                      {petaniDetails.length > 0 ? (
                        petaniDetails.map((detail) => (
                          <SelectItem key={detail.petani_id} value={detail.petani_id}>
                            {detail.petani_kode} - {detail.petani_nama}
                          </SelectItem>
                        ))
                      ) : (
                        farmers.map((farmer) => (
                          <SelectItem key={farmer.id} value={farmer.id}>
                            {farmer.kode_petani} - {farmer.nama}
                          </SelectItem>
                        ))
                      )}
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
                      <SelectValue placeholder="Pilih lahan" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLands.map((land) => (
                        <SelectItem key={land.id} value={land.id}>
                          {land.nama_lahan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Penerimaan *</Label>
                  <Input
                    type="date"
                    value={form.tanggal_penerimaan}
                    onChange={(e) => setForm(prev => ({ ...prev, tanggal_penerimaan: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Jumlah (Kg)</Label>
                  <Input
                    type="number"
                    value={totalKg}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warna Produk</Label>
                  <Input
                    value={form.warna_produk}
                    onChange={(e) => setForm(prev => ({ ...prev, warna_produk: e.target.value }))}
                    placeholder="Warna produk"
                  />
                </div>
                <div>
                  <Label>Kualitas</Label>
                  <Select
                    value={form.kualitas}
                    onValueChange={(value: QualityGrade) => setForm(prev => ({ ...prev, kualitas: value }))}
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Harga per Kg (Rp)</Label>
                  <Input
                    type="number"
                    value={form.harga_per_kg}
                    onChange={(e) => setForm(prev => ({ ...prev, harga_per_kg: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Kondisi</Label>
                  <Input
                    value={form.kondisi}
                    onChange={(e) => setForm(prev => ({ ...prev, kondisi: e.target.value }))}
                    placeholder="Kondisi hasil panen"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Batal</Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-gradient-organic"
            disabled={selectedPengambilan.length === 0 || !form.petani_id}
          >
            Simpan Batch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
