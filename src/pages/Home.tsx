import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, Award, Users, TreePine, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FarmerCard from "@/components/farmer-card";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-coconut-sugar.jpg";
import { useProducts } from "@/hooks/use-products";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { formatRupiah } from "@/lib/utils";

interface Petani {
  id: string;
  kode_petani: string;
  nama: string;
  alamat: string;
  rata_rata_panen: number;
  no_telepon?: string;
}

interface KontenWebsite {
  section: string;
  judul: string;
  isi: string;
  gambar_url?: string;
}

const Home = () => {
  const [petaniList, setPetaniList] = useState<Petani[]>([]);
  const [konten, setKonten] = useState<Record<string, KontenWebsite>>({});
  const [loading, setLoading] = useState(true);
  
  const { products } = useProducts();
  const { profile: companyProfile } = useCompanyProfile();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch petani
      const { data: petaniData, error: petaniError } = await supabase
        .from("petani")
        .select("*")
        .order("created_at", { ascending: false });

      if (petaniError) throw petaniError;

      // Fetch konten website
      const { data: kontenData, error: kontenError } = await supabase
        .from("konten_website")
        .select("*");

      if (kontenError) throw kontenError;

      setPetaniList(petaniData || []);
      
      // Convert konten array to object
      const kontenObj = (kontenData || []).reduce((acc, item) => {
        acc[item.section] = item;
        return acc;
      }, {} as Record<string, KontenWebsite>);
      
      setKonten(kontenObj);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Gula Kelapa Organik" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-organic-brown/70 via-organic-brown/50 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-6xl font-bold text-primary-foreground mb-6">
              {konten.hero?.judul || "Gula Kelapa Organik Berkualitas Tinggi"}
            </h1>
            <p className="text-xl text-primary-foreground/90 mb-8">
              {konten.hero?.isi || "Dari kebun petani lokal langsung ke meja Anda. Diproduksi dengan standar organik terbaik untuk kesehatan keluarga."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="bg-gradient-organic shadow-organic hover:shadow-warm transition-all duration-300">
                <Link to="/produk">
                  <Leaf className="mr-2 h-5 w-5" />
                  Lihat Produk
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <a href="#about">Tentang Kami</a>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/login">Login Admin</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-natural">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-organic w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-organic">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-2">{petaniList.length}</h3>
              <p className="text-muted-foreground">Petani Mitra</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-earth w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-warm">
                <TreePine className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-2">
                {petaniList.reduce((sum, petani) => sum + petani.rata_rata_panen, 0).toFixed(1)}
              </h3>
              <p className="text-muted-foreground">Kg Produksi/Bulan</p>
            </div>
            <div className="text-center">
              <div className="bg-organic-amber w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-gentle">
                <Award className="h-8 w-8 text-organic-brown" />
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-2">100%</h3>
              <p className="text-muted-foreground">Organik</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                {konten.about?.judul || `Tentang ${companyProfile?.nama_perusahaan || "Berkah Gendis Official"}`}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {konten.about?.isi || companyProfile?.deskripsi || "Berkah Gendis Official adalah perusahaan yang berkomitmen menghasilkan gula kelapa organik berkualitas tinggi."}
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-organic-green/10 p-2 rounded-full">
                    <Leaf className="h-5 w-5 text-organic-green" />
                  </div>
                  <span className="text-foreground">100% Organik & Alami</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-organic-amber/10 p-2 rounded-full">
                    <Users className="h-5 w-5 text-organic-amber" />
                  </div>
                  <span className="text-foreground">Kemitraan Langsung dengan Petani</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-organic-green/10 p-2 rounded-full">
                    <Award className="h-5 w-5 text-organic-green" />
                  </div>
                  <span className="text-foreground">Standar Kualitas Tinggi</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-organic rounded-2xl p-8 shadow-organic">
                <div className="bg-primary-foreground rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Proses Produksi</h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li>• Penyadapan nira kelapa segar</li>
                    <li>• Pemasakan tradisional tanpa bahan kimia</li>
                    <li>• Proses pengeringan alami</li>
                    <li>• Kontrol kualitas ketat</li>
                    <li>• Pengemasan higienis</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 bg-gradient-natural">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {konten.products?.judul || "Produk Kami"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {konten.products?.isi || "Gula kelapa organik premium yang diproses secara tradisional dan higienis."}
            </p>
          </div>
          
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.slice(0, 3).map((product) => (
                  <Card key={product.id} className="hover:shadow-gentle transition-all duration-300 overflow-hidden">
                    {product.gambar_url && (
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={product.gambar_url} 
                          alt={product.nama}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{product.nama}</h3>
                      {product.deskripsi && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.deskripsi}</p>
                      )}
                      <Badge variant="secondary" className="text-lg font-bold">
                        {formatRupiah(Number(product.harga))}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {products.length > 3 && (
                <div className="text-center mt-8">
                  <Button size="lg" asChild>
                    <Link to="/produk">
                      Lihat Semua Produk
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Belum ada produk tersedia.</div>
            </div>
          )}
        </div>
      </section>

      {/* Farmers Section */}
      <section id="farmers" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Petani Mitra Kami
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Berkenalan dengan para petani hebat yang menjadi mitra dalam menghasilkan gula kelapa organik berkualitas tinggi.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Memuat data petani...</div>
            </div>
          ) : petaniList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {petaniList.slice(0, 6).map((petani) => (
                <FarmerCard key={petani.id} petani={petani} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Belum ada data petani tersedia.</div>
            </div>
          )}

          {petaniList.length > 6 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg">
                Lihat Semua Petani
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;