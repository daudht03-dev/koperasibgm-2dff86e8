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
import { StatisticsChart } from "@/components/StatisticsChart";
import { useAuth } from "@/hooks/use-auth";
import { useFarmers } from "@/hooks/use-farmers";
import { useLands } from "@/hooks/use-lands";
import { useProducts } from "@/hooks/use-products";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useHarvests } from "@/hooks/use-harvests";
import { useNavigate, Link } from "react-router-dom";
import { Users, MapPin, Settings, Plus, LogOut, Edit, Trash2, Package, Building, BarChart3, Calendar, Eye, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  farmerSchema, 
  landSchema, 
  harvestSchema, 
  productSchema, 
  companyProfileSchema,
  imageFileSchema
} from "@/lib/validation-schemas";
import { TableSkeleton, StatsSkeleton, CardSkeleton } from "@/components/ui/skeleton-templates";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"farmers" | "lands" | "products" | "statistics" | "profile">("farmers");

  // Hooks for data management
  const { farmers, addFarmer, updateFarmer, deleteFarmer } = useFarmers();
  const { lands, addLand, updateLand, deleteLand } = useLands();
  const { products, createProduct, updateProduct, deleteProduct, uploadImage } = useProducts();
  const { profile, updateProfile, uploadLogo } = useCompanyProfile();
  const { harvests, addHarvest, deleteHarvest } = useHarvests();

  // Form states for farmers
  const [farmerForm, setFarmerForm] = useState({
    nama: "",
    kode_petani: "",
    alamat: "",
  });
  const [farmerErrors, setFarmerErrors] = useState<Record<string, string>>({});
  const [editingFarmer, setEditingFarmer] = useState<string | null>(null);
  const [farmerDialogOpen, setFarmerDialogOpen] = useState(false);

  // Form states for lands
  const [landForm, setLandForm] = useState({
    kode_lahan: "",
    keterangan: "",
    petani_id: "",
  });
  const [landErrors, setLandErrors] = useState<Record<string, string>>({});
  const [editingLand, setEditingLand] = useState<string | null>(null);
  const [landDialogOpen, setLandDialogOpen] = useState(false);

  // Form states for harvest
  const [harvestForm, setHarvestForm] = useState({
    lahan_id: "",
    tanggal_panen: "",
    jumlah_kg: "",
    keterangan: "",
  });
  const [harvestErrors, setHarvestErrors] = useState<Record<string, string>>({});
  const [harvestDialogOpen, setHarvestDialogOpen] = useState(false);

  // Form states for products
  const [productForm, setProductForm] = useState({
    nama: "",
    deskripsi: "",
    harga: "",
    gambar_url: "",
  });
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
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
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
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
    try {
      setFarmerErrors({});
      const validated = farmerSchema.parse(farmerForm);
      
      const success = await addFarmer({
        nama: validated.nama,
        kode_petani: validated.kode_petani,
        alamat: validated.alamat,
      });
      
      if (success) {
        setFarmerForm({ nama: "", kode_petani: "", alamat: "" });
        setFarmerDialogOpen(false);
      }
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
        setFarmerErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditFarmer = (farmer: any) => {
    setFarmerForm({
      nama: farmer.nama,
      kode_petani: farmer.kode_petani,
      alamat: farmer.alamat,
    });
    setFarmerErrors({});
    setEditingFarmer(farmer.id);
    setFarmerDialogOpen(true);
  };

  const handleUpdateFarmer = async () => {
    if (!editingFarmer) return;
    
    try {
      setFarmerErrors({});
      const validated = farmerSchema.parse(farmerForm);
      
      const success = await updateFarmer(editingFarmer, {
        nama: validated.nama,
        kode_petani: validated.kode_petani,
        alamat: validated.alamat,
      });
      
      if (success) {
        setFarmerForm({ nama: "", kode_petani: "", alamat: "" });
        setEditingFarmer(null);
        setFarmerDialogOpen(false);
      }
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
        setFarmerErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      }
    }
  };

  // Handler functions for lands
  const handleAddLand = async () => {
    try {
      setLandErrors({});
      const validated = landSchema.parse(landForm);
      
      const success = await addLand({
        kode_lahan: validated.kode_lahan,
        keterangan: validated.keterangan || null,
        petani_id: validated.petani_id && validated.petani_id !== "none" ? validated.petani_id : null,
      });
      
      if (success) {
        setLandForm({ kode_lahan: "", keterangan: "", petani_id: "" });
        setLandDialogOpen(false);
      }
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
        setLandErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditLand = (land: any) => {
    setLandForm({
      kode_lahan: land.kode_lahan,
      keterangan: land.keterangan || "",
      petani_id: land.petani_id || "none",
    });
    setLandErrors({});
    setEditingLand(land.id);
    setLandDialogOpen(true);
  };

  const handleUpdateLand = async () => {
    if (!editingLand) return;
    
    try {
      setLandErrors({});
      const validated = landSchema.parse(landForm);
      
      const success = await updateLand(editingLand, {
        kode_lahan: validated.kode_lahan,
        keterangan: validated.keterangan || null,
        petani_id: validated.petani_id && validated.petani_id !== "none" ? validated.petani_id : null,
      });
      
      if (success) {
        setLandForm({ kode_lahan: "", keterangan: "", petani_id: "" });
        setEditingLand(null);
        setLandDialogOpen(false);
      }
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
        setLandErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      }
    }
  };

  // Handler functions for harvest
  const handleAddHarvest = async () => {
    try {
      setHarvestErrors({});
      const validated = harvestSchema.parse(harvestForm);

      const success = await addHarvest({
        lahan_id: validated.lahan_id,
        tanggal_panen: validated.tanggal_panen,
        jumlah_kg: parseFloat(validated.jumlah_kg),
        keterangan: validated.keterangan || null,
      });

      if (success) {
        setHarvestForm({ lahan_id: "", tanggal_panen: "", jumlah_kg: "", keterangan: "" });
        setHarvestDialogOpen(false);
      }
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
        setHarvestErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      }
    }
  };

  // Handler functions for products
  const handleAddProduct = async () => {
    try {
      setLoading(true);
      setProductErrors({});
      
      // Validate product form
      const validated = productSchema.parse(productForm);
      
      // Validate image file if provided
      if (productImageFile) {
        imageFileSchema.parse(productImageFile);
      }
      
      let imageUrl = "";
      if (productImageFile) {
        imageUrl = await uploadImage(productImageFile) || "";
      }

      await createProduct({
        nama: validated.nama,
        deskripsi: validated.deskripsi || undefined,
        harga: parseFloat(validated.harga),
        gambar_url: imageUrl || undefined,
      });

      setProductForm({ nama: "", deskripsi: "", harga: "", gambar_url: "" });
      setProductImageFile(null);
      setProductDialogOpen(false);
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            errors[err.path[0]] = err.message;
          } else {
            errors.image = err.message;
          }
        });
        setProductErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      } else {
        console.error('Error adding product:', error);
        toast({
          title: "Error",
          description: "Gagal menambahkan produk",
          variant: "destructive",
        });
      }
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
    setProductErrors({});
    setEditingProduct(product.id);
    setProductDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      setLoading(true);
      setProductErrors({});
      
      // Validate product form
      const validated = productSchema.parse(productForm);
      
      // Validate image file if provided
      if (productImageFile) {
        imageFileSchema.parse(productImageFile);
      }
      
      let imageUrl = productForm.gambar_url;
      if (productImageFile) {
        imageUrl = await uploadImage(productImageFile) || imageUrl;
      }

      await updateProduct(editingProduct, {
        nama: validated.nama,
        deskripsi: validated.deskripsi || undefined,
        harga: parseFloat(validated.harga),
        gambar_url: imageUrl || undefined,
      });

      setProductForm({ nama: "", deskripsi: "", harga: "", gambar_url: "" });
      setProductImageFile(null);
      setEditingProduct(null);
      setProductDialogOpen(false);
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            errors[err.path[0]] = err.message;
          } else {
            errors.image = err.message;
          }
        });
        setProductErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      } else {
        console.error('Error updating product:', error);
        toast({
          title: "Error",
          description: "Gagal mengupdate produk",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler functions for company profile
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setProfileErrors({});
      
      // Validate profile form
      const validated = companyProfileSchema.parse(profileForm);
      
      // Validate logo file if provided
      if (logoFile) {
        imageFileSchema.parse(logoFile);
      }
      
      let logoUrl = profileForm.logo_url;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile) || logoUrl;
      }

      await updateProfile({
        nama_perusahaan: validated.nama_perusahaan,
        deskripsi: validated.deskripsi || undefined,
        alamat: validated.alamat || undefined,
        kontak: validated.kontak || undefined,
        logo_url: logoUrl || undefined,
      });

      setLogoFile(null);
      setProfileDialogOpen(false);
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            errors[err.path[0]] = err.message;
          } else {
            errors.logo = err.message;
          }
        });
        setProfileErrors(errors);
        toast({
          title: "Validasi Gagal",
          description: "Mohon periksa kembali data yang Anda masukkan",
          variant: "destructive",
        });
      } else {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Gagal mengupdate profil perusahaan",
          variant: "destructive",
        });
      }
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

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            variant="outline"
            asChild
            className="justify-start h-auto p-4 border-organic-green/20 hover:bg-organic-green/5"
          >
            <Link to="/scan">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-organic p-3 rounded-lg">
                  <QrCode className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Scan QR Code</p>
                  <p className="text-sm text-muted-foreground">Scan profil petani</p>
                </div>
              </div>
            </Link>
          </Button>
          
          <Button
            variant="outline"
            asChild
            className="justify-start h-auto p-4 border-organic-green/20 hover:bg-organic-green/5"
          >
            <Link to="/offline-farmers">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-organic p-3 rounded-lg">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Data Offline</p>
                  <p className="text-sm text-muted-foreground">Akses tanpa internet</p>
                </div>
              </div>
            </Link>
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 rounded-lg bg-muted p-1 overflow-x-auto">
            {[
              { key: "farmers", label: "Petani", icon: Users },
              { key: "lands", label: "Lahan", icon: MapPin },
              { key: "products", label: "Produk", icon: Package },
              { key: "statistics", label: "Statistik", icon: BarChart3 },
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
                      setFarmerForm({ nama: "", kode_petani: "", alamat: "" });
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
                        className={farmerErrors.nama ? "border-destructive" : ""}
                      />
                      {farmerErrors.nama && (
                        <p className="text-sm text-destructive mt-1">{farmerErrors.nama}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="kode">Kode Petani</Label>
                      <Input
                        id="kode"
                        value={farmerForm.kode_petani}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, kode_petani: e.target.value }))}
                        className={farmerErrors.kode_petani ? "border-destructive" : ""}
                      />
                      {farmerErrors.kode_petani && (
                        <p className="text-sm text-destructive mt-1">{farmerErrors.kode_petani}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="alamat">Alamat</Label>
                      <Textarea
                        id="alamat"
                        value={farmerForm.alamat}
                        onChange={(e) => setFarmerForm(prev => ({ ...prev, alamat: e.target.value }))}
                        className={farmerErrors.alamat ? "border-destructive" : ""}
                      />
                      {farmerErrors.alamat && (
                        <p className="text-sm text-destructive mt-1">{farmerErrors.alamat}</p>
                      )}
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
              {!farmers ? (
                <TableSkeleton rows={8} columns={4} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmers.map((farmer) => (
                    <TableRow key={farmer.id}>
                      <TableCell className="font-medium">{farmer.kode_petani}</TableCell>
                      <TableCell>{farmer.nama}</TableCell>
                      <TableCell className="max-w-xs truncate">{farmer.alamat}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link to={`/petani/${farmer.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link to={`/petani/${farmer.id}/qr`}>
                              <QrCode className="h-4 w-4" />
                            </Link>
                          </Button>
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
              )}
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
                        className={landErrors.kode_lahan ? "border-destructive" : ""}
                      />
                      {landErrors.kode_lahan && (
                        <p className="text-sm text-destructive mt-1">{landErrors.kode_lahan}</p>
                      )}
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
                          <SelectItem value="none">Tidak ada petani</SelectItem>
                          {farmers.map((farmer) => (
                            <SelectItem key={farmer.id} value={farmer.id}>
                              {farmer.nama} ({farmer.kode_petani})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="keterangan">Keterangan Lahan (Opsional)</Label>
                      <Textarea
                        id="keterangan"
                        value={landForm.keterangan}
                        onChange={(e) => setLandForm(prev => ({ ...prev, keterangan: e.target.value }))}
                        placeholder="Deskripsi atau catatan tentang lahan ini"
                        rows={4}
                        className={landErrors.keterangan ? "border-destructive" : ""}
                      />
                      {landErrors.keterangan && (
                        <p className="text-sm text-destructive mt-1">{landErrors.keterangan}</p>
                      )}
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
              {!lands ? (
                <TableSkeleton rows={8} columns={4} />
              ) : (
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
              )}
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
                        className={productErrors.nama ? "border-destructive" : ""}
                      />
                      {productErrors.nama && (
                        <p className="text-sm text-destructive mt-1">{productErrors.nama}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="deskripsi-produk">Deskripsi (Opsional)</Label>
                      <Textarea
                        id="deskripsi-produk"
                        rows={3}
                        value={productForm.deskripsi}
                        onChange={(e) => setProductForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                        className={productErrors.deskripsi ? "border-destructive" : ""}
                      />
                      {productErrors.deskripsi && (
                        <p className="text-sm text-destructive mt-1">{productErrors.deskripsi}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="harga-produk">Harga (Rp)</Label>
                      <Input
                        id="harga-produk"
                        type="number"
                        step="0.01"
                        value={productForm.harga}
                        onChange={(e) => setProductForm(prev => ({ ...prev, harga: e.target.value }))}
                        className={productErrors.harga ? "border-destructive" : ""}
                      />
                      {productErrors.harga && (
                        <p className="text-sm text-destructive mt-1">{productErrors.harga}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="gambar-produk">Upload Gambar (Opsional, max 5MB)</Label>
                      <Input
                        id="gambar-produk"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProductImageFile(e.target.files?.[0] || null)}
                        className={productErrors.image ? "border-destructive" : ""}
                      />
                      {productErrors.image && (
                        <p className="text-sm text-destructive mt-1">{productErrors.image}</p>
                      )}
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

        {/* Statistics Tab */}
        {activeTab === "statistics" && (
          <div className="space-y-6">
            <Card className="shadow-gentle border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Data Panen</CardTitle>
                  <CardDescription>Tambah dan kelola data hasil panen</CardDescription>
                </div>
                <Dialog open={harvestDialogOpen} onOpenChange={setHarvestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setHarvestForm({ lahan_id: "", tanggal_panen: "", jumlah_kg: "", keterangan: "" });
                      }}
                      className="bg-gradient-organic shadow-organic hover:shadow-warm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Data Panen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Data Panen</DialogTitle>
                      <DialogDescription>
                        Tambahkan data hasil panen untuk lahan
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="lahan">Lahan</Label>
                        <Select
                          value={harvestForm.lahan_id}
                          onValueChange={(value) => setHarvestForm(prev => ({ ...prev, lahan_id: value }))}
                        >
                          <SelectTrigger id="lahan" className={`bg-background ${harvestErrors.lahan_id ? "border-destructive" : ""}`}>
                            <SelectValue placeholder="Pilih lahan" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {lands.map((land) => {
                              const farmer = land.petani_id ? farmers.find(f => f.id === land.petani_id) : null;
                              return (
                                <SelectItem key={land.id} value={land.id}>
                                  {land.kode_lahan} {farmer ? `- ${farmer.nama}` : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {harvestErrors.lahan_id && (
                          <p className="text-sm text-destructive mt-1">{harvestErrors.lahan_id}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="tanggal">Tanggal Panen</Label>
                        <Input
                          id="tanggal"
                          type="date"
                          value={harvestForm.tanggal_panen}
                          onChange={(e) => setHarvestForm(prev => ({ ...prev, tanggal_panen: e.target.value }))}
                          className={harvestErrors.tanggal_panen ? "border-destructive" : ""}
                        />
                        {harvestErrors.tanggal_panen && (
                          <p className="text-sm text-destructive mt-1">{harvestErrors.tanggal_panen}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="jumlah">Jumlah (kg)</Label>
                        <Input
                          id="jumlah"
                          type="number"
                          step="0.1"
                          min="0"
                          value={harvestForm.jumlah_kg}
                          onChange={(e) => setHarvestForm(prev => ({ ...prev, jumlah_kg: e.target.value }))}
                          placeholder="0"
                          className={harvestErrors.jumlah_kg ? "border-destructive" : ""}
                        />
                        {harvestErrors.jumlah_kg && (
                          <p className="text-sm text-destructive mt-1">{harvestErrors.jumlah_kg}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="keterangan-panen">Keterangan (Opsional)</Label>
                        <Textarea
                          id="keterangan-panen"
                          value={harvestForm.keterangan}
                          onChange={(e) => setHarvestForm(prev => ({ ...prev, keterangan: e.target.value }))}
                          placeholder="Catatan tambahan (opsional)"
                          rows={3}
                          className={harvestErrors.keterangan ? "border-destructive" : ""}
                        />
                        {harvestErrors.keterangan && (
                          <p className="text-sm text-destructive mt-1">{harvestErrors.keterangan}</p>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setHarvestDialogOpen(false);
                          }}
                        >
                          Batal
                        </Button>
                        <Button onClick={handleAddHarvest}>
                          Simpan
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
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Lahan</TableHead>
                      <TableHead>Petani</TableHead>
                      <TableHead>Jumlah (kg)</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {harvests.map((harvest) => {
                      const land = lands.find(l => l.id === harvest.lahan_id);
                      const farmer = land?.petani_id ? farmers.find(f => f.id === land.petani_id) : null;
                      return (
                        <TableRow key={harvest.id}>
                          <TableCell>
                            {new Date(harvest.tanggal_panen).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="font-medium">{land?.kode_lahan || "-"}</TableCell>
                          <TableCell>{farmer?.nama || "-"}</TableCell>
                          <TableCell>{harvest.jumlah_kg} kg</TableCell>
                          <TableCell className="max-w-xs truncate">{harvest.keterangan || "-"}</TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Data Panen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus data panen ini? Aksi ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteHarvest(harvest.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <StatisticsChart lands={lands} farmers={farmers} harvests={harvests} />
          </div>
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
                        className={profileErrors.nama_perusahaan ? "border-destructive" : ""}
                      />
                      {profileErrors.nama_perusahaan && (
                        <p className="text-sm text-destructive mt-1">{profileErrors.nama_perusahaan}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="deskripsi-perusahaan">Deskripsi (Opsional)</Label>
                      <Textarea
                        id="deskripsi-perusahaan"
                        rows={3}
                        value={profileForm.deskripsi}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                        className={profileErrors.deskripsi ? "border-destructive" : ""}
                      />
                      {profileErrors.deskripsi && (
                        <p className="text-sm text-destructive mt-1">{profileErrors.deskripsi}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="alamat-perusahaan">Alamat (Opsional)</Label>
                      <Textarea
                        id="alamat-perusahaan"
                        rows={2}
                        value={profileForm.alamat}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, alamat: e.target.value }))}
                        className={profileErrors.alamat ? "border-destructive" : ""}
                      />
                      {profileErrors.alamat && (
                        <p className="text-sm text-destructive mt-1">{profileErrors.alamat}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="kontak-perusahaan">Kontak (Opsional)</Label>
                      <Input
                        id="kontak-perusahaan"
                        value={profileForm.kontak}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, kontak: e.target.value }))}
                        placeholder="email@domain.com | +62 xxx-xxxx-xxxx"
                        className={profileErrors.kontak ? "border-destructive" : ""}
                      />
                      {profileErrors.kontak && (
                        <p className="text-sm text-destructive mt-1">{profileErrors.kontak}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="logo-perusahaan">Upload Logo (Opsional, max 5MB)</Label>
                      <Input
                        id="logo-perusahaan"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className={profileErrors.logo ? "border-destructive" : ""}
                      />
                      {profileErrors.logo && (
                        <p className="text-sm text-destructive mt-1">{profileErrors.logo}</p>
                      )}
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