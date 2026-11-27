-- Secure server-only storage for the TRPH YouTube Live OAuth integration.
-- Run this migration in Supabase SQL Editor.
create table if not exists public.youtube_oauth_states (
  state_hash text primary key,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  redirect_origin text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.youtube_oauth_tokens (
  id boolean primary key default true check (id = true),
  refresh_token text not null,
  connected_channel_id text not null,
  connected_channel_title text,
  connected_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.youtube_oauth_states enable row level security;
alter table public.youtube_oauth_tokens enable row level security;

-- No browser roles receive access. Edge Functions use the service-role key only.
revoke all on public.youtube_oauth_states from anon, authenticated;
revoke all on public.youtube_oauth_tokens from anon, authenticated;
grant all on public.youtube_oauth_states to service_role;
grant all on public.youtube_oauth_tokens to service_role;

create index if not exists youtube_oauth_states_expiry_idx
  on public.youtube_oauth_states (expires_at);
