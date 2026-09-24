# AGENTS.md — AI Operating Manual (Supabase-Only Cloud-Direct Architecture)

> Single Source of Truth for AI Behavior, Development Workflow & Operational Rules.

> **ARCHITECTURE (AUTHORITATIVE):** The app is built as a **Supabase-only, cloud-direct, server-authoritative** system.
> P2P, WebRTC, device-to-device mesh sync, and offline license keys are **100% REMOVED**.
> Offline functionality is governed by a local SQLite cache + write-through sync queue (`src/data/`).
> Section 0 (Data Architecture Rules) and Section 1.5 (Atomic Action Bundles) are binding contracts.

---

## 0. Data Architecture Rules (MANDATORY — DO NOT DEVIATE)

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
    accounts (see the Auth System spec in the migration plan).

---

## 1. Operating Identity & Core Mandate
- **Role:** Senior Staff Software Architect + Senior Full-Stack Engineer + Database Architect + Distributed Systems Engineer.
- **Mandate:** Preserve 100% of user-facing POS features while re-engineering the system into a **Supabase-only, cloud-direct, server-authoritative** POS architecture with a local SQLite cache + sync queue for offline (device↔server only, never device↔device).
- **Execution Gate:** Work ONE phase at a time. Fully complete each phase (schema + code + verify) and update `supabase/SCHEMA.md` before moving to the next. No patches — corrections happen via a NEW migration, never by editing an already-applied one.

---

## 1.5 HARD RULE: Atomic Action Bundles (NON-NEGOTIABLE)

> This rule sits directly under Section 0. It does not weaken any existing rule (Rule 4
> operation_id, Rule 7 append-only, Sections 2.7 / 2.17 connected flow) — it enforces them.
> **A user action either fully saves (local + cloud) or fully does not. No half-saved records, ever.**

### 1.5.1 What is a bundle
- Any single user action that writes **2+ tables**, OR **writes + uploads a file**, OR
  **writes + queues sync** = **ONE atomic bundle**. Examples: create product (product +
  initial ledger + image link + price/stock history), create sale (sale + items + stock OUT +
  payments + customer ledger + audit), void/refund, stock adjust, purchase record.
- Splitting one action into separate `insertRow` / `updateRow` / `deleteRow` calls is
  **FORBIDDEN**. All parts go through `atomicWrite([...ops], { operation_id, action })`.

### 1.5.2 One operation_id per action
- Exactly **one** `operation_id` (`crypto.randomUUID()` via `newOperationId()`) is generated
  **once** per user action and **reused on every retry**. It is never regenerated on retry.
- The UI generates/holds this id at submit start; it resets only after success or discard.

### 1.5.3 Local atomicity
- All row writes + the **single** `sync_queue` bundle entry commit in **ONE** SQLite
  transaction via `atomicWrite`. Any error rolls back **everything** — zero rows, zero queue
  entries. Partial local state is a bug.
- `insertRow` / `updateRow` / `softDeleteRow` are thin single-op wrappers over `atomicWrite`
  so there is exactly **one write path**.

### 1.5.4 Cloud atomicity
- One bundle = **ONE Postgres RPC** running in a single transaction. Any server error rolls
  back the whole bundle — no partial cloud rows.
- The RPC is **idempotent** on `UNIQUE(operation_id)` (see `bundle_operations`); a replay
  returns the **original stored result** instead of erroring or duplicating.
- The sync worker pushes a bundle as one unit. On retryable failure (network/5xx) it retries
  with the **same** `operation_id` and never splits the bundle. On permanent failure
  (400/constraint) it marks the bundle `failed`, surfaces it in Settings → Cloud Sync, and
  leaves **no** partial cloud rows.

### 1.5.5 Images
- Upload the file **first**, link it **inside** the bundle. If the DB write fails, **delete
  the orphaned file**. Never leave an image referenced but unwritten, or written but unlinked.

### 1.5.6 Money + stock
- Ledger rows (`inventory_ledger`, `customer_ledger`, `payments`) and history/audit rows
  (`stock_history`, `variant_stock_history`, `price_history`, `sale_audit_log`) live **inside
  the same bundle** as their header row. Stock must never be out of sync with sale history.
