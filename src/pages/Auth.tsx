import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Eye, EyeOff, ArrowLeft, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-role";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { roles, loading: rolesLoading, home } = useUserRoles();
  const { profile, loading: profileLoading } = useCompanyProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Only allow same-origin relative paths for `next`.
  const rawNext = searchParams.get("next") ?? "";
  const explicitNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const nextPath = explicitNext ?? home;

  // Auto-redirect once the signed-in user's roles are known
  useEffect(() => {
    if (!user || rolesLoading) return;
    if (roles.length === 0) return; // no role assigned yet
    setIsRedirecting(true);
    navigate(nextPath, { replace: true });
  }, [user, roles, rolesLoading, navigate, nextPath]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error, redirected } = await signInWithGoogle();
      if (redirected) return;
      if (error) {
        toast({
          title: "Login Google gagal",
          description: (error as any)?.message || String(error),
          variant: "destructive",
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };


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
            description: "Mengarahkan sesuai peran akun Anda...",
          });
          if (explicitNext) {
            setIsRedirecting(true);
            navigate(explicitNext, { replace: true });
          }

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
                disabled={loading || googleLoading}
              >
                {loading ? "Memproses..." : isLogin ? "Login" : "Daftar"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">atau</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z" />
                </svg>
              )}
              Masuk dengan Google
            </Button>


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