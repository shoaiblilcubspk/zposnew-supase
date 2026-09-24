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
