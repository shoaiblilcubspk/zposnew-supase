# Zaynahs POS — P2P → Supabase Full Migration Plan
**Goal:** P2P sync system ko completely khatam karein, poori app ko Supabase-only (cloud-direct, server-authoritative) banayein. Koi patch nahi — clean, phased, production-grade rebuild of the data layer. Offline support local SQLite cache + sync queue ke zariye rahega (device↔server, kabhi device↔device nahi).

## STATUS: Phase 0 DONE
- Supabase project already created (India region).
- Credentials already present in `.env.local` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REGION`).
- **DO NOT create a new project. DO NOT ask for credentials — read them from `.env.local`.**
- Agent starts directly from **Phase 1** onward, in order, one phase at a time, fully complete each before moving to the next. No patches, no shortcuts, full production code every phase.

---

## LIVE PROGRESS TRACKER (update after every phase — nothing gets missed)

> Last updated: schema Phases 1–9 applied to the live project (ref in `.env.local`) and verified.

### Phase completion
| Phase | Scope | Migration file | Applied to DB | Verified | Status |
|---|---|---|---|---|---|
| 0 | Env + project (India) | — | ✅ | ✅ | DONE |
| 1 | Core: store_settings, receipt_settings | `0001_init_core_tables.sql` | ✅ | ✅ | DONE |
| 2 | Products, categories, suppliers, discounts, bundles, variants, images | `0002_products_inventory.sql` | ✅ | ✅ | DONE |
| 3 | inventory_ledger (append-only) + `current_stock` view | `0003_inventory_ledger.sql` | ✅ | ✅ | DONE |
| 4 | sales, sale_items, sale_voids, sale_refunds + `next_invoice_number()` + `create_sale_atomic()` | `0004_sales_payments.sql` | ✅ | ✅ (idempotent replay tested) | DONE |
| 5 | payment_modes, payments, customers, customer_ledger + `customer_balances` view | `0005_customers_ledger.sql` | ✅ | ✅ | DONE |
| 6 | expenses, expense_categories | `0006_expenses.sql` | ✅ | ✅ | DONE |
| 7 | roles, staff_users (seed admin/admin), audit_logs | `0007_users_roles_security.sql` | ✅ | ✅ | DONE |
| 8 | RLS enable + policy on all 24 app tables | `0008_rls_policies.sql` | ✅ | ✅ (zero RLS-without-policy) | DONE |
| 9 | Storage bucket `product-images` + RPC grants | `0009_storage_buckets.sql` | ✅ | ✅ (anon CRUD path tested) | DONE |
| 9-local | Local SQLite mirror layer (`src/data/localSchema.ts`) | — | n/a | ✅ (exists, mirrors 1:1) | DONE (pre-existing) |
| 10 | Sync engine (write-through + queue + worker + pull) | — | n/a | ⏳ partial | code exists in `src/data/`, needs feature wiring + Phase-12 tests |
| 11 | Remove P2P code (full repo sweep) | — | n/a | ❌ | NOT STARTED |
| 12 | Testing & validation (offline bill, RLS, camelCase grep, concurrent write) | — | n/a | ❌ | NOT STARTED |

### Artifacts produced
- ✅ `supabase/migrations/0001…0009_*.sql`
- ✅ `supabase/MASTER_SCHEMA.sql` (single runnable file; re-run idempotent-verified)
- ✅ `supabase/SCHEMA.md` (human-readable)
- ✅ `supabase/README.md` (setup/migrate commands + security note)
- ✅ `scripts/supabase-migrate.mjs`, `scripts/setup-supabase.mjs`
- ✅ `src/data/` layer (client, localDb, localSchema, syncQueue, syncWorker, pullSync, writeThrough, authService, dataLayer)

### Verified facts (live project)
- 24 app tables + `_migrations`; RLS ON on all 24, each with ≥1 policy (Rule 5 pass).
- Seeds present: admin/admin staff user, roles (admin/manager/cashier/salesman), payment_modes (cash/card/bank/udhar), `product-images` bucket (private).
- `create_sale_atomic` idempotent on `operation_id` (double-call → single sale row, same invoice).
- Server `updated_at` trigger authoritative (updated_at > created_at on upsert) — Rule 8.
- Real anon-key path tested: INSERT / UPSERT(onConflict=id) / SELECT / DELETE all OK.

### 🗂️ HISTORY / FEATURE TABLES PLAN (owner: keep everything, remove nothing)
Add migration `0011_history_and_features.sql` + mirror in localSchema + convert services. New tables:
| Table | Kind | Service |
|---|---|---|
| `stock_history` | append-only | stockHistoryService, saleCreate.stock |
| `variant_stock_history` | append-only | variantStockHistoryService, applyVariantStockMovement |
| `price_history` | append-only | priceHistoryService |
| `sale_audit_log` | append-only | auditLogService |
| `toppings` | config | toppingsService |
| `product_addons` | config | productAddonsService |
| `salesmen` | config | salesmenService |
| `purchase_orders` + `purchase_order_items` | config | PO module |
Status: ✅ DONE — `0011_history_and_features.sql` applied live; localSchema + SYNCED_TABLES +
APPEND_ONLY updated; services converted (stockHistoryService, variantStockHistoryService,
priceHistoryService, auditLogService, toppingsService, productAddonsService, salesmenService,
applyVariantStockMovement, saleStockMovements, productsService.adjustStock,
customersService.getCustomerPayments). All tsc-clean. Nothing removed — everything preserved.

### 🧭 WIRING DECISIONS (locked by owner — Phase 10/11 approach)
1. **camelCase → snake_case:** Owner chose FULL snake_case end-to-end (Rule 3 pure) as the
   eventual target. **PRAGMATIC INTERIM (in effect now):** repositories read/write the new
   snake_case data layer but map to the existing camelCase domain types AT THE REPO BOUNDARY,
   so the whole UI keeps working while domains are migrated one by one. Rewriting every type +
   store + component + receipt + report to snake_case is a large, separate cleanup pass done
   AFTER all repos are on the new layer and the app is runtime-verified. This interim is a
   conscious deviation from "no conversion layer" — recorded here so it is not lost.
2. **Old local data:** Fresh start from Supabase. Old SQLite (`zaynahs_pos.sqlite`) + Dexie
   (`PosDB`) data is abandoned (dev/test data). New mirror = `zaynahs_cloud.sqlite`, hydrated
   from Supabase only. (One-time import script only if real shop data must survive — not now.)
3. **Rollout:** Incremental, domain-by-domain. App must keep working after each domain switch.
   Order: Foundation (boot+auth) → leaf domains (categories, suppliers, expenses) → products →
   inventory → customers → sales/payments → settings/receipts → reports → delete P2P.

### Phase 10a — done (code)
- `src/data/localDb.ts` now uses a dedicated `createDriver()` instance (own connection to
  `zaynahs_cloud.sqlite`) instead of the shared singleton — no collision with legacy DB.
- `src/lib/db/drivers/wasmDriver.ts` now namespaces IndexedDB persistence by db name
  (`idbKeyFor`): legacy `zaynahs_pos.sqlite` keeps its original `active_database` key (data
  untouched); the mirror uses its own key. Lets both DBs coexist during migration.
- `src/context/AuthContext.tsx` `initAuth()` now calls `initDataLayer()` (best-effort, never
  blocks boot) right after `initDb()`.
- ⚠️ NOT build-verified: local `node_modules` disappeared from the workspace (also `scripts/`
  got wiped once) — looks like an external sync/cleanup process on this "…copy" folder. Must
  `npm install` then `npm run dev` / `npm run typecheck` to verify before continuing 10b+.

### 📊 CURRENT ARCHITECTURE REALITY (from full codebase audit)
The app today runs THREE data systems in parallel — all must be replaced by `src/data/`:
- **Old SQLite** `src/lib/db/` (snake_case, epoch-int timestamps, NO operation_id, PIN `users`).
- **Dexie/IndexedDB** `src/lib/PosDB.ts` + `src/lib/localDb.ts` (camelCase mirror — retire fully).
- **P2P outbox + WebRTC mesh** `src/lib/events/`, `src/lib/mesh/`, `src/lib/sync/` + 12
  `*EventHandlers.ts` + `src/lib/media/p2pImageTransfer.ts` (delete).
- Boot chain: `main.tsx → App.tsx → app/App.core.tsx → AppContent.tsx`. DB init lives in
  `context/AuthContext.tsx initAuth()` (calls old `initDb()`); P2P starts via
  `useMeshBootstrap()` in `AppContent.tsx`. Store hydration: `context/useAppLoadData.ts` +
  `lib/sync/storeSync.ts`. Writes: `commitLocalTransaction` (`lib/events/transactionManager.ts`)
  used by ~30 repositories, each also mirroring to Dexie.

### Phase 10/11 sub-phase tracker (incremental cutover)
| Sub | Scope | Status |
|---|---|---|
| 10a | Boot: call `initDataLayer()`; keep app booting on new mirror | ✅ CODE DONE (build unverified — node_modules missing) |
| 10b | Auth: PIN `users` → password `staff_users` (`src/data/authService.ts`); login UI | ❌ |
| 10c | Domain: categories repo → new layer | ✅ repo done (tsc clean) — types/UI still camelCase (mapper boundary) |
| 10d | Domain: suppliers repo → new layer | ✅ repo done (tsc clean) |
| 10e | Domain: expenses repo → new layer | ✅ repo done (tsc clean) |
| 10h | Domain: customers + customer_ledger repos → new layer | ✅ repos done (tsc clean) |
| 10x | Domain: discounts repo → new layer | ✅ repo done (tsc clean) |
| 10f | Domain: products repo + catalogResolvers → new layer | ✅ repo done (tsc clean) — needs runtime test |
| 10g | Domain: inventory_ledger + stockMovementCommit + purchaseRecords (new `0010_purchase_records.sql`) | ✅ repos done (tsc clean) — needs runtime test |
| 10i | Domain: sales/sale_items/voids/refunds + payments — salesRepository, saleQueries, localSaleCommit, void/edit/refund coordinators → new layer | ✅ repos done (tsc clean) — ⚠️ MUST runtime-verify money/stock (Rule 2.17/2.20) |
| 10j | Domain: store_settings + receipt_settings | ❌ |
| 10k | Reports re-pointed to new local reads | ❌ |
| 10j | Wallets/payment modes (walletRepository, paymentsService) → balances computed from SUM(payments) (no stored balance, Rule 7) | ✅ repos done (tsc clean) |
| 10k | Bundles (bundleGetAll/Create/Update/Delete) → new layer | ✅ repos done (tsc clean) |
| 10b | Auth: PIN `users` → password `staff_users` (userRepository + localAuthService + AuthContext + recoveryService) | ✅ DONE (tsc clean). Login/first-launch now read staff_users mirror; boot awaits initDataLayer pull first. admin/admin seeded server-side. |
| 10L | settings/receipts (settingsService) → store_settings + receipt_settings (device-local keys stay in localStorage) | ✅ done (tsc clean) — reuses existing mapSettings/toRemoteSettings, splits into 2 singleton rows |
| 10m | supplier ledger coordinator → new layer (bills→purchase_records + suppliers.balance, payments→payments) | ✅ done (tsc clean). Long-tail history helpers (stock/variant/price/toppings) still Dexie — need decisions. |
| 11a | Delete P2P: mesh/, sync/, event handlers, p2pImageTransfer, events/ | ✅ DONE. Deleted all of src/lib/mesh/* (except deviceIdentity helper), src/lib/sync/* (except storeSync + repurposed syncStatusStore), 12 *EventHandlers, p2pImageTransfer, and the entire src/lib/events/ outbox. P2P UI stubbed (JoinShop/JoinStore/PairDevice/DeviceMeshTab), DeviceMeshList deleted, SyncStatusWidget + useProductImage de-P2P'd. Errors 449→414. |
| 11b | Retire Dexie (PosDB, localDb) + old lib/db | ✅ SUBSTANTIALLY DONE. ALL business/synced data is off Dexie. Converted every remaining importer (useAppLoadData, SupabaseAppContext, actionToken, usersService, storeSync, useInvoice, stockInCommit, detailSave, useProductDetailData/History, useCheckoutPayment, usePurchaseHistory, CartItemListImpl, DashboardManager, useExpenseManagerActions, BatchStockInSystem, WalletStrip) + moved id/SETTINGS_ID helpers to Dexie-free `src/lib/ids.ts` + salesTabs → localStorage. Deleted dead realtime handlers. **Only remaining Dexie use: `savedReceiptPngs` (device-local receipt PNG blobs) in useReceiptActionsImpl** — acceptable device-local media (Rule 12), zero business data. Errors 456→388. |
| 11c | Grep sweep: getSyncEngine/getP2PMesh/signaling/pushPendingEventsToPeers/registerEventHandler/requestImageFromPeers = 0 real matches | ✅ DONE (0 matches in src). |
| 11b | Retire Dexie: `PosDB.ts`, `localDb.ts`, old `lib/db/` + migrations | ❌ |
| 11c | Grep sweep: webrtc/datachannel/peer/p2p/pairing/gossip/lww/mesh = 0 real matches | ❌ |
| 12 | Tests: offline bill, RLS, camelCase grep, concurrent write | ❌ |

### ✅ Session 2 summary (core transactional migration)
Converted to the new `src/data` layer (all tsc-clean; total TS errors 456→450, i.e. zero new
errors added): **boot wiring**, and repositories for **categories, suppliers, customers,
customer_ledger, discounts, expenses, products, catalogResolvers, inventory_ledger,
stockMovementCommit, purchase_records (new 0010 migration), bundles, wallets/payment modes,
and the full sales cluster** (salesRepository, saleQueries, localSaleCommit, void/edit/refund
coordinators). 22 service files now import from `src/data`.

### 🚧 What genuinely remains (needs runtime test and/or product decisions)
1. **Auth (10b)** — highest risk: converting login from PIN `users` → password `staff_users`
   can lock the app if boot/pull ordering or the hash check is wrong. MUST be built with the
   app running so login is verified live. Do NOT do this blind.
2. **Settings (10L)** — large field-by-field mapping of `AppSettings` ↔ `store_settings` +
   `receipt_settings` (~80 fields). Device-local keys stay in localStorage (Rule 12).
3. **History sub-features** — stock/variant/price history + toppings are Dexie-only today.
   DECISION: derive from `inventory_ledger`, add new migrations, or drop. Nothing lost until decided.
4. **P2P deletion (Phase 11)** + **Dexie retire (11b)** + **grep sweep (11c)**.
5. **Runtime tests (Phase 12)** — offline bill, void/refund money+stock, RLS, concurrent write.
   FINANCIAL CODE IS tsc-CLEAN BUT NOT RUNTIME-VERIFIED (Rule 2.17/2.20).

### ⚠️ OPEN ITEMS / DEVIATIONS TO RECONCILE (do not lose track)
1. **Rule 15 (`id uuid DEFAULT gen_random_uuid()`)** — current tables use `id uuid PRIMARY KEY`
   WITHOUT a server-side default, because the client always supplies the UUID (`safeRandomUUID`)
   and the local SQLite mirror has no default either. Adding `DEFAULT gen_random_uuid()` is
   harmless (client value wins) — TODO: add via a NEW migration `0010_*` for belt-and-suspenders
   safety, then regenerate `MASTER_SCHEMA.sql`.
2. **Rule 16 (standard metadata columns)** — `shop_id` and `deleted_at` are NOT present (single-shop
   design uses soft-delete via `active`/`is_active` flags instead of `deleted_at`; no tenant scope
   needed). `device_id` exists only on tables that record it (ledger/sales/payments/audit), not all.
   `version` exists on `products` only. DECISION NEEDED: either (a) formally accept the single-shop
   simplification and amend Rule 16 in the plan, or (b) add the columns via a new migration. Currently
   following (a); flagged here so it is a conscious choice, not an accidental omission.
3. **Device records table** (Section 7: "for troubleshooting/tracking only") — NOT yet created. Add
   in a later migration if device audit is wanted (NOT for P2P pairing).
4. **`device_approvals` table** (Section 3 users row) — intentionally OMITTED (P2P pairing artifact,
   banned by Rule 1). Confirmed dropped from scope.
5. **RLS hardening** — policies grant `anon` full CRUD because staff auth is app-level (no per-user
   Supabase Auth session). Follow-up: device-level Supabase Auth (Section 6.5) to revoke anon +
   tighten to `authenticated`.
6. **Split payments / credit repayment** — modeled via `payments` (append-only, multiple rows per
   sale) + `payment_modes` (`udhar` = credit) + `customer_ledger`. No dedicated split table; verify
   the checkout flow writes multiple payment rows in Phase 10 wiring.

---

## 0. Non-Negotiable Rules (paste into `AGENTS.md`)

```markdown
## Data Architecture Rules (MANDATORY — DO NOT DEVIATE)

