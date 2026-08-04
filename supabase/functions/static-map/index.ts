// Google Static Maps thumbnail via connector gateway (returns base64 data URL)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lat, lng, zoom = 15, size = "300x300" } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^\d{2,4}x\d{2,4}$/.test(String(size))) {
      return new Response(JSON.stringify({ error: "invalid size" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: "Google Maps connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const z = Math.max(1, Math.min(20, Number(zoom) || 15));
    const url =
      `https://connector-gateway.lovable.dev/google_maps/maps/api/staticmap` +
      `?center=${lat},${lng}&zoom=${z}&size=${size}&scale=2&maptype=roadmap` +
      `&markers=color:red%7C${lat},${lng}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Static map failed [${response.status}]: ${body}`);
      return new Response(
        JSON.stringify({ error: "Provider request failed", status: response.status, details: body }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const dataUrl = `data:image/png;base64,${btoa(binary)}`;

    return new Response(JSON.stringify({ dataUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("static-map error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
