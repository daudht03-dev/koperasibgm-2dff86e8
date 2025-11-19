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
import { useProducts } from "@/hooks/use-products";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useNavigate } from "react-router-dom";
import { Users, MapPin, Settings, Plus, LogOut, Edit, Trash2, Package, Building } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"farmers" | "lands" | "content" | "products" | "profile">("farmers");

  // Hooks for data management
  const { farmers, addFarmer, updateFarmer, deleteFarmer } = useFarmers();
  const { lands, addLand, updateLand, deleteLand } = useLands();
  const { contents, addContent, updateContent, deleteContent } = useContent();
  const { products, createProduct, updateProduct, deleteProduct, uploadImage } = useProducts();
  const { profile, updateProfile, uploadLogo } = useCompanyProfile();

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
    kode_lahan: "",
    keterangan: "",
    petani_id: "",
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

  // Form states for products
  const [productForm, setProductForm] = useState({
    nama: "",
    deskripsi: "",
    harga: "",
    gambar_url: "",
  });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  // Form states for company profile
  const [profileForm, setProfileForm] = useState({
    nama_perusahaan: "",
    deskripsi: "",
    alamat: "",
    kontak: "",
    logo_url: "",
  });
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
    if (!landForm.kode_lahan.trim()) {
      toast({
        title: "Error",
        description: "Kode lahan harus diisi",
        variant: "destructive",
      });
      return;
    }
    
    const success = await addLand({
      kode_lahan: landForm.kode_lahan.trim(),
      keterangan: landForm.keterangan.trim() || null,
      petani_id: landForm.petani_id || null,
    });
    if (success) {
      setLandForm({ kode_lahan: "", keterangan: "", petani_id: "" });
      setLandDialogOpen(false);
    }
  };

  const handleEditLand = (land: any) => {
    setLandForm({
      kode_lahan: land.kode_lahan,
      keterangan: land.keterangan || "",
      petani_id: land.petani_id || "",
    });
    setEditingLand(land.id);
    setLandDialogOpen(true);
  };

  const handleUpdateLand = async () => {
    if (!editingLand) return;
    if (!landForm.kode_lahan.trim()) {
      toast({
        title: "Error",
        description: "Kode lahan harus diisi",
        variant: "destructive",
      });
      return;
    }
    
    const success = await updateLand(editingLand, {
      kode_lahan: landForm.kode_lahan.trim(),
      keterangan: landForm.keterangan.trim() || null,
      petani_id: landForm.petani_id || null,
    });
    if (success) {
      setLandForm({ kode_lahan: "", keterangan: "", petani_id: "" });
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

  // Handler functions for products
  const handleAddProduct = async () => {
    try {
      setLoading(true);
      let imageUrl = "";
      
      if (productImageFile) {
        imageUrl = await uploadImage(productImageFile) || "";
      }

      await createProduct({
        nama: productForm.nama,
        deskripsi: productForm.deskripsi || undefined,
        harga: parseFloat(productForm.harga),
        gambar_url: imageUrl || undefined,
      });

      setProductForm({ nama: "", deskripsi: "", harga: "", gambar_url: "" });
      setProductImageFile(null);
      setProductDialogOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setProductForm({
      nama: product.nama,
      deskripsi: product.deskripsi || "",
      harga: product.harga.toString(),
      gambar_url: product.gambar_url || "",
    });
    setEditingProduct(product.id);
    setProductDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      setLoading(true);
      let imageUrl = productForm.gambar_url;
      
      if (productImageFile) {
        imageUrl = await uploadImage(productImageFile) || imageUrl;
      }

      await updateProduct(editingProduct, {
        nama: productForm.nama,
        deskripsi: productForm.deskripsi || undefined,
        harga: parseFloat(productForm.harga),
        gambar_url: imageUrl || undefined,
      });

      setProductForm({ nama: "", deskripsi: "", harga: "", gambar_url: "" });
      setProductImageFile(null);
      setEditingProduct(null);
      setProductDialogOpen(false);
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler functions for company profile
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      let logoUrl = profileForm.logo_url;
      
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile) || logoUrl;
      }

      await updateProfile({
        nama_perusahaan: profileForm.nama_perusahaan,
        deskripsi: profileForm.deskripsi || undefined,
        alamat: profileForm.alamat || undefined,
        kontak: profileForm.kontak || undefined,
        logo_url: logoUrl || undefined,
      });

      setLogoFile(null);
      setProfileDialogOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load profile data when component mounts
  useEffect(() => {
    if (profile) {
      setProfileForm({
        nama_perusahaan: profile.nama_perusahaan,
        deskripsi: profile.deskripsi || "",
        alamat: profile.alamat || "",
        kontak: profile.kontak || "",
        logo_url: profile.logo_url || "",
      });
    }
  }, [profile]);

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
          <div className="flex space-x-1 rounded-lg bg-muted p-1 overflow-x-auto">
            {[
              { key: "farmers", label: "Petani", icon: Users },
              { key: "lands", label: "Lahan", icon: MapPin },
              { key: "content", label: "Konten", icon: Settings },
              { key: "products", label: "Produk", icon: Package },
              { key: "profile", label: "Profil", icon: Building },
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
                      setLandForm({ kode_lahan: "", keterangan: "", petani_id: "" });
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
                      <Label htmlFor="kode-lahan">Kode Lahan</Label>
                      <Input
                        id="kode-lahan"
                        value={landForm.kode_lahan}
                        onChange={(e) => setLandForm(prev => ({ ...prev, kode_lahan: e.target.value }))}
                        placeholder="Contoh: LHN-001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="petani">Petani</Label>
                      <Select
                        value={landForm.petani_id}
                        onValueChange={(value) => setLandForm(prev => ({ ...prev, petani_id: value }))}
                      >
                        <SelectTrigger id="petani" className="bg-background">
                          <SelectValue placeholder="Pilih petani (opsional)" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="">Tidak ada petani</SelectItem>
                          {farmers.map((farmer) => (
                            <SelectItem key={farmer.id} value={farmer.id}>
                              {farmer.nama} ({farmer.kode_petani})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="keterangan">Keterangan Lahan</Label>
                      <Textarea
                        id="keterangan"
                        value={landForm.keterangan}
                        onChange={(e) => setLandForm(prev => ({ ...prev, keterangan: e.target.value }))}
                        placeholder="Deskripsi atau catatan tentang lahan ini"
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLandDialogOpen(false);
                          setEditingLand(null);
                        }}
                      >
                        Batal
                      </Button>
                      <Button onClick={editingLand ? handleUpdateLand : handleAddLand}>
                        {editingLand ? "Update" : "Simpan"}
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
                    <TableHead>Kode Lahan</TableHead>
                    <TableHead>Petani</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lands.map((land) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">{land.kode_lahan}</TableCell>
                      <TableCell>
                        {land.petani_id 
                          ? farmers.find(f => f.id === land.petani_id)?.nama || "-"
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="max-w-md">{land.keterangan || "-"}</TableCell>
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
                                  Apakah Anda yakin ingin menghapus lahan {land.kode_lahan}? Aksi ini tidak dapat dibatalkan.
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
                  ))}
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

        {/* Products Tab */}
        {activeTab === "products" && (
          <Card className="shadow-gentle border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Daftar Produk</CardTitle>
                <CardDescription>Kelola produk yang dijual</CardDescription>
              </div>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ nama: "", deskripsi: "", harga: "", gambar_url: "" });
                      setProductImageFile(null);
                    }}
                    className="bg-gradient-organic shadow-organic hover:shadow-warm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Produk
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
                    <DialogDescription>
                      {editingProduct ? "Edit data produk" : "Tambahkan produk baru"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nama-produk">Nama Produk</Label>
                      <Input
                        id="nama-produk"
                        value={productForm.nama}
                        onChange={(e) => setProductForm(prev => ({ ...prev, nama: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deskripsi-produk">Deskripsi</Label>
                      <Textarea
                        id="deskripsi-produk"
                        rows={3}
                        value={productForm.deskripsi}
                        onChange={(e) => setProductForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="harga-produk">Harga (Rp)</Label>
                      <Input
                        id="harga-produk"
                        type="number"
                        step="0.01"
                        value={productForm.harga}
                        onChange={(e) => setProductForm(prev => ({ ...prev, harga: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gambar-produk">Upload Gambar</Label>
                      <Input
                        id="gambar-produk"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProductImageFile(e.target.files?.[0] || null)}
                      />
                      {productForm.gambar_url && (
                        <div className="mt-2">
                          <img 
                            src={productForm.gambar_url} 
                            alt="Preview" 
                            className="w-20 h-20 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setProductDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                        className="bg-gradient-organic"
                        disabled={loading}
                      >
                        {editingProduct ? "Update" : "Tambah"}
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
                    <TableHead>Gambar</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.gambar_url ? (
                          <img 
                            src={product.gambar_url} 
                            alt={product.nama}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.nama}</TableCell>
                      <TableCell className="max-w-xs truncate">{product.deskripsi || "-"}</TableCell>
                      <TableCell>Rp {product.harga.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
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
                                <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus produk {product.nama}? Aksi ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteProduct(product.id)}
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

        {/* Company Profile Tab */}
        {activeTab === "profile" && (
          <Card className="shadow-gentle border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Profil Perusahaan</CardTitle>
                <CardDescription>Kelola informasi perusahaan</CardDescription>
              </div>
              <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setProfileDialogOpen(true)}
                    className="bg-gradient-organic shadow-organic hover:shadow-warm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profil
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Profil Perusahaan</DialogTitle>
                    <DialogDescription>
                      Perbarui informasi profil perusahaan
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nama-perusahaan">Nama Perusahaan</Label>
                      <Input
                        id="nama-perusahaan"
                        value={profileForm.nama_perusahaan}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, nama_perusahaan: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deskripsi-perusahaan">Deskripsi</Label>
                      <Textarea
                        id="deskripsi-perusahaan"
                        rows={3}
                        value={profileForm.deskripsi}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="alamat-perusahaan">Alamat</Label>
                      <Textarea
                        id="alamat-perusahaan"
                        rows={2}
                        value={profileForm.alamat}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, alamat: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="kontak-perusahaan">Kontak</Label>
                      <Input
                        id="kontak-perusahaan"
                        value={profileForm.kontak}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, kontak: e.target.value }))}
                        placeholder="email@domain.com | +62 xxx-xxxx-xxxx"
                      />
                    </div>
                    <div>
                      <Label htmlFor="logo-perusahaan">Upload Logo</Label>
                      <Input
                        id="logo-perusahaan"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      />
                      {profileForm.logo_url && (
                        <div className="mt-2">
                          <img 
                            src={profileForm.logo_url} 
                            alt="Logo Preview" 
                            className="w-20 h-20 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setProfileDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={handleUpdateProfile}
                        className="bg-gradient-organic"
                        disabled={loading}
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {profile ? (
                <div className="space-y-6">
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      {profile.logo_url ? (
                        <img 
                          src={profile.logo_url} 
                          alt="Company Logo"
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center border">
                          <Building className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {profile.nama_perusahaan}
                        </h3>
                      </div>
                      {profile.deskripsi && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Deskripsi</Label>
                          <p className="text-foreground mt-1">{profile.deskripsi}</p>
                        </div>
                      )}
                      {profile.alamat && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Alamat</Label>
                          <p className="text-foreground mt-1">{profile.alamat}</p>
                        </div>
                      )}
                      {profile.kontak && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Kontak</Label>
                          <p className="text-foreground mt-1">{profile.kontak}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada profil perusahaan. Klik "Edit Profil" untuk menambahkan.</p>
                </div>
              )}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Produk:</span>
                  <span className="font-semibold text-foreground">{products.length}</span>
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