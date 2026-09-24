-- =============================================================================
-- 0003_inventory_ledger.sql  —  Phase 3: Inventory Ledger (APPEND-ONLY, Rule 7)
--   type: IN | OUT | AUDIT | DAMAGE.  Current stock = SUM(quantity) VIEW.
--   Append-only tables carry created_at only (no updated_at) — history is never
--   rewritten. quantity is signed: IN/AUDIT-up = +, OUT/DAMAGE = -.
-- =============================================================================

create table if not exists public.inventory_ledger (
  id             uuid primary key,
  operation_id   uuid not null unique,
  product_id     uuid not null,
  variant_id     uuid,
  type           text not null,          -- IN | OUT | AUDIT | DAMAGE
  quantity       numeric not null,       -- signed
  reference_type text not null,          -- sale | return | purchase | adjustment | damage | initial
  reference_id   uuid,
  device_id      text,
  user_id        uuid,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_inv_ledger_product on public.inventory_ledger(product_id);
create index if not exists idx_inv_ledger_ref     on public.inventory_ledger(reference_type, reference_id);
create index if not exists idx_inv_ledger_created on public.inventory_ledger(created_at);

-- Current stock per product = signed sum of all ledger rows (Rule 7: computed, never edited).
create or replace view public.current_stock as
select
  product_id,
  variant_id,
  coalesce(sum(quantity), 0) as stock
from public.inventory_ledger
group by product_id, variant_id;
