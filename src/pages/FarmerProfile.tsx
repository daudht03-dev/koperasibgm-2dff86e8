import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, TreePine, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

interface Petani {
  id: string;
  kode_petani: string;
  nama: string;
  alamat: string;
  rata_rata_panen: number;
  created_at: string;
}

interface Lahan {
  id: string;
  kode_lahan: string;
  keterangan: string | null;
  created_at: string;
}

const FarmerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [petani, setPetani] = useState<Petani | null>(null);
  const [lands, setLands] = useState<Lahan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchFarmerProfile(id);
    }
  }, [id]);

  const fetchFarmerProfile = async (petaniId: string) => {
    try {
      const { data, error } = await supabase
        .from("petani")
        .select("id, kode_petani, nama, alamat, rata_rata_panen, created_at")
        .eq("id", petaniId)
        .single();

      if (error) throw error;

      setPetani(data);
      
      // Fetch lands associated with this farmer
      const { data: landsData, error: landsError } = await supabase
        .from("lahan")
        .select("id, kode_lahan, keterangan, created_at")
        .eq("petani_id", petaniId)
        .order("created_at", { ascending: false });

      if (landsError) {
        console.error("Error fetching lands:", landsError);
      } else {
        setLands(landsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching farmer profile:", error);
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
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <Card className="shadow-gentle border-border/50 bg-gradient-to-br from-card to-organic-cream/30">
              <CardHeader>
                <CardTitle>Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="bg-organic-amber w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-gentle">
                    <TreePine className="h-8 w-8 text-organic-brown" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">{petani.rata_rata_panen}</h3>
                  <p className="text-muted-foreground">kg/bulan</p>
                  <p className="text-sm text-muted-foreground mt-2">Rata-rata Panen</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Daftar Lahan */}
        <div className="mt-8">
          <Card className="shadow-gentle border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-organic-green" />
                Daftar Lahan ({lands.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lands.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode Lahan</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Terdaftar Sejak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lands.map((land) => (
                      <TableRow key={land.id}>
                        <TableCell className="font-medium">{land.kode_lahan}</TableCell>
                        <TableCell className="max-w-md">{land.keterangan || "-"}</TableCell>
                        <TableCell>
                          {new Date(land.created_at).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada lahan terdaftar untuk petani ini</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default FarmerProfile;
