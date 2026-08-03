import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, hasAccess, roleHome, type AppRole } from "@/hooks/use-user-role";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Legacy prop: equivalent to allowedRoles={["admin"]} */
  requireAdmin?: boolean;
  /** Roles allowed on this route. Developer always passes. */
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const location = useLocation();

  const allowed: string[] = allowedRoles ?? (requireAdmin ? ["admin"] : ["admin"]);
  const permitted = hasAccess(roles, allowed);
  const busy = loading || rolesLoading;

  useEffect(() => {
    if (busy) return;
    const nextPath = location.pathname + location.search;
    if (!session || !user) {
      navigate("/login?next=" + encodeURIComponent(nextPath), { replace: true });
    }
  }, [busy, session, user, navigate, location.pathname, location.search]);

  if (busy) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-organic-green" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) return null;

  if (!permitted) {
    const home = roleHome(roles);
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold text-foreground">Akses ditolak</h1>
          <p className="text-sm text-muted-foreground">
            Peran akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi Developer
            untuk meminta akses.
          </p>
          <button
            onClick={() => navigate(home === location.pathname ? "/login" : home, { replace: true })}
            className="text-sm underline text-primary"
          >
            Kembali ke halaman utama saya
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
