import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReqBody = { farmerId?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { farmerId } = (await req.json().catch(() => ({} as ReqBody))) as ReqBody;

    if (!farmerId) {
      return new Response(JSON.stringify({ error: "farmerId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: farmer, error: farmerError } = await supabaseAdmin
      .from("petani")
      .select("id, kode_petani, nama, is_organic")
      .eq("id", farmerId)
      .single();

    if (farmerError) throw farmerError;

    const { data: lands, error: landsError } = await supabaseAdmin
      .from("lahan")
      .select("id, petani_id, nama_lahan, lokasi, status, is_organic, created_at")
      .eq("petani_id", farmerId)
      .order("created_at", { ascending: false });

    if (landsError) throw landsError;

    return new Response(JSON.stringify({ farmer, lands: lands ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
