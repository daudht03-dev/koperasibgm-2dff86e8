import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowUpFromLine, Trash2 } from "lucide-react";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { usePengepul } from "@/hooks/use-pengepul";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const BarangKeluarTab = () => {
  const { pengambilanList, loading, addPengambilan, deletePengambilan } = usePengambilanKoperasi();
  const { pengepulList } = usePengepul();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterPengepul, setFilterPengepul] = useState<string>("all");
  
  const [form, setForm] = useState({
    pengepul_id: "",
    tanggal_ambil: format(new Date(), "yyyy-MM-dd"),
    jumlah_kg: "",
    catatan: "",
  });

  const resetForm = () => {
    setForm({
      pengepul_id: "",
      tanggal_ambil: format(new Date(), "yyyy-MM-dd"),
      jumlah_kg: "",
      catatan: "",
    });
  };

  const handleSubmit = async () => {
    if (!form.pengepul_id || !form.jumlah_kg) return;

    await addPengambilan({
      pengepul_id: form.pengepul_id,
      tanggal_ambil: form.tanggal_ambil,
      jumlah_kg: parseFloat(form.jumlah_kg),
      batch_id: null,
      catatan: form.catatan || null,
    });

    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
      await deletePengambilan(id);
    }
  };

  // Filter list by pengepul
  const filteredList = filterPengepul === "all" 
    ? pengambilanList 
    : pengambilanList.filter(p => p.pengepul_id === filterPengepul);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5" />
            Barang Keluar
          </CardTitle>
          <CardDescription>Pengambilan oleh koperasi (hari ke-8)</CardDescription>
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
                Tambah Barang Keluar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Barang Keluar</DialogTitle>
                <DialogDescription>Catat pengambilan barang oleh koperasi</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Pengepul *</Label>
                  <Select 
                    value={form.pengepul_id} 
                    onValueChange={(value) => setForm(prev => ({ ...prev, pengepul_id: value }))}
                  >
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
                  <Label>Tanggal Pengambilan *</Label>
                  <Input
                    type="date"
                    value={form.tanggal_ambil}
                    onChange={(e) => setForm(prev => ({ ...prev, tanggal_ambil: e.target.value }))}
                  />
                </div>
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
                  <Label>Catatan</Label>
                  <Textarea
                    value={form.catatan}
                    onChange={(e) => setForm(prev => ({ ...prev, catatan: e.target.value }))}
                    placeholder="Catatan tambahan..."
                  />
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
          <TableSkeleton rows={5} columns={5} />
        ) : filteredList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowUpFromLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada data barang keluar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pengepul</TableHead>
                <TableHead>Jumlah (Kg)</TableHead>
                <TableHead>Status Batch</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((item) => (
                <TableRow key={item.id}>
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
                  <TableCell>
                    {item.batch_id ? (
                      <Badge variant="default">Sudah Diproses</Badge>
                    ) : (
                      <Badge variant="secondary">Belum Diproses</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.catatan || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(item.id)}
                      disabled={!!item.batch_id}
                    >
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
