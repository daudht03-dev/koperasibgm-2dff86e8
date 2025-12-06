import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowDownToLine, Trash2 } from "lucide-react";
import { usePenjualanPetani, PenjualanPetani } from "@/hooks/use-penjualan-petani";
import { usePengepul } from "@/hooks/use-pengepul";
import { useFarmers } from "@/hooks/use-farmers";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const BarangMasukTab = () => {
  const { penjualanList, loading, addPenjualan, deletePenjualan } = usePenjualanPetani();
  const { pengepulList } = usePengepul();
  const { farmers } = useFarmers();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterPengepul, setFilterPengepul] = useState<string>("all");
  
  const [form, setForm] = useState({
    pengepul_id: "",
    petani_id: "",
    tanggal_jual: format(new Date(), "yyyy-MM-dd"),
    jumlah_kg: "",
    harga_per_kg: "",
    warna_produk: "",
    kualitas: "grade_a",
    catatan: "",
  });

  const resetForm = () => {
    setForm({
      pengepul_id: "",
      petani_id: "",
      tanggal_jual: format(new Date(), "yyyy-MM-dd"),
      jumlah_kg: "",
      harga_per_kg: "",
      warna_produk: "",
      kualitas: "grade_a",
      catatan: "",
    });
  };

  // Filter farmers by selected pengepul
  const filteredFarmers = farmers.filter(f => f.pengepul_id === form.pengepul_id);

  // Auto-fill harga when pengepul is selected
  const handlePengepulChange = (pengepulId: string) => {
    const pengepul = pengepulList.find(p => p.id === pengepulId);
    setForm(prev => ({
      ...prev,
      pengepul_id: pengepulId,
      petani_id: "",
      harga_per_kg: pengepul ? String(pengepul.harga_beli) : "",
    }));
  };

  const handleSubmit = async () => {
    if (!form.pengepul_id || !form.petani_id || !form.jumlah_kg || !form.harga_per_kg) return;

    await addPenjualan({
      pengepul_id: form.pengepul_id,
      petani_id: form.petani_id,
      tanggal_jual: form.tanggal_jual,
      jumlah_kg: parseFloat(form.jumlah_kg),
      harga_per_kg: parseFloat(form.harga_per_kg),
      warna_produk: form.warna_produk || null,
      kualitas: form.kualitas,
      catatan: form.catatan || null,
    });

    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
      await deletePenjualan(id);
    }
  };

  // Filter list by pengepul
  const filteredList = filterPengepul === "all" 
    ? penjualanList 
    : penjualanList.filter(p => p.pengepul_id === filterPengepul);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Barang Masuk
          </CardTitle>
          <CardDescription>Penjualan petani ke pengepul</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterPengepul} onValueChange={setFilterPengepul}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter Pengepul" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pengepul</SelectItem>
              {pengepulList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-organic">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Barang Masuk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Barang Masuk</DialogTitle>
                <DialogDescription>Catat penjualan petani ke pengepul</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Pengepul *</Label>
                  <Select value={form.pengepul_id} onValueChange={handlePengepulChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pengepul" />
                    </SelectTrigger>
                    <SelectContent>
                      {pengepulList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.kode_pengepul} - {p.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Petani *</Label>
                  <Select 
                    value={form.petani_id} 
                    onValueChange={(value) => setForm(prev => ({ ...prev, petani_id: value }))}
                    disabled={!form.pengepul_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.pengepul_id ? "Pilih petani" : "Pilih pengepul dulu"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredFarmers.length === 0 ? (
                        <SelectItem value="none" disabled>Tidak ada petani terdaftar</SelectItem>
                      ) : (
                        filteredFarmers.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.kode_petani} - {f.nama}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tanggal Jual *</Label>
                  <Input
                    type="date"
                    value={form.tanggal_jual}
                    onChange={(e) => setForm(prev => ({ ...prev, tanggal_jual: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jumlah (Kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.jumlah_kg}
                      onChange={(e) => setForm(prev => ({ ...prev, jumlah_kg: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Harga per Kg (Rp) *</Label>
                    <Input
                      type="number"
                      value={form.harga_per_kg}
                      onChange={(e) => setForm(prev => ({ ...prev, harga_per_kg: e.target.value }))}
                      placeholder="0"
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
                    <Select value={form.kualitas} onValueChange={(value) => setForm(prev => ({ ...prev, kualitas: value }))}>
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Batal</Button>
                  <Button onClick={handleSubmit} className="bg-gradient-organic">Simpan</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : filteredList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowDownToLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada data barang masuk</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pengepul</TableHead>
                <TableHead>Petani</TableHead>
                <TableHead>Jumlah (Kg)</TableHead>
                <TableHead>Harga/Kg</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Warna</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {format(new Date(item.tanggal_jual), "dd MMM yyyy", { locale: localeId })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.pengepul?.nama}</p>
                      <p className="text-xs text-muted-foreground">{item.pengepul?.kode_pengepul}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.petani?.nama}</p>
                      <p className="text-xs text-muted-foreground">{item.petani?.kode_petani}</p>
                    </div>
                  </TableCell>
                  <TableCell>{Number(item.jumlah_kg).toLocaleString()}</TableCell>
                  <TableCell>Rp {Number(item.harga_per_kg).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">Rp {Number(item.total_harga).toLocaleString()}</TableCell>
                  <TableCell>{item.warna_produk || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
