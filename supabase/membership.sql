-- TRPH member registration and automatic membership numbering
-- Run once in Supabase SQL Editor before enabling member registration.
-- First registered member receives TRPH/030, then TRPH/031, TRPH/032, etc.

create sequence if not exists public.member_number_seq
  start with 30 increment by 1 minvalue 30;

create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  membership_number text not null unique,
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.members add column if not exists address text;

alter table public.members enable row level security;

drop policy if exists "Members can read their own membership" on public.members;
create policy "Members can read their own membership" on public.members
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Members can update their own membership details" on public.members;
create policy "Members can update their own membership details" on public.members
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, update on public.members to authenticated;

create or replace function public.handle_new_trph_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.members (id, membership_number, full_name, phone, email)
  values (
    new.id,
    'TRPH/' || lpad(nextval('public.member_number_seq')::text, 3, '0'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_membership on auth.users;
create trigger on_auth_user_created_membership
after insert on auth.users
for each row execute procedure public.handle_new_trph_member();