- Append-only rows (Rule 7) are still INSERT-only inside the bundle — bundling does not permit
  editing immutable history.

### 1.5.7 Column types
- `user_id` / `created_by` / `reference_id` / actor columns are `text` unless they truly hold
  a UUID. (Migration 0012 already corrected `inventory_ledger`.)

### 1.5.8 Extending an existing action
- Any NEW table / field / trace / log / history / side effect added to an existing action MUST
  be added **INTO that action's bundle and RPC** — never as a separate write.
- Every new multi-table feature ships with: **(1)** bundle definition, **(2)** RPC migration,
  **(3)** failure-injection test. Without all three it is **incomplete**.

### 1.5.9 Self-check (before finishing any task touching writes)
- "Is **every** write of this action inside one bundle?"
- "Would a failure at **any** step leave partial data (local or cloud)?"
- If either answer is wrong, the task is not done.

### 1.5.10 Bundle Registry
Update this table whenever a bundle is added or changed.

| Action | Tables written | RPC | Status |
|---|---|---|---|
| create_product | categories/suppliers (resolve-or-create), products, product_images, inventory_ledger (INITIAL) | apply_bundle (generic) | ✅ done (Phase 4; image link in-bundle) |
| update_product | categories/suppliers (resolve-or-create), products, product_images (on image change), inventory_ledger (adjustment), price_history | apply_bundle (generic) | ✅ done (Phase 4; image link in-bundle) |
| create_sale | sales, sale_items, inventory_ledger, products(stock), payments, customers(balance), customer_ledger, sale_audit_log | apply_bundle (generic) | ✅ done (Phase 3) |
| void_sale | sale_voids, sales(status), inventory_ledger, products(stock), payments, customers(balance), customer_ledger, sale_audit_log | apply_bundle (generic) | ✅ done (Phase 3) |
| refund_sale | sale_refunds, sales(refunded/status), inventory_ledger, products(stock), payments, customers(balance), customer_ledger, sale_audit_log | apply_bundle (generic) | ✅ done (Phase 3) |
| add_payment | customers(balance), customer_ledger, payments | apply_bundle (generic) | ✅ done (Phase 3) |
| customer_refund | customers(balance), customer_ledger, payments | apply_bundle (generic) | ✅ done (Phase 3) |
| customer_credit | customer_ledger, customers(balance) | apply_bundle (generic) | ✅ done (Phase 3, via create_sale credit path) |
| stock_adjust | products(stock/cost), inventory_ledger, purchase_records, suppliers(balance) | apply_bundle (generic) | ✅ done (Phase 3) |
| edit_sale | sale_voids, sales(void+rename old / insert new), inventory_ledger(reversal+OUT), payments(reversal+new), customers(balance), customer_ledger, sale_audit_log | apply_bundle (generic) | ✅ done (Phase 3, Rule-7-safe void+recreate — no deletes) |
| purchase_record | purchase_records, inventory_ledger, products(cost/stock), suppliers(balance) | apply_bundle (generic) | ✅ done (create via stock_adjust Phase 3; delete-with-reversal Phase 5) |
| supplier_bill | suppliers(balance), purchase_records | apply_bundle (generic) | ✅ done (Phase 5) |
| supplier_payment | suppliers(balance), payments | apply_bundle (generic) | ✅ done (Phase 5) |
| bundle_deal | bundles, bundle_items | apply_bundle (generic) | ✅ done (Phase 5, create + item-replace) |
| expense | expenses (single table; delete via atomicWrite) | — (single-op path) | ✅ done (Phase 5) |
| purchase_order | purchase_orders, purchase_order_items | apply_bundle (generic) | ⏳ no write path yet (module not built) |

Single-table actions (categories, suppliers, customers, discounts, settings, toppings, etc.)
use the `atomicWrite` single-op path and need **no** RPC unless they touch 2+ tables.

