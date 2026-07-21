import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, session, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      const nextPath = location.pathname + location.search;
      const nextParam = "?next=" + encodeURIComponent(nextPath);
      if (!session || !user) {
        navigate("/login" + nextParam);
        return;
      }

      // Check admin role from database
      if (requireAdmin && !isAdmin) {
        navigate("/login" + nextParam);
        return;
      }
    }
  }, [user, session, loading, isAdmin, navigate, requireAdmin, location.pathname, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-organic-green" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;