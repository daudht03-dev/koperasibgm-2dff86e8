import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, User, MapPin, Trash2, WifiOff, Clock } from "lucide-react";
import { useOfflineFarmers } from "@/hooks/use-offline-farmers";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const OfflineFarmers = () => {
  const { offlineFarmers, deleteFarmer, clearAll } = useOfflineFarmers();

  const handleDelete = (id: string, name: string) => {
    if (deleteFarmer(id)) {
      toast({
        title: "Berhasil",
        description: `Data ${name} dihapus dari offline storage`,
      });
    }
  };

  const handleClearAll = () => {
    if (clearAll()) {
      toast({
        title: "Berhasil",
        description: "Semua data offline telah dihapus",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Data Petani Offline
          </h1>
          <p className="text-muted-foreground">
            Data petani yang telah di-scan dan disimpan untuk akses offline
          </p>
        </div>

        <Alert className="mb-6 border-organic-green/20 bg-organic-green/5">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            {offlineFarmers.length} data petani tersimpan secara offline dan bisa diakses tanpa koneksi internet
          </AlertDescription>
        </Alert>

        {offlineFarmers.length > 0 && (
          <div className="mb-6 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus Semua
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Semua Data Offline?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menghapus semua data petani yang tersimpan secara offline. Data masih tersedia di server.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Hapus Semua
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {offlineFarmers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {offlineFarmers.map((farmer) => (
              <Card key={farmer.id} className="shadow-gentle border-border/50 hover:shadow-organic transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-organic-green" />
                        {farmer.nama}
                      </CardTitle>
                      <Badge variant="secondary">{farmer.kode_petani}</Badge>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Data Offline?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Hapus data {farmer.nama} dari penyimpanan offline?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(farmer.id, farmer.nama)}>
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{farmer.alamat}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Disimpan: {new Date(farmer.saved_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      {farmer.lands.length} lahan terdaftar
                    </p>
                    <Button asChild className="w-full bg-gradient-organic text-primary-foreground">
                      <Link to={`/profil-petani/${farmer.id}`}>
                        Lihat Profil
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-gentle border-border/50">
            <CardContent className="text-center py-12">
              <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Belum Ada Data Offline
              </h3>
              <p className="text-muted-foreground mb-6">
                Scan QR code petani untuk menyimpan data secara offline
              </p>
              <Button asChild className="bg-gradient-organic text-primary-foreground">
                <Link to="/scan">
                  Mulai Scan QR Code
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default OfflineFarmers;
