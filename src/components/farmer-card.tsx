import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, TreePine, QrCode, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface FarmerCardProps {
  petani: {
    id: string;
    kode_petani: string;
    nama: string;
    alamat: string;
    rata_rata_panen: number;
    no_telepon?: string;
    lahan?: Array<{
      id: string;
      luas: number;
      alamat: string;
      jumlah_tanaman: number;
    }>;
  };
  showQRCode?: boolean;
}

const FarmerCard = ({ petani, showQRCode = false }: FarmerCardProps) => {
  const totalLuas = petani.lahan?.reduce((sum, lahan) => sum + Number(lahan.luas), 0) || 0;
  const totalTanaman = petani.lahan?.reduce((sum, lahan) => sum + (lahan.jumlah_tanaman || 0), 0) || 0;

  return (
    <Card className="hover:shadow-gentle transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-organic-cream/20">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-foreground">{petani.nama}</CardTitle>
            <Badge variant="secondary" className="mt-1">
              {petani.kode_petani}
            </Badge>
          </div>
          {showQRCode && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/petani/${petani.id}/qr`}>
                <QrCode className="h-4 w-4 mr-1" />
                QR
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-sm text-muted-foreground">{petani.alamat}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <TreePine className="h-4 w-4 text-organic-green" />
              <span className="text-muted-foreground">Total Lahan</span>
            </div>
            <p className="font-medium text-foreground">{totalLuas.toFixed(1)} ha</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <TreePine className="h-4 w-4 text-organic-amber" />
              <span className="text-muted-foreground">Tanaman</span>
            </div>
            <p className="font-medium text-foreground">{totalTanaman} pohon</p>
          </div>
        </div>

        {petani.rata_rata_panen && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-sm">
              <span className="text-muted-foreground">Rata-rata Panen: </span>
              <span className="font-medium text-organic-green">
                {petani.rata_rata_panen} kg/bulan
              </span>
            </div>
          </div>
        )}

        <div className="pt-3 flex space-x-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to={`/petani/${petani.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              Detail
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmerCard;