import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole =
  | "developer"
  | "admin"
  | "auditor"
  | "pengawas"
  | "staf_lapang"
  | "moderator"
  | "user";

export const ROLE_LABELS: Record<string, string> = {
  developer: "Developer",
  admin: "Admin",
  auditor: "Auditor",
  pengawas: "Pengawas",
  staf_lapang: "Staf Lapang",
  moderator: "Moderator",
  user: "User",
};

export const ASSIGNABLE_ROLES: AppRole[] = [
  "developer",
  "admin",
  "auditor",
  "pengawas",
  "staf_lapang",
];

/** Landing page per role, ordered by priority. */
export const roleHome = (roles: string[]): string => {
  if (roles.includes("developer") || roles.includes("admin")) return "/admin";
  if (roles.includes("staf_lapang") || roles.includes("pengawas")) return "/admin";
  if (roles.includes("auditor")) return "/auditor/map";
  return "/login";
};

/** Developer bypasses every restriction. */
export const hasAccess = (roles: string[], allowed: readonly string[]) =>
  roles.includes("developer") || allowed.some((r) => roles.includes(r));

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

  const isDeveloper = roles.includes("developer");

  return {
    roles,
    loading: loading || authLoading,
    isDeveloper,
    isAdmin: isDeveloper || roles.includes("admin"),
    isAuditor: roles.includes("auditor"),
    isPengawas: roles.includes("pengawas"),
    isStafLapang: roles.includes("staf_lapang"),
    /** Can edit farmer/land data & capture coordinates. */
    canEditField: hasAccess(roles, ["admin", "staf_lapang"]),
    /** Can see farmers / lands / map. */
    canViewField: hasAccess(roles, ["admin", "staf_lapang", "pengawas"]),
    can: (allowed: readonly string[]) => hasAccess(roles, allowed),
    home: roleHome(roles),
  };
};
