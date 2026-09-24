# NEW CLONE SETUP — Stand Up Zaynahs POS for a New Shop

> **Audience:** an AI agent (or developer) provisioning a **fresh shop** from a clean `git clone`.
> **Promise:** follow this one doc and you get a fully working, cloud-direct POS for ANY shop —
> **no code edits, no per-shop patches, no manual Supabase dashboard clicks** (AGENTS.md §1.6, §2.9).
>
> The repo is a product. A new shop = a new Supabase project + a fresh `.env.local` + running the
> automated migration. Nothing shop-specific is ever hard-coded.

---

## 0. What you end up with
- A Supabase project containing the **complete schema** (all tables, RLS, RPCs, the
  `product-images` storage bucket, and generic seeds) built purely from `supabase/migrations/*`.
- The app booting, pulling from the cloud, and usable with the default admin login.
- Everything reproducible: re-running the migration on an empty project rebuilds the whole system.

---

## 1. Prerequisites
- Node.js 18+ and npm.
- `git clone <repo>` then `npm install`.
- A Supabase account (for a brand-new project) OR an existing empty Supabase project for this shop.

---

## 2. Credentials — `.env.local` (connection only, never committed)
`.env.local` is gitignored. It holds ONLY connection/config — never shop data. Keys:

| Key | Used by | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | app + scripts | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | app (client) | Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | maintenance scripts only (repair) | Project Settings → API → service_role key (**server-side only**) |
| `SUPABASE_MGMT_API_KEY` | migration runner | Supabase account → Access Tokens (Management API) |
| `SUPABASE_REF` | migration runner | Project ref (the subdomain in the project URL) |
| `SUPABASE_PROJECT_REGION` | provisioning (optional) | e.g. `ap-south-1` |

