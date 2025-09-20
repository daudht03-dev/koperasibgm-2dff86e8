import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!session || !user) {
        navigate("/login");
        return;
      }

      // If admin role is required, check role from profiles table
      if (requireAdmin) {
        // For now, we'll assume any authenticated user is admin
        // You can later add role checking from profiles table
      }
    }
  }, [user, session, loading, navigate, requireAdmin]);

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