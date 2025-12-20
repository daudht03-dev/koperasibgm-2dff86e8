import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Eye, EyeOff, ArrowLeft, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { authSchema } from "@/lib/validation-schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSkeleton } from "@/components/ui/skeleton-templates";
import { z } from "zod";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { signIn, signUp, user, isAdmin } = useAuth();
  const { profile, loading: profileLoading } = useCompanyProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-redirect if already logged in as admin
  useEffect(() => {
    if (user && isAdmin) {
      setIsRedirecting(true);
      navigate("/admin");
    }
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validationData = isLogin 
        ? { email, password }
        : { email, password, fullName };
      
      const result = authSchema.safeParse(validationData);
      
      if (!result.success) {
        const firstError = result.error.errors[0];
        toast({
          title: "Validasi Gagal",
          description: firstError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(result.data.email, result.data.password);
        if (error) {
          toast({
            title: "Error Login",
            description: error.message === "Invalid login credentials" 
              ? "Email atau password salah" 
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Berhasil",
            description: "Selamat datang di dashboard admin!",
          });
          // Show redirecting state and navigate
          setIsRedirecting(true);
          navigate("/admin");
        }
      } else {
        const { error } = await signUp(result.data.email, result.data.password, result.data.fullName || "");
        if (error) {
          toast({
            title: "Error Registrasi",
            description: error.message === "User already registered"
              ? "Email sudah terdaftar"
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registrasi Berhasil",
            description: "Silakan cek email untuk verifikasi akun Anda.",
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Terjadi Kesalahan",
        description: "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen when redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-organic-green" />
          <p className="text-lg font-medium text-foreground">Mengarahkan ke Dashboard...</p>
          <p className="text-sm text-muted-foreground">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-natural flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>

        <Card className="shadow-gentle border-border/50">
          <CardHeader className="text-center space-y-4">
            {/* Logo Section with Loading State */}
            <div className="relative">
              {profileLoading ? (
                <Skeleton className="w-16 h-16 rounded-full mx-auto" />
              ) : (
                <div className="bg-gradient-organic w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-organic overflow-hidden transition-all duration-300">
                  {profile?.logo_url ? (
                    <img 
                      src={profile.logo_url} 
                      alt={profile.nama_perusahaan}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Leaf className="h-8 w-8 text-primary-foreground" />
                  )}
                </div>
              )}
            </div>

            {/* Title & Description with Loading State */}
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-foreground">
                {isLogin ? "Login Admin" : "Daftar Admin"}
              </CardTitle>
              {profileLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : (
                <CardDescription className="text-muted-foreground transition-opacity duration-300">
                  {isLogin 
                    ? `Masuk ke dashboard admin ${profile?.nama_perusahaan || "Berkah Gendis Mandiri"}` 
                    : "Buat akun admin baru"
                  }
                </CardDescription>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="border-border/50 focus:border-organic-green"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@berkahgendis.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border/50 focus:border-organic-green"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password (minimal 8 karakter)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="border-border/50 focus:border-organic-green pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-organic shadow-organic hover:shadow-warm transition-all duration-300" 
                disabled={loading}
              >
                {loading ? "Memproses..." : isLogin ? "Login" : "Daftar"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-organic-green hover:text-organic-green-dark"
              >
                {isLogin 
                  ? "Belum punya akun? Daftar di sini" 
                  : "Sudah punya akun? Login di sini"
                }
              </Button>
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                asChild
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                <Link to="/install">
                  <Download className="h-3 w-3 mr-1" />
                  Install Aplikasi di HP
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {profileLoading ? (
            <Skeleton className="h-4 w-48 mx-auto" />
          ) : (
            <p className="transition-opacity duration-300">
              © {new Date().getFullYear()} {profile?.nama_perusahaan || "Berkah Gendis Mandiri"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;