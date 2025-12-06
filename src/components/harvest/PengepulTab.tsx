import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, Edit, Trash2, UserPlus } from "lucide-react";
import { usePengepul, Pengepul, PengepulWithPetani } from "@/hooks/use-pengepul";
import { useFarmers } from "@/hooks/use-farmers";
import { TableSkeleton } from "@/components/ui/skeleton-templates";

export const PengepulTab = () => {
  const { pengepulList, loading, addPengepul, updatePengepul, deletePengepul, assignPetani, unassignPetani, refetch } = usePengepul();
  const { farmers, refetch: refetchFarmers } = useFarmers();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPengepul, setSelectedPengepul] = useState<PengepulWithPetani | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  const [form, setForm] = useState({
    nama: "",
    alamat: "",
    no_telepon: "",
    harga_beli: "",
  });

  const resetForm = () => {
    setForm({ nama: "", alamat: "", no_telepon: "", harga_beli: "" });
    setEditMode(false);
    setSelectedPengepul(null);
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.harga_beli) return;

    if (editMode && selectedPengepul) {
      await updatePengepul(selectedPengepul.id, {
        nama: form.nama,
        alamat: form.alamat || null,
        no_telepon: form.no_telepon || null,
        harga_beli: parseFloat(form.harga_beli),
      });
    } else {
      await addPengepul({
        nama: form.nama,
        alamat: form.alamat || null,
        no_telepon: form.no_telepon || null,
        harga_beli: parseFloat(form.harga_beli),
        status: "aktif",
      });
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (pengepul: PengepulWithPetani) => {
    setSelectedPengepul(pengepul);
    setForm({
      nama: pengepul.nama,
      alamat: pengepul.alamat || "",
      no_telepon: pengepul.no_telepon || "",
      harga_beli: String(pengepul.harga_beli),
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus pengepul ini?")) {
      await deletePengepul(id);
    }
  };

  const handleOpenAssign = (pengepul: PengepulWithPetani) => {
    setSelectedPengepul(pengepul);
    setAssignDialogOpen(true);
  };

  // Get farmers that are not assigned to any pengepul or assigned to this pengepul
  const availableFarmers = farmers.filter(f => !f.pengepul_id);
  const assignedFarmers = farmers.filter(f => f.pengepul_id === selectedPengepul?.id);

  const handleAssignFarmer = async (farmerId: string) => {
    if (!selectedPengepul) return;
    await assignPetani(farmerId, selectedPengepul.id);
    refetchFarmers();
    refetch();
  };

  const handleUnassignFarmer = async (farmerId: string) => {
    if (!selectedPengepul) return;
    await unassignPetani(farmerId, selectedPengepul.id);
    refetchFarmers();
    refetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Data Pengepul
          </CardTitle>
          <CardDescription>Kelola data pengepul dan pengelompokan petani</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-organic">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pengepul
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMode ? "Edit Pengepul" : "Tambah Pengepul Baru"}</DialogTitle>
              <DialogDescription>Masukkan data pengepul</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Nama Pengepul *</Label>
                <Input
                  value={form.nama}
                  onChange={(e) => setForm(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Nama pengepul"
                />
              </div>
              <div>
                <Label>Alamat</Label>
                <Input
                  value={form.alamat}
                  onChange={(e) => setForm(prev => ({ ...prev, alamat: e.target.value }))}
                  placeholder="Alamat pengepul"
                />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input
                  value={form.no_telepon}
                  onChange={(e) => setForm(prev => ({ ...prev, no_telepon: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div>
                <Label>Harga Beli per Kg (Rp) *</Label>
                <Input
                  type="number"
                  value={form.harga_beli}
                  onChange={(e) => setForm(prev => ({ ...prev, harga_beli: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Batal</Button>
                <Button onClick={handleSubmit} className="bg-gradient-organic">
                  {editMode ? "Update" : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : pengepulList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada data pengepul</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Harga Beli</TableHead>
                <TableHead>Jumlah Petani</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pengepulList.map((pengepul) => (
                <TableRow key={pengepul.id}>
                  <TableCell className="font-mono">{pengepul.kode_pengepul}</TableCell>
                  <TableCell className="font-medium">{pengepul.nama}</TableCell>
                  <TableCell className="max-w-xs truncate">{pengepul.alamat || "-"}</TableCell>
                  <TableCell>Rp {Number(pengepul.harga_beli).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{pengepul.petani_count} petani</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pengepul.status === 'aktif' ? 'default' : 'secondary'}>
                      {pengepul.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenAssign(pengepul)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(pengepul)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(pengepul.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Assign Petani Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Petani - {selectedPengepul?.nama}</DialogTitle>
            <DialogDescription>
              Pilih petani yang akan dikelompokkan ke pengepul ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Assigned Farmers */}
            {assignedFarmers.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Petani Terdaftar ({assignedFarmers.length})</h4>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {assignedFarmers.map((farmer) => (
                    <div key={farmer.id} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium">{farmer.nama}</p>
                        <p className="text-sm text-muted-foreground">{farmer.kode_petani}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUnassignFarmer(farmer.id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Farmers */}
            <div>
              <h4 className="font-medium mb-2">Petani Tersedia ({availableFarmers.length})</h4>
              {availableFarmers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Semua petani sudah terdaftar di pengepul
                </p>
              ) : (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {availableFarmers.map((farmer) => (
                    <div key={farmer.id} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium">{farmer.nama}</p>
                        <p className="text-sm text-muted-foreground">{farmer.kode_petani}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAssignFarmer(farmer.id)}
                      >
                        Tambahkan
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
