import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://tekkab.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin") ?? "";
  const allowedOrigins = ["https://tekkab.github.io", "http://localhost:5173"];
  if (!allowedOrigins.includes(origin)) return json({ error: "Origin not allowed" }, 403);

  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return json({ error: "Please sign in as a church administrator first." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
  if (!clientId || !redirectUri) return json({ error: "Google OAuth is not fully configured in Supabase secrets." }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return json({ error: "Your administrator session is invalid. Please sign in again." }, 401);

  const { data: role } = await admin.from("admin_roles").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (!role || !["super_admin", "editor"].includes(role.role)) return json({ error: "Only an approved church administrator can connect YouTube." }, 403);

  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = [...stateBytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  const stateHash = await sha256(state);
  const { error: insertError } = await admin.from("youtube_oauth_states").insert({
    state_hash: stateHash,
    admin_user_id: userData.user.id,
    redirect_origin: origin,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (insertError) return json({ error: "Could not start secure Google authorisation." }, 500);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return json({ authorization_url: url.toString() });
});
