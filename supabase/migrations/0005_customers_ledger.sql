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