### 1.5.11 Definition of Done (every write-touching task)
- [ ] Action uses one bundle via `atomicWrite` (no separate insert/update/delete calls).
- [ ] Cloud RPC exists and is idempotent on `operation_id` (replay returns original result).
- [ ] Failure-injection / rollback test passes (nothing saved, or fully saved).
- [ ] **All writes go through the bundle; the sync path (queue + apply_bundle) covers every
      new table/column; no raw `supabase.from().insert/update/delete/upsert` or raw SQL DML
      outside the data layer.**
- [ ] **The write-guard test passes (`tests/writeGuard.test.mjs`).**
- [ ] Bundle Registry updated.
- [ ] **Permanent fix — no patch/band-aid, no per-shop special-casing (§1.6, §2.12).**
- [ ] **On ANY schema change: numbered migration added + `supabase/MASTER_SCHEMA.sql` and
      `supabase/SCHEMA.md` regenerated (running MASTER_SCHEMA on an empty project = full schema).**
- [ ] **`docs/NEW_CLONE_SETUP.md` still accurate — a fresh `git clone` stays ready-to-use for
      any new shop (env + `node scripts/supabase-migrate.mjs` only, zero code edits).**

### 1.5.12 FUTURE-PROOF RULE: Bundle + Sync for Every Change (PERMANENT)

> This rule makes the bundle system the ONLY way data is ever written — for everything that
> exists today and everything added tomorrow. It is not optional and has no "temporary"
> exceptions. A guard test enforces it so a forgotten rule fails the build, not production.

1. **Every new writer is born on the bundle system.** Any NEW domain, table, column, field,
   feature, screen, or service that writes data MUST use the bundle system from day one:
   `atomicWrite` locally (single SQLite transaction + one `sync_queue` bundle entry), one
   `apply_bundle` push in the cloud, one `operation_id` per user action, idempotent replay.
   The ONLY approved write entry points are `atomicWrite` (multi-op) and its thin single-op
   wrappers `insertRow` / `updateRow` / `softDeleteRow`. **No exceptions, no "temporary"
   direct `insertRow` chains, no raw `supabase.from().insert/update/delete/upsert`, no raw
   SQL `INSERT/UPDATE/DELETE`, no manual `enqueue()` of table ops.**

2. **Extending a domain goes INTO its bundle.** Any UPDATE to an existing domain — a new
   field, a new history/audit/ledger row, a new side effect, a new part of the domain — MUST
   be added INTO that domain's existing bundle and RPC. Never as a separate write, and never
   as a follow-up call after the bundle commits.

3. **A new table/column ships complete or not at all.** Adding one requires ALL of:
   (a) `sync_queue` / `apply_bundle` support (allowlist + append-only classification),
   (b) a numbered migration, (c) `MASTER_SCHEMA.sql` + `SCHEMA.md` updated,
   (d) a failure-injection test, (e) a Bundle Registry row marked ✅ done.

4. **Raw writes are forbidden and guarded.** Writes outside the approved layer are banned.
   `tests/writeGuard.test.mjs` scans the source and FAILS if any file outside the data-sync
   layer performs a raw `supabase.from(<synced table>).insert/update/upsert/delete` or a raw
   `enqueue()` of an insert/update/delete op. It runs in `npm test`, so a bypass breaks the
   build immediately.

5. **Self-check before finishing ANY task.** Ask: "Does every write in this change go through
   a bundle and the sync path? Would a failure at any step leave partial data (local or
   cloud)?" If the answer is not a clean yes, the task is **NOT done**.

6. **When in doubt, STOP and ask.** If a task genuinely cannot follow this rule, halt and raise
   it with the maintainer. Never silently bypass the bundle/sync system.

---

## 1.6 CLONE-READY: One Codebase, Any Shop (NO PER-SHOP PATCHES)

> The repo is a **product**, not one shop's install. A fresh `git clone` must become a fully
> working POS for **any** new shop by running the automated setup — with **zero** code edits,
> zero hard-coded shop data, and zero manual dashboard clicks.

