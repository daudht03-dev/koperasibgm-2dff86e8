import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { useAuth } from "@/hooks/use-auth";
import { useFarmers } from "@/hooks/use-farmers";
import { useLands } from "@/hooks/use-lands";
import { useContent } from "@/hooks/use-content";
import { useNavigate } from "react-router-dom";
import { Users, MapPin, Settings, Plus, LogOut, Edit, Trash2 } from "lucide-react";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"farmers" | "lands" | "content">("farmers");

  // Hooks for data management
  const { farmers, addFarmer, updateFarmer, deleteFarmer } = useFarmers();
  const { lands, addLand, updateLand, deleteLand } = useLands();
  const { contents, addContent, updateContent, deleteContent } = useContent();

  // Form states for farmers
  const [farmerForm, setFarmerForm] = useState({
    nama: "",
    kode_petani: "",
    alamat: "",
    no_telepon: "",
    rata_rata_panen: "",
  });
  const [editingFarmer, setEditingFarmer] = useState<string | null>(null);
  const [farmerDialogOpen, setFarmerDialogOpen] = useState(false);

  // Form states for lands
  const [landForm, setLandForm] = useState({
    petani_id: "",
    luas: "",
    alamat: "",
    koordinat: "",
    jumlah_tanaman: "",
  });
  const [editingLand, setEditingLand] = useState<string | null>(null);
  const [landDialogOpen, setLandDialogOpen] = useState(false);

  // Form states for content
  const [contentForm, setContentForm] = useState({
    section: "",
    judul: "",
    isi: "",
    gambar_url: "",
  });
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    navigate("/");
    setLoading(false);
  };

  // Handler functions for farmers
  const handleAddFarmer = async () => {
    const success = await addFarmer({
      nama: farmerForm.nama,
      kode_petani: farmerForm.kode_petani,
      alamat: farmerForm.alamat,
      no_telepon: farmerForm.no_telepon || null,
      rata_rata_panen: farmerForm.rata_rata_panen ? parseFloat(farmerForm.rata_rata_panen) : null,
    });
    if (success) {
      setFarmerForm({ nama: "", kode_petani: "", alamat: "", no_telepon: "", rata_rata_panen: "" });
      setFarmerDialogOpen(false);
    }
  };

  const handleEditFarmer = (farmer: any) => {
    setFarmerForm({
      nama: farmer.nama,
      kode_petani: farmer.kode_petani,
      alamat: farmer.alamat,
      no_telepon: farmer.no_telepon || "",
      rata_rata_panen: farmer.rata_rata_panen?.toString() || "",
    });
    setEditingFarmer(farmer.id);
    setFarmerDialogOpen(true);
  };

  const handleUpdateFarmer = async () => {
    if (!editingFarmer) return;
    const success = await updateFarmer(editingFarmer, {
      nama: farmerForm.nama,
      kode_petani: farmerForm.kode_petani,
      alamat: farmerForm.alamat,
      no_telepon: farmerForm.no_telepon || null,
      rata_rata_panen: farmerForm.rata_rata_panen ? parseFloat(farmerForm.rata_rata_panen) : null,
    });
    if (success) {
      setFarmerForm({ nama: "", kode_petani: "", alamat: "", no_telepon: "", rata_rata_panen: "" });
      setEditingFarmer(null);
      setFarmerDialogOpen(false);
    }
  };

  // Handler functions for lands
  const handleAddLand = async () => {
    const success = await addLand({
      petani_id: landForm.petani_id,
      luas: parseFloat(landForm.luas),
      alamat: landForm.alamat,
      koordinat: landForm.koordinat || null,
      jumlah_tanaman: landForm.jumlah_tanaman ? parseInt(landForm.jumlah_tanaman) : null,
    });
    if (success) {
      setLandForm({ petani_id: "", luas: "", alamat: "", koordinat: "", jumlah_tanaman: "" });
      setLandDialogOpen(false);
    }
  };

  const handleEditLand = (land: any) => {
    setLandForm({
      petani_id: land.petani_id,
      luas: land.luas.toString(),
      alamat: land.alamat,
      koordinat: land.koordinat || "",
      jumlah_tanaman: land.jumlah_tanaman?.toString() || "",
    });
    setEditingLand(land.id);
    setLandDialogOpen(true);
  };

  const handleUpdateLand = async () => {
    if (!editingLand) return;
    const success = await updateLand(editingLand, {
      petani_id: landForm.petani_id,
      luas: parseFloat(landForm.luas),
      alamat: landForm.alamat,
      koordinat: landForm.koordinat || null,
      jumlah_tanaman: landForm.jumlah_tanaman ? parseInt(landForm.jumlah_tanaman) : null,
    });
    if (success) {
      setLandForm({ petani_id: "", luas: "", alamat: "", koordinat: "", jumlah_tanaman: "" });
      setEditingLand(null);
      setLandDialogOpen(false);
    }
  };

  // Handler functions for content
  const handleAddContent = async () => {
    const success = await addContent({
      section: contentForm.section,
      judul: contentForm.judul || null,
      isi: contentForm.isi || null,
      gambar_url: contentForm.gambar_url || null,
    });
    if (success) {
      setContentForm({ section: "", judul: "", isi: "", gambar_url: "" });
      setContentDialogOpen(false);
    }
  };

  const handleEditContent = (content: any) => {
    setContentForm({
      section: content.section,
      judul: content.judul || "",
      isi: content.isi || "",
      gambar_url: content.gambar_url || "",
    });
    setEditingContent(content.id);
    setContentDialogOpen(true);
  };

  const handleUpdateContent = async () => {
    if (!editingContent) return;
    const success = await updateContent(editingContent, {
      section: contentForm.section,
      judul: contentForm.judul || null,
      isi: contentForm.isi || null,
      gambar_url: contentForm.gambar_url || null,
    });
    if (success) {
      setContentForm({ section: "", judul: "", isi: "", gambar_url: "" });
      setEditingContent(null);
      setContentDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-natural">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Dashboard Admin
            </h1>
            <p className="text-muted-foreground">
              Selamat datang, {user?.email}
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            disabled={loading}
            className="border-border/50 hover:bg-muted/50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            {[
              { key: "farmers", label: "Petani", icon: Users },
              { key: "lands", label: "Lahan", icon: MapPin },
              { key: "content", label: "Konten", icon: Settings },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Farmers Tab */}
        {activeTab === "farmers" && (
          <Card className="shadow-gentle border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Daftar Petani</CardTitle>
                <CardDescription>Kelola data petani yang terdaftar</CardDescription>
              </div>
              <Dialog open={farmerDialogOpen} onOpenChange={setFarmerDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingFarmer(null);
                      setFarmerForm({ nama: "", kode_petani: "", alamat: "", no_telepon: "", rata_rata_panen: "" });
                    }}
                    className="bg-gradient-organic shadow-organic hover:shadow-warm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Petani
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingFarmer ? "Edit Petani" : "Tambah Petani"}</DialogTitle>
                    <DialogDescription>
                      {editingFarmer ? "Edit data petani" : "Tambahkan data petani baru"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nama">Nama</Label>
                      <Input
                        id="nama"
                        value={farmerForm.nama}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, nama: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="kode">Kode Petani</Label>
                      <Input
                        id="kode"
                        value={farmerForm.kode_petani}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, kode_petani: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="alamat">Alamat</Label>
                      <Textarea
                        id="alamat"
                        value={farmerForm.alamat}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, alamat: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="telepon">No. Telepon</Label>
                      <Input
                        id="telepon"
                        value={farmerForm.no_telepon}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, no_telepon: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="panen">Rata-rata Panen (kg/bulan)</Label>
                      <Input
                        id="panen"
                        type="number"
                        step="0.01"
                        value={farmerForm.rata_rata_panen}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, rata_rata_panen: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setFarmerDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={editingFarmer ? handleUpdateFarmer : handleAddFarmer}
                        className="bg-gradient-organic"
                      >
                        {editingFarmer ? "Update" : "Tambah"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>No. Telepon</TableHead>
                    <TableHead>Rata-rata Panen</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmers.map((farmer) => (
                    <TableRow key={farmer.id}>
                      <TableCell className="font-medium">{farmer.kode_petani}</TableCell>
                      <TableCell>{farmer.nama}</TableCell>
                      <TableCell className="max-w-xs truncate">{farmer.alamat}</TableCell>
                      <TableCell>{farmer.no_telepon || "-"}</TableCell>
                      <TableCell>{farmer.rata_rata_panen ? `${farmer.rata_rata_panen} kg` : "-"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFarmer(farmer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Petani</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus petani {farmer.nama}? Aksi ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteFarmer(farmer.id)}
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Lands Tab */}
        {activeTab === "lands" && (
          <Card className="shadow-gentle border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Daftar Lahan</CardTitle>
                <CardDescription>Kelola data lahan yang terdaftar</CardDescription>
              </div>
              <Dialog open={landDialogOpen} onOpenChange={setLandDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingLand(null);
                      setLandForm({ petani_id: "", luas: "", alamat: "", koordinat: "", jumlah_tanaman: "" });
                    }}
                    className="bg-gradient-organic shadow-organic hover:shadow-warm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Lahan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingLand ? "Edit Lahan" : "Tambah Lahan"}</DialogTitle>
                    <DialogDescription>
                      {editingLand ? "Edit data lahan" : "Tambahkan data lahan baru"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="petani">Petani</Label>
                      <Select 
                        value={landForm.petani_id} 
                        onValueChange={(value) => setLandForm(prev => ({ ...prev, petani_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih petani" />
                        </SelectTrigger>
                        <SelectContent>
                          {farmers.map((farmer) => (
                            <SelectItem key={farmer.id} value={farmer.id}>
                              {farmer.nama} ({farmer.kode_petani})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="luas">Luas (hektar)</Label>
                      <Input
                        id="luas"
                        type="number"
                        step="0.01"
                        value={landForm.luas}
                        onChange={(e) => setLandForm(prev => ({ ...prev, luas: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="alamat-lahan">Alamat</Label>
                      <Textarea
                        id="alamat-lahan"
                        value={landForm.alamat}
                        onChange={(e) => setLandForm(prev => ({ ...prev, alamat: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="koordinat">Koordinat</Label>
                      <Input
                        id="koordinat"
                        value={landForm.koordinat}
                        onChange={(e) => setLandForm(prev => ({ ...prev, koordinat: e.target.value }))}
                        placeholder="Contoh: -6.2088, 106.8456"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tanaman">Jumlah Tanaman</Label>
                      <Input
                        id="tanaman"
                        type="number"
                        value={landForm.jumlah_tanaman}
                        onChange={(e) => setLandForm(prev => ({ ...prev, jumlah_tanaman: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setLandDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={editingLand ? handleUpdateLand : handleAddLand}
                        className="bg-gradient-organic"
                      >
                        {editingLand ? "Update" : "Tambah"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Petani</TableHead>
                    <TableHead>Luas</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Koordinat</TableHead>
                    <TableHead>Jumlah Tanaman</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lands.map((land) => {
                    const farmer = farmers.find(f => f.id === land.petani_id);
                    return (
                      <TableRow key={land.id}>
                        <TableCell>{farmer?.nama || "Unknown"}</TableCell>
                        <TableCell>{land.luas} ha</TableCell>
                        <TableCell className="max-w-xs truncate">{land.alamat}</TableCell>
                        <TableCell>{land.koordinat || "-"}</TableCell>
                        <TableCell>{land.jumlah_tanaman || "-"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditLand(land)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Lahan</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus lahan ini? Aksi ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteLand(land.id)}
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
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <Card className="shadow-gentle border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Konten Website</CardTitle>
                <CardDescription>Kelola konten halaman utama</CardDescription>
              </div>
              <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingContent(null);
                      setContentForm({ section: "", judul: "", isi: "", gambar_url: "" });
                    }}
                    className="bg-gradient-organic shadow-organic hover:shadow-warm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Konten
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingContent ? "Edit Konten" : "Tambah Konten"}</DialogTitle>
                    <DialogDescription>
                      {editingContent ? "Edit konten website" : "Tambahkan konten website baru"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="section">Section</Label>
                      <Select 
                        value={contentForm.section} 
                        onValueChange={(value) => setContentForm(prev => ({ ...prev, section: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hero">Hero</SelectItem>
                          <SelectItem value="about">Tentang Kami</SelectItem>
                          <SelectItem value="product">Produk</SelectItem>
                          <SelectItem value="contact">Kontak</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="judul">Judul</Label>
                      <Input
                        id="judul"
                        value={contentForm.judul}
                        onChange={(e) => setContentForm(prev => ({ ...prev, judul: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="isi">Isi</Label>
                      <Textarea
                        id="isi"
                        rows={5}
                        value={contentForm.isi}
                        onChange={(e) => setContentForm(prev => ({ ...prev, isi: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gambar">URL Gambar</Label>
                      <Input
                        id="gambar"
                        value={contentForm.gambar_url}
                        onChange={(e) => setContentForm(prev => ({ ...prev, gambar_url: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setContentDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={editingContent ? handleUpdateContent : handleAddContent}
                        className="bg-gradient-organic"
                      >
                        {editingContent ? "Update" : "Tambah"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Isi</TableHead>
                    <TableHead>Gambar</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contents.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell className="font-medium">{content.section}</TableCell>
                      <TableCell>{content.judul || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{content.isi || "-"}</TableCell>
                      <TableCell>{content.gambar_url ? "Ada" : "-"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditContent(content)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Konten</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus konten {content.section}? Aksi ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteContent(content.id)}
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="shadow-gentle border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Statistik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Petani:</span>
                  <span className="font-semibold text-foreground">{farmers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Lahan:</span>
                  <span className="font-semibold text-foreground">{lands.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Konten:</span>
                  <span className="font-semibold text-foreground">{contents.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;