import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://tekkab.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") ?? "";
  if (!["https://tekkab.github.io", "http://localhost:5173"].includes(origin)) return json({ error: "Origin not allowed" }, 403);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: saved, error } = await admin.from("youtube_oauth_tokens")
    .select("refresh_token,connected_channel_title")
    .eq("id", true)
    .maybeSingle();
  if (error) return json({ error: "Could not read the YouTube connection." }, 500);
  if (!saved?.refresh_token) return json({ connected: false, live: false });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: saved.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    return json({ connected: false, live: false, error: "The Google connection needs to be renewed." }, 200);
  }

  const liveResponse = await fetch("https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,snippet,status&mine=true", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const liveData = await liveResponse.json();
  if (!liveResponse.ok) {
    console.error("YouTube API error:", {
      status: liveResponse.status,
      message: liveData?.error?.message,
      reason: liveData?.error?.errors?.[0]?.reason,
    });
    return json({
      connected: true,
      live: false,
      error: "YouTube Live status is temporarily unavailable.",
      diagnostic: liveData?.error?.message ?? "Unknown YouTube API error",
      status: liveResponse.status,
    }, 200);
  }

  // The YouTube API does not allow mine=true together with broadcastStatus.
  // Fetch this account's broadcasts, then select the one currently live.
  const broadcast = liveData.items?.find((item: any) => item.status?.lifeCycleStatus === "live");
  if (!broadcast) return json({ connected: true, live: false, channel: saved.connected_channel_title });
  return json({
    connected: true,
    live: true,
    channel: saved.connected_channel_title,
    video_id: broadcast.id,
    title: broadcast.snippet?.title ?? "TRPH Live",
    description: broadcast.snippet?.description ?? "",
    watch_url: `https://www.youtube.com/watch?v=${broadcast.id}`,
    embed_url: `https://www.youtube-nocookie.com/embed/${broadcast.id}?autoplay=1&mute=1`,
  });
});
