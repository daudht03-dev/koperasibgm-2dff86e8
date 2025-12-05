import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Printer, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { PrintPreviewDialog } from "@/components/PrintPreviewDialog";
import { toast } from "sonner";

interface Farmer {
  id: string;
  nama: string;
  kode_petani: string;
  alamat: string | null;
  logo_url: string | null;
  status: string | null;
}

export default function PackagingLabels() {
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    try {
      const { data, error } = await supabase
        .from("petani")
        .select("id, nama, kode_petani, alamat, logo_url, status")
        .order("kode_petani", { ascending: true });

      if (error) throw error;
      setFarmers(data || []);
    } catch (error: any) {
      console.error("Error fetching farmers:", error);
      toast.error("Gagal memuat data petani");
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch =
      farmer.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farmer.kode_petani.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (farmer.alamat?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" || farmer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedFarmers.size === filteredFarmers.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(filteredFarmers.map((f) => f.id)));
    }
  };

  const toggleFarmer = (id: string) => {
    const newSelected = new Set(selectedFarmers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFarmers(newSelected);
  };

  const handlePrint = () => {
    if (selectedFarmers.size === 0) {
      toast.error("Pilih minimal satu petani untuk mencetak");
      return;
    }
    setShowPrintDialog(true);
  };

  // Prepare farmers data for print dialog
  const farmersForPrint = filteredFarmers
    .filter((f) => selectedFarmers.has(f.id))
    .map((f) => ({
      id: f.id,
      nama: f.nama,
      kode_petani: f.kode_petani,
      logo_url: f.logo_url || undefined,
      // Default certification values - can be enhanced later with actual data
      euCertified: true,
      corNopCertified: true,
      sniCertified: false,
      isOrganic: f.status === "aktif",
    }));

  return (
    <div className="container mx-auto py-6">
      <Button
        onClick={() => navigate("/admin")}
        variant="ghost"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali
      </Button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Cetak Label Kemasan
          </h1>
          <p className="text-muted-foreground">
            Pilih petani untuk mencetak label kemasan
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/label-settings")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Pengaturan Label
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau kode petani..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="tidak aktif">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Selection Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={
                  selectedFarmers.size === filteredFarmers.length &&
                  filteredFarmers.length > 0
                }
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="cursor-pointer">
                <span className="font-semibold">
                  {selectedFarmers.size} dari {filteredFarmers.length} petani
                  dipilih
                </span>
              </label>
            </div>
            <Button
              onClick={handlePrint}
              disabled={selectedFarmers.size === 0}
              className="bg-gradient-organic shadow-organic hover:shadow-warm"
            >
              <Printer className="h-4 w-4 mr-2" />
              Cetak {selectedFarmers.size} Label
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Farmers List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Petani</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat data petani...
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada petani yang ditemukan
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredFarmers.map((farmer) => (
                <div
                  key={farmer.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedFarmers.has(farmer.id)
                      ? "bg-primary/5 border-primary/30"
                      : "hover:bg-muted/50 border-border/50"
                  }`}
                  onClick={() => toggleFarmer(farmer.id)}
                >
                  <Checkbox
                    checked={selectedFarmers.has(farmer.id)}
                    onCheckedChange={() => toggleFarmer(farmer.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {farmer.logo_url && (
                    <img
                      src={farmer.logo_url}
                      alt={farmer.nama}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{farmer.nama}</p>
                    <p className="text-sm text-muted-foreground">
                      {farmer.kode_petani}
                      {farmer.alamat && ` • ${farmer.alamat}`}
                    </p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      farmer.status === "aktif"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {farmer.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Preview Dialog */}
      <PrintPreviewDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        farmers={farmersForPrint}
        companyName={profile?.nama_perusahaan}
        customColors={
          profile?.label_primary_color
            ? {
                primary: profile.label_primary_color,
                backgroundStart: profile.label_background_start || "40 100% 97%",
                backgroundEnd: profile.label_background_end || "33 100% 87%",
              }
            : undefined
        }
        customFont={profile?.label_font_family || undefined}
        customLogo={profile?.logo_url || undefined}
        qrSize={profile?.qr_size || 200}
        qrErrorCorrection={(profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H') || 'M'}
        qrLogo={profile?.qr_logo_url || undefined}
        qrLogoSize={profile?.qr_logo_size || 50}
      />
    </div>
  );
}
