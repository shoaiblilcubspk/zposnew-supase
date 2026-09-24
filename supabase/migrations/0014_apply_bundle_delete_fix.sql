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