Example `.env.local`:
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_MGMT_API_KEY=<management-api-token>
SUPABASE_REF=<project-ref>
SUPABASE_PROJECT_REGION=ap-south-1
```

> The anon key ships to the client; the service-role key is used ONLY by local maintenance
> scripts (never imported into app code — Rule 6).

---

## 3. (Optional) Create a brand-new Supabase project
If the shop has no project yet, create one via the Management API:
```
node scripts/setup-supabase.mjs
```
This creates/configures the project (region from `SUPABASE_PROJECT_REGION`) and writes the
resulting URL/keys back into `.env.local`. If you already created the project in the dashboard,
skip this and just fill `.env.local` (Section 2).

---

## 4. Provision the database (schema + RLS + bucket + RPCs + seeds)
One command applies every numbered migration in order, idempotently:
```
node scripts/supabase-migrate.mjs
```
Check state any time:
```
node scripts/supabase-migrate.mjs --status
```
- Idempotent: a `_migrations` ledger prevents re-running an applied file. Safe to re-run.
- No dashboard clicks: tables, Row Level Security, the `product-images` bucket + its storage
  policies, the `apply_bundle` RPC + `bundle_operations`, and the `repair_quarantine` table are
  ALL created by migrations.
- Equivalent single-file rebuild: running `supabase/MASTER_SCHEMA.sql` on an empty project
  produces the identical, complete schema (use for a fresh project or a sanity check).

---

## 5. What gets created (verify these exist)
- **Business tables** (snake_case, `id` uuid, `operation_id` uuid unique, server-clock
  `updated_at`) — products, categories, suppliers, inventory_ledger, sales, sale_items,
  payments, customers, customer_ledger, expenses, purchase_records, bundles, staff_users,
  roles, history/audit tables, etc. (see `supabase/SCHEMA.md`).
- **RLS**: enabled on every table with an `anon/authenticated` policy (single-shop model).
- **Atomic Action Bundles**: `bundle_operations` (idempotency ledger) + `apply_bundle(text,text,jsonb)`
  RPC — the ONLY cloud write path for multi-table actions (AGENTS.md §1.5).
- **Storage**: private `product-images` bucket + scoped storage policies (migration 0009).
- **Images & avatars**: all images (product, bundle, staff avatar) are content-addressed —
  uploaded once to the `product-images` bucket, stored as a SHA-256 hash on the row
  (`products.image_hash`, `product_images`, `staff_users.avatar`), resolved for display via one
  shared path (bucket download + local cache, placeholder while loading), reused everywhere.
  (Store logo stays inline base64 for print receipts.)
- **Generic seeds** (every shop needs these — never shop-specific data):
  - Roles: `admin`, `manager`, `cashier`, `salesman`.
  - Payment modes: `cash`, `card`, `bank`, `udhar`.
  - Default admin staff user: **username `admin`, password `admin`** (change on first login).
- **Repair safety net**: `repair_quarantine` table.

---

## 6. Run the app
```
npm run dev            # browser dev (WASM SQLite)
# or a packaged build: npm run electron:dev / android:sync / ios:sync
```
On boot the app initialises the local SQLite mirror, pulls from Supabase, and starts the sync
worker. The header sync indicator shows real pending/failed/synced state from the queue.

---

## 7. First login + make it this shop's own (all in-app, no code)
1. Log in with **admin / admin**.
2. Change the admin password (Settings → Users / Password).
3. Enter the shop's identity in-app: store name, phone, address, logo, currency, tax, invoice
   prefix, receipt layout (Settings). **All of this is runtime data — never hard-coded.**
4. Add staff, categories, suppliers, products, customers as normal. Every write flows through
   the bundle/sync system automatically.

---

## 8. Verification checklist (prove the clone works)
- [ ] `node scripts/supabase-migrate.mjs --status` → all migrations `[x]`.
- [ ] App boots; login `admin/admin` works.
- [ ] Create a product (with an image) → it appears; image loads (resolves from the bucket).
- [ ] Make a sale → stock drops, payment recorded, appears in Sales.
- [ ] Void/refund a sale → stock restored, reversal recorded.
- [ ] Header sync indicator shows "Synced" when idle, "Queued N" offline, drains when online.
- [ ] `node scripts/repair-halfsaved.mjs` (dry-run) → `Total issues found: 0` on a fresh shop.
- [ ] `npm test` → all suites pass (incl. `writeGuard`).

---

## 9. Health & repair (any time)
- Report only (safe): `node scripts/repair-halfsaved.mjs`
- Apply fixes + quarantine (never silent delete): `node scripts/repair-halfsaved.mjs --apply`
- Failed cloud pushes are shown in **Settings → Cloud Sync** with a **Retry** button.

## 9b. Backup & Restore (Settings → Backup)
- **Backup** = encrypted `.zpos` export of the live cloud-mirror (AES-256-GCM; staff password
  hashes excluded), domain-driven via `src/lib/backup/domainRegistry.ts`.
- **Import never replaces the database.** It verifies + previews, then writes rows through the
  bundle system (`atomicWrite → apply_bundle → sync`), so it reaches Supabase and every device.
  Idempotent (no duplicates on re-import); append-only rows are never edited/deleted (Rule 7).
- The **primary backup is Supabase itself** (source of truth); `.zpos` is for offline/portable copies.

---

## 10. Golden rules for every shop (AGENTS.md §1.6)
1. **No per-shop patches.** No shop name/id/catalog/prefix/keys in source. Fixes are generic.
2. **New shop = new `.env.local` + `node scripts/supabase-migrate.mjs`.** Nothing else.
3. **Schema lives in migrations.** Any change = a new numbered migration + `MASTER_SCHEMA.sql`
   + `SCHEMA.md` update. Never a dashboard-only change.
4. **All writes go through the bundle/sync system** (`atomicWrite` → `apply_bundle`). The
   `writeGuard` test enforces this.

---

## 11. Troubleshooting
- **App can't reach cloud / 401s:** check `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- **Migration fails:** verify `SUPABASE_MGMT_API_KEY` + `SUPABASE_REF`; re-run (idempotent).
- **Images show a placeholder:** the blob will hydrate from the bucket automatically; a
  placeholder (not a broken icon) is expected until the download completes.
- **Duplicated/half-saved rows from an older build:** run the repair script (Section 9). Never
  fix a specific row in code (§1.6.5).
- **Rebuild schema from scratch on an empty project:** run `supabase/MASTER_SCHEMA.sql`.
