import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Download, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import JSZip from "jszip";
import { useToast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Input } from "@/components/ui/input";

interface Petani {
  id: string;
  kode_petani: string;
  nama: string;
  alamat: string;
}

const BatchQRCode = () => {
  const [petaniList, setPetaniList] = useState<Petani[]>([]);
  const [selectedPetani, setSelectedPetani] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { profile } = useCompanyProfile();

  useEffect(() => {
    fetchAllPetani();
  }, []);

  const fetchAllPetani = async () => {
    try {
      const { data, error } = await supabase
        .from("petani")
        .select("id, kode_petani, nama, alamat")
        .order("kode_petani", { ascending: true });

      if (error) throw error;
      setPetaniList(data || []);
    } catch (error: any) {
      console.error("Error fetching petani:", error);
      toast({
        title: "Gagal Memuat Data",
        description: "Tidak dapat memuat daftar petani",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPetani.size === filteredPetani.length) {
      setSelectedPetani(new Set());
    } else {
      setSelectedPetani(new Set(filteredPetani.map(p => p.id)));
    }
  };

  const togglePetani = (id: string) => {
    const newSelected = new Set(selectedPetani);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPetani(newSelected);
  };

  const generateQRCodeCanvas = async (petani: Petani): Promise<Blob> => {
    // Get production URL from company profile
    let baseUrl = window.location.origin;
    if (profile?.production_url) {
      baseUrl = profile.production_url.replace(/\/$/, '');
    }
    
    const farmerUrl = `${baseUrl}/profil-petani/${petani.id}`;
    
    // Generate QR code
    const qrDataURL = await QRCode.toDataURL(farmerUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#1a5d3a",
        light: "#ffffff"
      },
      errorCorrectionLevel: profile?.qr_error_correction as any || "M"
    });

    // Create canvas with farmer info
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 600;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get canvas context");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and draw QR code
    const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = qrDataURL;
    });

    const qrSize = 300;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = 100;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Draw header
    ctx.fillStyle = "#1a5d3a";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(profile?.nama_perusahaan || "Berkah Gendis Mandiri", canvas.width / 2, 40);

    // Draw farmer info
    ctx.fillStyle = "#333333";
    ctx.font = "18px Arial";
    ctx.fillText(petani.nama, canvas.width / 2, 450);
    
    ctx.font = "14px Arial";
    ctx.fillStyle = "#666666";
    ctx.fillText(petani.kode_petani, canvas.width / 2, 470);
    ctx.fillText("Scan untuk melihat detail profil", canvas.width / 2, 520);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    });
  };

  const handleBatchGenerate = async () => {
    if (selectedPetani.size === 0) {
      toast({
        title: "Tidak Ada Petani Dipilih",
        description: "Pilih minimal satu petani untuk generate QR code",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.production_url) {
      toast({
        title: "URL Production Belum Diatur",
        description: "Silakan atur URL Production di Pengaturan Label terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      const zip = new JSZip();
      const selectedList = petaniList.filter(p => selectedPetani.has(p.id));
      
      // Generate QR codes with progress
      for (let i = 0; i < selectedList.length; i++) {
        const petani = selectedList[i];
        
        toast({
          title: `Generating ${i + 1}/${selectedList.length}`,
          description: `Processing ${petani.nama}...`,
        });

        const blob = await generateQRCodeCanvas(petani);
        const filename = `QR-${petani.kode_petani}-${petani.nama.replace(/[^a-z0-9]/gi, '_')}.png`;
        zip.file(filename, blob);
      }

      // Generate ZIP file
      toast({
        title: "Membuat File ZIP",
        description: "Mengompres semua QR code...",
      });

      const content = await zip.generateAsync({ type: "blob" });
      
      // Download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `QR-Codes-Batch-${new Date().toISOString().split('T')[0]}.zip`;
      link.click();

      toast({
        title: "Berhasil!",
        description: `${selectedList.length} QR code berhasil di-generate dan diunduh`,
      });

      // Reset selection
      setSelectedPetani(new Set());
    } catch (error: any) {
      console.error("Error generating batch QR codes:", error);
      toast({
        title: "Gagal Generate QR Code",
        description: error.message || "Terjadi kesalahan saat generate QR code",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const filteredPetani = petaniList.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.kode_petani.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.alamat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-organic-green" />
          <p className="text-muted-foreground">Memuat data petani...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-natural">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Batch Generate QR Code
            </h1>
            <p className="text-muted-foreground">
              Generate QR code untuk multiple petani sekaligus
            </p>
          </div>
        </div>

        {/* Warning if production URL not set */}
        {!profile?.production_url ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>URL Production Belum Diatur</AlertTitle>
            <AlertDescription>
              QR Code akan mengarah ke URL preview yang memerlukan login. 
              Silakan atur <strong>URL Production</strong> di{" "}
              <Link to="/admin/label-settings" className="underline font-semibold">
                Pengaturan Label
              </Link>{" "}
              agar QR code dapat diakses publik tanpa login.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-organic-green/30 bg-organic-green/5">
            <CheckCircle className="h-4 w-4 text-organic-green" />
            <AlertTitle className="text-organic-green">Siap Generate QR Code</AlertTitle>
            <AlertDescription>
              QR code akan mengarah ke: <strong>{profile.production_url}/profil-petani/[id]</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Selection Info & Actions */}
        <Card className="mb-6 shadow-gentle border-border/50 bg-card/90 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {selectedPetani.size} petani dipilih
                </p>
                <p className="text-sm text-muted-foreground">
                  dari {filteredPetani.length} total petani
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={toggleSelectAll}
                  variant="outline"
                  className="border-organic-green/30"
                >
                  {selectedPetani.size === filteredPetani.length ? "Batal Pilih Semua" : "Pilih Semua"}
                </Button>
                
                <Button
                  onClick={handleBatchGenerate}
                  disabled={selectedPetani.size === 0 || generating}
                  className="bg-gradient-organic shadow-organic hover:shadow-warm transition-all duration-300"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download ZIP ({selectedPetani.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Cari petani berdasarkan nama, kode, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Petani List */}
        <Card className="shadow-gentle border-border/50 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle>Daftar Petani</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredPetani.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Tidak ada petani yang ditemukan
                </p>
              ) : (
                filteredPetani.map((petani) => (
                  <div
                    key={petani.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-organic-green/5 transition-colors border border-border/30"
                  >
                    <Checkbox
                      checked={selectedPetani.has(petani.id)}
                      onCheckedChange={() => togglePetani(petani.id)}
                      id={petani.id}
                    />
                    <label
                      htmlFor={petani.id}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-semibold text-foreground">
                        {petani.nama}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {petani.kode_petani} • {petani.alamat}
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BatchQRCode;
