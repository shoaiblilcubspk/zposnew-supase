# Zaynahs POS — Supabase Master Schema (human-readable)

> **Source of truth for a fresh clone.** This doc mirrors the current DB state.
> The executable equivalent is [`MASTER_SCHEMA.sql`](./MASTER_SCHEMA.sql) — run that one
> file on an empty Supabase project to build everything (Rule 14). Migrations live in
> [`migrations/`](./migrations) and are applied in numeric order by
> `scripts/supabase-migrate.mjs`.

## Architecture rules recap (AGENTS.md Section 0)
- Supabase is the **single source of truth**. No P2P.
- **snake_case** everywhere (DB, payloads, local mirror).
- Every write carries a client-generated `operation_id` (UUID v4) — `UNIQUE` per table (Rule 4).
- **Append-only** ledgers are never overwritten (Rule 7); balances/stock are computed views.
- **Non-additive** rows use UPDATE keyed on `id`; server `updated_at` trigger gives
  authoritative conflict ordering (Rule 8).
- Every table has **RLS enabled + ≥1 policy** (Rule 5).
- Local SQLite mirrors this schema 1:1 (`src/data/localSchema.ts`, Rule 9).

## Conventions
| Concern | Choice |
|---|---|
| Primary key | `id uuid` |
| Idempotency | `operation_id uuid not null unique` |
| Money / quantity | `numeric` |
| Boolean flags | `integer` (0/1) — mirrors local SQLite 1:1 |
| Timestamps | `timestamptz`; `updated_at` forced to server clock via `set_updated_at()` trigger |
| Append-only tables | `created_at` only (no `updated_at`) |

## Tables

### Phase 1 — Core (0001)
- **store_settings** (single row): store identity (name/address/phone/email/website/logo),
  finance (tax_rate, tax_id, currency, country), invoice numbering (invoice_prefix,
  invoice_counter, invoice_pad_digits), PO numbering, retail/wholesale toggles,
  sound_enabled, allow_negative_stock, refund_approval_threshold, credit/split/extra-charge
  toggles. Non-additive.
- **receipt_settings** (single row): receipt layout (paper size, template, font/padding/offset,
  show-* toggles) + barcode-label layout (paper size, A4 columns/rows, show-* toggles, sizing).
  Non-additive.

### Phase 2 — Catalog (0002)
- **categories**: name, color, icon, active.
- **suppliers**: name, phone, email, address, balance, active.
- **products**: name, barcode, sku, category_id, supplier_id, cost_price, retail_price, stock
  (cache; authoritative stock = inventory_ledger), min_stock_alert, track_inventory, image_hash,
  is_service, require_serial, product_type, variants_json, variant_data_json, product_addons_json,
  expiry_date, expiry_alert_days, active, version.
- **product_variants**: product_id, name, sku, barcode, cost_price, retail_price, stock, active.
- **product_images**: product_id, image_hash, storage_path, mime_type, file_size (binary lives
  in Storage bucket `product-images`).
- **discounts**: name, description, type, value, conditions, min_amount, max_discount,
  valid_from/to/days, active, is_auto_apply.
- **bundles** / **bundle_items**: bundle deals with per-item quantities.

### Phase 3 — Inventory (0003) — APPEND-ONLY
- **inventory_ledger**: product_id, variant_id, type (`IN|OUT|AUDIT|DAMAGE`), signed quantity,
  reference_type, reference_id, device_id, user_id, notes. Never edited.
- **current_stock** (VIEW): `SUM(quantity)` per product/variant.

### Phase 4 — Sales (0004)
- **sales** (header, non-additive status/refunded_amount): invoice_number (unique), customer/
  salesman attribution, subtotal/discount/tax/extra/total/tendered/change, payment_method,
  status, refunded_amount, sale_type, sold_at.
- **sale_items** (APPEND-ONLY): sale_id, product_id, variant_id, name, quantity, unit_price,
  unit_cost, discount, total_price, notes.
- **sale_voids** (APPEND-ONLY): sale_id, reason, voided_by, device_id.
- **sale_refunds** (APPEND-ONLY): sale_id, amount, reason, refunded_by, device_id, items_json.
- **next_invoice_number()**: race-safe counter from store_settings.
- **create_sale_atomic(p_operation_id, p_sale, p_items)**: one transaction = sale + items +
  inventory OUT ledger rows; idempotent on `operation_id` (replay returns existing sale).

### Phase 5 — Payments & Customers (0005)
- **payment_modes** (config): code, name, is_active. Seeded: cash, card, bank, udhar.
- **payments** (APPEND-ONLY): sale_id, mode_code, amount, reference, device_id, user_id.
- **customers**: name, phone, email, address, credit_limit, current_balance (cache), active.
- **customer_ledger** (APPEND-ONLY): customer_id, type, signed amount, sale_id, payment_mode,
  notes. **customer_balances** (VIEW) = `SUM(amount)` per customer.

