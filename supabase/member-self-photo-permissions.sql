-- Allow each signed-in member to manage only their own profile picture.
-- The existing church-assets bucket is used for public church website images.
update storage.buckets
set public = true
where id = 'church-assets';

drop policy if exists "Members upload own profile photo" on storage.objects;
create policy "Members upload own profile photo"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'church-assets'
  and (storage.foldername(name))[1] = 'member-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Members update own profile photo" on storage.objects;
create policy "Members update own profile photo"
on storage.objects for update to authenticated
using (
  bucket_id = 'church-assets'
  and (storage.foldername(name))[1] = 'member-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'church-assets'
  and (storage.foldername(name))[1] = 'member-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Members delete own profile photo" on storage.objects;
create policy "Members delete own profile photo"
on storage.objects for delete to authenticated
using (
  bucket_id = 'church-assets'
  and (storage.foldername(name))[1] = 'member-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
);
