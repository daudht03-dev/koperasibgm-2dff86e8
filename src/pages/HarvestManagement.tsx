import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { useBatchPanen, useProsesPengeringan, useGudangStok, usePengolahanDokumen, usePenjualan, BatchStatus, QualityGrade } from "@/hooks/use-batch-panen";
import { useFarmers } from "@/hooks/use-farmers";
import { useLands } from "@/hooks/use-lands";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Package, Flame, Warehouse, FileText, ShoppingCart, Eye, Edit, Trash2, RefreshCw, TrendingUp, Calendar, Scale, Droplets, Calculator } from "lucide-react";
import { useHarvestEstimation } from "@/hooks/use-harvest-estimation";
import { HarvestEstimationForm } from "@/components/HarvestEstimationForm";
import { HarvestEstimationTable } from "@/components/HarvestEstimationTable";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TableSkeleton } from "@/components/ui/skeleton-templates";

const statusColors: Record<BatchStatus, string> = {
  penerimaan: "bg-blue-100 text-blue-800 border-blue-200",
  pengeringan: "bg-orange-100 text-orange-800 border-orange-200",
  penyimpanan: "bg-purple-100 text-purple-800 border-purple-200",
  pengolahan: "bg-yellow-100 text-yellow-800 border-yellow-200",
  penjualan: "bg-green-100 text-green-800 border-green-200",
  selesai: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<BatchStatus, string> = {
  penerimaan: "Penerimaan",
  pengeringan: "Pengeringan",
  penyimpanan: "Penyimpanan",
  pengolahan: "Pengolahan",
  penjualan: "Penjualan",
  selesai: "Selesai",
};

const qualityLabels: Record<QualityGrade, string> = {
  premium: "Premium",
  grade_a: "Grade A",
  grade_b: "Grade B",
  grade_c: "Grade C",
};

const HarvestManagement = () => {
  const { batches, loading: batchLoading, addBatch, updateBatch, deleteBatch, updateBatchStatus } = useBatchPanen();
  const { proses: pengeringanList, loading: pengeringanLoading, addProses, updateProses } = useProsesPengeringan();
  const { stok: gudangList, loading: gudangLoading, addStok, updateStok } = useGudangStok();
  const { dokumen: dokumenList, loading: dokumenLoading, addDokumen } = usePengolahanDokumen();
  const { penjualan: penjualanList, loading: penjualanLoading, addPenjualan, updatePenjualan } = usePenjualan();
  const { farmers } = useFarmers();
  const { lands } = useLands();
  
  // Harvest Estimation Hook
  const harvestEstimation = useHarvestEstimation();

  const [activeTab, setActiveTab] = useState("penerimaan");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Form states for batch penerimaan
  const [batchForm, setBatchForm] = useState({
    petani_id: "",
    lahan_id: "",
    tanggal_penerimaan: format(new Date(), "yyyy-MM-dd"),
    jumlah_kg: "",
    warna_produk: "",
    kualitas: "grade_a" as QualityGrade,
    harga_per_kg: "",
    kondisi: "",
  });

  // Form states for pengeringan
  const [pengeringanForm, setPengeringanForm] = useState({
    batch_id: "",
    suhu_oven: "",
    durasi_jam: "",
    kadar_air_awal: "",
    jumlah_kg_sebelum: "",
    operator: "",
    catatan: "",
  });

  // Form states for gudang
  const [gudangForm, setGudangForm] = useState({
    batch_id: "",
    lokasi_gudang: "Gudang Utama",
    rak_posisi: "",
    jumlah_kg: "",
    kondisi_penyimpanan: "",
    suhu_gudang: "",
    kelembaban: "",
    catatan: "",
  });

  // Form states for dokumen
  const [dokumenForm, setDokumenForm] = useState({
    batch_id: "",
    nomor_dokumen: "",
    jenis_dokumen: "",
    penerbit: "",
    masa_berlaku: "",
    catatan: "",
  });

  // Form states for penjualan
  const [penjualanForm, setPenjualanForm] = useState({
    batch_id: "",
    pembeli: "",
    alamat_pembeli: "",
    jumlah_kg: "",
    harga_per_kg: "",
    metode_pembayaran: "",
    tanggal_kirim: "",
    catatan: "",
  });

  const resetForms = () => {
    setBatchForm({
      petani_id: "",
      lahan_id: "",
      tanggal_penerimaan: format(new Date(), "yyyy-MM-dd"),
      jumlah_kg: "",
      warna_produk: "",
      kualitas: "grade_a",
      harga_per_kg: "",
      kondisi: "",
    });
    setPengeringanForm({
      batch_id: "",
      suhu_oven: "",
      durasi_jam: "",
      kadar_air_awal: "",
      jumlah_kg_sebelum: "",
      operator: "",
      catatan: "",
    });
    setGudangForm({
      batch_id: "",
      lokasi_gudang: "Gudang Utama",
      rak_posisi: "",
      jumlah_kg: "",
      kondisi_penyimpanan: "",
      suhu_gudang: "",
      kelembaban: "",
      catatan: "",
    });
    setDokumenForm({
      batch_id: "",
      nomor_dokumen: "",
      jenis_dokumen: "",
      penerbit: "",
      masa_berlaku: "",
      catatan: "",
    });
    setPenjualanForm({
      batch_id: "",
      pembeli: "",
      alamat_pembeli: "",
      jumlah_kg: "",
      harga_per_kg: "",
      metode_pembayaran: "",
      tanggal_kirim: "",
      catatan: "",
    });
  };

  const handleAddBatch = async () => {
    if (!batchForm.petani_id || !batchForm.jumlah_kg) return;

    await addBatch({
      petani_id: batchForm.petani_id,
      lahan_id: batchForm.lahan_id || null,
      tanggal_penerimaan: batchForm.tanggal_penerimaan,
      jumlah_kg: parseFloat(batchForm.jumlah_kg),
      warna_produk: batchForm.warna_produk || null,
      kualitas: batchForm.kualitas,
      harga_per_kg: batchForm.harga_per_kg ? parseFloat(batchForm.harga_per_kg) : null,
      kondisi: batchForm.kondisi || null,
      pengepul_ids: null,
      status: "penerimaan",
    });

    resetForms();
    setDialogOpen(false);
  };

  const handleAddPengeringan = async () => {
    if (!pengeringanForm.batch_id || !pengeringanForm.jumlah_kg_sebelum) return;

    await addProses({
      batch_id: pengeringanForm.batch_id,
      tanggal_mulai: new Date().toISOString(),
      tanggal_selesai: null,
      suhu_oven: pengeringanForm.suhu_oven ? parseFloat(pengeringanForm.suhu_oven) : null,
      durasi_jam: pengeringanForm.durasi_jam ? parseFloat(pengeringanForm.durasi_jam) : null,
      kadar_air_awal: pengeringanForm.kadar_air_awal ? parseFloat(pengeringanForm.kadar_air_awal) : null,
      kadar_air_akhir: null,
      jumlah_kg_sebelum: parseFloat(pengeringanForm.jumlah_kg_sebelum),
      jumlah_kg_sesudah: null,
      operator: pengeringanForm.operator || null,
      catatan: pengeringanForm.catatan || null,
      status: "proses",
    });

    // Update batch status
    await updateBatchStatus(pengeringanForm.batch_id, "pengeringan");

    resetForms();
    setDialogOpen(false);
  };

  const handleAddGudang = async () => {
    if (!gudangForm.batch_id || !gudangForm.jumlah_kg) return;

    await addStok({
      batch_id: gudangForm.batch_id,
      lokasi_gudang: gudangForm.lokasi_gudang,
      rak_posisi: gudangForm.rak_posisi || null,
      tanggal_masuk: format(new Date(), "yyyy-MM-dd"),
      tanggal_keluar: null,
      jumlah_kg: parseFloat(gudangForm.jumlah_kg),
      kondisi_penyimpanan: gudangForm.kondisi_penyimpanan || null,
      suhu_gudang: gudangForm.suhu_gudang ? parseFloat(gudangForm.suhu_gudang) : null,
      kelembaban: gudangForm.kelembaban ? parseFloat(gudangForm.kelembaban) : null,
      catatan: gudangForm.catatan || null,
      status: "tersimpan",
    });

    // Update batch status
    await updateBatchStatus(gudangForm.batch_id, "penyimpanan");

    resetForms();
    setDialogOpen(false);
  };

  const handleAddDokumen = async () => {
    if (!dokumenForm.batch_id || !dokumenForm.nomor_dokumen || !dokumenForm.jenis_dokumen) return;

    await addDokumen({
      batch_id: dokumenForm.batch_id,
      nomor_dokumen: dokumenForm.nomor_dokumen,
      jenis_dokumen: dokumenForm.jenis_dokumen,
      tanggal_dokumen: format(new Date(), "yyyy-MM-dd"),
      penerbit: dokumenForm.penerbit || null,
      masa_berlaku: dokumenForm.masa_berlaku || null,
      file_url: null,
      catatan: dokumenForm.catatan || null,
      status: "aktif",
    });

    // Update batch status
    await updateBatchStatus(dokumenForm.batch_id, "pengolahan");

    resetForms();
    setDialogOpen(false);
  };

  const handleAddPenjualan = async () => {
    if (!penjualanForm.batch_id || !penjualanForm.pembeli || !penjualanForm.jumlah_kg || !penjualanForm.harga_per_kg) return;

    await addPenjualan({
      batch_id: penjualanForm.batch_id,
      tanggal_penjualan: format(new Date(), "yyyy-MM-dd"),
      pembeli: penjualanForm.pembeli,
      alamat_pembeli: penjualanForm.alamat_pembeli || null,
      jumlah_kg: parseFloat(penjualanForm.jumlah_kg),
      harga_per_kg: parseFloat(penjualanForm.harga_per_kg),
      metode_pembayaran: penjualanForm.metode_pembayaran || null,
      status_pembayaran: "pending",
      tanggal_kirim: penjualanForm.tanggal_kirim || null,
      catatan: penjualanForm.catatan || null,
    });

    // Update batch status
    await updateBatchStatus(penjualanForm.batch_id, "penjualan");

    resetForms();
    setDialogOpen(false);
  };

  // Filter lands by selected farmer
  const filteredLands = lands.filter(land => 
    !batchForm.petani_id || land.petani_id === batchForm.petani_id
  );

  // Stats calculation
  const stats = {
    totalBatch: batches.length,
    totalKg: batches.reduce((sum, b) => sum + Number(b.jumlah_kg || 0), 0),
    totalPenjualan: penjualanList.reduce((sum, p) => sum + Number(p.total_harga || 0), 0),
    batchDiProses: batches.filter(b => b.status !== 'selesai').length,
  };

  return (
    <div className="min-h-screen bg-gradient-natural">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Dashboard
            </Link>
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Manajemen Hasil Panen
          </h1>
          <p className="text-muted-foreground">
            Kelola alur panen dari penerimaan hingga penjualan
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-organic-green/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Batch</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalBatch}</p>
                </div>
                <div className="bg-gradient-organic p-3 rounded-lg">
                  <Package className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-organic-green/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Panen (Kg)</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalKg.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-organic p-3 rounded-lg">
                  <Scale className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-organic-green/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Penjualan</p>
                  <p className="text-2xl font-bold text-foreground">
                    Rp {stats.totalPenjualan.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gradient-organic p-3 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-organic-green/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Batch Diproses</p>
                  <p className="text-2xl font-bold text-foreground">{stats.batchDiProses}</p>
                </div>
                <div className="bg-gradient-organic p-3 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="penerimaan" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Penerimaan</span>
            </TabsTrigger>
            <TabsTrigger value="pengeringan" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Pengeringan</span>
            </TabsTrigger>
            <TabsTrigger value="penyimpanan" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              <span className="hidden sm:inline">Gudang</span>
            </TabsTrigger>
            <TabsTrigger value="dokumen" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Dokumen</span>
            </TabsTrigger>
            <TabsTrigger value="penjualan" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Penjualan</span>
            </TabsTrigger>
            <TabsTrigger value="estimasi" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Estimasi</span>
            </TabsTrigger>
          </TabsList>

          {/* Penerimaan Tab */}
          <TabsContent value="penerimaan">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Penerimaan Hasil Panen</CardTitle>
                  <CardDescription>Catat penerimaan hasil panen dari petani</CardDescription>
                </div>
                <Dialog open={dialogOpen && activeTab === "penerimaan"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForms();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-organic">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Batch
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Tambah Batch Penerimaan</DialogTitle>
                      <DialogDescription>Catat data penerimaan hasil panen dari petani</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Petani *</Label>
                          <Select
                            value={batchForm.petani_id}
                            onValueChange={(value) => setBatchForm(prev => ({ ...prev, petani_id: value, lahan_id: "" }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih petani" />
                            </SelectTrigger>
                            <SelectContent>
                              {farmers.map((farmer) => (
                                <SelectItem key={farmer.id} value={farmer.id}>
                                  {farmer.kode_petani} - {farmer.nama}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Lahan</Label>
                          <Select
                            value={batchForm.lahan_id}
                            onValueChange={(value) => setBatchForm(prev => ({ ...prev, lahan_id: value }))}
                            disabled={!batchForm.petani_id}
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
                            value={batchForm.tanggal_penerimaan}
                            onChange={(e) => setBatchForm(prev => ({ ...prev, tanggal_penerimaan: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Jumlah (Kg) *</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={batchForm.jumlah_kg}
                            onChange={(e) => setBatchForm(prev => ({ ...prev, jumlah_kg: e.target.value }))}
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Warna Produk</Label>
                          <Input
                            value={batchForm.warna_produk}
                            onChange={(e) => setBatchForm(prev => ({ ...prev, warna_produk: e.target.value }))}
                            placeholder="Warna produk"
                          />
                        </div>
                        <div>
                          <Label>Kualitas</Label>
                          <Select
                            value={batchForm.kualitas}
                            onValueChange={(value: QualityGrade) => setBatchForm(prev => ({ ...prev, kualitas: value }))}
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
                            value={batchForm.harga_per_kg}
                            onChange={(e) => setBatchForm(prev => ({ ...prev, harga_per_kg: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Kondisi</Label>
                          <Input
                            value={batchForm.kondisi}
                            onChange={(e) => setBatchForm(prev => ({ ...prev, kondisi: e.target.value }))}
                            placeholder="Kondisi hasil panen"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleAddBatch} className="bg-gradient-organic">Simpan</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {batchLoading ? (
                  <TableSkeleton rows={5} columns={7} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Batch</TableHead>
                        <TableHead>Petani</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Jumlah (Kg)</TableHead>
                        <TableHead>Kualitas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono font-medium">{batch.batch_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{batch.petani?.nama || "-"}</p>
                              <p className="text-sm text-muted-foreground">{batch.petani?.kode_petani}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(batch.tanggal_penerimaan), "dd MMM yyyy", { locale: localeId })}
                          </TableCell>
                          <TableCell>{Number(batch.jumlah_kg).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{qualityLabels[batch.kualitas]}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[batch.status]}>
                              {statusLabels[batch.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/admin/batch/${batch.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Batch?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus batch {batch.batch_number}? Semua data terkait akan ikut terhapus.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteBatch(batch.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {batches.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Belum ada data batch panen
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pengeringan Tab */}
          <TabsContent value="pengeringan">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Proses Pengeringan / Oven</CardTitle>
                  <CardDescription>Kelola proses pengeringan hasil panen</CardDescription>
                </div>
                <Dialog open={dialogOpen && activeTab === "pengeringan"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForms();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-organic">
                      <Plus className="h-4 w-4 mr-2" />
                      Mulai Pengeringan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mulai Proses Pengeringan</DialogTitle>
                      <DialogDescription>Catat proses pengeringan/oven batch panen</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>Pilih Batch *</Label>
                        <Select
                          value={pengeringanForm.batch_id}
                          onValueChange={(value) => {
                            const batch = batches.find(b => b.id === value);
                            setPengeringanForm(prev => ({
                              ...prev,
                              batch_id: value,
                              jumlah_kg_sebelum: batch ? String(batch.jumlah_kg) : "",
                              kadar_air_awal: "",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.filter(b => b.status === 'penerimaan').map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.batch_number} - {batch.petani?.nama} ({batch.jumlah_kg} Kg)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Suhu Oven (°C)</Label>
                          <Input
                            type="number"
                            value={pengeringanForm.suhu_oven}
                            onChange={(e) => setPengeringanForm(prev => ({ ...prev, suhu_oven: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Durasi (Jam)</Label>
                          <Input
                            type="number"
                            value={pengeringanForm.durasi_jam}
                            onChange={(e) => setPengeringanForm(prev => ({ ...prev, durasi_jam: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Kadar Air Awal (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={pengeringanForm.kadar_air_awal}
                            onChange={(e) => setPengeringanForm(prev => ({ ...prev, kadar_air_awal: e.target.value }))}
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <Label>Jumlah Kg Sebelum *</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={pengeringanForm.jumlah_kg_sebelum}
                            onChange={(e) => setPengeringanForm(prev => ({ ...prev, jumlah_kg_sebelum: e.target.value }))}
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Operator</Label>
                        <Input
                          value={pengeringanForm.operator}
                          onChange={(e) => setPengeringanForm(prev => ({ ...prev, operator: e.target.value }))}
                          placeholder="Nama operator"
                        />
                      </div>
                      <div>
                        <Label>Catatan</Label>
                        <Textarea
                          value={pengeringanForm.catatan}
                          onChange={(e) => setPengeringanForm(prev => ({ ...prev, catatan: e.target.value }))}
                          placeholder="Catatan proses..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleAddPengeringan} className="bg-gradient-organic">Mulai Proses</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {pengeringanLoading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Mulai</TableHead>
                        <TableHead>Suhu (°C)</TableHead>
                        <TableHead>Kg Sebelum</TableHead>
                        <TableHead>Kg Sesudah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pengeringanList.map((proses) => {
                        const batch = batches.find(b => b.id === proses.batch_id);
                        return (
                          <TableRow key={proses.id}>
                            <TableCell className="font-mono">{batch?.batch_number || "-"}</TableCell>
                            <TableCell>
                              {format(new Date(proses.tanggal_mulai), "dd MMM yyyy HH:mm", { locale: localeId })}
                            </TableCell>
                            <TableCell>{proses.suhu_oven || "-"}</TableCell>
                            <TableCell>{Number(proses.jumlah_kg_sebelum).toLocaleString()}</TableCell>
                            <TableCell>{proses.jumlah_kg_sesudah ? Number(proses.jumlah_kg_sesudah).toLocaleString() : "-"}</TableCell>
                            <TableCell>
                              <Badge variant={proses.status === 'selesai' ? 'default' : 'secondary'}>
                                {proses.status === 'selesai' ? 'Selesai' : 'Proses'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {proses.status !== 'selesai' && (
                                <Button variant="outline" size="sm">
                                  Selesaikan
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {pengeringanList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Belum ada data proses pengeringan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penyimpanan Tab */}
          <TabsContent value="penyimpanan">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Stok Gudang</CardTitle>
                  <CardDescription>Kelola penyimpanan hasil panen di gudang</CardDescription>
                </div>
                <Dialog open={dialogOpen && activeTab === "penyimpanan"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForms();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-organic">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah ke Gudang
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Stok Gudang</DialogTitle>
                      <DialogDescription>Catat penyimpanan batch di gudang</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>Pilih Batch *</Label>
                        <Select
                          value={gudangForm.batch_id}
                          onValueChange={(value) => {
                            const batch = batches.find(b => b.id === value);
                            setGudangForm(prev => ({
                              ...prev,
                              batch_id: value,
                              jumlah_kg: batch ? String(batch.jumlah_kg) : "",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.filter(b => b.status === 'pengeringan').map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.batch_number} - {batch.petani?.nama} ({batch.jumlah_kg} Kg)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Lokasi Gudang</Label>
                          <Input
                            value={gudangForm.lokasi_gudang}
                            onChange={(e) => setGudangForm(prev => ({ ...prev, lokasi_gudang: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Posisi Rak</Label>
                          <Input
                            value={gudangForm.rak_posisi}
                            onChange={(e) => setGudangForm(prev => ({ ...prev, rak_posisi: e.target.value }))}
                            placeholder="A1, B2, dll"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Jumlah (Kg) *</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={gudangForm.jumlah_kg}
                            onChange={(e) => setGudangForm(prev => ({ ...prev, jumlah_kg: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Suhu (°C)</Label>
                          <Input
                            type="number"
                            value={gudangForm.suhu_gudang}
                            onChange={(e) => setGudangForm(prev => ({ ...prev, suhu_gudang: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Kelembaban (%)</Label>
                          <Input
                            type="number"
                            value={gudangForm.kelembaban}
                            onChange={(e) => setGudangForm(prev => ({ ...prev, kelembaban: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Kondisi Penyimpanan</Label>
                        <Input
                          value={gudangForm.kondisi_penyimpanan}
                          onChange={(e) => setGudangForm(prev => ({ ...prev, kondisi_penyimpanan: e.target.value }))}
                          placeholder="Baik, perlu perhatian, dll"
                        />
                      </div>
                      <div>
                        <Label>Catatan</Label>
                        <Textarea
                          value={gudangForm.catatan}
                          onChange={(e) => setGudangForm(prev => ({ ...prev, catatan: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleAddGudang} className="bg-gradient-organic">Simpan</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {gudangLoading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Tanggal Masuk</TableHead>
                        <TableHead>Jumlah (Kg)</TableHead>
                        <TableHead>Suhu/Kelembaban</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gudangList.map((item) => {
                        const batch = batches.find(b => b.id === item.batch_id);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{batch?.batch_number || "-"}</TableCell>
                            <TableCell>
                              <div>
                                <p>{item.lokasi_gudang}</p>
                                {item.rak_posisi && <p className="text-sm text-muted-foreground">Rak: {item.rak_posisi}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(item.tanggal_masuk), "dd MMM yyyy", { locale: localeId })}
                            </TableCell>
                            <TableCell>{Number(item.jumlah_kg).toLocaleString()}</TableCell>
                            <TableCell>
                              {item.suhu_gudang && `${item.suhu_gudang}°C`}
                              {item.suhu_gudang && item.kelembaban && " / "}
                              {item.kelembaban && `${item.kelembaban}%`}
                              {!item.suhu_gudang && !item.kelembaban && "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'tersimpan' ? 'default' : 'secondary'}>
                                {item.status === 'tersimpan' ? 'Tersimpan' : item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {gudangList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Belum ada data stok gudang
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dokumen Tab */}
          <TabsContent value="dokumen">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pengolahan Dokumen</CardTitle>
                  <CardDescription>Kelola dokumen sertifikasi dan administrasi</CardDescription>
                </div>
                <Dialog open={dialogOpen && activeTab === "dokumen"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForms();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-organic">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Dokumen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Dokumen</DialogTitle>
                      <DialogDescription>Catat dokumen terkait batch panen</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>Pilih Batch *</Label>
                        <Select
                          value={dokumenForm.batch_id}
                          onValueChange={(value) => setDokumenForm(prev => ({ ...prev, batch_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.filter(b => b.status === 'penyimpanan').map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.batch_number} - {batch.petani?.nama}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nomor Dokumen *</Label>
                          <Input
                            value={dokumenForm.nomor_dokumen}
                            onChange={(e) => setDokumenForm(prev => ({ ...prev, nomor_dokumen: e.target.value }))}
                            placeholder="DOC-2024-001"
                          />
                        </div>
                        <div>
                          <Label>Jenis Dokumen *</Label>
                          <Select
                            value={dokumenForm.jenis_dokumen}
                            onValueChange={(value) => setDokumenForm(prev => ({ ...prev, jenis_dokumen: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sertifikat_organik">Sertifikat Organik</SelectItem>
                              <SelectItem value="surat_jalan">Surat Jalan</SelectItem>
                              <SelectItem value="invoice">Invoice</SelectItem>
                              <SelectItem value="laporan_mutu">Laporan Mutu</SelectItem>
                              <SelectItem value="lainnya">Lainnya</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Penerbit</Label>
                          <Input
                            value={dokumenForm.penerbit}
                            onChange={(e) => setDokumenForm(prev => ({ ...prev, penerbit: e.target.value }))}
                            placeholder="Nama penerbit"
                          />
                        </div>
                        <div>
                          <Label>Masa Berlaku</Label>
                          <Input
                            type="date"
                            value={dokumenForm.masa_berlaku}
                            onChange={(e) => setDokumenForm(prev => ({ ...prev, masa_berlaku: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Catatan</Label>
                        <Textarea
                          value={dokumenForm.catatan}
                          onChange={(e) => setDokumenForm(prev => ({ ...prev, catatan: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleAddDokumen} className="bg-gradient-organic">Simpan</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {dokumenLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>No. Dokumen</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Masa Berlaku</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dokumenList.map((dok) => {
                        const batch = batches.find(b => b.id === dok.batch_id);
                        return (
                          <TableRow key={dok.id}>
                            <TableCell className="font-mono">{batch?.batch_number || "-"}</TableCell>
                            <TableCell className="font-medium">{dok.nomor_dokumen}</TableCell>
                            <TableCell>{dok.jenis_dokumen.replace(/_/g, ' ')}</TableCell>
                            <TableCell>
                              {format(new Date(dok.tanggal_dokumen), "dd MMM yyyy", { locale: localeId })}
                            </TableCell>
                            <TableCell>
                              {dok.masa_berlaku 
                                ? format(new Date(dok.masa_berlaku), "dd MMM yyyy", { locale: localeId })
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={dok.status === 'aktif' ? 'default' : 'secondary'}>
                                {dok.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {dokumenList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Belum ada data dokumen
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penjualan Tab */}
          <TabsContent value="penjualan">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Penjualan</CardTitle>
                  <CardDescription>Kelola penjualan dan distribusi hasil panen</CardDescription>
                </div>
                <Dialog open={dialogOpen && activeTab === "penjualan"} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForms();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-organic">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Penjualan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Penjualan</DialogTitle>
                      <DialogDescription>Catat transaksi penjualan batch</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>Pilih Batch *</Label>
                        <Select
                          value={penjualanForm.batch_id}
                          onValueChange={(value) => {
                            const batch = batches.find(b => b.id === value);
                            setPenjualanForm(prev => ({
                              ...prev,
                              batch_id: value,
                              jumlah_kg: batch ? String(batch.jumlah_kg) : "",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.filter(b => b.status === 'pengolahan').map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.batch_number} - {batch.petani?.nama} ({batch.jumlah_kg} Kg)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nama Pembeli *</Label>
                          <Input
                            value={penjualanForm.pembeli}
                            onChange={(e) => setPenjualanForm(prev => ({ ...prev, pembeli: e.target.value }))}
                            placeholder="Nama pembeli"
                          />
                        </div>
                        <div>
                          <Label>Metode Pembayaran</Label>
                          <Select
                            value={penjualanForm.metode_pembayaran}
                            onValueChange={(value) => setPenjualanForm(prev => ({ ...prev, metode_pembayaran: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih metode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transfer">Transfer Bank</SelectItem>
                              <SelectItem value="tunai">Tunai</SelectItem>
                              <SelectItem value="kredit">Kredit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Alamat Pembeli</Label>
                        <Textarea
                          value={penjualanForm.alamat_pembeli}
                          onChange={(e) => setPenjualanForm(prev => ({ ...prev, alamat_pembeli: e.target.value }))}
                          placeholder="Alamat lengkap"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Jumlah (Kg) *</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={penjualanForm.jumlah_kg}
                            onChange={(e) => setPenjualanForm(prev => ({ ...prev, jumlah_kg: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Harga per Kg (Rp) *</Label>
                          <Input
                            type="number"
                            value={penjualanForm.harga_per_kg}
                            onChange={(e) => setPenjualanForm(prev => ({ ...prev, harga_per_kg: e.target.value }))}
                          />
                        </div>
                      </div>
                      {penjualanForm.jumlah_kg && penjualanForm.harga_per_kg && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Harga</p>
                          <p className="text-xl font-bold">
                            Rp {(parseFloat(penjualanForm.jumlah_kg) * parseFloat(penjualanForm.harga_per_kg)).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <Label>Tanggal Kirim</Label>
                        <Input
                          type="date"
                          value={penjualanForm.tanggal_kirim}
                          onChange={(e) => setPenjualanForm(prev => ({ ...prev, tanggal_kirim: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Catatan</Label>
                        <Textarea
                          value={penjualanForm.catatan}
                          onChange={(e) => setPenjualanForm(prev => ({ ...prev, catatan: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleAddPenjualan} className="bg-gradient-organic">Simpan</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {penjualanLoading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Pembeli</TableHead>
                        <TableHead>Jumlah (Kg)</TableHead>
                        <TableHead>Total Harga</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {penjualanList.map((sale) => {
                        const batch = batches.find(b => b.id === sale.batch_id);
                        return (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono font-medium">{sale.nomor_invoice}</TableCell>
                            <TableCell className="font-mono">{batch?.batch_number || "-"}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{sale.pembeli}</p>
                                {sale.alamat_pembeli && (
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">{sale.alamat_pembeli}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{Number(sale.jumlah_kg).toLocaleString()}</TableCell>
                            <TableCell className="font-medium">
                              Rp {Number(sale.total_harga || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={sale.status_pembayaran === 'lunas' ? 'default' : 'secondary'}>
                                {sale.status_pembayaran === 'lunas' ? 'Lunas' : 'Pending'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {penjualanList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Belum ada data penjualan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estimasi Tab */}
          <TabsContent value="estimasi">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <div className="lg:col-span-1">
                <HarvestEstimationForm
                  farmers={farmers}
                  selectedFarmers={harvestEstimation.selectedFarmers}
                  setSelectedFarmers={harvestEstimation.setSelectedFarmers}
                  startDate={harvestEstimation.startDate}
                  setStartDate={harvestEstimation.setStartDate}
                  autoHoliday={harvestEstimation.autoHoliday}
                  setAutoHoliday={harvestEstimation.setAutoHoliday}
                  manualHolidays={harvestEstimation.manualHolidays}
                  setManualHolidays={harvestEstimation.setManualHolidays}
                  batchAverage={harvestEstimation.batchAverage}
                  setBatchAverage={harvestEstimation.setBatchAverage}
                  onGenerate={harvestEstimation.generateEstimation}
                  applyBatchAverage={harvestEstimation.applyBatchAverage}
                  updateFarmerAverage={harvestEstimation.updateFarmerAverage}
                />
              </div>

              {/* Table Section */}
              <div className="lg:col-span-2">
                <HarvestEstimationTable
                  weeklyData={harvestEstimation.weeklyData}
                  savedEstimations={harvestEstimation.savedEstimations}
                  isSaving={harvestEstimation.isSaving}
                  isLoading={harvestEstimation.isLoading}
                  onRefreshAll={harvestEstimation.refreshAll}
                  onRefreshHarvest={harvestEstimation.refreshHarvest}
                  onRefreshSales={harvestEstimation.refreshSales}
                  onAddNextWeek={harvestEstimation.addNextWeek}
                  onRefreshWeek={harvestEstimation.refreshWeek}
                  onRemoveWeek={harvestEstimation.removeWeek}
                  onExportCSV={harvestEstimation.exportToCSV}
                  onSave={harvestEstimation.saveToDatabase}
                  onLoadSaved={harvestEstimation.loadSavedEstimations}
                  onLoadEstimation={harvestEstimation.loadEstimation}
                  onDeleteEstimation={harvestEstimation.deleteEstimation}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default HarvestManagement;
