import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Camera, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

const QRScanner = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError("Gagal mengakses kamera. Pastikan Anda memberikan izin kamera.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const onScanSuccess = (decodedText: string) => {
    console.log("QR Code scanned:", decodedText);
    
    // Extract farmer ID from URL
    const urlMatch = decodedText.match(/profil-petani\/([a-zA-Z0-9-]+)/);
    
    if (urlMatch && urlMatch[1]) {
      const farmerId = urlMatch[1];
      stopScanner();
      toast({
        title: "QR Code Berhasil Di-scan",
        description: "Membuka profil petani...",
      });
      navigate(`/profil-petani/${farmerId}`);
    } else {
      toast({
        title: "QR Code Tidak Valid",
        description: "QR code ini bukan untuk profil petani",
        variant: "destructive",
      });
    }
  };

  const onScanError = (error: string) => {
    // Ignore common scanning errors
    if (!error.includes("NotFoundException")) {
      console.error("Scan error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>

        <Card className="shadow-gentle border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-6 w-6 text-organic-green" />
              Scan QR Code Petani
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div 
              id="qr-reader" 
              className="w-full rounded-lg overflow-hidden bg-black/5"
              style={{ minHeight: isScanning ? "auto" : "300px" }}
            />

            <div className="flex flex-col gap-3">
              {!isScanning ? (
                <Button
                  onClick={startScanner}
                  className="w-full bg-gradient-organic text-primary-foreground hover:opacity-90"
                  size="lg"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Mulai Scan
                </Button>
              ) : (
                <Button
                  onClick={stopScanner}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Berhenti Scan
                </Button>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Arahkan kamera ke QR code pada kartu petani. Data petani akan disimpan secara offline setelah berhasil di-scan.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default QRScanner;