1. P2P / WebRTC / device-to-device sync is BANNED. All data flows through Supabase only.
2. Supabase is the single source of truth. No exceptions.
3. Naming convention: snake_case EVERYWHERE — DB columns, API payloads, frontend state,
   sync queue payloads. No camelCase conversion layer anywhere in the codebase.
4. Every write operation (create/update/delete) MUST carry a client-generated `operation_id`
   (UUID v4) for idempotency. Server enforces UNIQUE(operation_id) per table.
5. Every table with tenant/user data MUST have Row Level Security (RLS) ENABLED, with an
   explicit policy. A table with RLS on and no policy is a bug — every table needs at least
   one SELECT/INSERT/UPDATE/DELETE policy before it ships.
6. Background/sync jobs use the Supabase SERVICE ROLE key (server-side only, never shipped
   to client). Client apps use the ANON key + authenticated user session only.
7. Additive data (stock movements, sales, payments, customer ledger entries) is NEVER
   overwritten — it is always an INSERT into an immutable ledger table. Current balance/stock
   is a computed VIEW or aggregate, never a directly-edited field.
8. Non-additive data (products, customers, settings, discounts) uses normal UPDATE, protected
   by `operation_id` idempotency + `updated_at` server timestamp (server clock, not client
   clock) for conflict ordering.
