import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings, Printer, Package } from "lucide-react";

export const LabelManagement = () => {
  return (
    <Card className="shadow-gentle border-border/50">
      <CardHeader>
        <CardTitle>Manajemen Label</CardTitle>
        <CardDescription>Kelola dan cetak label untuk petani</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <Button asChild className="bg-gradient-organic shadow-organic hover:shadow-warm">
            <Link to="/admin/packaging-labels">
              <Package className="h-4 w-4 mr-2" />
              Cetak Label Kemasan
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/farmer-identity-labels">
              <Printer className="h-4 w-4 mr-2" />
              Cetak Label Identitas
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/label-settings">
              <Settings className="h-4 w-4 mr-2" />
              Pengaturan Label Kemasan
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/identity-label-settings">
              <Settings className="h-4 w-4 mr-2" />
              Pengaturan Label Identitas
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Gunakan menu di atas untuk mencetak dan mengatur label produk serta label identitas petani.
        </p>
      </CardContent>
    </Card>
  );
};
