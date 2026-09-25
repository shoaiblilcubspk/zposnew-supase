-- 0023_media_assets.sql
-- Reusable Media Library assets (uploads + Pexels picks). A picked image stays here for reuse
-- until soft-deleted; the LINK + credit are permanent, the local blob is a disposable cache.
-- Synced to all devices (future-proof apply_bundle handles it automatically). Deduped by
-- (source, pexels_id) for Pexels and by image_hash for uploads.

create table if not exists public.media_assets (
  id               uuid primary key,
  operation_id     uuid not null unique,
  source           text not null default 'upload',   -- 'upload' | 'pexels'
  image_hash       text,                              -- content hash of the cached/compressed blob
  pexels_id        text,                              -- Pexels photo id (credit + re-download)
  photographer     text,
  photographer_url text,
  page_url         text,
  alt              text,
  avg_color        text,
  width            integer,
  height           integer,
  src_original     text,
  src_large2x      text,
  src_large        text,
  src_medium       text,
  src_portrait     text,
  src_tiny         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index if not exists idx_media_assets_pexels on public.media_assets(pexels_id);
create index if not exists idx_media_assets_hash on public.media_assets(image_hash);
create index if not exists idx_media_assets_deleted on public.media_assets(deleted_at);

alter table public.media_assets enable row level security;
drop policy if exists media_assets_all on public.media_assets;
create policy media_assets_all on public.media_assets
  for all to anon, authenticated using (true) with check (true);

drop trigger if exists trg_media_assets_updated_at on public.media_assets;
create trigger trg_media_assets_updated_at
  before insert or update on public.media_assets
  for each row execute function public.set_updated_at();
