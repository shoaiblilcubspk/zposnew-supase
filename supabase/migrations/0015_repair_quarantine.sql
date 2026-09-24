-- 0015_repair_quarantine.sql
-- Safety net for the repair script (Phase 6). Half-saved / orphaned rows are moved HERE
-- instead of being silently deleted, so nothing is ever lost and an admin can review/restore.
-- Additive only. Supabase is the source of truth; the local SQLite mirror re-pulls after repair.

create table if not exists public.repair_quarantine (
  id           uuid primary key default gen_random_uuid(),
  table_name   text not null,
  row_id       text,
  payload      jsonb not null,
  reason       text not null,
  created_at   timestamptz not null default now()
);

alter table public.repair_quarantine enable row level security;

drop policy if exists repair_quarantine_all on public.repair_quarantine;
create policy repair_quarantine_all on public.repair_quarantine
  for all to anon, authenticated using (true) with check (true);
