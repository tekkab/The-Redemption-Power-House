-- Reserve the first three TRPH membership numbers for church leadership.
-- Run this once in Supabase SQL Editor.
-- Existing matching auth accounts are updated immediately; if an account is
-- created later, the auth trigger below assigns the reserved number on signup.

create or replace function public.handle_new_trph_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_number text;
  assigned_name text;
begin
  case lower(coalesce(new.email, ''))
    when 'fjlanya@gmail.com' then
      assigned_number := 'TRPH/001';
      assigned_name := 'Rev. Prosper Lanya';
    when 'libertyfg69@gmail.com' then
      assigned_number := 'TRPH/002';
      assigned_name := 'Pst. Grace Liberty';
    when 'tekaf1blessings@gmail.com' then
      assigned_number := 'TRPH/003';
      assigned_name := 'Pst. Tekka Blessings';
    else
      assigned_number := 'TRPH/' || lpad(nextval('public.member_number_seq')::text, 3, '0');
      assigned_name := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        split_part(coalesce(new.email, ''), '@', 1)
      );
  end case;

  insert into public.members (id, membership_number, full_name, phone, email)
  values (
    new.id,
    assigned_number,
    assigned_name,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    new.email
  )
  on conflict (id) do update
    set membership_number = excluded.membership_number,
        full_name = excluded.full_name,
        email = excluded.email;

  return new;
end;
$$;

-- Apply the reserved numbers now to accounts that already exist in Supabase Auth.
insert into public.members (id, membership_number, full_name, email)
select
  u.id,
  case lower(u.email)
    when 'fjlanya@gmail.com' then 'TRPH/001'
    when 'libertyfg69@gmail.com' then 'TRPH/002'
    when 'tekaf1blessings@gmail.com' then 'TRPH/003'
  end,
  case lower(u.email)
    when 'fjlanya@gmail.com' then 'Rev. Prosper Lanya'
    when 'libertyfg69@gmail.com' then 'Pst. Grace Liberty'
    when 'tekaf1blessings@gmail.com' then 'Pst. Tekka Blessings'
  end,
  u.email
from auth.users u
where lower(u.email) in (
  'fjlanya@gmail.com',
  'libertyfg69@gmail.com',
  'tekaf1blessings@gmail.com'
)
on conflict (id) do update
  set membership_number = excluded.membership_number,
      full_name = excluded.full_name,
      email = excluded.email;
