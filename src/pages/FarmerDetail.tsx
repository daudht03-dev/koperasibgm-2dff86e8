import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, TreePine, Phone, Calendar, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

interface Petani {
  id: string;
  kode_petani: string;
  nama: string;
  alamat: string;
  rata_rata_panen: number;
  no_telepon?: string;
  created_at: string;
  lahan: Array<{
    id: string;
    luas: number;
    alamat: string;
    koordinat?: string;
    jumlah_tanaman: number;
  }>;
}

const FarmerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [petani, setPetani] = useState<Petani | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPetaniDetail(id);
    }
  }, [id]);

  const fetchPetaniDetail = async (petaniId: string) => {
    try {
      const { data, error } = await supabase
        .from("petani")
        .select(`
          *,
          lahan (*)
        `)
        .eq("id", petaniId)
        .single();

      if (error) throw error;

      setPetani(data);
    } catch (error: any) {
      console.error("Error fetching petani detail:", error);
      setError("Gagal memuat data petani");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="text-muted-foreground">Memuat data petani...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !petani) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Petani Tidak Ditemukan</h1>
            <p className="text-muted-foreground mb-8">{error || "Data petani tidak tersedia"}</p>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Beranda
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalLuas = petani.lahan.reduce((sum, lahan) => sum + Number(lahan.luas), 0);
  const totalTanaman = petani.lahan.reduce((sum, lahan) => sum + (lahan.jumlah_tanaman || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </Button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {petani.nama}
              </h1>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {petani.kode_petani}
              </Badge>
            </div>
            <Button asChild className="bg-gradient-organic shadow-organic">
              <Link to={`/petani/${petani.id}/qr`}>
                <QrCode className="mr-2 h-4 w-4" />
                Lihat QR Code
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informasi Petani */}
            <Card className="shadow-gentle border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="bg-gradient-organic p-2 rounded-lg shadow-organic">
                    <TreePine className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span>Informasi Petani</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Alamat</span>
                    </div>
                    <p className="text-foreground">{petani.alamat}</p>
                  </div>
                  
                  {petani.no_telepon && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">No. Telepon</span>
                      </div>
                      <p className="text-foreground">{petani.no_telepon}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <TreePine className="h-4 w-4" />
                      <span className="text-sm">Rata-rata Panen</span>
                    </div>
                    <p className="text-organic-green font-medium">
                      {petani.rata_rata_panen} kg/bulan
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Terdaftar Sejak</span>
                    </div>
                    <p className="text-foreground">
                      {new Date(petani.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daftar Lahan */}
            <Card className="shadow-gentle border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="bg-gradient-earth p-2 rounded-lg shadow-warm">
                    <MapPin className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span>Daftar Lahan ({petani.lahan.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {petani.lahan.length > 0 ? (
                  <div className="space-y-4">
                    {petani.lahan.map((lahan, index) => (
                      <div key={lahan.id}>
                        <div className="bg-gradient-to-r from-organic-cream to-organic-brown-light/30 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h4 className="font-medium text-foreground mb-1">
                                Lahan {index + 1}
                              </h4>
                              <p className="text-sm text-muted-foreground">{lahan.alamat}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-organic-green">
                                {lahan.luas}
                              </p>
                              <p className="text-xs text-muted-foreground">Hektar</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-organic-amber">
                                {lahan.jumlah_tanaman || 0}
                              </p>
                              <p className="text-xs text-muted-foreground">Pohon</p>
                            </div>
                          </div>
                          {lahan.koordinat && (
                            <div className="mt-3 pt-3 border-t border-border/30">
                              <p className="text-xs text-muted-foreground">
                                Koordinat: {lahan.koordinat}
                              </p>
                            </div>
                          )}
                        </div>
                        {index < petani.lahan.length - 1 && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada data lahan terdaftar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <Card className="shadow-gentle border-border/50 bg-gradient-to-br from-card to-organic-cream/30">
              <CardHeader>
                <CardTitle>Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="bg-gradient-organic w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-organic">
                    <TreePine className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">{totalLuas.toFixed(1)}</h3>
                  <p className="text-muted-foreground">Total Hektar</p>
                </div>
                
                <Separator />
                
                <div className="text-center">
                  <div className="bg-gradient-earth w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-warm">
                    <TreePine className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">{totalTanaman}</h3>
                  <p className="text-muted-foreground">Total Pohon</p>
                </div>
                
                <Separator />
                
                <div className="text-center">
                  <div className="bg-organic-amber w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-gentle">
                    <TreePine className="h-8 w-8 text-organic-brown" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">{petani.rata_rata_panen}</h3>
                  <p className="text-muted-foreground">kg/bulan</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-gentle border-border/50">
              <CardHeader>
                <CardTitle>Bagikan Profil</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Gunakan QR Code untuk membagikan profil petani ini
                </p>
                <Button asChild className="w-full bg-gradient-organic shadow-organic">
                  <Link to={`/petani/${petani.id}/qr`}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate QR Code
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default FarmerDetail;