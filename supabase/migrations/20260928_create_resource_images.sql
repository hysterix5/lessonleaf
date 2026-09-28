-- Private textbook and resource pictures are grouped by account and lesson.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-images', 'resource-images', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their resource images" on storage.objects;
create policy "Users can read their resource images"
  on storage.objects for select to authenticated
  using (bucket_id = 'resource-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their resource images" on storage.objects;
create policy "Users can upload their resource images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resource-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.extension(name) in ('png', 'jpg', 'webp')
  );

drop policy if exists "Users can delete their resource images" on storage.objects;
create policy "Users can delete their resource images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resource-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
