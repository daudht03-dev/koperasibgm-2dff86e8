import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, roleHome } from "@/hooks/use-user-role";

/** Sends each signed-in user to the dashboard that matches their role. */
const RoleLanding = () => {
  const { user, loading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-organic-green" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={roleHome(roles)} replace />;
};

export default RoleLanding;
