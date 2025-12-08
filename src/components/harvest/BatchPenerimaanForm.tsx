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
import { Plus, Package, Users, AlertCircle, Leaf, Factory } from "lucide-react";
import { usePengambilanKoperasi, PengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { useFarmers } from "@/hooks/use-farmers";
import { useLands } from "@/hooks/use-lands";
import { QualityGrade } from "@/hooks/use-batch-panen";
import { format } from "date-fns";
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
    }>;
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
  is_organic: boolean;
}

export const BatchPenerimaanForm = ({ onSubmit, dialogOpen, setDialogOpen }: BatchPenerimaanFormProps) => {
  const { pengambilanList, loading: pengambilanLoading } = usePengambilanKoperasi();
  const { farmers } = useFarmers();
  const { lands } = useLands();

  const [selectedPengambilan, setSelectedPengambilan] = useState<string[]>([]);
  const [petaniDetails, setPetaniDetails] = useState<PetaniDetail[]>([]);

  const [form, setForm] = useState({
    petani_id: "",
    lahan_id: "",
    tanggal_penerimaan: format(new Date(), "yyyy-MM-dd"),
    warna_produk: "",
    kualitas: "grade_a" as QualityGrade,
    harga_per_kg: "",
    kondisi: "",
  });

  // Memoize unprocessed list to prevent infinite loops
  const unprocessedPengambilan = useMemo(() => 
    pengambilanList.filter(p => !p.batch_id),
    [pengambilanList]
  );

  // Calculate total kg from selected pengambilan
  const totalKg = useMemo(() => 
    unprocessedPengambilan
      .filter(p => selectedPengambilan.includes(p.id))
      .reduce((sum, p) => sum + Number(p.jumlah_kg), 0),
    [unprocessedPengambilan, selectedPengambilan]
  );

  // Get unique pengepul IDs from selected pengambilan
  const selectedPengepulIds = useMemo(() => [...new Set(
    unprocessedPengambilan
      .filter(p => selectedPengambilan.includes(p.id))
      .map(p => p.pengepul_id)
  )], [unprocessedPengambilan, selectedPengambilan]);

  // Check if selected items are organic (first item determines type)
  const isOrganicBatch = useMemo(() => {
    const selectedItems = unprocessedPengambilan.filter(p => selectedPengambilan.includes(p.id));
    if (selectedItems.length === 0) return true;
    return selectedItems[0].is_organic !== false;
  }, [unprocessedPengambilan, selectedPengambilan]);

  // Load petani details from detail_petani field in pengambilan_koperasi
  const loadPetaniDetails = useCallback(() => {
    if (selectedPengambilan.length === 0) {
      setPetaniDetails([]);
      return;
    }

    const selectedItems = unprocessedPengambilan.filter(p => selectedPengambilan.includes(p.id));
    const details: PetaniDetail[] = [];
    const petaniMap = new Map<string, PetaniDetail>();

    for (const item of selectedItems) {
      // Get detail_petani from the pengambilan_koperasi record
      const detailPetani = item.detail_petani as Array<{
        id?: string;
        petani_id?: string;
        name?: string;
        petani_nama?: string;
        code?: string;
        petani_kode?: string;
        kg?: number;
        jumlah_kg?: number;
        isOrganic?: boolean;
        is_organic?: boolean;
      }> | null;

      if (detailPetani && Array.isArray(detailPetani)) {
        for (const farmer of detailPetani) {
          const farmerId = farmer.petani_id || farmer.id || '';
          const farmerName = farmer.petani_nama || farmer.name || 'Unknown';
          const farmerCode = farmer.petani_kode || farmer.code || '-';
          const farmerKg = farmer.jumlah_kg || farmer.kg || 0;
          const farmerIsOrganic = farmer.is_organic ?? farmer.isOrganic ?? (item.is_organic !== false);

          if (farmerId) {
            if (petaniMap.has(farmerId)) {
              const existing = petaniMap.get(farmerId)!;
              existing.total_kg += farmerKg;
            } else {
              petaniMap.set(farmerId, {
                petani_id: farmerId,
                petani_nama: farmerName,
                petani_kode: farmerCode,
                total_kg: farmerKg,
                pengepul_nama: item.pengepul?.nama || "Unknown",
                pengepul_kode: item.pengepul?.kode_pengepul || "-",
                warna_produk: null,
                kualitas: "grade_a",
                is_organic: farmerIsOrganic,
              });
            }
          }
        }
      }
    }

    setPetaniDetails(Array.from(petaniMap.values()));
  }, [selectedPengambilan, unprocessedPengambilan]);

  // Load details when selection changes
  useEffect(() => {
    loadPetaniDetails();
  }, [loadPetaniDetails]);

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
  }, [petaniDetails, form.petani_id]);

  // Filter lands by selected petani
  const filteredLands = useMemo(() => 
    lands.filter(land => !form.petani_id || land.petani_id === form.petani_id),
    [lands, form.petani_id]
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

  // Select by organic type
  const handleSelectByType = (isOrganic: boolean) => {
    const items = unprocessedPengambilan.filter(p => (p.is_organic !== false) === isOrganic);
    setSelectedPengambilan(items.map(p => p.id));
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

    // Prepare detail_petani for batch
    const detailPetaniForBatch = petaniDetails.map(p => ({
      petani_id: p.petani_id,
      petani_nama: p.petani_nama,
      petani_kode: p.petani_kode,
      jumlah_kg: p.total_kg,
      is_organic: p.is_organic,
    }));

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
      is_organic: isOrganicBatch,
      detail_petani: detailPetaniForBatch,
    }, selectedPengambilan);

    resetForm();
    setDialogOpen(false);
  };

  // Group unprocessed by type
  const organicItems = unprocessedPengambilan.filter(p => p.is_organic !== false);
  const conventionalItems = unprocessedPengambilan.filter(p => p.is_organic === false);

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
              <div className="flex items-center gap-2">
                {organicItems.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => handleSelectByType(true)} className="text-green-600">
                    <Leaf className="h-3 w-3 mr-1" />
                    Organik ({organicItems.length})
                  </Button>
                )}
                {conventionalItems.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => handleSelectByType(false)} className="text-orange-500">
                    <Factory className="h-3 w-3 mr-1" />
                    Konvensional ({conventionalItems.length})
                  </Button>
                )}
                {unprocessedPengambilan.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedPengambilan.length === unprocessedPengambilan.length ? "Batalkan" : "Semua"}
                  </Button>
                )}
              </div>
            </div>
            
            {unprocessedPengambilan.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada data pengambilan koperasi yang belum diproses. Tambahkan data di tab Barang Keluar terlebih dahulu.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-48 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Pengepul</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Petani</TableHead>
                      <TableHead>Jumlah (Kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unprocessedPengambilan.map((item) => {
                      const detailPetani = item.detail_petani as Array<any> | null;
                      const petaniCount = detailPetani?.length || 0;
                      
                      return (
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
                          <TableCell>
                            {item.is_organic !== false ? (
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
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {petaniCount} petani
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{Number(item.jumlah_kg).toLocaleString()} Kg</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
            
            {selectedPengambilan.length > 0 && (
              <div className="mt-3 p-3 bg-primary/5 rounded-md flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <strong>{selectedPengambilan.length}</strong> pengambilan dipilih
                  {isOrganicBatch ? (
                    <Badge className="bg-green-600 text-xs"><Leaf className="h-3 w-3 mr-1" />Organik</Badge>
                  ) : (
                    <Badge className="bg-orange-500 text-xs"><Factory className="h-3 w-3 mr-1" />Konvensional</Badge>
                  )}
                </span>
                <Badge variant="secondary" className="text-lg">
                  Total: {totalKg.toLocaleString()} Kg
                </Badge>
              </div>
            )}
          </div>

          {/* Petani Details from detail_petani */}
          {selectedPengambilan.length > 0 && petaniDetails.length > 0 && (
            <div className="border rounded-lg p-4">
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                Detail Petani ({petaniDetails.length} petani)
              </Label>
              
              <ScrollArea className="h-32 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Petani</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Total (Kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {petaniDetails.map((detail, idx) => (
                      <TableRow key={`${detail.petani_id}-${idx}`}>
                        <TableCell>
                          <p className="font-medium">{detail.petani_nama}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-muted-foreground">{detail.petani_kode}</p>
                        </TableCell>
                        <TableCell>
                          {detail.is_organic ? (
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">O</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">K</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{detail.total_kg.toLocaleString()} Kg</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tanggal Penerimaan</Label>
                  <Input
                    type="date"
                    value={form.tanggal_penerimaan}
                    onChange={(e) => setForm(prev => ({ ...prev, tanggal_penerimaan: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Warna Produk</Label>
                  <Input
                    value={form.warna_produk}
                    onChange={(e) => setForm(prev => ({ ...prev, warna_produk: e.target.value }))}
                    placeholder="Cokelat muda, dll"
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
                    placeholder="Baik, dll"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-gradient-organic"
            disabled={selectedPengambilan.length === 0 || !form.petani_id}
          >
            Buat Batch ({totalKg.toLocaleString()} Kg)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
