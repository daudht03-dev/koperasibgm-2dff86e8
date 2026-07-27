// Proxy to Google Routes API for auditor/admin users.
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

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

    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return json({ error: "Google Maps connector not configured" }, 500);
    }

    const { origin, destination, travelMode = "DRIVE" } = await req.json();
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return json({ error: "origin and destination lat/lng required" }, 400);
    }

    const response = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode,
          routingPreference: travelMode === "DRIVE" ? "TRAFFIC_UNAWARE" : undefined,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`Routes failed [${response.status}]: ${body}`);
      return json({ error: "Provider request failed", status: response.status, details: body }, response.status);
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) return json({ error: "no route found" }, 404);

    return json({
      distanceMeters: route.distanceMeters,
      duration: route.duration,
      polyline: route.polyline?.encodedPolyline,
    });
  } catch (err) {
    console.error("directions-route error", err);
    return json({ error: String((err as Error).message || err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
