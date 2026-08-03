// Developer-only user & role management.
// Actions: list, create, set_roles, reset_password, delete
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = ["developer", "admin", "auditor", "pengawas", "staf_lapang", "user"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const caller = userRes?.user;
    if (!caller) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: devRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "developer")
      .maybeSingle();
    if (!devRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "list") {
      const { data: usersRes, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listErr) throw listErr;

      const { data: roleRows } = await admin.from("user_roles").select("user_id, role");
      const rolesByUser: Record<string, string[]> = {};
      for (const r of roleRows || []) {
        (rolesByUser[(r as any).user_id] ||= []).push((r as any).role);
      }

      const users = (usersRes?.users || []).map((u: any) => ({
        user_id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        provider: u.app_metadata?.provider || "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: rolesByUser[u.id] || [],
      }));
      return json({ users });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const fullName = String(body.full_name || "").trim();
      const roles: string[] = Array.isArray(body.roles) ? body.roles : [];
      if (!email || password.length < 8) {
        return json({ error: "Email dan password (min 8 karakter) wajib diisi" }, 400);
      }
      if (roles.some((r) => !VALID_ROLES.includes(r))) return json({ error: "Peran tidak valid" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
      if (createErr) return json({ error: createErr.message }, 400);
      const uid = created.user!.id;

      if (roles.length) {
        const { error: roleErr } = await admin
          .from("user_roles")
          .insert(roles.map((role) => ({ user_id: uid, role })));
        if (roleErr) {
          await admin.auth.admin.deleteUser(uid);
          return json({ error: roleErr.message }, 400);
        }
      }
      return json({ ok: true, user_id: uid });
    }

    if (action === "set_roles") {
      const userId = String(body.user_id || "");
      const roles: string[] = Array.isArray(body.roles) ? body.roles : [];
      if (!userId) return json({ error: "user_id wajib diisi" }, 400);
      if (roles.some((r) => !VALID_ROLES.includes(r))) return json({ error: "Peran tidak valid" }, 400);
      if (userId === caller.id && !roles.includes("developer")) {
        return json({ error: "Tidak dapat mencabut peran Developer dari akun Anda sendiri" }, 400);
      }
      await admin.from("user_roles").delete().eq("user_id", userId);
      if (roles.length) {
        const { error } = await admin
          .from("user_roles")
          .insert(roles.map((role) => ({ user_id: userId, role })));
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const userId = String(body.user_id || "");
      const password = String(body.password || "");
      if (!userId || password.length < 8) return json({ error: "user_id dan password baru wajib" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const userId = String(body.user_id || "");
      if (!userId) return json({ error: "user_id wajib diisi" }, 400);
      if (userId === caller.id) return json({ error: "Tidak dapat menghapus akun sendiri" }, 400);
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("manage-users error", err);
    return json({ error: String((err as Error).message || err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
