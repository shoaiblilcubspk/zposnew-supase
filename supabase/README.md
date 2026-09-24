# supabase/ — Cloud-Direct Backend (Zaynahs POS)

Supabase-only, server-authoritative backend. Everything here is reproducible from code —
no manual dashboard clicking (Rule 11 / Section 2.14).

## Files
| Path | Purpose |
|---|---|
| `migrations/000N_*.sql` | Numbered, append-only migrations. **Never edit an applied file** — fix forward with a new migration. |
| `MASTER_SCHEMA.sql` | Single complete runnable schema (Rule 14). Run on a fresh/empty project to build the whole DB in one shot. Regenerated after every migration. |
| `SCHEMA.md` | Human-readable schema doc. |

## Prerequisites
`.env.local` at the repo root (already populated — do **not** recreate the project):
```
VITE_SUPABASE_URL=            # client (anon)
VITE_SUPABASE_ANON_KEY=       # client (anon)
SUPABASE_SERVICE_ROLE_KEY=    # server/sync only — never in client bundle
SUPABASE_MGMT_API_KEY=        # tooling (migrations/provisioning)
SUPABASE_REF=                 # project ref
SUPABASE_PROJECT_REGION=ap-south-1
```

## Common tasks

Apply pending migrations (idempotent, tracked in `public._migrations`):
```bash
node scripts/supabase-migrate.mjs
```

Show applied/pending:
```bash
node scripts/supabase-migrate.mjs --status
```

Fresh clone → fresh project (full provisioning, 100% API-driven):
```bash
node scripts/setup-supabase.mjs          # uses existing SUPABASE_REF, else creates one
# then migrations run automatically; or run them manually:
node scripts/supabase-migrate.mjs
```

Build a brand-new empty project from the single master file instead of replaying history:
run `MASTER_SCHEMA.sql` once (via the SQL editor or the Management API `database/query`).

## Rules that govern this folder
- snake_case everywhere; every write carries a unique `operation_id` (Rules 3, 4).
- Append-only ledgers never overwritten; balances/stock are computed views (Rule 7).
- Every table has RLS enabled + ≥1 policy (Rule 5). Verify with:
  ```sql
  select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity
    and not exists (select 1 from pg_policy p where p.polrelid=c.oid);
  -- must return zero rows
  ```
- After every migration, regenerate `MASTER_SCHEMA.sql` and update `SCHEMA.md` in the same
  commit (Rules 10, 14).

## ⚠️ Security note (single-shop model)
Staff login is app-level (local hash compare), not Supabase Auth, so the client uses the ANON
key with no per-user session. RLS policies therefore grant `anon` full CRUD. Anyone holding the
shipped anon key can read/write. Acceptable only for the single-shop design; hardening path is
device-level Supabase Auth (plan Section 6.5) to enable revocation and tighter policies.
