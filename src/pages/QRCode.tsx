import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share, Copy, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";

interface Petani {
  id: string;
  kode_petani: string;
  nama: string;
  alamat: string;
}

const QRCodePage = () => {
  const { id } = useParams<{ id: string }>();
  const [petani, setPetani] = useState<Petani | null>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchPetaniAndGenerateQR(id);
    }
  }, [id]);

  const fetchPetaniAndGenerateQR = async (petaniId: string) => {
    try {
      const { data, error } = await supabase
        .from("petani")
        .select("id, kode_petani, nama, alamat")
        .eq("id", petaniId)
        .single();

      if (error) throw error;

      setPetani(data);
      
      // Generate QR Code that points to public profile
      const farmerUrl = `${window.location.origin}/profil-petani/${data.id}`;
      const qrDataURL = await QRCode.toDataURL(farmerUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#1a5d3a", // organic-green-dark
          light: "#ffffff"
        },
        errorCorrectionLevel: "M"
      });
      
      setQrCodeDataURL(qrDataURL);
    } catch (error: any) {
      console.error("Error fetching petani or generating QR:", error);
      setError("Gagal memuat data petani atau generate QR Code");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataURL || !petani) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 500;
    canvas.height = 600;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and draw QR code
    const qrImg = new Image();
    qrImg.onload = () => {
      // Draw QR code centered
      const qrSize = 300;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 100;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Draw header
      ctx.fillStyle = "#1a5d3a";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Berkah Gendis Official", canvas.width / 2, 40);

      // Draw farmer info
      ctx.fillStyle = "#333333";
      ctx.font = "18px Arial";
      ctx.fillText(petani.nama, canvas.width / 2, 450);
      
      ctx.font = "14px Arial";
      ctx.fillStyle = "#666666";
      ctx.fillText(petani.kode_petani, canvas.width / 2, 470);
      ctx.fillText("Scan untuk melihat detail profil", canvas.width / 2, 520);

      // Download
      const link = document.createElement("a");
      link.download = `QR-${petani.kode_petani}-${petani.nama}.png`;
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
    if (!petani) return;

    const farmerUrl = `${window.location.origin}/profil-petani/${petani.id}`;
    
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
    if (!petani) return;

    const farmerUrl = `${window.location.origin}/profil-petani/${petani.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${petani.nama} - Petani Mitra Berkah Gendis Official`,
          text: `Lihat profil lengkap petani ${petani.nama} (${petani.kode_petani})`,
          url: farmerUrl,
        });
      } catch (error) {
        console.log("Share cancelled or failed");
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-muted-foreground">Generating QR Code...</div>
        </div>
      </div>
    );
  }

  if (error || !petani) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">QR Code Tidak Dapat Dibuat</h1>
          <p className="text-muted-foreground mb-8">{error || "Data petani tidak tersedia"}</p>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-natural">
      <div className="max-w-2xl mx-auto px-4 py-8">
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
              QR Code Petani
            </h1>
            <p className="text-muted-foreground">
              Scan QR Code untuk membuka profil {petani.nama}
            </p>
          </div>
        </div>

        {/* QR Code Card */}
        <Card className="shadow-gentle border-border/50 bg-card/90 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">
              {petani.nama}
            </CardTitle>
            <p className="text-muted-foreground">{petani.kode_petani}</p>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            {/* QR Code Display */}
            <div className="bg-white p-6 rounded-xl shadow-gentle inline-block">
              {qrCodeDataURL && (
                <img 
                  src={qrCodeDataURL} 
                  alt={`QR Code untuk ${petani.nama}`}
                  className="w-64 h-64 mx-auto"
                />
              )}
            </div>
            
            <div className="text-sm text-muted-foreground max-w-sm mx-auto">
              <p className="mb-2">Alamat: {petani.alamat}</p>
              <p>Scan QR Code ini untuk membuka profil lengkap petani di website</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button 
                onClick={handleDownload}
                className="bg-gradient-organic shadow-organic hover:shadow-warm transition-all duration-300"
              >
                <Download className="mr-2 h-4 w-4" />
                Unduh
              </Button>
              
              <Button 
                onClick={handleShare}
                variant="outline"
                className="border-organic-green/30 hover:bg-organic-green/5"
              >
                <Share className="mr-2 h-4 w-4" />
                Bagikan
              </Button>
              
              <Button 
                onClick={handleCopyLink}
                variant="outline"
                className="border-organic-amber/30 hover:bg-organic-amber/5"
              >
                {copied ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-organic-green" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Salin Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="mt-6 shadow-gentle border-border/50 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Cara Menggunakan QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-3">
              <div className="bg-organic-green text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </div>
              <p>Unduh QR Code dengan klik tombol "Unduh"</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-organic-amber text-organic-brown w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </div>
              <p>Cetak atau tampilkan QR Code di tempat yang mudah diakses</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-organic-brown text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </div>
              <p>Scan QR Code dengan smartphone untuk membuka profil petani</p>
            </div>
          </CardContent>
        </Card>

        {/* Hidden canvas for download */}
        <canvas 
          ref={canvasRef} 
          style={{ display: 'none' }}
          width={500}
          height={600}
        />
      </div>
    </div>
  );
};

export default QRCodePage;