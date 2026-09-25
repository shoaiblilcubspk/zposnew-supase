-- 0022_integration_settings_created_at.sql
-- This project's integration_settings pre-existed without a created_at column, while the write
-- layer (writeThrough) always sets created_at on non-append inserts. Add it idempotently so
-- inserts succeed and the table matches the 0020 schema on fresh clones.

alter table public.integration_settings add column if not exists created_at timestamptz not null default now();
alter table public.integration_settings add column if not exists key_value text;
alter table public.integration_settings add column if not exists metadata text;
alter table public.integration_settings add column if not exists updated_by text;
