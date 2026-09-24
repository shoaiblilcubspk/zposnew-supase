-- 0017_soft_delete_tombstones.sql
-- FIX (permanent, multi-device): DELETE propagation. Hard deletes removed the cloud row, but
-- the pull layer only INSERT-OR-REPLACEs existing rows — it can never learn a row was deleted,
-- so other devices kept showing stale rows forever. The tables that were hard-deleted
-- (expenses, purchase_records, bundle_items) now get a `deleted_at` tombstone; deletes become
-- an UPDATE that sets deleted_at (bumps the server updated_at via the existing trigger), so the
-- pull cursor carries the tombstone to every device and local reads hide it.
-- Tables with active/is_active already soft-delete and propagate — unchanged. Append-only
-- tables are never deleted. Additive only.

alter table public.expenses          add column if not exists deleted_at timestamptz;
alter table public.purchase_records  add column if not exists deleted_at timestamptz;
alter table public.bundle_items       add column if not exists deleted_at timestamptz;

create index if not exists idx_expenses_deleted_at         on public.expenses(deleted_at);
create index if not exists idx_purchase_records_deleted_at on public.purchase_records(deleted_at);
create index if not exists idx_bundle_items_deleted_at     on public.bundle_items(deleted_at);
