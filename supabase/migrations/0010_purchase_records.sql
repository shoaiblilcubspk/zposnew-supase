-- =============================================================================
-- 0010_purchase_records.sql  —  Phase 10g: Purchase / Restock records.
--   Denormalized purchase-history log (stock-in bills, restocks, adjustments) shown in
--   inventory reports. Non-additive (editable/deletable); stock truth still lives in
--   inventory_ledger (Rule 7). Kept so no existing feature is dropped (plan Section 7).
-- =============================================================================

create table if not exists public.purchase_records (
  id            uuid primary key,
  operation_id  uuid not null unique,
  type          text not null default 'Stock IN',
  product_id    uuid,
  product_name  text not null default '',
  sku           text,
  variant_id    uuid,
  variant_label text,
  quantity      numeric not null default 0,
  cost_price    numeric not null default 0,
  retail_price  numeric,
  total_amount  numeric not null default 0,
  supplier      text,
  supplier_id   uuid,
  added_by      text,
  notes         text,
  purchased_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_purchase_records_product on public.purchase_records(product_id);
create index if not exists idx_purchase_records_date on public.purchase_records(purchased_at);
drop trigger if exists trg_purchase_records_updated_at on public.purchase_records;
create trigger trg_purchase_records_updated_at before insert or update on public.purchase_records
  for each row execute function public.set_updated_at();

-- RLS (Rule 5) — same single-shop anon/authenticated policy pattern as 0008.
alter table public.purchase_records enable row level security;
drop policy if exists purchase_records_all_access on public.purchase_records;
create policy purchase_records_all_access on public.purchase_records
  for all to anon, authenticated using (true) with check (true);