1. **No per-shop patches, ever.** Never hard-code a shop's name, id, products, categories,
   customers, invoice prefix, credentials, Supabase URL/keys, or any tenant data into source.
   All of that comes from `.env.local` (connection) + runtime data (entered in-app / seeded
   generically). A fix for a bug must be **generic** — it fixes the behaviour for every shop,
   not one shop's data. If you catch yourself special-casing one shop's row/name/id, STOP.

2. **Fresh clone → working system via automation only.** A new shop is provisioned by:
   (a) put Supabase project credentials in `.env.local`, (b) run `node scripts/supabase-migrate.mjs`
   (all numbered migrations, in order, idempotent), (c) the app boots, pulls, and is usable.
   No step may require editing code or clicking in the Supabase dashboard (Rule 2.9). Storage
   buckets, RLS, RPCs, seeds are all created by migrations/scripts.

3. **Everything reproducible from the repo.** `supabase/migrations/*` + `MASTER_SCHEMA.sql`
   are the single source of truth for the entire cloud (tables, RLS, buckets, RPCs, seeds).
   Running `MASTER_SCHEMA.sql` on an empty project MUST produce the complete, current schema.
   No schema exists only in someone's dashboard.

4. **Generic seeds only.** Seeded rows are role/config defaults that every shop needs (roles,
   payment modes, default admin `admin`/`admin`). Never seed a specific shop's catalog/customers.

5. **Data cleanup is data, not code.** A bad/duplicate/half-saved row is fixed with the repair
   script (`scripts/repair-halfsaved.mjs`) or normal in-app actions — never by adding code that
   targets that specific row. Display/logic bugs are fixed generically for all rows.

6. **New-clone guide is mandatory + current.** `docs/NEW_CLONE_SETUP.md` is the complete,
   no-questions agent guide to stand up a new shop end-to-end (API/CLI, migrations, bucket, RLS,
   seeds, env, verification). Whenever setup/provisioning changes, update that guide in the same
   task. A new clone must be doable by following that one doc alone.

---

## 1.7 SINGLE-CONNECTION SAFETY + TWO-WAY SYNC (PERMANENT — NO PATCH)

