import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, TreePine, WifiOff, Award, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineFarmers } from "@/hooks/use-offline-farmers";
import { toast } from "@/hooks/use-toast";
import PublicNavbar from "@/components/ui/public-navbar";
import PublicFooter from "@/components/ui/public-footer";

type PublicPetani = {
  id: string;
  kode_petani: string;
  nama: string;
  is_organic: boolean | null;
};

type PublicLahan = {
  id: string;
  petani_id: string | null;
  nama_lahan: string;
  lokasi: string | null;
  status: string | null;
  is_organic: boolean | null;
  created_at?: string | null;
};

const FarmerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [petani, setPetani] = useState<PublicPetani | null>(null);
  const [lands, setLands] = useState<PublicLahan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { saveFarmer, getFarmer } = useOfflineFarmers();

  useEffect(() => {
    if (id) {
      fetchFarmerProfile(id);
    }
  }, [id]);

  const fetchFarmerProfile = async (petaniId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("public-farmer-profile", {
        body: { farmerId: petaniId },
      });

      if (error) throw error;
      if (!data?.farmer) throw new Error("Petani tidak ditemukan");

      const farmer = data.farmer as PublicPetani;
      const landsData = (data.lands ?? []) as PublicLahan[];

      setPetani(farmer);
      setLands(landsData);

      // Save to offline storage
      saveFarmer({
        id: farmer.id,
        kode_petani: farmer.kode_petani,
        nama: farmer.nama,
        alamat: null,
        created_at: new Date().toISOString(),
        is_organic: farmer.is_organic,
        lands: landsData.map((l) => ({
          id: l.id,
          nama_lahan: l.nama_lahan,
          lokasi: l.lokasi,
          created_at: l.created_at || new Date().toISOString(),
          is_organic: l.is_organic,
        })),
        saved_at: new Date().toISOString(),
      });

      setIsOffline(false);
    } catch (error: any) {
      console.error("Error fetching farmer profile:", error);
      
      // Try to load from offline storage
      const offlineFarmer = getFarmer(petaniId);
      if (offlineFarmer) {
        setPetani({
          id: offlineFarmer.id,
          kode_petani: offlineFarmer.kode_petani,
          nama: offlineFarmer.nama,
          is_organic: offlineFarmer.is_organic ?? true,
        });
        setLands(
          offlineFarmer.lands.map((l) => ({
            id: l.id,
            petani_id: petaniId,
            nama_lahan: l.nama_lahan,
            lokasi: l.lokasi,
            status: null,
            created_at: l.created_at,
            is_organic: l.is_organic ?? null,
          }))
        );
        setIsOffline(true);
        toast({
          title: "Mode Offline",
          description: "Menampilkan data dari penyimpanan offline",
        });
      } else {
        setError("Gagal memuat data petani dan tidak ada data offline");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
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
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Petani Tidak Ditemukan</h1>
            <p className="text-muted-foreground mb-8">{error || "Data petani tidak tersedia"}</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">

          {isOffline && (
            <Alert className="mb-4 border-organic-green/20 bg-organic-green/5">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Anda sedang melihat data offline. Data ini terakhir disimpan saat Anda online.
              </AlertDescription>
            </Alert>
          )}
          
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
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Petani terdaftar dengan kode <span className="font-medium text-foreground">{petani.kode_petani}</span>
                    </p>
                    <Badge 
                      variant="outline" 
                      className={petani.is_organic 
                        ? "border-organic-green text-organic-green" 
                        : "border-amber-500 text-amber-600"
                      }
                    >
                      {petani.is_organic ? "Petani Organik" : "Petani Konvensional"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informasi Sertifikasi */}
            {petani.is_organic && (
              <Card className="shadow-gentle border-border/50 bg-gradient-to-br from-organic-green/5 to-organic-cream/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="bg-organic-green p-2 rounded-lg shadow-organic">
                      <Award className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span>Sertifikasi Organik</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-organic-green mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Tersertifikasi Organik</p>
                      <p className="text-sm text-muted-foreground">
                        Petani ini mengikuti standar pertanian organik dan tidak menggunakan pestisida atau pupuk kimia sintetis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-organic-green mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Praktik Berkelanjutan</p>
                      <p className="text-sm text-muted-foreground">
                        Menerapkan metode pertanian ramah lingkungan untuk menjaga kesuburan tanah dan ekosistem
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <Card className="shadow-gentle border-border/50 bg-gradient-to-br from-card to-organic-cream/30">
              <CardHeader>
                <CardTitle>Informasi Lahan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="bg-organic-green w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-gentle">
                    <MapPin className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">{lands.length}</h3>
                  <p className="text-sm text-muted-foreground mt-2">Total Lahan Terdaftar</p>
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lands.map((land) => {
                      const isLandOrganic = land.is_organic ?? petani.is_organic;
                      return (
                        <TableRow key={land.id}>
                          <TableCell className="font-medium">{land.nama_lahan}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={isLandOrganic 
                                ? "border-organic-green text-organic-green" 
                                : "border-amber-500 text-amber-600"
                              }
                            >
                              {isLandOrganic ? "Organik" : "Konvensional"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
      
      <PublicFooter />
    </div>
  );
};

export default FarmerProfile;
