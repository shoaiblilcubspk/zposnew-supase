-- =============================================================================
-- 0011_history_and_features.sql  —  Phase 10m: preserve ALL history/feature data
--   (owner mandate: keep everything, remove nothing). Adds the tables that previously
--   lived only in Dexie so they now sync via Supabase like every other entity.
--   Append-only history: stock_history, variant_stock_history, price_history, sale_audit_log.
--   Config (editable): toppings, product_addons, salesmen, purchase_orders(+items).
-- =============================================================================

-- ---- stock_history (APPEND-ONLY product stock movement log) ----
create table if not exists public.stock_history (
  id            uuid primary key,
  operation_id  uuid not null unique,
  product_id    uuid not null,
  change_qty    numeric not null default 0,
  type          text not null default 'adjustment',
  reference_id  text,
  note          text,
  balance_after numeric,
  cashier_id    text,
  cashier_name  text,
  was_oversold  integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_stock_history_product on public.stock_history(product_id);

-- ---- variant_stock_history (APPEND-ONLY) ----
create table if not exists public.variant_stock_history (
  id            uuid primary key,
  operation_id  uuid not null unique,
  product_id    uuid not null,
  variant_id    text,
  variant_label text,
  change_qty    numeric not null default 0,
  type          text not null default 'adjustment',
  reference_id  text,
  note          text,
  balance_after numeric,
  cashier_name  text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_variant_stock_history_product on public.variant_stock_history(product_id);

-- ---- price_history (APPEND-ONLY price/cost change audit) ----
create table if not exists public.price_history (
  id           uuid primary key,
  operation_id uuid not null unique,
  product_id   uuid not null,
  old_price    numeric,
  new_price    numeric,
  old_cost     numeric,
  new_cost     numeric,
  changed_by   text,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_price_history_product on public.price_history(product_id);

-- ---- sale_audit_log (APPEND-ONLY tamper-evident sale actions) ----
create table if not exists public.sale_audit_log (
  id                uuid primary key,
  operation_id      uuid not null unique,
  sale_id           uuid,
  invoice_number    text,
  action            text not null,
  performed_by_name text,
  performed_by_role text,
  device_id         text,
  note              text,
  meta              text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_sale_audit_log_sale on public.sale_audit_log(sale_id);

-- ---- toppings (config) ----
create table if not exists public.toppings (
  id           uuid primary key,
  operation_id uuid not null unique,
  name         text not null,
  price_small  numeric not null default 0,
  price_medium numeric not null default 0,
  price_large  numeric not null default 0,
  active       integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_toppings_updated_at on public.toppings;
create trigger trg_toppings_updated_at before insert or update on public.toppings
  for each row execute function public.set_updated_at();

-- ---- product_addons (config: inventory-tracked linked add-ons) ----
create table if not exists public.product_addons (
  id               uuid primary key,
  operation_id     uuid not null unique,
  product_id       uuid not null,
  addon_product_id uuid,
  name             text not null default '',
  price            numeric not null default 0,
  max_qty          numeric not null default 1,
  active           integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_product_addons_product on public.product_addons(product_id);
drop trigger if exists trg_product_addons_updated_at on public.product_addons;
create trigger trg_product_addons_updated_at before insert or update on public.product_addons
  for each row execute function public.set_updated_at();

-- ---- salesmen (config) ----
create table if not exists public.salesmen (
  id           uuid primary key,
  operation_id uuid not null unique,
  name         text not null,
  phone        text,
  active       integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_salesmen_updated_at on public.salesmen;
create trigger trg_salesmen_updated_at before insert or update on public.salesmen
  for each row execute function public.set_updated_at();

-- ---- purchase_orders + purchase_order_items (config) ----
create table if not exists public.purchase_orders (
  id           uuid primary key,
  operation_id uuid not null unique,
  po_number    text not null,
  supplier_id  uuid,
  status       text not null default 'draft',
  total_amount numeric not null default 0,
  notes        text,
  received_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at before insert or update on public.purchase_orders
  for each row execute function public.set_updated_at();

create table if not exists public.purchase_order_items (
  id              uuid primary key,
  operation_id    uuid not null unique,
  purchase_order_id uuid not null,
  product_id      uuid,
  quantity        numeric not null default 0,
  received_qty    numeric not null default 0,
  cost_price      numeric,
  unit_price      numeric,
  is_received     integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_po_items_po on public.purchase_order_items(purchase_order_id);
drop trigger if exists trg_po_items_updated_at on public.purchase_order_items;
create trigger trg_po_items_updated_at before insert or update on public.purchase_order_items
  for each row execute function public.set_updated_at();

-- ---- RLS (Rule 5) — single-shop anon/authenticated policy for every new table ----
do $$
declare
  t text;
  tbls text[] := array[
    'stock_history','variant_stock_history','price_history','sale_audit_log',
    'toppings','product_addons','salesmen','purchase_orders','purchase_order_items'
  ];
begin
  foreach t in array tbls loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_access', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all_access', t
    );
  end loop;
end;
$$;
