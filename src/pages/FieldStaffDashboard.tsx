import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, ROLE_LABELS } from "@/hooks/use-user-role";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { GPSMapCamera } from "@/components/GPSMapCamera";
import { LandMapTab } from "@/components/LandMapTab";
import {
  Camera,
  CloudOff,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Users,
  Wifi,
  Images,
} from "lucide-react";
import { LandPhotoGallery } from "@/components/LandPhotoGallery";

/** Dashboard for field staff (staf lapang): capture-first, offline aware. */
const FieldStaffDashboard = () => {
  const { user, signOut } = useAuth();
  const { roles } = useUserRoles();
  const navigate = useNavigate();
  const { isOnline, pendingCount, syncing, sync } = useOfflineQueue();

  const [stats, setStats] = useState({ petani: 0, lahan: 0, foto: 0, tanpaKoordinat: 0 });
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    const [petani, lahan, foto, tanpa] = await Promise.all([
      supabase.from("petani").select("id", { count: "exact", head: true }),
      supabase.from("lahan").select("id", { count: "exact", head: true }),
      supabase.from("foto_lahan").select("id", { count: "exact", head: true }),
      supabase.from("lahan").select("id", { count: "exact", head: true }).is("koordinat", null),
    ]);
    setStats({
      petani: petani.count ?? 0,
      lahan: lahan.count ?? 0,
      foto: foto.count ?? 0,
      tanpaKoordinat: tanpa.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const roleLabel = useMemo(
    () => roles.map((r) => ROLE_LABELS[r] || r).join(", ") || "Staf Lapang",
    [roles],
  );

  const cards = [
    { label: "Petani Terdaftar", value: stats.petani, icon: Users },
    { label: "Lahan Terdaftar", value: stats.lahan, icon: MapPin },
    { label: "Foto Dokumentasi", value: stats.foto, icon: Images },
    { label: "Lahan Tanpa Koordinat", value: stats.tanpaKoordinat, icon: CloudOff },
  ];

  return (
    <div className="min-h-screen bg-gradient-natural">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-lg font-semibold">Dashboard Petugas Lapang</h1>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email} · {roleLabel}
            </p>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"} className="gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
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
        {pendingCount > 0 && (
          <Card className="border-amber-500/50">
            <CardContent className="py-4 flex flex-wrap items-center gap-3">
              <CloudOff className="h-5 w-5 text-amber-600" />
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-medium">{pendingCount} data lapangan menunggu sinkronisasi</p>
                <p className="text-xs text-muted-foreground">
                  Koordinat & foto tersimpan di perangkat, otomatis terunggah saat sinyal kembali.
                </p>
              </div>
              <Button size="sm" onClick={sync} disabled={!isOnline || syncing}>
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sinkron Sekarang
              </Button>
            </CardContent>
          </Card>
        )}

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
            <CardTitle>Aksi Cepat Lapangan</CardTitle>
            <CardDescription>
              Ambil titik koordinat & foto berwatermark, bahkan saat tidak ada sinyal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => setCameraOpen(true)}>
              <Camera className="h-4 w-4 mr-2" /> Kamera Peta
            </Button>
            <Button variant="outline" onClick={() => setGalleryOpen(true)}>
              <Images className="h-4 w-4 mr-2" /> Galeri Foto
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin">
                <Users className="h-4 w-4 mr-2" /> Daftar Petani & Lahan
              </Link>
            </Button>
          </CardContent>
        </Card>

        <LandMapTab />
      </main>

      <GPSMapCamera open={cameraOpen} onOpenChange={setCameraOpen} onSaved={loadStats} />
      <LandPhotoGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
    </div>
  );
};

export default FieldStaffDashboard;
