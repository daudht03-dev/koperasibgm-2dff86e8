// Reverse geocode via Google Maps gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), {
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

    const url = `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?latlng=${lat},${lng}&language=id`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Geocode failed [${response.status}]: ${body}`);
      return new Response(JSON.stringify({ error: "Provider request failed", status: response.status, details: body }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const first = data?.results?.[0];
    const address = first?.formatted_address || null;

    return new Response(JSON.stringify({ address, results: data?.results ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("reverse-geocode error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