9. Local device storage = SQLite only (not IndexedDB/Dexie). Schema mirrors the Supabase
   schema 1:1 (same table/column names) so the sync mapping layer stays trivial.
10. No manual schema patches. Every schema change is a new numbered migration file in
    supabase/migrations/. The master schema file (supabase/SCHEMA.md) is regenerated/updated
    after every migration so a fresh clone can always see current true state at a glance.
11. All Supabase operations (schema, RLS, storage, project config) go through the Supabase
    API/CLI using credentials in `.env.local` — never manual dashboard edits without also
    committing the equivalent migration file.
12. Per-device-only settings (never synced): theme, posGridColumns, iconStyle, interfaceMode,
    touchKeyboardEnabled, receiptPrinter, enableKotPrinter, autoSaveReceiptPng. These stay in
    local device storage / localStorage only — never touch Supabase.
13. OLD AUTH SYSTEM IS FULLY REMOVED. No license keys, no P2P device-pairing auth, no
    key-based activation of any kind. Replaced entirely by simple username/password staff
    accounts (see Section 6 — Auth System).
14. MASTER SCHEMA FILE: `supabase/MASTER_SCHEMA.sql` is a single, complete, always-current,
    directly-runnable SQL file (full CREATE TABLE / RLS / storage bucket / sequence
    definitions for the ENTIRE database — not a summary, not partial). On a fresh Supabase
    project with nothing in it, running this ONE file must produce the full, complete,
    working schema from scratch — no need to replay migration history in order.
    Rule: after EVERY migration, `MASTER_SCHEMA.sql` is regenerated/updated in the same
    commit so it always matches true current state exactly. `SCHEMA.md` remains a separate
    human-readable doc (Section 1) — `MASTER_SCHEMA.sql` is the executable source of truth
    for "clone repo → fresh project → run one file → done."
