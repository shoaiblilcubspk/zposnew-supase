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
