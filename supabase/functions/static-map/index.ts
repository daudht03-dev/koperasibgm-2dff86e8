// Google Static Maps thumbnail (returns base64 data URL).
// Tries the direct Google endpoint first, then falls back to the Lovable connector gateway.
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
    const BROWSER_KEY = Deno.env.get("GOOGLE_MAPS_BROWSER_KEY");
    if (!GOOGLE_MAPS_API_KEY && !BROWSER_KEY) {
      return new Response(JSON.stringify({ error: "Google Maps connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const z = Math.max(1, Math.min(20, Number(zoom) || 15));
    const query =
      `?center=${lat},${lng}&zoom=${z}&size=${size}&scale=2&maptype=roadmap` +
      `&markers=color:red%7C${lat},${lng}`;

    const attempts: { url: string; headers?: Record<string, string> }[] = [];
    for (const key of [GOOGLE_MAPS_API_KEY, BROWSER_KEY]) {
      if (key) attempts.push({ url: `https://maps.googleapis.com/maps/api/staticmap${query}&key=${key}` });
    }
    if (LOVABLE_API_KEY && GOOGLE_MAPS_API_KEY) {
      attempts.push({
        url: `https://connector-gateway.lovable.dev/google_maps/maps/api/staticmap${query}`,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        },
      });
    }

    let lastDetail = "";
    for (const attempt of attempts) {
      const response = await fetch(attempt.url, { headers: attempt.headers });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.startsWith("image/")) {
        lastDetail = await response.text().catch(() => "");
        console.error(`Static map attempt failed [${response.status}] ${contentType}: ${lastDetail.slice(0, 200)}`);
        continue;
      }

      const buf = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        binary += String.fromCharCode(...buf.subarray(i, i + chunk));
      }
      const mime = contentType.split(";")[0];
      return new Response(JSON.stringify({ dataUrl: `data:${mime};base64,${btoa(binary)}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Provider request failed", details: lastDetail }), {
      status: 502,
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