> Two permanent invariants learned from real bugs (bill crash "cannot start a transaction
> within a transaction"; a second device stuck showing stale data). Every future change keeps
> them true so any clone works out of the box.

### 1.7.1 One local connection → serialize every transaction
- The local SQLite mirror is a **single connection** (sql.js/wasm has one; `BEGIN IMMEDIATE`).
  Two overlapping transactions throw *"cannot start a transaction within a transaction"*.
- **ALL** transactional work MUST go through `runExclusiveTransaction` (a global promise-chain
  mutex in `src/data/localDb.ts`). `atomicWrite`, `enqueueRpc`, and pull-apply already do.
  **Never call `driver.transaction()` / `db.transaction()` directly** and never open a second
  transaction inside another. `try/finally` always releases the lock — a failed transaction
  never leaves the connection stuck.
- A write and the background pull can fire at the same moment; the mutex makes that safe.

### 1.7.2 Sync is TWO-WAY — push AND pull, for every table
- Cloud-direct sync has two halves and BOTH must work for every synced table:
  **push** (local `sync_queue` → `apply_bundle`) and **pull** (`pullSync` server → local mirror).
- Every table in `SYNCED_TABLES` is pulled by the generic `pullAll()` (server-timestamp cursor;
  append-only pulled by `created_at` with a small overlap so cross-device clock skew never
  permanently skips a row — dedup-safe via INSERT OR IGNORE). Adding a table = it is pulled and
  pushed automatically; if it ever needs special handling, add it in the same task, never patch
  one screen.
- Pull runs on **boot, interval, window focus/visibility, reconnect, and manual Sync now**, plus
  a **Force full re-sync** (drops cursors, re-pulls; keeps unsynced local bundles).

### 1.7.3 Sync status must tell the TRUTH
- The "Synced" indicator reflects **both** sides: push queue empty AND a recent successful pull.
  Never show "Synced" using only the push queue. Show pending / failed / pulling / last-pull and
  offer Retry / Discard / Force full re-sync in Settings → Cloud Sync.

### 1.7.4 Timestamps
- `updated_at` is the **server clock** (Postgres `now()` via trigger) — the authoritative pull
  cursor for non-additive tables. Client time is display-only; never drive a cursor from it.

### 1.7.5 Still open (scoped, do NOT patch around) 
- **Delete/tombstone propagation** and **Realtime push-to-pull** are the next scoped step: a
  hard delete on one device must remove the row on others (soft-delete/tombstone + pull), and
  realtime gives near-instant convergence. Ship them as a proper migration (+ MASTER_SCHEMA /
  SCHEMA.md / localSchema / NEW_CLONE_SETUP update), never as a per-screen workaround.

---

## 2. Fundamental Architectural Rules (Non-Negotiable)

### 2.1 Supabase Single Authoritative Source of Truth
- Supabase PostgreSQL is the **ONLY** authoritative single source of truth for all business data.
- The local SQLite database (`zaynahs_cloud.sqlite`) is a high-performance offline mirror and cache.
- Commits occur locally via `atomicWrite` in `< 10ms` and enqueue in `sync_queue` for cloud push.

### 2.2 Device-to-Cloud Sync (Zero Device-to-Device / P2P)
- **P2P, WebRTC, local mesh, and device-to-device sync are strictly BANNED.**
- All synchronization flows strictly between Device ↔ Supabase (push queued mutations, pull cloud deltas).
- Every write mutation carries an idempotent `operation_id` (UUID v4) enforced server-side via `UNIQUE(operation_id)`.

### 2.3 Append-Only Financial & Stock Ledger
- Stock mutations MUST be append-only rows in `inventory_ledger` (`IN`, `OUT`, `ADJUST`, `AUDIT`). Never mutate stock directly without an immutable ledger row.
- Current stock is ALWAYS a computed VIEW or aggregate (`SUM(quantity)`), never a manually updated column.
- Financial transactions (payments, customer ledger, supplier ledger) are strictly append-only.

### 2.4 Offline Operation & Cloud Convergence
- POS operates 100% offline indefinitely without blocking sales or terminal checkout.
- Offline transactions commit locally to SQLite in an atomic transaction and queue in `sync_queue`.
- Upon network reconnection, `syncWorker` pushes bundles to Supabase RPCs idempotently.
- Network or server 5xx errors retry with the exact same `operation_id`; permanent failures mark `failed` for admin resolution.

### 2.5 Connected Domain & Financial Flow
- Never allow disconnected, random direct state updates. Maintain the clear financial and inventory chain:
  - `SALE` → Sale Row + Items → Inventory OUT (`inventory_ledger`) → Payment IN (`payments`) → Customer Ledger (if credit) → Audit Log.
  - `RETURN` / `VOID` → Void/Refund Record → Inventory IN (`inventory_ledger`) → Payment Reversal → Customer Ledger Reversal → Audit Log.

### 2.6 Cloud Media & Local Image Architecture
- Binary product images are uploaded to Supabase Storage (`product-images` private bucket).
- Files are cached in the local filesystem (`$APPDATA/images/`). SQLite stores metadata (hash, URL, MIME, size).
- Upload the image file first, link inside the atomic bundle. Delete orphaned files if bundle write fails.

### 2.7 Staff Authentication & Role-Based Access Control (RBAC)
- Staff accounts (`staff_users` table) authenticate via username and secure password hash.
- Role-based permissions (`admin`, `manager`, `cashier`, `salesman`) are enforced server-authoritatively via Supabase RLS.
- Old auth systems (license keys, QR pairing tokens, offline master recovery codes, plaintext PINs) are completely eliminated.
- Terminal identity (`device_id`) is used solely for audit/traceability (`created_by`, `device_id`), not cryptographic trust.

### 2.8 Database Schema, Import/Export & Backup Synchronization Rule (Mandatory)
- Whenever any database table, migration, or column is added, modified, or removed:
  1. Add a numbered SQL migration in `supabase/migrations/` and update `supabase/MASTER_SCHEMA.sql` and `supabase/SCHEMA.md`.
  2. Synchronously mirror in local schema (`src/data/localSchema.ts`).
  3. Update Backup & Restore (`src/lib/backup/backupEngine.ts` and `restoreEngine.ts`).
  4. Update Product Catalog / Entity Import & Export (`src/lib/services/products/productExportImport.ts`).

### 2.9 Automated Supabase Provisioning (Zero Manual Dashboard Steps)
- All Supabase infrastructure (projects, buckets, migrations, RLS) is automated via scripts or Management API.
- Never ask the user to manually configure the cloud dashboard.

### 2.10 100% Zero-Refresh Reactivity Mandate (0ms Screen Updates)
- All POS operations (Sales, Deletions, Restock, Adjustments, Wallets, Badges, Expenses, Ledger) must be 100% reactive — reflecting in 0ms on screen without manual page reload.
- Native desktop (Electron/Tauri) and mobile apps (Capacitor) have no concept of browser refresh.
- Local SQLite commit immediately updates authoritative local data and triggers Zustand store updates.

### 2.11 Cross-Platform Parity (Windows EXE, macOS DMG, Android APK, iOS IPA)
- Windows, macOS, Android, and iOS builds share 100% identical business logic, schema, and offline capabilities.
- Stale browser or service worker caches are strictly prohibited.

### 2.12 Permanent Architectural Fix Mandate (Zero Band-Aids)
- Whenever any calculation error, stock mismatch, sign inversion, or business logic bug is discovered, applying superficial patches or UI-only band-aids is strictly prohibited.
- Solve every issue at its fundamental architectural origin across the entire lifecycle:
  `UI Action → Atomic Write Bundle → Local SQLite + Queue → Cloud RPC → Supabase DB → Store Sync → UI / Reports`.

### 2.13 Shareable vs Device-Local Settings (Mandatory Classification)
- ✅ **SYNCED TO SUPABASE:** Store Identity (name/phone/email/address/logo), Products, Categories, Suppliers, Stock Ledger, Sales, Payments, Customers, Expenses, Wallets, Discounts, Tax, Currency, Invoice settings, Receipt layout, Staff Users, Roles.
- 🔒 **DEVICE-LOCAL ONLY (Never synced to Supabase):** `theme`, `posGridColumns`, `iconStyle`, `interfaceMode`, `touchKeyboardEnabled`, `receiptPrinter`, `enableKotPrinter`, `autoSaveReceiptPng`. These stay in local device storage / localStorage only.

### 2.14 Deep Root-Cause Engineering & Silent Bug Elimination Mandate (The Claude Standard)
- **Zero Superficial Checks:** Whenever any bug, sync failure, state mismatch, or unexpected behavior occurs, the AI agent is STRICTLY PROHIBITED from doing high-level superficial inspections, cosmetic patches, or guessing. You MUST evaluate actual runtime values and trace code execution line by line.
- **Silent Bug Hunting (Universal Categories to Check):**
  1. **Date & Timestamp Parsing:** Never use `Number(date)` or direct string comparison. ISO strings formatted differently or passed to `Number()` silently evaluate to `NaN`, making `<` and `>` comparisons silently fail. ALWAYS use ISO strings / UTC timestamps reliably.
  2. **Network & Sync Traps (Offline / Slow Cloud Connections):** Never assume instant cloud responses. Handle slow network connections, server timeouts, queue stalls, and offline reconnection seamlessly with idempotent retries.
  3. **Type Coercion & Mathematical Traps:** In financial/ledger operations, beware of string numbers (`"10" + 5 = "105"`), floating-point arithmetic errors (`0.1 + 0.2 !== 0.3`), division by zero, and `NaN` propagation. Always sanitize and parse numbers explicitly.
  4. **Queue & Serialization Barriers:** Ensure messages, write operations, and sync queue payloads are properly serialized and validated before passing to `atomicWrite` and Supabase RPCs.
  5. **Silent Promise & Fallback Failures:** Never write empty `.catch(() => {})` blocks without logging or recovery. Ensure sync errors surface to UI / retry queues without dropping user data.
  6. **Reactivity & State Sync Traps:** Stale closures, missing dependency arrays in hooks, unmounted listeners leaking connections, and out-of-sync Zustand stores must be systematically eliminated.
- **Deep Full-Stack Investigation:** Trace issues down to the exact data layer:
  - Are SQLite transactions committing atomically without partial writes?
  - Is `atomicWrite` properly enqueuing the bundle in `sync_queue`?
  - Does the Supabase RPC return the expected payload or a constraint violation?
- **Universal Root-Cause Utilities:** When an issue is identified, do not patch just the single reporting file. Create or update centralized utilities and sweep the ENTIRE codebase for consistent immunity.
- **Rigorous Verification Protocol:** Run static type checks (`npx tsc --noEmit`), trace all call sites, test edge-case data shapes, and verify offline-to-online reconnection cycles before declaring any task complete.

### 2.15 Mandatory Next Version Bump & Universal Build Naming Rule (Zero Stale Versions)
- **Mandatory Version Bump Across All Files:** Har update, feature change, bug fix, ya rebuild se pehle version number ko semver standard ke mutabiq bump karna (`1.0.0` → `1.0.1` / `1.1.0`) strictly compulsory hai across **ALL** files simultaneously:
  1. `package.json` (`"version": "x.y.z"`) & `package-lock.json`.
  2. `src-tauri/tauri.conf.json` (`"version": "x.y.z"`).
  3. `android/app/build.gradle` (`versionCode` incremented, `versionName "x.y.z"`).
  4. `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION = x.y.z`, `CURRENT_PROJECT_VERSION` incremented).
