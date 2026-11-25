-- Add profile photo URLs for member portraits
alter table public.members
  add column if not exists profile_photo_url text;

-- Ensure the existing church-assets storage bucket is publicly readable.
-- The bucket itself is already used by the church website for its pastor portrait.