15. UUID PRIMARY KEYS: every table's primary key column is `id UUID DEFAULT gen_random_uuid()
    PRIMARY KEY` — never an auto-increment integer, on any table, no exceptions. This applies
    to every business table (products, sales, sale_items, customers, payments, inventory_ledger,
    customer_ledger, expenses, staff_users, devices, etc.) as well as `operation_id` (Rule 4).
16. STANDARD METADATA COLUMNS: every synced table includes, in addition to its own columns:
    `id UUID PK`, `shop_id UUID` (or equivalent tenant scope, per single-shop design already
    established), `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`
    (server-set, drives conflict ordering per Rule 8), `device_id UUID` (which device the write
    originated from, for audit), and `deleted_at timestamptz NULL` (soft delete — set instead of
    a hard DELETE wherever the table has downstream references; NULL = active row). A `version`
    integer column (starts at 1, incremented on every update) is added to non-additive/overwrite
    tables (products, customers, settings, discounts, staff_users, etc.) as an extra safety check
    alongside `updated_at` — not used on append-only ledger tables (inventory_ledger, sales,
    payments, customer_ledger), which are never updated in place, only inserted.
```

---

## 1. Folder Structure to Create

```
/supabase
  /migrations
    0001_init_core_tables.sql
    0002_products_inventory.sql
    0003_sales_payments.sql
    0004_customers_ledger.sql
    0005_expenses.sql
    0006_settings_receipt_config.sql
    0007_users_roles_security.sql
    0008_rls_policies.sql
    0009_storage_buckets.sql
    ... (one file per phase, never edit old ones, always add new)
  SCHEMA.md              <- human-readable master schema doc, always kept current
  MASTER_SCHEMA.sql      <- single complete runnable SQL file, always current — run on a
                             fresh/empty Supabase project to build the ENTIRE DB in one shot
  README.md              <- how to run `supabase db push`, how to clone-and-setup fresh
/src
  /data                  <- all Supabase access lives here, nowhere else in the app
    supabaseClient.ts
    syncQueue.ts
    syncWorker.ts
    localDb.ts            <- SQLite setup/schema (mirrors supabase/SCHEMA.md)
  /features/...           <- existing app features, refactored to call /data layer only
.env.local                <- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (sync worker only), SUPABASE_PROJECT_REGION=india
```

