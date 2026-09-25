-- =============================================================================
-- MASTER_SCHEMA.sql — Zaynahs POS (Supabase-only, cloud-direct, server-authoritative)
-- SINGLE, COMPLETE, DIRECTLY-RUNNABLE schema (Rule 14). Regenerated after every migration.
-- =============================================================================

-- ####### SOURCE: supabase/migrations/0001_init_core_tables.sql #######
-- =============================================================================
-- 0001_init_core_tables.sql  —  Phase 1: Core Schema (Store Identity + Settings)
-- Supabase-only, cloud-direct, server-authoritative (AGENTS.md Section 0).
--
-- Conventions (apply to EVERY migration):
--   * snake_case everywhere (Rule 3).
--   * id            uuid primary key
--   * operation_id  uuid not null unique   (idempotency, Rule 4)
--   * money/qty     numeric
--   * boolean flags integer (0/1) to mirror the local SQLite schema 1:1 (Rule 9)
--   * timestamps    timestamptz; updated_at is forced to the SERVER clock (Rule 8)
-- =============================================================================

-- ---- Shared: server-clock updated_at trigger (Rule 8, non-additive tables) ----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.created_at is null then
    new.created_at := now();
  end if;
  return new;
end;
$$;

-- ---- store_settings (single row: store identity + finance/business rules) ----
create table if not exists public.store_settings (
  id                       uuid primary key,
  operation_id             uuid not null unique,
  store_name               text not null default 'Zaynahs POS',
  store_address            text not null default '',
  store_phone              text,
  store_email              text,
  store_website            text,
  store_logo               text,
  tax_rate                 numeric not null default 0,
  tax_id                   text,
  currency                 text not null default 'PKR',
  country                  text not null default 'PK',
  language                 text default 'en',
  business_type            text not null default 'general',
  invoice_prefix           text not null default 'INV-',
  invoice_counter          integer not null default 0,
  invoice_pad_digits       integer not null default 4,
  custom_receipt_number    integer not null default 0,
  po_prefix                text default 'PO-',
  po_counter               integer not null default 0,
  retail_enabled           integer not null default 1,
  wholesale_enabled        integer not null default 0,
  default_sale_type        text default 'retail',
  sound_enabled            integer not null default 1,
  allow_negative_stock     integer not null default 0,
  refund_approval_threshold numeric not null default 0,
  enable_credit_sales      integer not null default 0,
  cashier_can_credit       integer not null default 0,
  allow_credit_over_limit  integer not null default 0,
  enable_split_payment     integer not null default 1,
  enable_extra_charges     integer not null default 0,
  enable_purchase_orders   integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
  before insert or update on public.store_settings
  for each row execute function public.set_updated_at();

-- ---- receipt_settings (single row: receipt + barcode-label layout) ----
create table if not exists public.receipt_settings (
  id                            uuid primary key,
  operation_id                  uuid not null unique,
  receipt_paper_size            text not null default '80mm',
  receipt_density               text not null default 'normal',
  receipt_template              text not null default 'modern',
  receipt_font_scale            numeric not null default 1,
  receipt_font_bold             integer not null default 0,
  receipt_font_weight           integer,
  receipt_padding_top           integer not null default 0,
  receipt_padding_bottom        integer not null default 0,
  receipt_padding_left          integer not null default 0,
  receipt_padding_right         integer not null default 0,
  receipt_offset_x              integer not null default 0,
  receipt_header_offset_x       integer,
  receipt_footer_offset_x       integer,
  receipt_header                text,
  receipt_footer                text,
  receipt_show_footer           integer not null default 1,
  receipt_show_logo             integer not null default 1,
  receipt_show_tax              integer not null default 1,
  receipt_show_discount         integer not null default 1,
  receipt_show_store_name       integer not null default 1,
  receipt_show_store_address    integer not null default 1,
  receipt_show_store_phone      integer not null default 1,
  receipt_show_store_email      integer not null default 0,
  receipt_show_customer_name    integer not null default 1,
  receipt_show_customer_phone   integer not null default 1,
  receipt_show_notes            integer not null default 1,
  receipt_show_barcode          integer not null default 0,
  receipt_show_delivery_address integer not null default 0,
  receipt_show_qr_code          integer not null default 0,
  barcode_paper_size            text default 'Thermal-40x30',
  barcode_a4_columns            integer,
  barcode_a4_rows               integer,
  barcode_show_price            integer default 1,
  barcode_show_name             integer default 1,
  barcode_show_sku              integer default 0,
  barcode_show_category         integer default 0,
  barcode_show_barcode          integer default 1,
  barcode_show_qr               integer default 0,
  barcode_scale                 numeric,
  barcode_height                integer,
  barcode_padding               integer,
  barcode_border                integer default 0,
  barcode_qr_size               integer,
  barcode_name_lines            integer,
  barcode_font_size             integer,
  barcode_content_scale         numeric,
  barcode_margin_x              integer,
  barcode_margin_y              integer,
  barcode_gap_x                 integer,
  barcode_gap_y                 integer,
  barcode_bar_width             numeric,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

drop trigger if exists trg_receipt_settings_updated_at on public.receipt_settings;
create trigger trg_receipt_settings_updated_at
  before insert or update on public.receipt_settings
  for each row execute function public.set_updated_at();


-- ####### SOURCE: supabase/migrations/0002_products_inventory.sql #######
-- =============================================================================
-- 0002_products_inventory.sql  —  Phase 2: Products, Categories, Suppliers,
--   Discounts, Bundles, Variants, Product Images (metadata).
-- Non-additive tables: normal INSERT/UPDATE + operation_id idempotency (Rule 8).
-- =============================================================================

-- ---- categories ----
create table if not exists public.categories (
  id           uuid primary key,
  operation_id uuid not null unique,
  name         text not null,
  color        text,
  icon         text,
  active       integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before insert or update on public.categories
  for each row execute function public.set_updated_at();

-- ---- suppliers ----
create table if not exists public.suppliers (
  id           uuid primary key,
  operation_id uuid not null unique,
  name         text not null,
  phone        text,
  email        text,
  address      text,
  balance      numeric not null default 0,
  active       integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at before insert or update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---- products ----
create table if not exists public.products (
  id                 uuid primary key,
  operation_id       uuid not null unique,
  name               text not null,
  barcode            text,
  sku                text,
  category_id        uuid,
  supplier_id        uuid,
  cost_price         numeric not null default 0,
  retail_price       numeric not null default 0,
  stock              numeric not null default 0,
  min_stock_alert    numeric not null default 5,
  track_inventory    integer not null default 1,
  image_hash         text,
  is_service         integer not null default 0,
  require_serial     integer not null default 0,
  product_type       text not null default 'simple',
  variants_json      text,
  variant_data_json  text,
  product_addons_json text,
  expiry_date        text,
  expiry_alert_days  integer not null default 90,
  active             integer not null default 1,
  version            integer not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_products_barcode  on public.products(barcode);
create index if not exists idx_products_category  on public.products(category_id);
create index if not exists idx_products_name       on public.products(name);
drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before insert or update on public.products
  for each row execute function public.set_updated_at();

-- ---- product_variants ----
create table if not exists public.product_variants (
  id           uuid primary key,
  operation_id uuid not null unique,
  product_id   uuid not null,
  name         text not null,
  sku          text,
  barcode      text,
  cost_price   numeric,
  retail_price numeric,
  stock        numeric not null default 0,
  active       integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_variants_product on public.product_variants(product_id);
drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at before insert or update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---- product_images (metadata only; binary lives in Storage bucket product-images) ----
create table if not exists public.product_images (
  id           uuid primary key,
  operation_id uuid not null unique,
  product_id   uuid not null,
  image_hash   text not null,
  storage_path text not null,
  mime_type    text not null default 'image/webp',
  file_size    integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_images_product on public.product_images(product_id);
drop trigger if exists trg_product_images_updated_at on public.product_images;
create trigger trg_product_images_updated_at before insert or update on public.product_images
  for each row execute function public.set_updated_at();

-- ---- discounts ----
create table if not exists public.discounts (
  id            uuid primary key,
  operation_id  uuid not null unique,
  name          text not null,
  description   text not null default '',
  type          text not null default 'percentage',
  value         numeric not null default 0,
  conditions    text not null default '[]',
  min_amount    numeric,
  max_discount  numeric,
  valid_from    text,
  valid_to      text,
  valid_days    text,
  active        integer not null default 1,
  is_auto_apply integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists trg_discounts_updated_at on public.discounts;
create trigger trg_discounts_updated_at before insert or update on public.discounts
  for each row execute function public.set_updated_at();

-- ---- bundles / bundle_items ----
create table if not exists public.bundles (
  id                uuid primary key,
  operation_id      uuid not null unique,
  name              text not null,
  description       text not null default '',
  discount_value    numeric not null default 0,
  discount_type     text not null default 'percentage',
  override_price    numeric,
  hide_item_prices  integer not null default 0,
  active            integer not null default 1,
  image             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
drop trigger if exists trg_bundles_updated_at on public.bundles;
create trigger trg_bundles_updated_at before insert or update on public.bundles
  for each row execute function public.set_updated_at();

create table if not exists public.bundle_items (
  id           uuid primary key,
  operation_id uuid not null unique,
  bundle_id    uuid not null,
  product_id   uuid not null,
  quantity     numeric not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_bundle_items_bundle on public.bundle_items(bundle_id);
drop trigger if exists trg_bundle_items_updated_at on public.bundle_items;
create trigger trg_bundle_items_updated_at before insert or update on public.bundle_items
  for each row execute function public.set_updated_at();


-- ####### SOURCE: supabase/migrations/0003_inventory_ledger.sql #######
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


-- ####### SOURCE: supabase/migrations/0004_sales_payments.sql #######
-- =============================================================================
-- 0004_sales_payments.sql  —  Phase 4: Sales, Invoices, Voids, Refunds
--   sales           : header (UPDATE-able status/refunded_amount) — has updated_at
--   sale_items      : APPEND-ONLY line items
--   sale_voids      : APPEND-ONLY void events
--   sale_refunds    : APPEND-ONLY refund events
--   Invoice number  : atomic via store_settings.invoice_counter inside the RPC.
--   create_sale_atomic: one transaction = sale + items + inventory OUT ledger rows,
--                       idempotent on p_operation_id (Rule 4).
-- =============================================================================

-- ---- sales (header) ----
create table if not exists public.sales (
  id              uuid primary key,
  operation_id    uuid not null unique,
  invoice_number  text not null unique,
  device_id       text,
  customer_id     uuid,
  customer_name   text,
  user_id         uuid,
  salesman_id     uuid,
  salesman_name   text,
  subtotal        numeric not null default 0,
  discount_amount numeric not null default 0,
  tax_amount      numeric not null default 0,
  extra_charges   numeric not null default 0,
  total_amount    numeric not null default 0,
  tendered_amount numeric not null default 0,
  change_amount   numeric not null default 0,
  payment_method  text not null default 'cash',
  status          text not null default 'completed',
  refunded_amount numeric not null default 0,
  sale_type       text not null default 'retail',
  notes           text,
  sold_at         timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_sales_sold_at  on public.sales(sold_at);
create index if not exists idx_sales_customer on public.sales(customer_id);
drop trigger if exists trg_sales_updated_at on public.sales;
create trigger trg_sales_updated_at before insert or update on public.sales
  for each row execute function public.set_updated_at();

-- ---- sale_items (APPEND-ONLY) ----
create table if not exists public.sale_items (
  id           uuid primary key,
  operation_id uuid not null unique,
  sale_id      uuid not null,
  product_id   uuid,
  variant_id   uuid,
  name         text not null,
  quantity     numeric not null,
  unit_price   numeric not null,
  unit_cost    numeric not null default 0,
  discount     numeric not null default 0,
  total_price  numeric not null,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);

-- ---- sale_voids (APPEND-ONLY) ----
create table if not exists public.sale_voids (
  id           uuid primary key,
  operation_id uuid not null unique,
  sale_id      uuid not null,
  reason       text,
  voided_by    uuid,
  device_id    text,
  created_at   timestamptz not null default now()
);

-- ---- sale_refunds (APPEND-ONLY) ----
create table if not exists public.sale_refunds (
  id           uuid primary key,
  operation_id uuid not null unique,
  sale_id      uuid not null,
  amount       numeric not null,
  reason       text,
  refunded_by  uuid,
  device_id    text,
  items_json   text,
  created_at   timestamptz not null default now()
);

-- ---- Atomic invoice-number allocator (race-safe, Section 3 note) ----
-- Increments store_settings.invoice_counter and returns the formatted number.
create or replace function public.next_invoice_number()
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_pad    integer;
  v_counter integer;
begin
  update public.store_settings
    set invoice_counter = invoice_counter + 1
  where id = (select id from public.store_settings order by created_at asc limit 1)
  returning invoice_prefix, invoice_pad_digits, invoice_counter
    into v_prefix, v_pad, v_counter;

  if v_counter is null then
    -- No store_settings row yet: fall back to a standalone counter.
    v_prefix := 'INV-';
    v_pad := 4;
    v_counter := (
      select coalesce(max((regexp_replace(invoice_number, '\D', '', 'g'))::bigint), 0) + 1
      from public.sales
    );
  end if;

  return v_prefix || lpad(v_counter::text, greatest(v_pad, 1), '0');
end;
$$;

-- ---- create_sale_atomic: sale + items + inventory OUT, idempotent on operation_id ----
create or replace function public.create_sale_atomic(
  p_operation_id uuid,
  p_sale         jsonb,
  p_items        jsonb
)
returns public.sales
language plpgsql
as $$
declare
  v_sale        public.sales;
  v_existing    public.sales;
  v_item        jsonb;
  v_invoice     text;
  v_sale_id     uuid := gen_random_uuid();
  v_track       boolean;
begin
  -- Idempotency guard (Rule 4): replay returns the already-created sale, no double post.
  select * into v_existing from public.sales where operation_id = p_operation_id;
  if found then
    return v_existing;
  end if;

  v_invoice := public.next_invoice_number();

  insert into public.sales (
    id, operation_id, invoice_number, device_id, customer_id, customer_name,
    user_id, salesman_id, salesman_name, subtotal, discount_amount, tax_amount,
    extra_charges, total_amount, tendered_amount, change_amount, payment_method,
    status, refunded_amount, sale_type, notes, sold_at
  ) values (
    v_sale_id, p_operation_id, v_invoice,
    p_sale->>'device_id',
    (p_sale->>'customer_id')::uuid,
    p_sale->>'customer_name',
    (p_sale->>'user_id')::uuid,
    (p_sale->>'salesman_id')::uuid,
    p_sale->>'salesman_name',
    coalesce((p_sale->>'subtotal')::numeric, 0),
    coalesce((p_sale->>'discount_amount')::numeric, 0),
    coalesce((p_sale->>'tax_amount')::numeric, 0),
    coalesce((p_sale->>'extra_charges')::numeric, 0),
    coalesce((p_sale->>'total_amount')::numeric, 0),
    coalesce((p_sale->>'tendered_amount')::numeric, 0),
    coalesce((p_sale->>'change_amount')::numeric, 0),
    coalesce(p_sale->>'payment_method', 'cash'),
    coalesce(p_sale->>'status', 'completed'),
    coalesce((p_sale->>'refunded_amount')::numeric, 0),
    coalesce(p_sale->>'sale_type', 'retail'),
    p_sale->>'notes',
    coalesce((p_sale->>'sold_at')::timestamptz, now())
  ) returning * into v_sale;

  -- Line items + inventory OUT ledger rows (only when tracked).
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.sale_items (
      id, operation_id, sale_id, product_id, variant_id, name,
      quantity, unit_price, unit_cost, discount, total_price, notes
    ) values (
      gen_random_uuid(),
      coalesce((v_item->>'operation_id')::uuid, gen_random_uuid()),
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'variant_id')::uuid,
      v_item->>'name',
      coalesce((v_item->>'quantity')::numeric, 0),
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce((v_item->>'unit_cost')::numeric, 0),
      coalesce((v_item->>'discount')::numeric, 0),
      coalesce((v_item->>'total_price')::numeric, 0),
      v_item->>'notes'
    );

    v_track := coalesce((v_item->>'track_inventory')::boolean, true);
    if v_track and (v_item->>'product_id') is not null then
      insert into public.inventory_ledger (
        id, operation_id, product_id, variant_id, type, quantity,
        reference_type, reference_id, device_id, user_id
      ) values (
        gen_random_uuid(),
        gen_random_uuid(),
        (v_item->>'product_id')::uuid,
        (v_item->>'variant_id')::uuid,
        'OUT',
        -1 * coalesce((v_item->>'quantity')::numeric, 0),   -- signed OUT
        'sale',
        v_sale_id,
        p_sale->>'device_id',
        (p_sale->>'user_id')::uuid
      );
    end if;
  end loop;

  return v_sale;
end;
$$;


-- ####### SOURCE: supabase/migrations/0005_customers_ledger.sql #######
-- =============================================================================
-- 0005_customers_ledger.sql  —  Phase 5: Payment Modes, Payments, Customers,
--   Customer Ledger.
--   payment_modes : non-additive (config)   — has updated_at
--   payments      : APPEND-ONLY             — created_at only
--   customers     : non-additive            — has updated_at
--   customer_ledger: APPEND-ONLY balance    — created_at only; balance = SUM view
-- =============================================================================

-- ---- payment_modes (config) ----
create table if not exists public.payment_modes (
  id           uuid primary key,
  operation_id uuid not null unique,
  code         text not null unique,
  name         text not null,
  is_active    integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_payment_modes_updated_at on public.payment_modes;
create trigger trg_payment_modes_updated_at before insert or update on public.payment_modes
  for each row execute function public.set_updated_at();

-- Seed default modes (fixed operation_id for cross-device idempotency).
insert into public.payment_modes (id, operation_id, code, name, is_active, created_at, updated_at) values
  ('11111111-1111-4111-8111-000000000001','11111111-1111-4111-8111-a00000000001','cash','Cash',1,now(),now()),
  ('11111111-1111-4111-8111-000000000002','11111111-1111-4111-8111-a00000000002','card','Card',1,now(),now()),
  ('11111111-1111-4111-8111-000000000003','11111111-1111-4111-8111-a00000000003','bank','Bank Transfer',1,now(),now()),
  ('11111111-1111-4111-8111-000000000004','11111111-1111-4111-8111-a00000000004','udhar','Udhar / Credit',1,now(),now())
on conflict (id) do nothing;

-- ---- payments (APPEND-ONLY) ----
create table if not exists public.payments (
  id           uuid primary key,
  operation_id uuid not null unique,
  sale_id      uuid,
  mode_code    text not null,
  amount       numeric not null,
  reference    text,
  device_id    text,
  user_id      uuid,
  created_at   timestamptz not null default now()
);
create index if not exists idx_payments_sale on public.payments(sale_id);

-- ---- customers ----
create table if not exists public.customers (
  id              uuid primary key,
  operation_id    uuid not null unique,
  name            text not null,
  phone           text,
  email           text,
  address         text,
  credit_limit    numeric not null default 0,
  current_balance numeric not null default 0,
  active          integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_customers_phone on public.customers(phone);
drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before insert or update on public.customers
  for each row execute function public.set_updated_at();

-- ---- customer_ledger (APPEND-ONLY; balance is a computed sum) ----
create table if not exists public.customer_ledger (
  id           uuid primary key,
  operation_id uuid not null unique,
  customer_id  uuid not null,
  type         text not null,        -- charge (credit sale) = +, payment/repayment = -
  amount       numeric not null,     -- signed
  sale_id      uuid,
  payment_mode text,
  notes        text,
  device_id    text,
  user_id      uuid,
  created_at   timestamptz not null default now()
);
create index if not exists idx_customer_ledger_cust on public.customer_ledger(customer_id);

-- Computed customer balance (Rule 7: never a directly-edited field).
create or replace view public.customer_balances as
select
  customer_id,
  coalesce(sum(amount), 0) as balance
from public.customer_ledger
group by customer_id;


-- ####### SOURCE: supabase/migrations/0006_expenses.sql #######
-- =============================================================================
-- 0006_expenses.sql  —  Phase 6: Expenses + Expense Categories (non-additive).
-- =============================================================================

create table if not exists public.expense_categories (
  id           uuid primary key,
  operation_id uuid not null unique,
  name         text not null unique,
  active       integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_expense_categories_updated_at on public.expense_categories;
create trigger trg_expense_categories_updated_at before insert or update on public.expense_categories
  for each row execute function public.set_updated_at();

create table if not exists public.expenses (
  id           uuid primary key,
  operation_id uuid not null unique,
  title        text not null,
  category     text not null,
  amount       numeric not null,
  payment_mode text,
  store_type   text default 'retail',
  notes        text,
  user_id      uuid,
  device_id    text,
  spent_at     timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_expenses_spent_at on public.expenses(spent_at);
drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at before insert or update on public.expenses
  for each row execute function public.set_updated_at();


-- ####### SOURCE: supabase/migrations/0007_users_roles_security.sql #######
-- =============================================================================
-- 0007_users_roles_security.sql  —  Phase 7: Auth Rebuild (Section 6)
--   Simple username/password staff accounts. NO license keys, NO P2P pairing.
--   roles       : non-additive config
--   staff_users : non-additive; password_hash ONLY (PBKDF2 "salt:hash:fallback"),
--                 never plaintext. Seeded default admin/admin (a normal, editable row).
--   audit_logs  : APPEND-ONLY tamper-evident trail.
-- =============================================================================

-- ---- roles ----
create table if not exists public.roles (
  id           uuid primary key,
  operation_id uuid not null unique,
  code         text not null unique,
  name         text not null,
  permissions  text not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at before insert or update on public.roles
  for each row execute function public.set_updated_at();

insert into public.roles (id, operation_id, code, name, permissions, created_at, updated_at) values
  ('22222222-2222-4222-8222-000000000001','22222222-2222-4222-8222-a00000000001','admin','Administrator','{"all":true}',now(),now()),
  ('22222222-2222-4222-8222-000000000002','22222222-2222-4222-8222-a00000000002','manager','Manager','{"sales":true,"inventory":true,"reports":true,"expenses":true,"customers":true}',now(),now()),
  ('22222222-2222-4222-8222-000000000003','22222222-2222-4222-8222-a00000000003','cashier','Cashier','{"sales":true,"customers":true}',now(),now()),
  ('22222222-2222-4222-8222-000000000004','22222222-2222-4222-8222-a00000000004','salesman','Salesman','{"sales":true}',now(),now())
on conflict (id) do nothing;

-- ---- staff_users ----
create table if not exists public.staff_users (
  id                  uuid primary key,
  operation_id        uuid not null unique,
  username            text not null unique,
  password_hash       text not null,
  role                text not null default 'cashier',
  full_name           text,
  email               text,
  avatar              text,
  is_active           integer not null default 1,
  can_view_expiry     integer not null default 1,
  require_pin_on_sale integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_staff_users_username on public.staff_users(username);
drop trigger if exists trg_staff_users_updated_at on public.staff_users;
create trigger trg_staff_users_updated_at before insert or update on public.staff_users
  for each row execute function public.set_updated_at();

-- Default admin (Section 6.1): username 'admin', password 'admin'.
-- Hash = PBKDF2-SHA256(100k, 32B) "salt:hash:fallback" — compatible with pinCrypto.ts.
-- This is a NORMAL, editable/deletable row (not hardcoded in app logic).
insert into public.staff_users (
  id, operation_id, username, password_hash, role, full_name,
  is_active, can_view_expiry, require_pin_on_sale, created_at, updated_at
) values (
  '33333333-3333-4333-8333-000000000001',
  '33333333-3333-4333-8333-a00000000001',
  'admin',
  '0123456789abcdef0123456789abcdef:ff4c24ac0f96496324ebdf9cc8cb881671120fae0bd19b6a3d5169c93c7c4983:bb70727b9b05956cf567bb836398104206ff7b6bfc768c3292e180a80b374390',
  'admin',
  'Administrator',
  1, 1, 0, now(), now()
) on conflict (id) do nothing;

-- ---- audit_logs (APPEND-ONLY) ----
create table if not exists public.audit_logs (
  id           uuid primary key,
  operation_id uuid not null unique,
  user_id      uuid,
  device_id    text,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  details      text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at);


-- ####### SOURCE: supabase/migrations/0008_rls_policies.sql #######
-- =============================================================================
-- 0008_rls_policies.sql  —  Phase 8: Row Level Security for EVERY table (Rule 5)
--
-- Single-shop model (not multi-tenant). Staff auth is APP-LEVEL (Section 6.5),
-- NOT Supabase Auth — the client talks to Supabase with the ANON key and no user
-- session. Therefore policies must grant the `anon` (and `authenticated`) roles
-- full CRUD so the cloud-direct sync works. The SERVICE ROLE key bypasses RLS.
--
-- ⚠️ SECURITY NOTE: because there is no per-user Supabase Auth session, anyone
--   holding the shipped ANON key can read/write these tables. This is acceptable
--   ONLY for the single-shop design. Follow-up hardening = device-level Supabase
--   Auth (Section 6.5) so `anon` can be revoked and policies tightened to
--   `auth.role() = 'authenticated'`.
--
-- Every RLS-enabled table below gets at least one explicit policy (Rule 5).
-- =============================================================================

do $$
declare
  t text;
  app_tables text[] := array[
    'store_settings','receipt_settings','categories','suppliers','products',
    'product_variants','product_images','discounts','bundles','bundle_items',
    'inventory_ledger','sales','sale_items','sale_voids','sale_refunds',
    'payment_modes','payments','customers','customer_ledger',
    'expense_categories','expenses','roles','staff_users','audit_logs'
  ];
begin
  foreach t in array app_tables loop
    execute format('alter table public.%I enable row level security;', t);
    -- Idempotent: drop then recreate the single all-access policy.
    execute format('drop policy if exists %I on public.%I;', t || '_all_access', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all_access', t
    );
  end loop;
end;
$$;

-- ---- Verification helper (Rule 5 / Phase 8): list RLS-on tables with ZERO policies.
-- Run manually after migrations; MUST return no rows.
--   select c.relname
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
--     and not exists (select 1 from pg_policy p where p.polrelid = c.oid);


-- ####### SOURCE: supabase/migrations/0009_storage_buckets.sql #######
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


-- ####### SOURCE: supabase/migrations/0010_purchase_records.sql #######
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


-- ####### SOURCE: supabase/migrations/0011_history_and_features.sql #######
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


-- ####### SOURCE: supabase/migrations/0012_actor_columns_to_text.sql #######
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


-- ####### SOURCE: supabase/migrations/0013_bundle_operations.sql #######
-- 0013_bundle_operations.sql
-- PHASE 2 — Cloud atomicity for Atomic Action Bundles (AGENTS.md §1.5.4).
--
-- One bundle = ONE Postgres RPC (apply_bundle) running in a single transaction:
--   * All rows apply together or not at all — a server error rolls back the whole bundle.
--   * Idempotent on bundle_operations.operation_id — a replay returns the stored result
--     instead of erroring or duplicating.
--
-- The generic apply_bundle handles EVERY bundle (single- and multi-op) because the client
-- already builds fully-formed snake_case rows. Phase 3/4 add specialised RPCs
-- (create_sale_atomic, create_product_atomic) for actions needing server-authoritative logic;
-- those will also record into bundle_operations for the same idempotency guarantee.
--
-- Safe on existing data: additive only (new table + new function). Nothing dropped/altered.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Idempotency ledger
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.bundle_operations (
  operation_id text primary key,
  action       text not null,
  result       jsonb,
  created_at   timestamptz not null default now()
);

alter table public.bundle_operations enable row level security;

drop policy if exists bundle_operations_all on public.bundle_operations;
create policy bundle_operations_all on public.bundle_operations
  for all to anon, authenticated using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Generic atomic bundle applier
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.apply_bundle(
  p_operation_id text,
  p_action       text,
  p_rows         jsonb
) returns jsonb
language plpgsql
as $$
declare
  -- Allowlist mirrors SYNCED_TABLES (localSchema.ts). Only these tables may be written.
  v_allowed text[] := array[
    'store_settings','receipt_settings','categories','suppliers','products',
    'product_variants','product_images','discounts','bundles','bundle_items',
    'inventory_ledger','sales','sale_items','sale_voids','sale_refunds',
    'payment_modes','payments','customers','customer_ledger',
    'expense_categories','expenses','purchase_records','roles','staff_users','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log',
    'toppings','product_addons','salesmen','purchase_orders','purchase_order_items'
  ];
  -- Append-only tables (APPEND_ONLY_TABLES) never UPDATE/DELETE; conflict on operation_id.
  v_append_only text[] := array[
    'inventory_ledger','sale_items','sale_voids','sale_refunds',
    'payments','customer_ledger','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log'
  ];
  v_existing   jsonb;
  v_found      boolean;
  v_row        jsonb;
  v_table      text;
  v_op         text;
  v_payload    jsonb;
  v_set        text;
  v_count      integer := 0;
  v_result     jsonb;
begin
  -- Idempotent replay: if this action already ran, return the original stored result.
  select true, result into v_found, v_existing
    from public.bundle_operations where operation_id = p_operation_id;
  if v_found then
    return coalesce(v_existing, jsonb_build_object('replayed', true));
  end if;

  -- Apply every row inside THIS function's single transaction.
  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_table   := v_row->>'table';
    v_op      := v_row->>'op';
    v_payload := v_row->'payload';

    if v_table is null or not (v_table = any(v_allowed)) then
      raise exception 'apply_bundle: table % not allowed', v_table;
    end if;
    if v_payload is null then
      raise exception 'apply_bundle: null payload for table %', v_table;
    end if;

    if v_op = 'delete' then
      execute format('delete from public.%I where id = $1', v_table)
        using (v_payload->>'id');

    elsif v_table = any(v_append_only) then
      -- Immutable history: insert, and on replay never rewrite (conflict on operation_id).
      execute format(
        'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)
           on conflict (operation_id) do nothing', v_table, v_table)
        using v_payload;

    else
      -- Non-additive: upsert on the stable PK; update only the columns present in payload.
      select string_agg(format('%I = excluded.%I', k, k), ', ')
        into v_set
        from jsonb_object_keys(v_payload) k
        where k <> 'id';

      if v_set is null then
        execute format(
          'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)
             on conflict (id) do nothing', v_table, v_table)
          using v_payload;
      else
        execute format(
          'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)
             on conflict (id) do update set %s', v_table, v_table, v_set)
          using v_payload;
      end if;
    end if;

    v_count := v_count + 1;
  end loop;

  v_result := jsonb_build_object('ok', true, 'action', p_action, 'rows_applied', v_count);

  -- Record the action for idempotency. If a concurrent replay already inserted it, keep theirs.
  insert into public.bundle_operations (operation_id, action, result)
    values (p_operation_id, p_action, v_result)
    on conflict (operation_id) do nothing;

  return v_result;
end;
$$;

grant execute on function public.apply_bundle(text, text, jsonb) to anon, authenticated;

-- ####### SOURCE: supabase/migrations/0014_apply_bundle_delete_fix.sql #######
-- 0014_apply_bundle_delete_fix.sql
-- FIX: apply_bundle delete op failed with SQLSTATE 42883 ("operator does not exist: uuid = text")
-- because the row id was passed as text against a uuid `id` column. Cast both sides to text so
-- the generic applier works for uuid AND text primary keys. Everything else is unchanged from
-- 0013. Safe/additive: CREATE OR REPLACE of the function only.

create or replace function public.apply_bundle(
  p_operation_id text,
  p_action       text,
  p_rows         jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_allowed text[] := array[
    'store_settings','receipt_settings','categories','suppliers','products',
    'product_variants','product_images','discounts','bundles','bundle_items',
    'inventory_ledger','sales','sale_items','sale_voids','sale_refunds',
    'payment_modes','payments','customers','customer_ledger',
    'expense_categories','expenses','purchase_records','roles','staff_users','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log',
    'toppings','product_addons','salesmen','purchase_orders','purchase_order_items'
  ];
  v_append_only text[] := array[
    'inventory_ledger','sale_items','sale_voids','sale_refunds',
    'payments','customer_ledger','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log'
  ];
  v_existing   jsonb;
  v_found      boolean;
  v_row        jsonb;
  v_table      text;
  v_op         text;
  v_payload    jsonb;
  v_set        text;
  v_count      integer := 0;
  v_result     jsonb;
begin
  select true, result into v_found, v_existing
    from public.bundle_operations where operation_id = p_operation_id;
  if v_found then
    return coalesce(v_existing, jsonb_build_object('replayed', true));
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_table   := v_row->>'table';
    v_op      := v_row->>'op';
    v_payload := v_row->'payload';

    if v_table is null or not (v_table = any(v_allowed)) then
      raise exception 'apply_bundle: table % not allowed', v_table;
    end if;
    if v_payload is null then
      raise exception 'apply_bundle: null payload for table %', v_table;
    end if;

    if v_op = 'delete' then
      -- Cast both sides to text so uuid and text primary keys both work (fixes 42883).
      execute format('delete from public.%I where id::text = $1', v_table)
        using (v_payload->>'id');

    elsif v_table = any(v_append_only) then
      execute format(
        'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)
           on conflict (operation_id) do nothing', v_table, v_table)
        using v_payload;

    else
      select string_agg(format('%I = excluded.%I', k, k), ', ')
        into v_set
        from jsonb_object_keys(v_payload) k
        where k <> 'id';

      if v_set is null then
        execute format(
          'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)
             on conflict (id) do nothing', v_table, v_table)
          using v_payload;
      else
        execute format(
          'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)
             on conflict (id) do update set %s', v_table, v_table, v_set)
          using v_payload;
      end if;
    end if;

    v_count := v_count + 1;
  end loop;

  v_result := jsonb_build_object('ok', true, 'action', p_action, 'rows_applied', v_count);

  insert into public.bundle_operations (operation_id, action, result)
    values (p_operation_id, p_action, v_result)
    on conflict (operation_id) do nothing;

  return v_result;
end;
$$;

grant execute on function public.apply_bundle(text, text, jsonb) to anon, authenticated;

-- ####### SOURCE: supabase/migrations/0015_repair_quarantine.sql #######
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

-- ####### SOURCE: supabase/migrations/0016_apply_bundle_insert_defaults.sql #######
-- 0016_apply_bundle_insert_defaults.sql
-- FIX (permanent, all tables): partial INSERT payloads must respect column DEFAULTS.
-- Before: `insert ... select * from jsonb_populate_record(null::t, payload)` forced EVERY
-- omitted column to an explicit NULL, so a NOT NULL column WITH a default (e.g.
-- store_settings.store_name default 'Zaynahs POS') failed with a not-null violation on the
-- first partial settings save. Now we insert ONLY the columns present in the payload, so
-- omitted columns fall back to their table default. Delete/update behaviour unchanged.
-- Safe/additive: CREATE OR REPLACE of the function only.

create or replace function public.apply_bundle(
  p_operation_id text,
  p_action       text,
  p_rows         jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_allowed text[] := array[
    'store_settings','receipt_settings','categories','suppliers','products',
    'product_variants','product_images','discounts','bundles','bundle_items',
    'inventory_ledger','sales','sale_items','sale_voids','sale_refunds',
    'payment_modes','payments','customers','customer_ledger',
    'expense_categories','expenses','purchase_records','roles','staff_users','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log',
    'toppings','product_addons','salesmen','purchase_orders','purchase_order_items'
  ];
  v_append_only text[] := array[
    'inventory_ledger','sale_items','sale_voids','sale_refunds',
    'payments','customer_ledger','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log'
  ];
  v_existing   jsonb;
  v_found      boolean;
  v_row        jsonb;
  v_table      text;
  v_op         text;
  v_payload    jsonb;
  v_cols       text;
  v_set        text;
  v_count      integer := 0;
  v_result     jsonb;
begin
  select true, result into v_found, v_existing
    from public.bundle_operations where operation_id = p_operation_id;
  if v_found then
    return coalesce(v_existing, jsonb_build_object('replayed', true));
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_table   := v_row->>'table';
    v_op      := v_row->>'op';
    v_payload := v_row->'payload';

    if v_table is null or not (v_table = any(v_allowed)) then
      raise exception 'apply_bundle: table % not allowed', v_table;
    end if;
    if v_payload is null then
      raise exception 'apply_bundle: null payload for table %', v_table;
    end if;

    if v_op = 'delete' then
      execute format('delete from public.%I where id::text = $1', v_table)
        using (v_payload->>'id');

    else
      -- Insert ONLY the columns present in the payload so omitted columns keep their DEFAULT.
      select string_agg(format('%I', k), ', ') into v_cols
        from jsonb_object_keys(v_payload) k;
      if v_cols is null then
        raise exception 'apply_bundle: empty payload for table %', v_table;
      end if;

      if v_table = any(v_append_only) then
        execute format(
          'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)
             on conflict (operation_id) do nothing', v_table, v_cols, v_cols, v_table)
          using v_payload;
      else
        select string_agg(format('%I = excluded.%I', k, k), ', ') into v_set
          from jsonb_object_keys(v_payload) k where k <> 'id';
        if v_set is null then
          execute format(
            'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)
               on conflict (id) do nothing', v_table, v_cols, v_cols, v_table)
            using v_payload;
        else
          execute format(
            'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)
               on conflict (id) do update set %s', v_table, v_cols, v_cols, v_table, v_set)
            using v_payload;
        end if;
      end if;
    end if;

    v_count := v_count + 1;
  end loop;

  v_result := jsonb_build_object('ok', true, 'action', p_action, 'rows_applied', v_count);

  insert into public.bundle_operations (operation_id, action, result)
    values (p_operation_id, p_action, v_result)
    on conflict (operation_id) do nothing;

  return v_result;
end;
$$;

grant execute on function public.apply_bundle(text, text, jsonb) to anon, authenticated;

-- ####### SOURCE: supabase/migrations/0017_soft_delete_tombstones.sql #######
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

-- ####### SOURCE: supabase/migrations/0018_staff_permissions.sql #######
-- 0018_staff_permissions.sql
-- Persist per-user privileges. staff_users only had role + can_view_expiry + require_pin_on_sale,
-- so the "New Staff" privilege toggles (Price Override, Manage Products, Void/Delete, Issue
-- Discounts, Inventory Adjust, PO, Transaction Records, Edit Completed Sales, View Profit) were
-- never saved, synced, or enforced. A single `permissions` jsonb holds the full per-user map so
-- it persists, syncs to every device (staff_users is pulled), and drives enforcement. Additive;
-- existing users default to '{}' and fall back to role defaults, so nobody is locked out.

alter table public.staff_users add column if not exists permissions jsonb not null default '{}';

-- ####### SOURCE: supabase/migrations/0019_staff_permissions_text.sql #######
-- 0019_staff_permissions_text.sql
-- Store staff_users.permissions as TEXT (JSON string), not jsonb. The local SQLite mirror keeps
-- this column as TEXT, and the write path (updateRow re-selects the row) pushes the JSON as a
-- string; a jsonb column would double-encode that string. TEXT keeps push + pull symmetric
-- (the app parses/stringifies the JSON itself). Safe: only '{}' defaults exist so far.

alter table public.staff_users
  alter column permissions type text using permissions::text,
  alter column permissions set default '{}';

-- ####### SOURCE: supabase/migrations/0020_integration_settings.sql #######
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

-- ####### SOURCE: supabase/migrations/0021_apply_bundle_future_proof_tables.sql #######
-- 0021_apply_bundle_future_proof_tables.sql
-- Make apply_bundle FUTURE-PROOF for new synced tables (AGENTS.md §1.5.12): instead of a
-- hardcoded allowlist that must be edited every time a table is added, allow any EXISTING
-- public table except an explicit infra deny-list. Append-only classification stays explicit.
-- So a new synced table (e.g. integration_settings) works through the bundle system with no
-- further RPC change. Behaviour is otherwise identical to 0016.

create or replace function public.apply_bundle(
  p_operation_id text,
  p_action       text,
  p_rows         jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_denied text[] := array['bundle_operations','repair_quarantine','_migrations','sync_pull_cursor','sync_queue'];
  v_append_only text[] := array[
    'inventory_ledger','sale_items','sale_voids','sale_refunds',
    'payments','customer_ledger','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log'
  ];
  v_existing jsonb; v_found boolean; v_row jsonb; v_table text; v_op text; v_payload jsonb;
  v_cols text; v_set text; v_count integer := 0; v_result jsonb;
begin
  select true, result into v_found, v_existing from public.bundle_operations where operation_id = p_operation_id;
  if v_found then return coalesce(v_existing, jsonb_build_object('replayed', true)); end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_table := v_row->>'table'; v_op := v_row->>'op'; v_payload := v_row->'payload';

    if v_table is null or v_table = any(v_denied) or to_regclass('public.' || v_table) is null then
      raise exception 'apply_bundle: table % not allowed', v_table;
    end if;
    if v_payload is null then raise exception 'apply_bundle: null payload for table %', v_table; end if;

    if v_op = 'delete' then
      execute format('delete from public.%I where id::text = $1', v_table) using (v_payload->>'id');
    else
      select string_agg(format('%I', k), ', ') into v_cols from jsonb_object_keys(v_payload) k;
      if v_cols is null then raise exception 'apply_bundle: empty payload for table %', v_table; end if;

      if v_table = any(v_append_only) then
        execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (operation_id) do nothing', v_table, v_cols, v_cols, v_table) using v_payload;
      else
        select string_agg(format('%I = excluded.%I', k, k), ', ') into v_set from jsonb_object_keys(v_payload) k where k <> 'id';
        if v_set is null then
          execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (id) do nothing', v_table, v_cols, v_cols, v_table) using v_payload;
        else
          execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (id) do update set %s', v_table, v_cols, v_cols, v_table, v_set) using v_payload;
        end if;
      end if;
    end if;
    v_count := v_count + 1;
  end loop;

  v_result := jsonb_build_object('ok', true, 'action', p_action, 'rows_applied', v_count);
  insert into public.bundle_operations (operation_id, action, result) values (p_operation_id, p_action, v_result) on conflict (operation_id) do nothing;
  return v_result;
end;
$$;

grant execute on function public.apply_bundle(text, text, jsonb) to anon, authenticated;

-- ####### SOURCE: supabase/migrations/0022_integration_settings_created_at.sql #######
-- 0022_integration_settings_created_at.sql
-- This project's integration_settings pre-existed without a created_at column, while the write
-- layer (writeThrough) always sets created_at on non-append inserts. Add it idempotently so
-- inserts succeed and the table matches the 0020 schema on fresh clones.

alter table public.integration_settings add column if not exists created_at timestamptz not null default now();
alter table public.integration_settings add column if not exists key_value text;
alter table public.integration_settings add column if not exists metadata text;
alter table public.integration_settings add column if not exists updated_by text;
