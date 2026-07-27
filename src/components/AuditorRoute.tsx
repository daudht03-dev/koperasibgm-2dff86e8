import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";

interface AuditorRouteProps {
  children: React.ReactNode;
}

const AuditorRoute = ({ children }: AuditorRouteProps) => {
  const { user, session, loading } = useAuth();
  const { isAuditor, isAdmin, loading: roleLoading } = useUserRoles();
  const location = useLocation();

  // Log page view (fire-and-forget) whenever route changes
  useEffect(() => {
    if (session && (isAuditor || isAdmin)) {
      supabase.functions
        .invoke("log-auditor-access", {
          body: { path: location.pathname + location.search, event: "page_view" },
        })
        .catch(() => {});
    }
  }, [location.pathname, location.search, session, isAuditor, isAdmin]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to={`/auditor/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isAuditor && !isAdmin) {
    return <Navigate to="/auditor/login" replace />;
  }

  return <>{children}</>;
};

export default AuditorRoute;