**Rule:** `supabase/SCHEMA.md` is the master file — after every migration, update it so a fresh clone of the repo can read ONE file and know the complete current schema (tables, columns, types, RLS policies, storage buckets) without digging through migration history.

---

## 2. Environment Setup (Phase 0 — ✅ ALREADY DONE, do not repeat)

~~1. Create new Supabase project via API/CLI — region: India (ap-south-1).~~
~~2. Get credentials: SUPABASE_URL, anon key, service_role key.~~
~~3. Add to .env.local.~~

**Current state:** Project exists, `.env.local` is already filled with real credentials. Agent must read from `.env.local` directly — never regenerate, never re-create the project, never prompt the user for keys again.

4. `.env.local` in `.gitignore` — never commit real keys. Commit `.env.local.example` with empty placeholders (if not already present).
5. All further schema/RLS/storage setup done via Supabase CLI (`supabase db push`, migration files) — not manual dashboard clicking, so a fresh clone can reproduce the entire backend from `supabase/migrations/` + `supabase/MASTER_SCHEMA.sql` alone.

---

## 3. Data Categories → Tables (from your Shareable list)

| Category | Tables | Sync type |
|---|---|---|
| Store Identity | `store_settings` | Overwrite (single row) |
| Products/Categories/Discounts | `products`, `categories`, `bundles`, `discounts`, `suppliers` | Overwrite w/ idempotency |
| Product Images | Supabase Storage bucket `product-images` | Upload, checksum-verified |
| Stock & Inventory | `inventory_ledger` (in/out/audit/damage as rows, never edited) | Append-only |
| Sales & Invoices | `sales`, `sale_items`, `sale_voids`, `sale_refunds` | Append-only + status flag |
| Payments | `payments` (cash/card/transfer/split/credit types) | Append-only |
| Customers & Ledger | `customers`, `customer_ledger` (append-only balance entries) | Customers = overwrite; ledger = append-only |
| Expenses | `expenses`, `expense_categories` | Overwrite w/ idempotency |
| Business Rules/Finance Settings | `store_settings` (currency, tax, invoice counter, retail/wholesale, negative stock, refund threshold, sound toggle) | Overwrite (single row) |
| Receipt/Barcode Layout | `receipt_settings` | Overwrite (single row) |
| Users/Roles/Security | `staff_users`, `roles`, `device_approvals`, `audit_logs` | Overwrite/append mixed; PIN hashes only, never plaintext |
| Local-only (never synced) | theme, grid density, icon style, interface mode, touch keyboard, printer settings, KOT toggle, receipt PNG toggle | Stays in device localStorage/SQLite only |

