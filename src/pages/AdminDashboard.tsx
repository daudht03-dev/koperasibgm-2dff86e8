import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { Users, MapPin, Settings, Plus, LogOut } from "lucide-react";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    navigate("/");
    setLoading(false);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-gentle border-border/50 hover:shadow-warm transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Users className="h-5 w-5 mr-2 text-organic-green" />
                Kelola Petani
              </CardTitle>
              <CardDescription>
                Tambah, edit, dan hapus data petani
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-organic shadow-organic hover:shadow-warm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Petani
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-gentle border-border/50 hover:shadow-warm transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <MapPin className="h-5 w-5 mr-2 text-organic-green" />
                Kelola Lahan
              </CardTitle>
              <CardDescription>
                Tambah, edit, dan hapus data lahan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-organic shadow-organic hover:shadow-warm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Lahan
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-gentle border-border/50 hover:shadow-warm transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Settings className="h-5 w-5 mr-2 text-organic-green" />
                Konten Website
              </CardTitle>
              <CardDescription>
                Edit konten halaman utama
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-organic shadow-organic hover:shadow-warm">
                <Settings className="h-4 w-4 mr-2" />
                Kelola Konten
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-gentle border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Statistik Petani</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Petani:</span>
                  <span className="font-semibold text-foreground">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Lahan:</span>
                  <span className="font-semibold text-foreground">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rata-rata Panen:</span>
                  <span className="font-semibold text-foreground">0 kg/bulan</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-gentle border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Aktivitas Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada aktivitas</p>
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