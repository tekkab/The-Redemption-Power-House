import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = "https://tekkab.github.io/The-Redemption-Power-House/";
const CHANNEL_ID = "UCQj13HtaPJMObnkGN6KzJkA";

function redirect(params: Record<string, string>) {
  const url = new URL(APP_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Response.redirect(url.toString(), 302);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const googleError = requestUrl.searchParams.get("error");
  if (googleError) return redirect({ youtube_error: "Google authorisation was cancelled or denied." });
  if (!code || !state) return redirect({ youtube_error: "The Google authorisation response was incomplete." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) return redirect({ youtube_error: "The YouTube connection is not fully configured." });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const stateHash = await sha256(state);
  const { data: stateRow, error: stateError } = await admin
    .from("youtube_oauth_states")
    .select("state_hash,admin_user_id,expires_at,consumed_at")
    .eq("state_hash", stateHash)
    .maybeSingle();

  if (stateError || !stateRow || stateRow.consumed_at || new Date(stateRow.expires_at).getTime() < Date.now()) {
    return redirect({ youtube_error: "The security check expired. Please start the YouTube connection again." });
  }
  const { error: consumeError } = await admin.from("youtube_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state_hash", stateHash)
    .is("consumed_at", null);
  if (consumeError) return redirect({ youtube_error: "The security check could not be completed. Please try again." });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.refresh_token) {
    return redirect({ youtube_error: "Google did not return a refresh token. Please reconnect and approve access." });
  }

  const channelResponse = await fetch("https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const channelData = await channelResponse.json();
  const channel = channelData.items?.find((item: { id: string }) => item.id === CHANNEL_ID);
  if (!channel) return redirect({ youtube_error: "The Google account does not own the TRPH YouTube channel. Please use the channel owner's Google account." });

  const { error: saveError } = await admin.from("youtube_oauth_tokens").upsert({
    id: true,
    refresh_token: tokenData.refresh_token,
    connected_channel_id: channel.id,
    connected_channel_title: channel.snippet?.title ?? "The Redemption Power House",
    connected_by: stateRow.admin_user_id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (saveError) return redirect({ youtube_error: "The YouTube account was verified, but its connection could not be saved." });

  return redirect({ youtube_connected: "1" });
});