- **Mandatory Version in ALL Binary & Package Filenames:**
  - Kisi bhi binary, package, ya artifact ko generic name (jaise `app-debug.apk` ya generic `App.ipa`) dena strictly prohibited hai.
  - Har installer aur output binary ke name me version number lazmi shamil hoga taake cashiers, clients aur testing devices par update ka turant pata chale:
    - **Android:** `Zaynahs-POS-v<version>.apk`
    - **iOS:** `Zaynahs-POS-v<version>.ipa`
    - **macOS:** `Zaynahs-POS-v<version>.dmg`
    - **Windows:** `Zaynahs-POS-v<version>-Setup.exe` aur `Zaynahs-POS-v<version>.msi`
- **GitHub Actions & Releases Par Parity:** GitHub Actions artifacts aur Release tags hamesha `v<version>` ke sath generate aur publish honge. Kabhi bhi previous/old version number reuse nahi hoga.

---


## 3. Development vs Build Workflow (Flexible & Lightweight)

During development, use either standard browser dev mode (`npm run dev`) or Tauri dev mode (`npm run tauri dev`) based on convenience and the task at hand. Both environments share 100% of the business logic, storage abstraction, and state management.

Full production installer packaging (EXE/DMG/APK/IPA) is reserved strictly for release/deployment milestones, not required after routine feature edits.

