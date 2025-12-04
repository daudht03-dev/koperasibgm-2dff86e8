import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings, Printer } from "lucide-react";

export const LabelManagement = () => {
  return (
    <Card className="shadow-gentle border-border/50">
      <CardHeader>
        <CardTitle>Manajemen Label</CardTitle>
        <CardDescription>Kelola dan cetak label untuk petani</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="bg-gradient-organic shadow-organic hover:shadow-warm">
            <Link to="/admin/label-settings">
              <Settings className="h-4 w-4 mr-2" />
              Pengaturan Label Produk
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/identity-label-settings">
              <Printer className="h-4 w-4 mr-2" />
              Pengaturan Label Identitas
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/farmer-identity-labels">
              <Printer className="h-4 w-4 mr-2" />
              Cetak Label Identitas
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Gunakan menu di atas untuk mengatur dan mencetak label produk serta label identitas petani.
        </p>
      </CardContent>
    </Card>
  );
};
