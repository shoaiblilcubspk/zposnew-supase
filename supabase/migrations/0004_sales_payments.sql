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