### Phase 6 — Expenses (0006)
- **expense_categories**: name (unique), active.
- **expenses**: title, category, amount, payment_mode, store_type, notes, user_id, device_id,
  spent_at.

### Phase 7 — Auth & Security (0007)
- **roles** (config): code, name, permissions (JSON text). Seeded: admin, manager, cashier,
  salesman.
- **staff_users**: username (unique), password_hash (PBKDF2 `salt:hash:fallback`, **never
  plaintext**), role, full_name, email, avatar, is_active, can_view_expiry, require_pin_on_sale.
  **Seeded default admin** (`admin`/`admin`) as a normal editable row.
- **audit_logs** (APPEND-ONLY): user_id, device_id, action, entity_type, entity_id, details.

### Phase 8 — RLS (0008)
- RLS enabled on all 24 app tables; each has one `*_all_access` policy for `anon`,
  `authenticated` (`using (true) with check (true)`). Service role bypasses RLS for sync jobs.
- ⚠️ Single-shop model: staff auth is app-level, so the client uses the ANON key (no per-user
  Supabase Auth session). Anyone with the shipped anon key can read/write. Hardening path =
  device-level Supabase Auth (Section 6.5) to allow revocation + tighter policies.

### Phase 9 — Storage (0009)
- Bucket **product-images** (private) with `anon/authenticated` RLS policies scoped to the
  bucket. RPC EXECUTE granted to `anon, authenticated`.

### Atomic Action Bundles (0013)
- **bundle_operations** (idempotency ledger): `operation_id` (PK), `action`, `result` (jsonb),
  `created_at`. RLS enabled with an `anon/authenticated` all-access policy.
- **apply_bundle(p_operation_id text, p_action text, p_rows jsonb) → jsonb**: applies a whole
  Atomic Action Bundle (AGENTS.md §1.5) in ONE transaction. Replays return the stored result
  (idempotent on `operation_id`). Per row: `delete` → DELETE by id; append-only table → INSERT
  … ON CONFLICT (operation_id) DO NOTHING (Rule 7); non-additive → INSERT … ON CONFLICT (id)
  DO UPDATE. Any row error rolls back the whole bundle → zero partial cloud rows. Table name is
  allowlist-checked against the 34 synced tables. EXECUTE granted to `anon, authenticated`.
- **0014**: delete op casts `id::text = $1` so it works for uuid and text primary keys
  (fixes SQLSTATE 42883 "uuid = text").
- **0016**: INSERT lists ONLY the payload's columns (`insert (cols) select cols from
  jsonb_populate_record`), so omitted columns keep their table DEFAULT instead of an explicit
  NULL — a partial insert (e.g. first settings save without `store_name`) no longer violates a
  NOT NULL default column.

### Soft-delete tombstones (0017)
- `deleted_at timestamptz` on **expenses**, **purchase_records**, **bundle_items** (the tables
  that were hard-deleted). Deletes are now an UPDATE that sets `deleted_at` (bumps the server
  `updated_at` trigger), so the pull cursor carries the tombstone to every device and local
  reads filter `WHERE deleted_at IS NULL`. No hard `DELETE` on synced tables — otherwise other
  devices never learn about the deletion. Tables with `active`/`is_active` already soft-delete.

### Repair safety net (0015)
- **repair_quarantine**: `id`, `table_name`, `row_id`, `payload` (jsonb), `reason`, `created_at`.
  RLS enabled with `anon/authenticated` all-access. `scripts/repair-halfsaved.mjs` moves
  orphaned rows here (payload preserved) before removing them from live tables — nothing is
  ever silently deleted. Missing INITIAL/OUT ledger rows are reconstructed rather than
  quarantined. Supabase is the source of truth; the local SQLite mirror re-pulls after repair.

## Append-only tables (never UPDATE/DELETE)
`inventory_ledger`, `sale_items`, `sale_voids`, `sale_refunds`, `payments`, `customer_ledger`,
`audit_logs`.

## Module inventory checklist (plan Section 7) — all covered
Store identity ✅ · Products ✅ · Product images (Storage) ✅ · Categories ✅ · Bundles ✅ ·
Discounts ✅ · Suppliers ✅ · Inventory ledger ✅ · Sales/invoices ✅ · Voids ✅ · Refunds ✅ ·
Payments (cash/card/bank/credit) ✅ · Customers ✅ · Customer ledger ✅ · Expenses ✅ ·
Expense categories ✅ · Business/finance settings ✅ · Receipt/barcode layout ✅ ·
Staff users/roles ✅ · Audit logs ✅ · Local-only per-device settings (never synced) — in
localStorage/SQLite only (Rule 12).
