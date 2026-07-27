import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-role";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const AuditorLogin = () => {
  const { signIn, user } = useAuth();
  const { isAuditor, isAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get("next") || "/auditor/map";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/auditor/map";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !rolesLoading && (isAuditor || isAdmin)) {
      navigate(nextPath, { replace: true });
    }
  }, [user, isAuditor, isAdmin, rolesLoading, nextPath, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({
        title: "Login gagal",
        description: error.message === "Invalid login credentials" ? "Email atau password salah" : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Login berhasil", description: "Membuka peta audit..." });
    // navigation happens via effect once roles load
  };

  return (
    <div className="min-h-screen bg-gradient-natural flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-gentle">
        <CardHeader className="text-center">
          <div className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <CardTitle>Portal Auditor</CardTitle>
          <CardDescription>Akses peta lahan untuk keperluan audit eksternal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Akun auditor dibuat oleh admin. Butuh akses?{" "}
            <Link to="/login" className="underline">Login admin</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditorLogin;
