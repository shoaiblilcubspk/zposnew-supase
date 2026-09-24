-- =============================================================================
-- 0012_actor_columns_to_text.sql  —  Fix: actor/variant/reference id columns.
--   The app uses human/loose identifiers for "who did it" (e.g. 'system', 'cashier',
--   staff names) and for variant/reference ids that are not always UUIDs. These columns
--   were uuid, causing PostgREST 400s on insert. Convert them to text (uuid casts cleanly).
--   Real foreign keys (product_id, customer_id, supplier_id, sale_id, id, operation_id)
--   remain uuid.
-- =============================================================================

-- current_stock view depends on inventory_ledger columns — drop, alter, recreate.
drop view if exists public.current_stock;

alter table public.inventory_ledger  alter column user_id     type text using user_id::text;
alter table public.inventory_ledger  alter column variant_id  type text using variant_id::text;
alter table public.inventory_ledger  alter column reference_id type text using reference_id::text;

create or replace view public.current_stock as
select
  product_id,
  variant_id,
  coalesce(sum(quantity), 0) as stock
from public.inventory_ledger
group by product_id, variant_id;

alter table public.sales              alter column user_id     type text using user_id::text;
alter table public.sales              alter column salesman_id type text using salesman_id::text;

alter table public.sale_items         alter column variant_id  type text using variant_id::text;

alter table public.sale_voids         alter column voided_by   type text using voided_by::text;
alter table public.sale_refunds       alter column refunded_by type text using refunded_by::text;

alter table public.payments           alter column user_id     type text using user_id::text;

alter table public.customer_ledger    alter column user_id     type text using user_id::text;

alter table public.audit_logs         alter column user_id     type text using user_id::text;
alter table public.audit_logs         alter column entity_id   type text using entity_id::text;

alter table public.expenses           alter column user_id     type text using user_id::text;

alter table public.product_addons     alter column addon_product_id type text using addon_product_id::text;
