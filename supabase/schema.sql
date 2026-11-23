-- The Redemption Power House: initial Supabase schema
-- Run in Supabase SQL Editor. Never expose service_role keys in the browser.

create extension if not exists pgcrypto;

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('super_admin','editor')) default 'editor',
  created_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null check (category in ('Activity','Announcement','Weekly Message')),
  event_date timestamptz,
  image_url text,
  published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notice_likes (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  device_token text not null,
  created_at timestamptz not null default now(),
  unique (notice_id, device_token)
);

create table if not exists public.church_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;
alter table public.notices enable row level security;
alter table public.notice_likes enable row level security;
alter table public.church_settings enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid());
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid() and role = 'super_admin');
$$;

create policy "Anyone can read published notices" on public.notices
for select using (published = true or public.is_admin());

create policy "Admins can insert notices" on public.notices
for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

create policy "Admins can update notices" on public.notices
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete notices" on public.notices
for delete to authenticated using (public.is_admin());

create policy "Public can read settings" on public.church_settings
for select using (true);

create policy "Admins manage settings" on public.church_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can count likes" on public.notice_likes
for select using (true);

create policy "Visitors can add a like" on public.notice_likes
for insert to anon, authenticated with check (
  length(device_token) between 20 and 100
  and exists (select 1 from public.notices n where n.id = notice_id and n.published = true)
);

create policy "Super admins manage administrator roles" on public.admin_roles
for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Bootstrap the first Super Admin only after tekkab866@gmail.com has signed in once
-- through Supabase Auth. Run this statement in SQL Editor:
-- insert into public.admin_roles (user_id, email, role)
-- select id, email, 'super_admin' from auth.users
-- where lower(email) = lower('tekkab866@gmail.com')
-- on conflict (user_id) do update set role = 'super_admin', email = excluded.email;

-- Subsequent administrators can be invited from Supabase Authentication → Users,
-- then assigned 'editor' by a Super Admin in the admin_roles table.
-- Allow each signed-in user to read their own administrator role.
create policy "Admins can read their own role" on public.admin_roles
for select to authenticated using (user_id = auth.uid());


-- Church logo uploads (run this section once in Supabase SQL Editor)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('church-assets', 'church-assets', true, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml'];

drop policy if exists "Public can view church branding" on storage.objects;
create policy "Public can view church branding" on storage.objects
for select using (bucket_id = 'church-assets');

drop policy if exists "Admins can upload church branding" on storage.objects;
create policy "Admins can upload church branding" on storage.objects
for insert to authenticated with check (bucket_id = 'church-assets' and public.is_admin());

drop policy if exists "Admins can update church branding" on storage.objects;
create policy "Admins can update church branding" on storage.objects
for update to authenticated using (bucket_id = 'church-assets' and public.is_admin())
with check (bucket_id = 'church-assets' and public.is_admin());

drop policy if exists "Admins can delete church branding" on storage.objects;
create policy "Admins can delete church branding" on storage.objects
for delete to authenticated using (bucket_id = 'church-assets' and public.is_admin());

grant select on table public.church_settings to anon, authenticated;
grant insert, update on table public.church_settings to authenticated;