### 3.1 Local Storage & Execution Hierarchy
```text
React UI (Shared Business Logic)
   ↓
Storage Abstraction Layer (Tauri Native SQLite / Browser Wasm SQLite)
   ↓
Local OS / Browser Storage
   ├── database.sqlite       (Authoritative local source of truth)
   ├── images/               (Locally stored content-addressed images)
   ├── product-images/       (Cached & chunked product assets)
   ├── receipts/             (Rendered/generated receipt backups)
   ├── backups/              (AES-256 encrypted .zpos archives)
   └── sync/                 (Outbox/inbox cursors & checkpoints)
```

### 3.2 Flexible Testing & Platform Uniformity
- **Single Source of Business Logic:** Browser dev mode and Tauri dev mode share 100% identical business logic, stores, schema, and calculations. Storage driver dynamically switches (`TauriSqliteDriver` on desktop, `WasmSqliteDriver` in browser fallback).
- **Flexible Testing:** Developers may validate features using either `npm run dev` or `npm run tauri dev`. Both are valid for testing logic, synchronization, and UI flows.
- **Production Packaging:** Full installer builds (Windows EXE/MSI, macOS DMG, Linux AppImage, Android APK, iOS IPA) are executed at release time without blocking daily development.

---

## 4. Code Standards & Professional Engineering

