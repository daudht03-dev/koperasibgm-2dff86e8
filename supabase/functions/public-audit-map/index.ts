// Returns farmer + land data for authenticated auditors (or admins).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const caller = userRes?.user;
    if (!caller) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const allowed = (roles || []).some((r: any) => r.role === "auditor" || r.role === "admin");
    if (!allowed) return json({ error: "forbidden" }, 403);

    // Log access (best-effort)
    admin
      .from("auditor_access_log")
      .insert({
        user_id: caller.id,
        email: caller.email,
        path: "/auditor/map",
        event: "load_map",
        ip: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      })
      .then(() => {});

    const [farmersRes, landsRes, prefixRes] = await Promise.all([
      admin
        .from("petani")
        .select("id, kode_petani, nama, alamat_rumah, koordinat_lat, koordinat_lng, is_organic")
        .limit(5000),
      admin
        .from("lahan")
        .select("id, petani_id, nama_lahan, lokasi, koordinat, luas, is_organic")
        .limit(10000),
      admin.from("village_prefixes").select("code, name").limit(500),
    ]);

    if (farmersRes.error) throw farmersRes.error;
    if (landsRes.error) throw landsRes.error;

    return json({
      farmers: farmersRes.data ?? [],
      lands: landsRes.data ?? [],
      prefixes: prefixRes.data ?? [],
    });
  } catch (err) {
    console.error("public-audit-map error", err);
    return json({ error: String((err as Error).message || err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
