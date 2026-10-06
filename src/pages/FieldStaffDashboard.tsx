import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { LocationConfirmationBadge } from "@/components/LocationConfirmationPanel";
import { LandPhotoGallery } from "@/components/LandPhotoGallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFarmers } from "@/hooks/use-farmers";
import { useLands } from "@/hooks/use-lands";
import { FarmerFormDialog, LandFormDialog } from "@/pages/AdminDashboard";
import { Edit } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

/** Dashboard for field staff (staf lapang): capture-first, offline aware. */
const FieldStaffDashboard = () => {
  const { user, signOut } = useAuth();
  const { roles } = useUserRoles();
  const navigate = useNavigate();
  const { isOnline, pendingCount, syncing, sync } = useOfflineQueue();
  const { farmers, loading: farmersLoading, addFarmer, updateFarmer, refetch: refetchFarmers } = useFarmers();
  const { lands, loading: landsLoading, addLand, updateLand, refetch: refetchLands } = useLands();

  const [stats, setStats] = useState({ petani: 0, lahan: 0, foto: 0, tanpaKoordinat: 0 });
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("map");
  const [editingFarmer, setEditingFarmer] = useState<Tables<"petani"> | null>(null);
  const [editingLand, setEditingLand] = useState<Tables<"lahan"> | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{
    kind: "petani" | "lahan";
    id: string;
    farmerId?: string;
  } | null>(null);

  const sortedFarmers = useMemo(() => [...farmers].sort((a, b) =>
    a.kode_petani.localeCompare(b.kode_petani, undefined, { numeric: true, sensitivity: "base" }),
  ), [farmers]);
  const sortedLands = useMemo(() => [...lands].sort((a, b) =>
    a.nama_lahan.localeCompare(b.nama_lahan, undefined, { numeric: true, sensitivity: "base" }),
  ), [lands]);
  const farmerById = useMemo(() => new Map(farmers.map((farmer) => [farmer.id, farmer])), [farmers]);

  const openDirectory = () => {
    setActiveTab("farmers");
    window.requestAnimationFrame(() => {
      document.getElementById("field-directory")?.scrollIntoView({ block: "start" });
    });
  };

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
          <LocationConfirmationBadge />
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
            <Button onClick={() => { setCameraTarget(null); setCameraOpen(true); }}>
              <Camera className="h-4 w-4 mr-2" /> Kamera Peta
            </Button>
            <Button variant="outline" onClick={() => setGalleryOpen(true)}>
              <Images className="h-4 w-4 mr-2" /> Galeri Foto
            </Button>
            <Button variant="outline" onClick={openDirectory}>
              <Users className="h-4 w-4 mr-2" /> Daftar Petani & Lahan
            </Button>
          </CardContent>
        </Card>

        <Tabs id="field-directory" value={activeTab} onValueChange={setActiveTab} className="scroll-mt-36 space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
            <TabsTrigger value="map">Peta</TabsTrigger>
            <TabsTrigger value="farmers">Daftar Petani</TabsTrigger>
            <TabsTrigger value="lands">Daftar Lahan</TabsTrigger>
          </TabsList>
          <TabsContent value="map"><LandMapTab /></TabsContent>
          <TabsContent value="farmers" className="space-y-4">
            <h2 className="text-lg font-semibold">Daftar Petani</h2>
            {farmersLoading ? (
              <div role="status" className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat petani...</div>
            ) : sortedFarmers.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Belum ada data petani.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sortedFarmers.map((farmer) => (
                  <Card key={farmer.id} className="min-w-0">
                    <CardContent className="space-y-3 pt-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold break-words">{farmer.nama}</h3>
                        <Badge variant="secondary" className="max-w-full whitespace-normal break-all">{farmer.kode_petani}</Badge>
                      </div>
                      <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="break-words min-w-0">{farmer.alamat || "Alamat belum diisi"}</span></p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingFarmer(farmer)}><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setCameraTarget({ kind: "petani", id: farmer.id, farmerId: farmer.id });
                          setCameraOpen(true);
                        }}><Camera className="h-4 w-4 mr-2" /> Update Foto Rumah</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="lands" className="space-y-4">
            <h2 className="text-lg font-semibold">Daftar Lahan</h2>
            {landsLoading ? (
              <div role="status" className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat lahan...</div>
            ) : sortedLands.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Belum ada data lahan.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sortedLands.map((land) => {
                  const farmer = land.petani_id ? farmerById.get(land.petani_id) : undefined;
                  return (
                    <Card key={land.id} className="min-w-0">
                      <CardContent className="space-y-3 pt-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold break-words">{land.nama_lahan}</h3>
                          <p className="text-sm text-muted-foreground break-words">{farmer ? `${farmer.nama} (${farmer.kode_petani})` : "Belum terhubung ke petani"}</p>
                        </div>
                        <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="break-words min-w-0">{land.lokasi || "Lokasi belum diisi"}</span></p>
                        <div className="flex flex-wrap gap-2 items-center text-sm">
                          <Badge variant="secondary">{land.status === "nonaktif" ? "Tidak Aktif" : "Aktif"}</Badge>
                          {land.luas != null && <span>{Number(land.luas).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingLand(land)}><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setCameraTarget({ kind: "lahan", id: land.id, farmerId: land.petani_id ?? undefined });
                            setCameraOpen(true);
                          }}><Camera className="h-4 w-4 mr-2" /> Update Foto Lahan</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={editingFarmer !== null} onOpenChange={(open) => { if (!open) setEditingFarmer(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Petani</DialogTitle></DialogHeader>
          {editingFarmer && <FarmerFormDialog key={editingFarmer.id} editingFarmer={editingFarmer} addFarmer={addFarmer} updateFarmer={updateFarmer} onClose={() => setEditingFarmer(null)} onCreated={() => {}} />}
        </DialogContent>
      </Dialog>
      <Dialog open={editingLand !== null} onOpenChange={(open) => { if (!open) setEditingLand(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lahan</DialogTitle></DialogHeader>
          {editingLand && <LandFormDialog key={editingLand.id} editingLand={editingLand} farmers={sortedFarmers} addLand={addLand} updateLand={updateLand} onClose={() => setEditingLand(null)} />}
        </DialogContent>
      </Dialog>
      <GPSMapCamera
        key={cameraTarget ? `${cameraTarget.kind}-${cameraTarget.id}` : "capture"}
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        defaultFarmerId={cameraTarget?.farmerId}
        defaultLandId={cameraTarget?.kind === "lahan" ? cameraTarget.id : undefined}
        defaultTipe={cameraTarget?.kind === "petani" ? "rumah" : "lahan"}
        onSaved={() => { void loadStats(); void refetchFarmers(); void refetchLands(); }}
      />
      <LandPhotoGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
    </div>
  );
};

export default FieldStaffDashboard;