- **Professional Engineering:** Write code like a professional human engineering team maintaining a long-lived production system: clear names, small focused functions, predictable control flow, explicit types, proper error handling, no fake TODO implementations, no placeholder business logic, and no boilerplate.
- **Max File Size:** 300 lines MAX. Split into focused sub-modules if approaching 300 lines.
- **USE SHARED CODE — DO NOT CREATE THE SAME CODE AGAIN AND AGAIN:** ALL UI components must strictly come from `src/shared/ui/` and `src/shared/modules/` (except dense POS grid in `src/components/pos/`). Hand-rolled page-local markup, custom buttons, alag-alag lookalikes = **STRICTLY BANNED**. Re-use existing primitives.
- **State Management:** Domain-isolated Zustand stores (`src/stores/`). No ad-hoc `useReducer`.
- **Time/Dates:** Always use helpers from `src/lib/dateUtils.ts`. Never raw unformatted timestamps.

### 4.1 Linear & Anti-AI Professional UI/UX Standards (Mandatory)
- **MANDATORY SOURCE OF TRUTH — `docs/UI_RULES.md` & `docs/MODULES.md`:**  
  All UI rules, design tokens, color guidelines, button behaviors, typography, dark mode contrast, cross badges, dialogs, and component rules are strictly governed by **`docs/UI_RULES.md`**. Before writing or modifying ANY frontend component, page, or modal, reading and adhering to `docs/UI_RULES.md` is strictly compulsory.
- **Linear Decisions:** 13px base text (`text-[13px]`), 32px standard rows (`h-8`), letter spacing pulled in 1% (`tracking-[-0.01em]`). Flat engineered surfaces with 1px hairline border at 8% (`border-white/[0.08]`) and 0 card shadows (`shadow-none`).
- **One Accent Color:** Monochromatic neutral greys for 90% of UI. Exactly ONE accent color (Emerald / Indigo) strictly for selected rows and primary actions. Status is an icon + neutral text, NEVER colored candy pills.
- **Anti-AI Dashboard Rules:** Zero gradients, zero pastel icon tiles, asymmetric metric hierarchy, tight radiuses, and high-contrast typography. Refer to **`docs/UI_RULES.md`** for exhaustive specifications.

### 4.2 Centralized Single-Source UI/UX & Shared Module Architecture (Mandatory Rule)
- **1 Single Place For Everything (No Scattered Styling):** All UI/UX elements — typography tokens, font sizes, text contrast/colors, action icons, popup modals, inputs, form fields, badges, buttons, cards, and dividers — MUST be defined in and imported from a single shared location (`src/shared/ui/`, `src/shared/icons/`, `src/styles/`).
- **Alag-Alag Custom System Strictly Banned:** Writing inline hardcoded font sizes (`text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`), scattered low-contrast greys (`text-gray-400`, `text-neutral-500` on dark), direct scattered SVG/lucide imports with custom sizes, and ad-hoc form markups across separate files is **STRICTLY BANNED**.
- **1-Point Update Guarantee:** Whenever any font size, text visibility, icon, or modal styling needs an update, it MUST be changed in **1 single shared file** (`src/shared/ui/typography.ts`, `src/shared/icons/`, `src/styles/components.css`, `src/shared/ui/`) so that the entire app updates everywhere automatically from 1 place.

---

## 5. Phase Execution & Verification Protocol
- **Dependency-Aware Ordering:** Execute steps logically with sound foundational dependencies.
- **Atomic Progress:** Keep changes small, focused, and clear.
- **Lightweight Verification:** Verify code health (e.g., `npx tsc --noEmit` or dev server check) to ensure no regressions.

---

## 6. Communication Guidelines
- **Language:** Roman Urdu, technical, direct, professional.
- **Style:** Clear action, no fluff, no back-and-forth ambiguity.
- **Status Reporting:** When planning is complete, report: `"PLANNING COMPLETE — WAITING FOR PHASE 01."`
