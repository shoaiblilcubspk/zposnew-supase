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
