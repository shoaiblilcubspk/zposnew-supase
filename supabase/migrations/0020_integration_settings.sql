-- 0020_integration_settings.sql
-- Third-party integration keys (Pexels image search) — a GENERIC key/value store (reuses the
-- existing integration_settings shape: key_name/key_value/metadata) so any future integration
-- adds a row, not a column. Single shared store, synced to all devices like other settings.
-- Single-shop model: anon/authenticated policy (same trust boundary as the shipped anon key).
-- The key is sent only in the Authorization header by the client and never logged.

create table if not exists public.integration_settings (
  id           uuid primary key,
  operation_id uuid not null unique,
  key_name     text not null unique,
  key_value    text,
  metadata     text,
  updated_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.integration_settings enable row level security;
drop policy if exists integration_settings_all on public.integration_settings;
create policy integration_settings_all on public.integration_settings
  for all to anon, authenticated using (true) with check (true);

drop trigger if exists trg_integration_settings_updated_at on public.integration_settings;
create trigger trg_integration_settings_updated_at
  before insert or update on public.integration_settings
  for each row execute function public.set_updated_at();
