import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LandMapTab } from "@/components/LandMapTab";
import { LandPhotoGallery } from "@/components/LandPhotoGallery";
import { Eye, Images, Loader2, LogOut, MapPin, Sprout, Users } from "lucide-react";

/** Read-only dashboard for pengawas: petani, lahan, and map only. */
const SupervisorDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ petani: 0, lahan: 0, organik: 0, foto: 0 });
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [petani, lahan, organik, foto] = await Promise.all([
        supabase.from("petani").select("id", { count: "exact", head: true }),
        supabase.from("lahan").select("id", { count: "exact", head: true }),
        supabase.from("lahan").select("id", { count: "exact", head: true }).eq("is_organic", true),
        supabase.from("foto_lahan").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        petani: petani.count ?? 0,
        lahan: lahan.count ?? 0,
        organik: organik.count ?? 0,
        foto: foto.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Petani", value: stats.petani, icon: Users },
    { label: "Lahan", value: stats.lahan, icon: MapPin },
    { label: "Lahan Organik", value: stats.organik, icon: Sprout },
    { label: "Foto Dokumentasi", value: stats.foto, icon: Images },
  ];

  return (
    <div className="min-h-screen bg-gradient-natural">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-lg font-semibold">Dashboard Pengawas</h1>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Eye className="h-3 w-3" /> Mode Lihat Saja
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              signOut();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Icon className="h-4 w-4" /> {label}
                </div>
                <p className="text-2xl font-bold mt-1">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dokumentasi Lapangan</CardTitle>
            <CardDescription>Tinjau foto lahan & alamat petani yang sudah diunggah petugas lapang.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setGalleryOpen(true)}>
              <Images className="h-4 w-4 mr-2" /> Buka Galeri Foto
            </Button>
          </CardContent>
        </Card>

        <LandMapTab />
      </main>

      <LandPhotoGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
    </div>
  );
};

export default SupervisorDashboard;
