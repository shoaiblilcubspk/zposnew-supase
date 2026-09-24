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
