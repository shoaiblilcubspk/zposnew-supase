-- =============================================================================
-- 0009_storage_buckets.sql  —  Phase 9: Storage bucket for product images + logo.
--   Bucket: product-images (private). Metadata (hash/path/mime/size) lives in the
--   product_images table (0002); the binary lives here. SHA-256 hash = object name
--   for content-addressed, dedup-friendly uploads (Section 2.8 intent, cloud-direct).
--   Access via ANON key (single-shop model, same rationale as 0008).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

-- storage.objects RLS policies scoped to the product-images bucket.
drop policy if exists "product_images_read"   on storage.objects;
drop policy if exists "product_images_insert" on storage.objects;
drop policy if exists "product_images_update" on storage.objects;
drop policy if exists "product_images_delete" on storage.objects;

create policy "product_images_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'product-images');

create policy "product_images_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

create policy "product_images_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'product-images');

-- Ensure the ANON/AUTHENTICATED roles can call the RPCs (PostgREST exposure).
grant execute on function public.next_invoice_number() to anon, authenticated;
grant execute on function public.create_sale_atomic(uuid, jsonb, jsonb) to anon, authenticated;
