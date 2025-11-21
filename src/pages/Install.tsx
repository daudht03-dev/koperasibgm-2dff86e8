import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-natural flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Link>
          </Button>
        </div>

        <Card className="shadow-gentle border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="bg-gradient-organic w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-organic">
              <Smartphone className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Install Aplikasi
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Install Berkah Gendis Mandiri di perangkat Anda
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isInstalled ? (
              <div className="text-center space-y-4">
                <div className="bg-organic-green/10 p-6 rounded-lg">
                  <CheckCircle className="h-12 w-12 text-organic-green mx-auto mb-3" />
                  <p className="font-semibold text-foreground">Aplikasi Sudah Terinstal!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Aplikasi sudah terinstal di perangkat Anda
                  </p>
                </div>
                <Button asChild className="w-full bg-gradient-organic shadow-organic">
                  <Link to="/login">Buka Aplikasi</Link>
                </Button>
              </div>
            ) : (
              <>
                {deferredPrompt && !isIOS ? (
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-4">
                        Install aplikasi untuk akses cepat dan pengalaman yang lebih baik:
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-organic-green mt-0.5 flex-shrink-0" />
                          <span>Akses langsung dari home screen</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-organic-green mt-0.5 flex-shrink-0" />
                          <span>Bekerja offline</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-organic-green mt-0.5 flex-shrink-0" />
                          <span>Loading lebih cepat</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-organic-green mt-0.5 flex-shrink-0" />
                          <span>Splash screen dengan haptic feedback</span>
                        </li>
                      </ul>
                    </div>
                    
                    <Button 
                      onClick={handleInstallClick} 
                      className="w-full bg-gradient-organic shadow-organic hover:shadow-warm transition-all duration-300"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Install Aplikasi
                    </Button>
                  </div>
                ) : isIOS ? (
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="font-semibold text-foreground mb-3">
                        Cara Install di iPhone/iPad:
                      </p>
                      <ol className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex gap-2">
                          <span className="font-semibold text-foreground">1.</span>
                          <span>Tap tombol Share (kotak dengan panah ke atas) di browser Safari</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-foreground">2.</span>
                          <span>Scroll ke bawah dan pilih "Add to Home Screen"</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-foreground">3.</span>
                          <span>Tap "Add" di pojok kanan atas</span>
                        </li>
                      </ol>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        Catatan: Pastikan Anda menggunakan browser Safari
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="font-semibold text-foreground mb-3">
                        Cara Install di Android:
                      </p>
                      <ol className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex gap-2">
                          <span className="font-semibold text-foreground">1.</span>
                          <span>Tap menu (tiga titik) di browser</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-foreground">2.</span>
                          <span>Pilih "Install app" atau "Add to Home screen"</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-foreground">3.</span>
                          <span>Ikuti instruksi untuk menyelesaikan instalasi</span>
                        </li>
                      </ol>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        Tombol install akan muncul jika browser Anda mendukung PWA
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Berkah Gendis Mandiri</p>
        </div>
      </div>
    </div>
  );
};

export default Install;
