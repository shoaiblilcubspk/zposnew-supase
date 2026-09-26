-- 0025_apply_bundle_sequence_renumber.sql
-- ============================================================================
-- SERVER-AUTHORITATIVE SEQUENCE NUMBERS (AGENTS.md §1.7 / cross-device safety)
-- ============================================================================
-- Problem: two offline devices generate the same optimistic sequence number
-- (e.g. invoice INV-1016). When both come online the second push fails with
-- 23505 on a UNIQUE column (sales_invoice_number_key) and parks as a permanent
-- Failed bundle forever. Numbers were only ever guessed device-locally.
--
-- Fix (generic, not per-domain code): a `sequence_registry` maps a synced table
-- to its sequence column. Inside apply_bundle, an insert into a registered table
-- tries the client's optimistic value first; on a unique violation of that
-- column it RE-ALLOCATES the next free value server-side (max+1, prefix/pad
-- preserved) inside the SAME transaction and retries — collision-proof, zero
-- data loss, no user-facing error. Any renumbering is returned in the RPC
-- result as `renumbered: [{table,id,column,old,new}]` so each device silently
-- patches its local row. Idempotency on operation_id is unchanged.
--
-- Adding a new auto-numbered domain = INSERT one row into sequence_registry
-- (no new code). This is the ONLY approved way to allocate a cross-device
-- sequence number.
-- ============================================================================

create table if not exists public.sequence_registry (
  table_name  text not null,
  column_name text not null,
  primary key (table_name, column_name)
);

-- Live sequence today: sales.invoice_number. Future domains (purchase_orders.po_number,
-- expense vouchers, etc.) just add their row here — apply_bundle covers them automatically.
insert into public.sequence_registry (table_name, column_name)
values ('sales', 'invoice_number')
on conflict do nothing;

create or replace function public.apply_bundle(
  p_operation_id text,
  p_action       text,
  p_rows         jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_denied text[] := array['bundle_operations','repair_quarantine','_migrations','sync_pull_cursor','sync_queue','sequence_registry'];
  v_append_only text[] := array[
    'inventory_ledger','sale_items','sale_voids','sale_refunds',
    'payments','customer_ledger','audit_logs',
    'stock_history','variant_stock_history','price_history','sale_audit_log'
  ];
  v_existing jsonb; v_found boolean; v_row jsonb; v_table text; v_op text; v_payload jsonb;
  v_cols text; v_set text; v_count integer := 0; v_result jsonb;
  v_seq_col text; v_val text; v_num_txt text; v_prefix text; v_width int;
  v_maxnum bigint; v_newnum bigint; v_newval text; v_try int;
  v_renumbered jsonb := '[]'::jsonb;
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
        -- Is this table registered as carrying a cross-device sequence column?
        select column_name into v_seq_col from public.sequence_registry where table_name = v_table limit 1;

        select string_agg(format('%I = excluded.%I', k, k), ', ') into v_set from jsonb_object_keys(v_payload) k where k <> 'id';

        v_try := 0;
        loop
          begin
            if v_set is null then
              execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (id) do nothing', v_table, v_cols, v_cols, v_table) using v_payload;
            else
              execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) on conflict (id) do update set %s', v_table, v_cols, v_cols, v_table, v_set) using v_payload;
            end if;
            exit; -- success
          exception when unique_violation then
            -- Only a registered sequence column may be auto-resolved; anything else is a real error.
            if v_seq_col is null then raise; end if;
            v_try := v_try + 1;
            if v_try > 100 then raise exception 'apply_bundle: could not allocate free %.% after 100 tries', v_table, v_seq_col; end if;

            v_val := v_payload->>v_seq_col;
            if v_val is null then raise; end if;

            -- Split into prefix + trailing numeric part (e.g. 'INV-1016' -> 'INV-' , '1016').
            v_num_txt := substring(v_val from '(\d+)$');
            if v_num_txt is null then raise; end if;
            v_prefix := left(v_val, length(v_val) - length(v_num_txt));
            v_width := length(v_num_txt);

            -- Next free value = max existing numeric suffix (same prefix) + 1, never below the client's.
            execute format(
              'select coalesce(max((substring(%I from ''(\d+)$''))::bigint), 0) from public.%I where %I like $1',
              v_seq_col, v_table, v_seq_col
            ) into v_maxnum using (v_prefix || '%');

            v_newnum := greatest(v_maxnum, v_num_txt::bigint) + 1;
            v_newval := v_prefix || lpad(v_newnum::text, v_width, '0');

            v_renumbered := v_renumbered || jsonb_build_object(
              'table', v_table, 'id', v_payload->>'id', 'column', v_seq_col,
              'old', v_val, 'new', v_newval
            );
            v_payload := jsonb_set(v_payload, array[v_seq_col], to_jsonb(v_newval));
          end;
        end loop;
      end if;
    end if;
    v_count := v_count + 1;
  end loop;

  v_result := jsonb_build_object('ok', true, 'action', p_action, 'rows_applied', v_count, 'renumbered', v_renumbered);
  insert into public.bundle_operations (operation_id, action, result) values (p_operation_id, p_action, v_result) on conflict (operation_id) do nothing;
  return v_result;
end;
$$;

grant execute on function public.apply_bundle(text, text, jsonb) to anon, authenticated;
