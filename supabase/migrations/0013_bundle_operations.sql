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