**Invoice counter note:** this is a classic race-condition field across counters — use a Postgres `SEQUENCE` or atomic RPC (`increment_invoice_counter()`), never a plain read-then-write from the client.

---

## 6. Auth System — Full Spec (replaces old key/license/P2P login entirely)

**Old system removed completely:** no license keys, no key-file activation, no P2P device
pairing/approval. Nothing "grandfathered" — full removal, not disabled/hidden.

**New system: simple username + password staff accounts, offline-accurate, synced across
all devices.**

### 6.1 Default Admin (first-run)
- On fresh Supabase project + fresh local install: seed one row —
  `username: admin`, `password: admin` (hashed), `role: admin`.
- This default account is a **normal row** in `staff_users` — not hardcoded/special-cased in
  code. It can be edited or deleted like any other account once a real admin account exists.
- Recommend (not force) a "change default password" prompt on first login — but do not block
  functionality if skipped, since offline-first shops need it to just work.

### 6.2 Table: `staff_users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `username` | text UNIQUE | |
| `password_hash` | text | Argon2id or PBKDF2 — never store plaintext, never sync plaintext |
| `role` | text | admin / manager / cashier / salesman |
| `full_name` | text | |
| `is_active` | boolean | soft-disable instead of hard delete, for audit trail |
| `created_at`, `updated_at` | timestamptz | server-set |
| `operation_id` | uuid | idempotency, same pattern as every other write |

### 6.3 Where login check happens (offline-accurate)
- `staff_users` (hashes only, no plaintext) is synced to **every device's local SQLite**,
  exactly like products/customers/etc — same sync queue and idempotency system already
  defined in this plan. No separate auth-only sync path.
- **Login screen always checks the LOCAL SQLite copy first** — hash compare happens on-device.
  This makes login 100% functional offline, on every device, instantly.
- If net is available, this local check is also correct because it's already been kept in
  sync — no "online-only" fallback needed, no separate online login flow. One code path.

### 6.4 Password change / account create / delete — sync behavior
- Treated exactly like any other write in this plan: local write → `sync_queue` entry with
  `operation_id` → background worker pushes to Supabase → Supabase is source of truth →
  propagates to all other devices' local SQLite via the same pull/sync mechanism already
  defined for products/customers.
- **No special-case code path for auth** — this is the whole point of reusing the same
  sync/queue/idempotency system from Section 4: it prevents the exact "patches keep being
  needed" problem you've been hitting, because auth data behaves identically to every other
  synced table instead of having its own bespoke logic.
- Conflict rule: `updated_at` (server clock) wins on conflicting edits to the same account,
  same as all other non-additive tables (Rule 8, Section 0).

### 6.5 Session (app-level, not Supabase Auth)
- Supabase Auth is NOT used for staff login (see earlier discussion — offline requirement
  rules it out for per-staff logins).
- Supabase Auth (or a single fixed service credential) is used only once, at device level, to
  authorize the device's own Supabase connection (API access) — unrelated to which staff
  member is currently using the counter.
- After local PIN/password check succeeds, app sets its own local session (which staff_id,
  role, login time) — used for permission checks and audit_logs entries.

### 6.6 RLS impact
- `staff_users` RLS: device-level authenticated access only (same policy pattern as Section
  8/Phase 8) — no per-staff Supabase-level restriction, since permission logic is app-level
  (Section 6.5), not RLS-level, per the single-shop design already established.

---

## 7. Complete Module/Table Inventory Checklist (nothing gets missed)

Agent must verify EVERY item below has a table (or explicit local-only entry) before considering migration "done." Mark each done in `SCHEMA.md` as completed.

