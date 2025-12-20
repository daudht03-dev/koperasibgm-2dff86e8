import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share, Copy, CheckCircle, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { useCompanyProfile } from "@/hooks/use-company-profile";

interface QRPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmerId: string;
  farmerName: string;
  farmerCode: string;
}

export const QRPreviewDialog = ({ 
  open, 
  onOpenChange, 
  farmerId, 
  farmerName, 
  farmerCode 
}: QRPreviewDialogProps) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { profile } = useCompanyProfile();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && farmerId) {
      generateQRWithLogo();
    }
  }, [open, farmerId, profile?.production_url, profile?.qr_logo_url]);

  const generateQRWithLogo = async () => {
    setLoading(true);
    try {
      let baseUrl = window.location.origin;
      if (profile?.production_url) {
        baseUrl = profile.production_url.replace(/\/$/, '');
      }
      
      const farmerUrl = `${baseUrl}/profil-petani/${farmerId}`;
      
      // Generate QR code with higher error correction for logo support
      const qrDataURL = await QRCode.toDataURL(farmerUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1a5d3a",
          light: "#ffffff"
        },
        errorCorrectionLevel: profile?.qr_logo_url ? "H" : (profile?.qr_error_correction as any || "M")
      });
      
      // If there's a logo, embed it in the center
      if (profile?.qr_logo_url) {
        const qrWithLogo = await embedLogoInQR(qrDataURL, profile.qr_logo_url, profile.qr_logo_size || 50);
        setQrCodeDataURL(qrWithLogo);
      } else {
        setQrCodeDataURL(qrDataURL);
      }
    } catch (error) {
      console.error("Error generating QR:", error);
      toast({
        title: "Gagal Generate QR",
        description: "Tidak dapat membuat QR code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const embedLogoInQR = (qrDataURL: string, logoUrl: string, logoSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
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
          // Calculate logo position (center of QR)
          const logoSizePx = (logoSize / 100) * qrImg.width * 0.8; // Max 80% of specified size
          const logoX = (qrImg.width - logoSizePx) / 2;
          const logoY = (qrImg.height - logoSizePx) / 2;

          // Draw white background circle for logo
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(qrImg.width / 2, qrImg.height / 2, logoSizePx / 2 + 8, 0, Math.PI * 2);
          ctx.fill();

          // Draw logo
          ctx.drawImage(logoImg, logoX, logoY, logoSizePx, logoSizePx);

          resolve(canvas.toDataURL());
        };
        logoImg.onerror = () => {
          console.warn("Failed to load logo, using QR without logo");
          resolve(qrDataURL);
        };
        logoImg.src = logoUrl;
      };
      qrImg.onerror = reject;
      qrImg.src = qrDataURL;
    });
  };

  const handleDownload = () => {
    if (!qrCodeDataURL) return;

    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 600;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const qrImg = new Image();
    qrImg.onload = () => {
      const qrSize = 300;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 100;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = "#1a5d3a";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(profile?.nama_perusahaan || "Berkah Gendis Mandiri", canvas.width / 2, 40);

      ctx.fillStyle = "#333333";
      ctx.font = "18px Arial";
      ctx.fillText(farmerName, canvas.width / 2, 450);
      
      ctx.font = "14px Arial";
      ctx.fillStyle = "#666666";
      ctx.fillText(farmerCode, canvas.width / 2, 470);
      ctx.fillText("Scan untuk melihat detail profil", canvas.width / 2, 520);

      const link = document.createElement("a");
      link.download = `QR-${farmerCode}-${farmerName.replace(/[^a-z0-9]/gi, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "QR Code Berhasil Diunduh",
        description: "File telah disimpan ke device Anda",
      });
    };
    qrImg.src = qrCodeDataURL;
  };

  const handleCopyLink = async () => {
    let baseUrl = window.location.origin;
    if (profile?.production_url) {
      baseUrl = profile.production_url.replace(/\/$/, '');
    }
    const farmerUrl = `${baseUrl}/profil-petani/${farmerId}`;
    
    try {
      await navigator.clipboard.writeText(farmerUrl);
      setCopied(true);
      toast({
        title: "Link Berhasil Disalin",
        description: "Link profil petani telah disalin ke clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Gagal Menyalin Link",
        description: "Terjadi kesalahan saat menyalin link",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    let baseUrl = window.location.origin;
    if (profile?.production_url) {
      baseUrl = profile.production_url.replace(/\/$/, '');
    }
    const farmerUrl = `${baseUrl}/profil-petani/${farmerId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${farmerName} - Petani Mitra ${profile?.nama_perusahaan || "Berkah Gendis Mandiri"}`,
          text: `Lihat profil lengkap petani ${farmerName} (${farmerCode})`,
          url: farmerUrl,
        });
      } catch (error) {
        console.log("Share cancelled or failed");
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preview QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="font-semibold text-foreground">{farmerName}</p>
            <p className="text-sm text-muted-foreground">{farmerCode}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-organic-green" />
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-xl shadow-gentle mx-auto w-fit">
                {qrCodeDataURL && (
                  <img 
                    src={qrCodeDataURL} 
                    alt={`QR Code untuk ${farmerName}`}
                    className="w-48 h-48"
                  />
                )}
              </div>

              {profile?.qr_logo_url && (
                <p className="text-xs text-muted-foreground text-center">
                  QR Code dengan logo perusahaan
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                <Button 
                  onClick={handleDownload}
                  size="sm"
                  className="bg-gradient-organic"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Unduh
                </Button>
                
                <Button 
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                >
                  <Share className="h-4 w-4 mr-1" />
                  Bagikan
                </Button>
                
                <Button 
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1 text-organic-green" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Salin
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};
