// Admin-only management of auditor accounts.
// Actions: list, create, reset_password, delete
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "unauthorized" }, 401);
    }

    // Verify caller is admin
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const caller = userRes?.user;
    if (!caller) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data: roles, error: rolesErr } = await admin
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "auditor");
      if (rolesErr) throw rolesErr;

      const userIds = (roles || []).map((r: any) => r.user_id);
      const results: any[] = [];
      for (const uid of userIds) {
        const { data: uRes } = await admin.auth.admin.getUserById(uid);
        if (uRes?.user) {
          results.push({
            user_id: uRes.user.id,
            email: uRes.user.email,
            created_at: uRes.user.created_at,
            last_sign_in_at: uRes.user.last_sign_in_at,
            banned: (uRes.user as any).banned_until != null,
          });
        }
      }
      return json({ auditors: results });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || password.length < 8) {
        return json({ error: "email and password (min 8 chars) required" }, 400);
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) return json({ error: createErr.message }, 400);
      const uid = created.user!.id;
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: uid, role: "auditor" });
      if (roleErr) {
        await admin.auth.admin.deleteUser(uid);
        return json({ error: roleErr.message }, 400);
      }
      return json({ ok: true, user_id: uid });
    }

    if (action === "reset_password") {
      const userId = String(body.user_id || "");
      const password = String(body.password || "");
      if (!userId || password.length < 8) return json({ error: "user_id and new password required" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const userId = String(body.user_id || "");
      if (!userId) return json({ error: "user_id required" }, 400);
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "auditor");
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "list_logs") {
      const limit = Math.min(Number(body.limit) || 200, 1000);
      const { data, error } = await admin
        .from("auditor_access_log")
        .select("*")
        .order("accessed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json({ logs: data ?? [] });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("manage-auditors error", err);
    return json({ error: String((err as Error).message || err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