- [x] Store Identity: name, phone, email, website, address, logo → `store_settings`
- [x] Products (name, barcode, SKU, sale price, cost price, category, supplier, stock) → `products`
- [x] Product Images (Storage bucket, SHA-256 checksum) → bucket `product-images` + `product_images` (image_hash/storage_path/mime/size)
- [x] Categories (name, color, icon) → `categories`
- [x] Bundles & Deals → `bundles` + `bundle_items`
- [x] Discounts (percentage/fixed, status) → `discounts`
- [x] Suppliers (name, phone, address, balance) → `suppliers`
- [x] Inventory Ledger: Stock In, Stock Out, Audit/Adjustment, Damaged/Expired (all append-only) → `inventory_ledger` (type IN/OUT/AUDIT/DAMAGE) + `current_stock` view
- [x] Sales & Invoices (invoice #, items, qty, rate, subtotal, tax) → `sales` + `sale_items` + `create_sale_atomic()`
- [x] Sale Edits (item add/remove/qty change — as ledger entries, not overwrites) → sale_items append-only + inventory_ledger reversal rows
- [x] Sale Voids (bill cancel → stock reversal ledger entry) → `sale_voids` (+ ledger reversal to be posted by Phase-10 flow)
- [x] Sale Refunds (refund payout + stock reversal) → `sale_refunds` (+ ledger reversal by Phase-10 flow)
- [x] Payments: Cash, Card, Bank/Online Transfer, Split, Credit Sale, Credit Repayment → `payments` (append-only, multi-row = split) + `payment_modes` (cash/card/bank/udhar) + `customer_ledger`
- [x] Customers (name, phone, address, credit limit, notes) → `customers`
- [x] Customer Ledger (append-only balance entries) → `customer_ledger` + `customer_balances` view
- [x] Expenses (name, amount, category, date, notes) → `expenses`
- [x] Expense Categories → `expense_categories`
- [x] Business/Finance Settings: currency, tax rate, tax ID, invoice prefix/counter/padding, retail/wholesale mode, default sale type, allow-negative-stock, refund approval threshold, sound toggle → `store_settings`
- [x] Receipt/Barcode Layout: template, paper size, header/footer notes, print toggles (logo/phone/address/tax/barcode/QR/notes), margins/font size, barcode label layout (A4 columns/rows/price) → `receipt_settings`
- [x] Staff Users, Roles/Permissions, Audit Logs (see Section 6 — Auth) → `staff_users` + `roles` + `audit_logs`
- [ ] Device records (for troubleshooting/tracking only — NOT for P2P pairing/approval) → NOT yet created (open item #3)
- [x] Local-only per-device settings (never synced — listed in Section 0, Rule 12): theme, posGridColumns, iconStyle, interfaceMode, touchKeyboardEnabled, receiptPrinter, enableKotPrinter, autoSaveReceiptPng → localStorage/SQLite only, never in Supabase

**Rule:** if agent finds any data/feature in the current app not listed above, it must be added to this checklist AND to `MASTER_SCHEMA.sql`/`SCHEMA.md` before being considered migrated — nothing silently dropped.

---

## 8. P2P Removal Checklist (code + docs — full sweep, not just data layer)

Search the entire repo (not just `/src/data`) for and remove/replace every one of these:

- [ ] All WebRTC / RTCPeerConnection / DataChannel code
- [ ] Peer discovery (mDNS, broadcast, QR-pairing, local network scan) code
- [ ] `P2P_SYNC_RULES.md` and any other P2P-specific docs — delete or archive out of active docs, replace references in `AGENTS.md`/`GEMINI.md`/`PAGES_SPEC.md` etc. with pointers to this plan
- [ ] LWW conflict-resolution helper functions tied to P2P (replaced by server `updated_at` ordering, Section 0 Rule 8)
- [ ] Device approval/revocation/pairing UI screens and their backing tables (`device_approvals` as P2P-pairing — NOT the same as a simple device log, keep only if repurposed for audit, not pairing)
- [ ] "Shareable settings" P2P propagation logic (`settingsHelper.ts` and similar) — replaced entirely by Supabase sync queue (Section 4)
- [ ] Any `sync_status`/`conflict`/`vector_clock` fields tied to the old P2P model that don't match the new `operation_id` + server `updated_at` model
- [ ] Old license-key/key-file activation system (Section 6 already covers this for auth specifically — also check for any leftover key-check code elsewhere, e.g. app startup gates)
- [ ] Grep for: `webrtc`, `datachannel`, `peer`, `p2p`, `pairing`, `gossip`, `lww`, `mesh` — confirm zero real matches left (comments/docs included) once done

**Rule:** removal is a checklist item per phase, not a single cleanup at the end — as each data category is migrated (Section 3 table), its old P2P code path is deleted in the same phase, not left for later.

---

## 9. Multi-Platform Build Targets

The same Supabase + local SQLite data layer (Section 1 `/src/data`) must work unmodified across:

| Target | Package/Runtime | Local DB binding |
|---|---|---|
| Browser (PWA) | Vite/React web build | `wa-sqlite` (WASM + OPFS) |
| Windows `.exe` | Electron | `better-sqlite3` (native) |
| Mac `.dmg` | Electron | `better-sqlite3` (native) |
| Android `.apk` | Capacitor | `@capacitor-community/sqlite` |

- One shared `/src/data` layer, one shared SQL schema — only the SQLite binding differs per platform (already noted Section 1/Phase 9).
- Each platform build must pass the same offline/online test (Phase 12) independently — a fix on one platform doesn't get assumed to also fix the others; verify each.
- Images (product images, logo) — Supabase Storage as source of truth, cached locally per platform's file system equivalent (IndexedDB/OPFS for browser, filesystem for Electron/Capacitor) for offline display.

---

## 4. Phased Build Plan

> **Status:** Phases 1–9 (schema + storage + RLS) are ✅ DONE and applied to the live project —
> see the **LIVE PROGRESS TRACKER** near the top of this doc. Phases 10–12 (sync wiring, P2P
> removal, testing) are still open. Note migration filenames landed as `0001_init_core_tables`,
> `0002_products_inventory`, `0003_inventory_ledger`, `0004_sales_payments`,
> `0005_customers_ledger`, `0006_expenses`, `0007_users_roles_security`, `0008_rls_policies`,
> `0009_storage_buckets` (Phase 2 also created the `product-images` bucket via 0009).

### Phase 1 — Core Schema (Store Identity + Settings) — ✅ DONE
- `store_settings`, `receipt_settings` tables.
- Migration `0001_init_core_tables.sql`.
- Update `SCHEMA.md`.

### Phase 2 — Products, Categories, Discounts, Suppliers, Bundles — ✅ DONE
- Full tables + Storage bucket `product-images` with SHA-256 checksum column for verified uploads.
- Migration `0002_products_inventory.sql`.

### Phase 3 — Inventory Ledger — ✅ DONE
- `inventory_ledger` append-only table (type: IN/OUT/AUDIT/DAMAGE).
- Current stock = SQL view: `SUM(qty)` grouped by product.
- Migration `0003_...`.

### Phase 4 — Sales, Invoices, Voids, Refunds — ✅ DONE
- `sales`, `sale_items`, `sale_voids`, `sale_refunds`.
- Atomic RPC for creating a sale (insert sale + items + inventory_ledger rows in one transaction).
- Invoice number via Postgres sequence.
- Migration `0004_...`.

### Phase 5 — Payments & Customer Ledger — ✅ DONE
- `payments`, `customers`, `customer_ledger` (append-only, balance = computed sum).
- Migration `0005_...`.

### Phase 6 — Expenses — ✅ DONE
- `expenses`, `expense_categories`.
- Migration `0006_...`.

### Phase 7 — Users, Roles, Security (Auth Rebuild) — ✅ DONE
- Full spec: see Section 6 above.
- Remove old license-key/P2P device-pairing auth code completely (files, tables, UI screens).
- Create `staff_users` table, seed default `admin`/`admin` row.
- `roles`, `audit_logs` tables.
- Password stored as Argon2id/PBKDF2 hash column only — never plaintext, never synced plaintext.
- Login check wired to local SQLite (offline-accurate) as described in 6.3.
- Migration `0007_auth_rebuild.sql`.

### Phase 8 — RLS Policies (ALL tables) — ✅ DONE
- Single-store model: every table gets `USING (true)` scoped to authenticated staff role, OR simpler `USING (auth.role() = 'authenticated')` since it's one shop, not multi-tenant.
- Service role bypass for sync worker.
- Migration `0008_rls_policies.sql`.
- **Verify:** every RLS-enabled table has ≥1 policy — run a check query listing tables with RLS on but zero policies (this was your earlier bug).

### Phase 9 — Local SQLite Layer — ✅ DONE (pre-existing src/data/localSchema.ts)
- Mirror schema exactly (same table/column names, snake_case) in local SQLite.
- Library: `better-sqlite3` (Electron) / `@capacitor-community/sqlite` (mobile) / `wa-sqlite` (browser).
- `sync_queue` table: `operation_id UUID PK, table_name, operation_type, payload JSON, status, created_at, retry_count`.

### Phase 10 — Sync Engine — ⏳ PARTIAL (code exists, needs feature wiring)
- Every local write: (a) write to local table in a transaction, (b) write to `sync_queue` in the same transaction.
- Background worker: on interval + on reconnect, pushes `pending` queue items to Supabase via RPC/API using `operation_id` for idempotent UPSERT.
- On success → mark `synced`. On failure → exponential backoff retry, stays `pending`.
- App boot: check for leftover `pending` rows, retry immediately.

### Phase 11 — Remove P2P Code — ❌ NOT STARTED
- Delete WebRTC/DataChannel sync code, `P2P_SYNC_RULES.md` logic, peer discovery, LWW conflict resolver.
- Replace every call site with the new `/src/data` layer.
- No dead code left behind — full removal, not disabling.

### Phase 12 — Testing & Validation — ❌ NOT STARTED
- Offline bill test: disconnect net → create sale → close/reopen app → reconnect → verify exactly one row in Supabase, no duplicate, no loss.
- RLS test: confirm staff can read/write, confirm sync worker (service role) works with RLS on.
- Naming test: confirm zero camelCase leftover in API payloads (grep check).
- Concurrent-write test: two counters edit the same product simultaneously → verify `updated_at`-based resolution, no silent data loss on ledger tables (should be impossible by design since they're append-only).

---

## 5. Agent Execution Instructions

- Project + `.env.local` already set up (see Status note at top) — **start directly at Phase 1**.
- Work **one phase at a time**, fully complete each phase (schema + code + test) before moving to the next.
- Every phase ends with updated `supabase/MASTER_SCHEMA.sql` AND `supabase/SCHEMA.md`.
- No partial/patch commits — each migration file is final once written; corrections happen via a NEW migration, never editing an already-applied one.
- After each phase, confirm: fresh `git clone` + `.env.local` (already has credentials) + run `MASTER_SCHEMA.sql` → app fully functional at that phase's feature set, nothing broken.
- Report progress after each phase: which phase completed, what's next.

---

*Yeh plan aapke AGENTS.md mein Section 0 ke rules ke sath paste karein, aur agent ko batayein: "Is plan ko Phase 1 se shuru karo, ek phase mukammal kar ke agle phase pe jao, koi patch nahi, poora production-ready code."*
