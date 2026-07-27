import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "admin" | "auditor" | "user";

export const useUserRoles = () => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) {
        if (!cancelled) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!cancelled) {
        setRoles(((data || []) as any[]).map((r) => r.role as AppRole));
        setLoading(false);
      }
    };
    if (!authLoading) run();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    roles,
    loading: loading || authLoading,
    isAdmin: roles.includes("admin"),
    isAuditor: roles.includes("auditor"),
  };
};
