import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import JSZip from "jszip";

interface Farmer {
  id: string;
  kode_petani: string;
  nama: string;
}

interface DownloadAllQRCodesProps {
  farmers: Farmer[];
}

export const DownloadAllQRCodes = ({ farmers }: DownloadAllQRCodesProps) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFarmer, setCurrentFarmer] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useCompanyProfile();

  const embedLogoInQR = (qrDataURL: string, logoUrl: string, logoSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(qrDataURL);
        return;
      }

      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.onload = () => {
        canvas.width = qrImg.width;
        canvas.height = qrImg.height;
        ctx.drawImage(qrImg, 0, 0);

        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => {
          const logoSizePx = (logoSize / 100) * qrImg.width * 0.8;
          const logoX = (qrImg.width - logoSizePx) / 2;
          const logoY = (qrImg.height - logoSizePx) / 2;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(qrImg.width / 2, qrImg.height / 2, logoSizePx / 2 + 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(logoImg, logoX, logoY, logoSizePx, logoSizePx);
          resolve(canvas.toDataURL());
        };
        logoImg.onerror = () => resolve(qrDataURL);
        logoImg.src = logoUrl;
      };
      qrImg.onerror = () => resolve(qrDataURL);
      qrImg.src = qrDataURL;
    });
  };

  const generateFarmerQRCanvas = async (farmer: Farmer): Promise<Blob | null> => {
    try {
      let baseUrl = window.location.origin;
      if (profile?.production_url) {
        baseUrl = profile.production_url.replace(/\/$/, '');
      }
      
      const farmerUrl = `${baseUrl}/profil-petani/${farmer.id}`;
      
      // Generate QR code
      let qrDataURL = await QRCode.toDataURL(farmerUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#1a5d3a",
          light: "#ffffff"
        },
        errorCorrectionLevel: profile?.qr_logo_url ? "H" : (profile?.qr_error_correction as any || "M")
      });

      // Embed logo if exists
      if (profile?.qr_logo_url) {
        qrDataURL = await embedLogoInQR(qrDataURL, profile.qr_logo_url, profile?.qr_logo_size || 50);
      }

      // Create final canvas with farmer info
      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 600;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load and draw QR
      await new Promise<void>((resolve, reject) => {
        const qrImg = new Image();
        qrImg.onload = () => {
          const qrSize = 300;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = 100;
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve();
        };
        qrImg.onerror = reject;
        qrImg.src = qrDataURL;
      });

      // Draw header
      ctx.fillStyle = "#1a5d3a";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(profile?.nama_perusahaan || "Berkah Gendis Mandiri", canvas.width / 2, 40);

      // Draw farmer info
      ctx.fillStyle = "#333333";
      ctx.font = "18px Arial";
      ctx.fillText(farmer.nama, canvas.width / 2, 450);
      
      ctx.font = "14px Arial";
      ctx.fillStyle = "#666666";
      ctx.fillText(farmer.kode_petani, canvas.width / 2, 470);
      ctx.fillText("Scan untuk melihat detail profil", canvas.width / 2, 520);

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (error) {
      console.error(`Error generating QR for ${farmer.nama}:`, error);
      return null;
    }
  };

  const handleDownloadAll = async () => {
    if (farmers.length === 0) {
      toast({
        title: "Tidak ada petani",
        description: "Belum ada data petani untuk diunduh",
        variant: "destructive",
      });
      return;
    }

    setDownloading(true);
    setDialogOpen(true);
    setCompleted(false);
    setError(null);
    setProgress(0);

    try {
      const zip = new JSZip();
      let successCount = 0;

      for (let i = 0; i < farmers.length; i++) {
        const farmer = farmers[i];
        setCurrentFarmer(farmer.nama);
        setProgress(Math.round(((i + 1) / farmers.length) * 100));

        const blob = await generateFarmerQRCanvas(farmer);
        if (blob) {
          const fileName = `QR-${farmer.kode_petani}-${farmer.nama.replace(/[^a-z0-9]/gi, '_')}.png`;
          zip.file(fileName, blob);
          successCount++;
        }
      }

      if (successCount > 0) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = `QR-Codes-Semua-Petani-${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);

        setCompleted(true);
        toast({
          title: "Download Berhasil",
          description: `${successCount} QR code berhasil diunduh`,
        });
      } else {
        setError("Tidak ada QR code yang berhasil dibuat");
      }
    } catch (error) {
      console.error("Error downloading QR codes:", error);
      setError("Terjadi kesalahan saat mengunduh QR codes");
      toast({
        title: "Download Gagal",
        description: "Terjadi kesalahan saat mengunduh QR codes",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleDownloadAll}
        disabled={downloading}
        className="border-organic-amber/30"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download Semua QR
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {completed ? "Download Selesai" : error ? "Download Gagal" : "Mengunduh QR Codes..."}
            </DialogTitle>
            <DialogDescription>
              {completed 
                ? `${farmers.length} QR code berhasil diunduh dalam file ZIP` 
                : error 
                  ? error 
                  : `Sedang memproses ${farmers.length} petani`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!completed && !error && (
              <>
                <Progress value={progress} className="w-full" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {currentFarmer ? `Memproses: ${currentFarmer}` : "Mempersiapkan..."}
                  </p>
                  <p className="text-lg font-semibold">{progress}%</p>
                </div>
              </>
            )}

            {completed && (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-12 w-12 text-organic-green" />
                <p className="text-sm text-muted-foreground">
                  File ZIP telah diunduh ke perangkat Anda
                </p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          {(completed || error) && (
            <div className="flex justify-end">
              <Button onClick={() => setDialogOpen(false)}>
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
