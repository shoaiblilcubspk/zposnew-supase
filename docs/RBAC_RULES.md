# 🔐 RBAC, USER & TRANSACTION INTEGRITY SPECIFICATION (Supabase-Authoritative, P2P-Free)

> **Single Source of Truth for Roles, Permissions, User Identity, Device Tracking, and Transaction Integrity**
>
> **Architecture reference:** `SUPABASE_MIGRATION_PLAN.md` (schema, sync queue, RLS, auth, naming, migrations — do not duplicate those rules here, this document extends them for RBAC + transaction integrity specifically).
>
> **Supersedes:** any previous local-first/WebRTC-P2P version of this spec. Every P2P/WebRTC/device-pairing/signaling reference from the old version is REMOVED, not kept as an option.

---

# 01 — ARCHITECTURE AUTHORITY

```text
React + Vite + TypeScript
        ↓
Electron / Capacitor / Browser
        ↓
Local SQLite (offline cache + fast local reads/writes)
        ↓
Authorization (local, instant)
        ↓
Business Transaction
        ↓
Immutable Event
        ↓
Sync Queue (Outbox)
        ↓
Supabase (source of truth)
        ↓
Pulled by all other devices
```

## Authority Rules

```text
LOCAL SQLITE
= Offline operational cache — lets the app work instantly with or without internet

EVENT LEDGER / SYNC QUEUE
= Change tracking + idempotent delivery to Supabase

SUPABASE
= Business Data Authority AND Sync Hub
  (Users, Roles, Permissions, Products, Inventory, Sales, Payments, Wallets,
   Customer Ledger, Supplier Ledger, Expenses, Reports source, RBAC)
```

There is **no device-to-device sync of any kind.** Every device syncs only with Supabase (push via sync queue, pull via incremental fetch). This is the single change from the old spec that eliminates an entire class of bugs (gossip gaps, clock skew, duplicate/missing events, P2P pairing failures) — see `SUPABASE_MIGRATION_PLAN.md` Section 8 for the full P2P removal checklist.

Normal POS transaction loop still does **not** require internet for the transaction itself to be recorded (see Section 02) — it requires internet only to eventually sync that record to Supabase and to other devices.

---

# 02 — CORE PRINCIPLES

1. Local operation must work without internet (record locally, sync later).
2. Supabase is the single business-data and RBAC authority; local SQLite is the offline cache/operational buffer.
3. RBAC is centralized and defined once (Section 26), enforced both locally (instant offline checks against the last-synced permission set) and re-validated server-side via RLS/RPC.
4. Exactly four primary roles exist: ADMIN, MANAGER, CASHIER, SALESMAN.
5. Admin is automatically created during first shop setup (`admin`/`admin` default row, per `SUPABASE_MIGRATION_PLAN.md` Section 6.1).
6. Manager, Cashier and Salesman are created only when needed.
7. Every sensitive business action requires authorization.
8. UI authorization is only UX; business-layer authorization is mandatory and re-checked server-side.
9. Unknown authorization state always means DENY.
10. Financial and inventory transactions are immutable effects (append-only ledger rows).
11. Financial and inventory data **never** uses Last-Write-Wins.
12. Every successful business mutation creates an event, queued for sync via the same `sync_queue` + `operation_id` mechanism defined in `SUPABASE_MIGRATION_PLAN.md` Section 4 — no separate event system.
13. Business data + effects + event + outbox commit atomically in one local SQLite transaction.
14. Failed transactions produce zero committed effects.
15. Duplicate events/operations are idempotent (via `operation_id`, same as every other synced table).
16. Users are disabled rather than destructively deleted when historical references exist.
17. Devices are identified by a simple local `device_id` for audit/traceability — no cryptographic pairing infrastructure (removed with P2P).
18. Devices can be marked inactive by Admin; this stops that device's own future syncing but never deletes history.
19. Sync transfers only missing/changed rows since last checkpoint (incremental), not the whole database, after initial bootstrap.
20. A newly installed device receives a full initial pull ("bootstrap") from Supabase on first login.
21. No fake APIs, fake SQLite, or fake security are permitted anywhere in the implementation.

---

# 03 — AUTHORITATIVE ROLES

```text
ADMIN     = CONTROL
MANAGER   = OPERATE
CASHIER   = CHECKOUT
SALESMAN  = SELL + TRACK SALES
```

Role hierarchy is conceptual only — it does not automatically grant permissions. Actual authorization comes from the centralized permission mapping (Section 26/27).

---

# 04 — FIRST SHOP SETUP

```text
First Launch
    ↓
Create New Shop
    ↓
Shop Name + Optional Logo
    ↓
Supabase project already provisioned (SUPABASE_MIGRATION_PLAN.md Phase 0 — done once, not per shop)
    ↓
Generate local DEVICE_ID (simple UUID, no keypair)
    ↓
Initialize local SQLite (mirrors Supabase schema)
    ↓
Seed default ADMIN account (username: admin, password: admin — SUPABASE_MIGRATION_PLAN.md Section 6.1)
    ↓
Prompt (not force) password change
    ↓
Dashboard
```

System automatically creates exactly one initial Admin. It must NOT automatically create Manager, Cashier, or Salesman.

---

# 05 — INITIAL ADMIN

Required fields (table: `staff_users`, per `SUPABASE_MIGRATION_PLAN.md` Section 6.2):

```text
id (uuid)
username
password_hash
role = ADMIN
is_active = true
created_at / updated_at (server-set)
operation_id
```

The first Admin becomes the initial trusted administrative user with full business and security authority. Additional unrestricted Admins are not created through ordinary user creation — only through the same `staff_users` flow with `role = ADMIN` explicitly chosen by an existing Admin (no separate "root admin" recovery mechanism is needed since there is no P2P trust chain to recover — password reset is a normal authorized Admin action, or a Supabase-level reset if all Admin accounts are locked out).

---

# 06 — USER CREATION

Default rule: **ADMIN ONLY** (Manager may be granted this — see override note, Section 28).

```text
Users → Add User → Name → Role → Username → Password → Confirm → Save
```

Allowed roles to assign: MANAGER, CASHIER, SALESMAN.

System automatically generates `id`, `created_at`, `updated_at`, `created_by`, `operation_id`. No manual ID entry.

The operation creates a `USER_CREATED` event, queued for sync exactly like any other write (Section 12, and `SUPABASE_MIGRATION_PLAN.md` Section 4).

---

# 07 — USER IDENTITY

Every user has: `id`, `username`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`, `created_by`.

Every business operation records the authenticated actor where applicable:

```text
user_id
device_id
event_id
timestamp
```

This provides permanent attribution: WHO, WHICH DEVICE, WHEN, WHAT. Historical transactions retain their original actor identity permanently.

---

# 08 — USER STATUS

Users are never destructively deleted when historical records reference them.

```text
is_active = true   (ACTIVE)
is_active = false  (DISABLED)
```

Disabling creates a `USER_STATUS_CHANGED` event. Once a disabled-user state is known locally:

```text
LOGIN = DENY
BUSINESS ACTION = DENY
NEW TRANSACTION = DENY
```

Historical records remain fully intact.

---

# 09 — USER ROLE CHANGE

```text
Ahmed: SALESMAN → MANAGER
```

Creates a `USER_ROLE_UPDATED` event. The event syncs to Supabase via the normal sync queue; every other device's local authorization state updates on its next pull. No separate RBAC-sync path exists — it's the same mechanism as every other synced table.

---

# 10 — PASSWORD / PIN SECURITY

Rules (unchanged from strongest practice, P2P references removed):

* Never store plaintext password/PIN anywhere — not in the DB, not in events, not in logs, not in audit details.
* Hash with Argon2id (preferred) or PBKDF2-HMAC-SHA256 with a unique salt and strong work factor.
* Exact production parameters selected per final platform implementation.
* Password hash syncs to Supabase like any other `staff_users` column — never synced in plaintext, ever (`SUPABASE_MIGRATION_PLAN.md` Section 6.2).

---

# 11 — ADMIN PASSWORD RECOVERY

Since there is no P2P trust chain, recovery is simpler than the old spec:

* Any active Admin can reset another user's password directly in Settings → Users.
* If **all** Admin accounts are locked out, recovery happens via direct Supabase access (project owner) — resetting the `password_hash` row for one Admin account, since Supabase is the authoritative store.
* No 24-character offline master recovery code, no local-only recovery secret — that mechanism existed specifically to solve trust recovery in a P2P mesh with no central authority. With Supabase as the authority, this entire class of complexity is removed.
* Password rotation always creates a `USER_UPDATED` event, synced normally.

---

# 12 — LOCAL AUTHENTICATION (offline-accurate)

```text
User selects account
    ↓
Enter password/PIN
    ↓
Hash using stored parameters
    ↓
Compare against LOCAL SQLite credential verifier (already synced from Supabase)
    ↓
Success → create local authenticated session → load permissions → allow operations
```

No internet connection is required for login. `staff_users` (hash column only) is kept in sync to every device's local SQLite exactly like products/customers — see `SUPABASE_MIGRATION_PLAN.md` Section 6.3. This is the entire mechanism; there is no separate "online login" path.

---

# 13 — LOGIN LOCKOUT

```text
3 failed attempts  → 30 second cooldown
5 failed attempts  → 5 minute cooldown
10 failed attempts → account locked, requires Admin reset
```

Failed attempts never modify business transactions. Lockout state is local-first (works offline) and syncs to Supabase for cross-device visibility (an Admin on another device can see and clear a lockout).

---

# 14 — SESSION LOCK

Configurable idle locking: 2 min / 5 min / 15 min / Never. Also a manual "Lock Terminal" action. Locking returns to the local authentication screen; protected operations require re-authentication.

---

# 15 — DEVICE IDENTITY (simplified — no P2P trust)

Every installation generates a simple local `device_id` (UUID) and optional `device_name` on first run. This exists purely for **audit/traceability** (who acted, on which device) — not for cryptographic P2P trust, since no device-to-device sync exists to protect.

Table: `devices` (log only, not a trust/pairing mechanism):

```text
id
device_name
first_seen
last_seen
is_active
```

---

# 16 — DEVICE MANAGEMENT (replaces old "Device Trust/Pairing/Revocation")

There is no pairing flow, no QR codes, no public/private keypairs, no PENDING/TRUSTED/REVOKED trust states — all of that existed solely to establish P2P trust, which no longer applies.

What remains, Admin-only:

```text
Admin → Devices → view list (device_name, last_seen, is_active)
Admin → rename a device
Admin → mark a device inactive (stops that device from syncing further; does not delete its history)
```

Every device authenticates to Supabase the normal way (the app's own Supabase client credentials from `.env.local`, plus the locally-authenticated staff session for attribution) — there is no separate device-level cryptographic authorization layer to build or maintain.

---

# 17 — [REMOVED] Device Pairing

Entirely removed. See Section 16.

---

# 18 — DEVICE DEACTIVATION

Admin-only. Marking a device `is_active = false`:

```text
is_active = false
    ↓
That device may continue reading locally-cached data
    ↓
Its future sync pushes are rejected server-side (RLS/RPC check on device_id)
```

Historical local data on that device is never silently destroyed. This is a much lighter mechanism than the old "revocation" concept since there's no mesh to protect — it's just a sync on/off switch enforced by Supabase.

---

# 19 — ADMIN PERMISSIONS

Full authority over: Dashboard, POS, Sales, Returns, Refunds, Products, Categories, Pricing, Inventory, Restock, Inventory adjustments, Purchases, Suppliers, Customers, Customer payments, Wallets, Payments, Expenses, Ledgers, Reports, Users, Roles, Permissions, Devices, Sync controls, Backup, Restore, Settings, Security, Audit, Data export.

No approval queue required.

---

# 20 — MANAGER PERMISSIONS

Default access: Dashboard, Sales (create/edit where permitted), Returns, Normal refunds, Products (view/edit), Inventory viewing, Restock, Purchases, Suppliers, Customers, Customer ledger, Customer payments, Expenses, Operational reports, Audit viewing, Operational wallet viewing.

Cannot by default: create/disable users, change roles, manage permissions, manage devices, change security settings, manual wallet adjustment, modify system settings, full data export, modify audit history.

---

# 21 — CASHIER PERMISSIONS

Allowed: POS, product search/barcode scan, cart management, permitted discounts, customer lookup/creation/basic edit, payment (incl. split), receipt printing/reprint, normal returns, normal customer payments, own/current sales, current shift info.

Cannot by default: product management, cost modification, inventory adjustment, restock, purchases, supplier payments, wallet adjustment/transfer, expenses, user/role/permission/device management, system/security settings, sale reversal/deletion, historical financial manipulation, company-wide financial reports.

---

# 22 — SALESMAN PERMISSIONS

Allowed: customer view/create/basic edit, product view/search/lookup, stock lookup, sale preparation/cart/draft creation, self-assignment to a sale, own sales view, relevant customer history, sales tracking.

Cannot by default: inventory adjustment, restock, purchases, supplier payments, wallet adjustment/transfer, expenses, user/role/permission/device management, system/security settings, sale reversal, historical financial manipulation.

---

# 23 — SALESMAN + CASHIER IDENTITY

Sales support separate actors: `salesman_id`, `cashier_id`, `created_by_user_id`, `device_id`.

```text
Ahmed (SALESMAN) → Customer + Products → Sale → Ali (CASHIER) → Payment → Completed
```

The completed sale preserves both identities permanently.

---

# 24 — SALESMAN SELF CHECKOUT

If the salesman also completes checkout: `salesman_id = cashier_id = Ahmed`. No duplicate account required — the app uses the current authenticated user automatically.

---

# 25 — SALE ATTRIBUTION

A sale preserves: `sale_id`, `salesman_id`, `cashier_id`, `created_by_user_id`, `device_id`, `created_at`.

Changing attribution after creation creates a traceable event (never a silent overwrite). Reports can aggregate by salesman, cashier, user, device, date, product, customer.

---

# 26 — CENTRAL PERMISSION MODEL

Defined once, centrally — never scattered/duplicated across components:

```text
dashboard.view
sales.view / sales.create / sales.edit / sales.reverse
returns.create / refunds.create
products.view / products.create / products.edit / products.archive
inventory.view / inventory.restock / inventory.adjust
purchases.view / purchases.create
suppliers.view / suppliers.manage / suppliers.payment
customers.view / customers.create / customers.edit / customers.payment / customers.credit
wallet.view / wallet.adjust / wallet.transfer
expenses.view / expenses.create / expenses.edit / expenses.reverse
reports.view / reports.financial
users.view / users.create / users.edit / users.disable
roles.manage / permissions.manage
devices.view / devices.manage
settings.manage / security.manage
backup.create / backup.restore
audit.view / exports.create
```

---

# 27 — ROLE PERMISSION MAPPING

```text
ADMIN    → All permissions
MANAGER  → Operational permissions
CASHIER  → POS/checkout permissions
SALESMAN → Sales/customer permissions
```

Permissions are binary: ALLOW / DENY. No approval workflow, no amount-based thresholds, no async approval queues, no `PENDING_APPROVAL` state, unless explicitly introduced later as a separate requirement.

---

# 28 — OPTIONAL USER OVERRIDES

Per-user permission overrides may be supported only if genuinely required:

```text
ROLE DEFAULT + OPTIONAL USER OVERRIDE → FINAL PERMISSION
```

Never create competing permission engines, and never use shortcut boolean fields like `isAdmin`, `canEverything`, `superUser`.

---

# 29 — AUTHORIZATION SERVICE

One centralized service: `can(userId, permission, context)`.

Resolves: current user + user status + role + role permissions + explicit override (if any) + device active state.

Result: ALLOW or DENY. Unknown state → DENY.

Enforced twice: locally (instant offline UX + first gate) and again server-side via Supabase RLS/RPC on every write (never trust the client-only check — see Section 31).

---

# 30 — UI AUTHORIZATION

Same authorization service drives sidebar, navigation, routes, buttons, tabs, dropdowns, forms, modals, context menus, mobile UI. Unauthorized UI is hidden/disabled — but UI ≠ security boundary. Direct calls, modified frontend state, or manually triggered actions must still be rejected by the business layer AND by Supabase RLS.

---

# 31 — BUSINESS-LAYER AUTHORIZATION

Every sensitive mutation checks authorization before changing data, both locally and server-side:

```text
adjustInventory()
    ↓
authorize("inventory.adjust")   [local check]
    ↓
validate
    ↓
local SQLite transaction (commit)
    ↓
sync_queue push → Supabase RPC re-validates permission via RLS before accepting
```

Never rely on "button hidden, therefore secure."

---

# 32 — FAIL-CLOSED SECURITY

If any required state is missing, invalid, unknown, corrupt, user inactive, device inactive, or permission undefined → **DENY**. Golden rule: `UNKNOWN = DENY`.

---

# 33 — NO FRONTEND SECURITY BYPASS

Never trust frontend-supplied `role`, `isAdmin`, `permissions`, `userId`, or `device_id` values. Authorization is derived from trusted local state (synced from Supabase) and re-verified server-side by RLS — never accepted as-is from client payloads.

---

# 34 — BUSINESS ACTION PIPELINE

```text
Current User → Active? → Permission? → Validate Input → Validate Business Rules
    ↓
Local SQLite Transaction (business rows + effects + audit + event, atomic)
    ↓
Sync Queue (operation_id)
    ↓
Supabase (RLS re-validates, applies)
    ↓
COMMIT confirmed
```

Failure before local commit = ZERO business effect. Failure at Supabase sync stage = row stays `pending` in the queue, retried — never silently dropped (per `SUPABASE_MIGRATION_PLAN.md` Phase 10).

---

# 35 — EVENT IDENTITY

Every business mutation's event/queue entry contains:

```text
operation_id (idempotency key — see SUPABASE_MIGRATION_PLAN.md Rule 4)
table_name
operation_type
user_id
device_id
payload
created_at
```

`operation_id` must be globally unique. This is the same field already defined for every synced table — RBAC events use no separate identity scheme.

---

# 36 — EVENT IMMUTABILITY

Events/ledger rows are append-only. Never rewrite history, modify financial event meaning, delete committed business events, or replace one financial event with another. Corrections are new events/transactions (Section 57–59).

---

# 37 — OUTBOX ATOMICITY

A successful local mutation commits Business Data + Effects + Audit + Event + Sync Queue entry inside the **same local SQLite transaction**. Success = all committed. Failure = none committed. Never create business data without its event; never create a queue entry for a transaction that didn't commit.

---

# 38 — IDEMPOTENCY

Every business operation carries a unique `operation_id` (Section 35). This protects against double-click, retry, app restart, connection interruption, or repeated sync attempts. The same logical operation never creates duplicate financial or inventory effects — enforced by a `UNIQUE(operation_id)` constraint on the Supabase side (per `SUPABASE_MIGRATION_PLAN.md` Rule 4).

---

# 39 — [REMOVED] Incoming P2P Event Validation

Entirely removed — there is no peer-to-peer event stream to validate. All incoming data comes from one trusted source: Supabase, via the normal authenticated API/RLS-protected pull.

---

# 40 — DUPLICATE SYNC HANDLING

Before a queued operation is considered applied:

```text
operation_id already exists on Supabase?
    → yes: server returns success without reapplying (idempotent UPSERT)
    → no: apply normally
```

Protects against retry, reconnect, app restart, and double-submission — same mechanism as every other table, no RBAC-specific duplicate logic needed.

---

# 41 — SYNC (replaces "P2P Sync")

```text
Device online
    ↓
Push: pending sync_queue rows → Supabase (idempotent via operation_id)
    ↓
Pull: rows changed on Supabase since last local checkpoint (updated_at/sequence) → local SQLite
    ↓
Apply locally (transactional)
    ↓
Update local checkpoint
```

Supabase is fully authoritative — no signaling-only limitation applies (that constraint existed only for the P2P model).

---

# 42 — INITIAL BOOTSTRAP

A newly installed device, on first authenticated login, pulls its full authorized dataset from Supabase: Shop settings, Users/Roles/Permissions, Products + Images, Inventory state, Customers, Suppliers, Sales, Payments, Expenses, Wallets, Ledgers, Settings, Audit (scope as appropriate), Sync checkpoint. Exact bootstrap dataset follows `SUPABASE_MIGRATION_PLAN.md` Section 3 table.

---

# 43 — NORMAL SYNC RULE

After bootstrap: never re-pull the complete database on every sync. Exchange the last checkpoint, pull only changed rows, apply transactionally, update checkpoint. Prevents unnecessary full-database transfers.

---

# 44 — RBAC SYNC

RBAC changes are business/security state changes synced exactly like any other table — no special path:

```text
USER_CREATED, USER_UPDATED, USER_ROLE_UPDATED, USER_STATUS_CHANGED,
USER_PASSWORD_RESET, ROLE_PERMISSION_UPDATED, USER_PERMISSION_UPDATED
```

Only the event types actually required by the implementation should exist. Sensitive credentials (password hash) sync as a hash column only — never plaintext, never a separate "credential sync" mechanism.

---

# 45 — CONFLICT MODEL

Not every field uses the same conflict strategy.

**Safe ordinary fields** (deterministic server-timestamp ordering is fine): product name/description, display settings, non-financial metadata. Resolved by Supabase `updated_at` — the write that reaches the server last, wins (per `SUPABASE_MIGRATION_PLAN.md` Section on conflict behavior — "last" is decided by arrival at the server, never by a device's local clock).

**Never LWW** — resolved instead via immutable append-only transactions/effects/events: Inventory, Sales, Payments, Refunds, Returns, Wallet, Customer ledger, Supplier ledger, Expenses, all financial transactions.

---

# 46 — INVENTORY INTEGRITY

Inventory is transaction-based, never LWW.

```text
Opening = 6
Device A sells 5 (offline)
Device B sells 4 (offline)
```

Both sales are valid, independent events — both survive sync. Calculated stock = `6 - 5 - 4 = -3` → system reports **Oversold = 3**. Never delete or overwrite one valid sale to hide the conflict.

---

# 47 — WALLET INTEGRITY

```text
Balance = Opening + IN − OUT
```

Never overwritten because another device has a "newer" value — every movement is a traceable row, balance is always a computed sum.

---

# 48 — CUSTOMER LEDGER INTEGRITY

```text
Current Receivable = Opening Receivable + Credit − Payments
```

Payments and credit effects are immutable transactions. Never LWW.

---

# 49 — SUPPLIER LEDGER INTEGRITY

```text
Current Payable = Opening Payable + Purchases − Payments
```

All movements remain traceable.

---

# 50 — FINANCIAL INTEGRITY

Never LWW for: Sales, Payments, Refunds, Returns, Expenses, Wallet movements, Customer ledger, Supplier ledger, any financial transaction. Corrections are always explicit new transactions/effects.

---

# 51 — SALE TRANSACTION

A successful sale creates, atomically: Sale, Sale Items, Inventory OUT, Payment Effects, Customer Effect (if applicable), Audit, Event/Queue entry.

---

# 52 — CASH SALE

`Sale = Rs 5,000` → Effects: `Inventory OUT`, `Cash IN 5,000`.

---

# 53 — BANK / CARD / ONLINE SALE

`Inventory OUT`, payment effect matches the actual selected payment method.

---

# 54 — SPLIT PAYMENT

`Total = 10,000` (Cash 4,000 + Bank 6,000) → `Inventory OUT`, `Cash IN 4,000`, `Bank IN 6,000` — all part of one sale transaction.

---

# 55 — CREDIT SALE

`Total = 10,000, Paid = 3,000, Credit = 7,000` → `Inventory OUT`, `Wallet IN 3,000`, `Customer Receivable +7,000`.

---

# 56 — PARTIAL CREDIT

```text
Receivable = Total Sale − Actual Payments
```

Resulting customer ledger effect equals the unpaid amount exactly.

---

# 57 — SALE EDIT

Never blindly overwrite committed financial history. Compute: original committed state → new requested state → exact delta → required adjustment effects.

```text
Original Qty = 2, New Qty = 1 → Inventory IN 1 (adjustment, traceable)
```

---

# 58 — SALE REVERSAL

Never delete the original sale — create a reversal transaction with exact opposite effects. Original stays permanently traceable.

---

# 59 — DOUBLE REVERSAL

If a transaction is already fully reversed → **REJECT** any further reversal, enforced by transaction state/constraints, not only UI logic.

---

# 60 — RETURNS

Return without refund: `Inventory IN`. Return with refund: `Inventory IN`, `Wallet OUT`. Refund without physical return: `Wallet OUT` only.

---

# 61 — RESTOCK

`Inventory IN`. If supplier payment made simultaneously: `Wallet OUT`, `Supplier Payable DECREASE` — relationship stays traceable.

---

# 62 — EXPENSE

`Wallet OUT`. Reversal: `Wallet IN`. Original stays traceable.

---

# 63 — CUSTOMER PAYMENT

`Wallet IN`, `Customer Receivable DECREASE`. Reversal: `Wallet OUT`, `Customer Receivable INCREASE`.

---

# 64 — SUPPLIER PAYMENT

`Wallet OUT`, `Supplier Payable DECREASE`. Reversal: `Wallet IN`, `Supplier Payable INCREASE`.

---

# 65 — WALLET TRANSFER

`Cash OUT 10,000`, `Bank IN 10,000` — both effects commit atomically; failure rolls back both, never one-sided.

---

# 66 — INVENTORY ADJUSTMENT

```text
ADMIN   = ALLOW
MANAGER = DENY unless explicitly granted
CASHIER = DENY
SALESMAN = DENY
```

No approval queue, no amount threshold. Must include reason, actor, device, timestamp, reference, event. Final rule: permission exists → ALLOW; absent → DENY.

---

# 67 — NO PARTIAL TRANSACTIONS

```text
ALL REQUIRED EFFECTS COMMIT — OR — ZERO EFFECTS COMMIT
```

A failed sale creation produces: no sale, no inventory OUT, no wallet IN, no ledger effect, no committed event, no sync queue entry.

---

# 68 — TRANSACTION GRAPH

```text
MAIN TRANSACTION
    ├── Inventory Effects
    ├── Wallet Effects
    ├── Customer/Supplier Effects
    ├── Audit
    └── Event → Sync Queue
```

Reversal = original transaction → original effects → reversal transaction → exact opposite effects.

---

# 69 — AUDIT LOG

Append-only. Fields: `audit_id`, `user_id`, `device_id`, `action`, `entity_type`, `entity_id`, `timestamp`, `details`, `event_id`. Not editable/deletable by normal users. No plaintext secrets in details. Syncs to Supabase like any other table.

---

# 70 — REPORTING

```text
Local SQLite → Query → Aggregation → Report (offline-capable)
```

No cloud query required for the report itself (local cache is sufficient) — Supabase remains the authoritative source the cache is synced from. Dimensions: sales by salesman/cashier/device/date/product/customer. Manager gets operational reporting; Admin gets full; Cashier/Salesman get only permitted reports.

---

# 71 — UI ROLE VISIBILITY

Cashier should not normally see: Users, Devices, Settings, Inventory Adjustment, Expenses, Suppliers. Salesman should not normally see: Users, Devices, Wallet Management, Inventory Adjustment, Settings, Expenses. Manager should not normally see: User Administration, Device Management, Security. Hiding navigation is not sufficient — the business layer + Supabase RLS must still reject direct actions.

---

# 72 — HARD DELETE POLICY

Users → Disable, not delete, when history exists. Products → Archive, not delete, when history exists. Financial Transactions → Reverse/Void, never destructively delete. Audit → Append-only, always.

---

# 73 — LOCAL OFFLINE OPERATION

Normal POS continues working when internet and Supabase are unreachable: local login, sales, returns, customer payments, permitted data changes, inventory movements, financial transactions, event creation, sync queue queuing all function fully offline.

---

# 74 — RECONNECT

```text
Connectivity returns
    ↓
Push pending sync_queue rows to Supabase (idempotent)
    ↓
Pull changed rows since last checkpoint
    ↓
Apply transactionally
```

No P2P handshake of any kind — a single, simple client↔Supabase sync.

---

# 75 — DATA CONVERGENCE

```text
Device A offline → Sale A
Device B offline → Sale B
```

After both sync: **every device ends up with Sale A + Sale B.** Valid independent transactions both survive — the system never overwrites one transaction merely because another has a "newer" timestamp (this is why Rule 50/45 forbid LWW on financial data).

---

# 76 — REQUIRED INTEGRITY CHECKS

System must detect: orphan inventory/wallet effect, duplicate effect, missing source transaction, missing reversal, double reversal, invalid/unauthorized event, broken ledger relationship, incorrect calculated balance, duplicate `operation_id`, inactive-device write attempt, invalid actor, corrupt payload. Detected corruption is never silently hidden.

---

# 77 — SECURITY CHECKS (codebase audit)

Search the entire codebase for: `isAdmin`, `role ===`, `role ==`, `admin`, `permission`, `permissions`, `can(`, `authorize`, `auth`, `supabase`, `rpc`, `RLS`, `JWT`, `approval`, `PENDING_APPROVAL`, plus P2P-era terms: `webrtc`, `datachannel`, `peer`, `p2p`, `pairing`, `gossip`, `lww`, `mesh`, `signaling` (cross-reference `SUPABASE_MIGRATION_PLAN.md` Section 8 checklist — do this sweep once, not twice). Audit every result. Remove: hardcoded admin bypasses, duplicate permission systems, frontend-only authorization, legacy approval workflows, fail-open logic, all P2P/pairing/signaling code and docs. Inspect first, then migrate — don't blindly delete.

---

# 78 — SUPABASE'S ROLE (clarified — replaces old "Remove Legacy Supabase RBAC")

The old spec forbade Supabase from being an authority because the architecture was P2P-first. That constraint is now removed. Supabase **is** the business-data and RBAC authority (Section 01). What still must never happen:

* No hardcoded client-side bypass of RLS/permission checks.
* No trusting a client-supplied role/permission value without server-side re-validation.
* No duplicate/competing local-only RBAC system that can drift from Supabase's — local SQLite is a synced cache of Supabase's RBAC state, never an independent source.

---

# 79 — NO FAKE SECURITY

Never pretend security exists when it doesn't. Never trust client-controlled `role`/`isAdmin`/`permissions` payloads. Never implement fake SQLite, fake authorization, fake sync, or fake device tracking that only simulates functionality. All production paths connect to the real implementation.

---

# 80 — ROLE × BUSINESS MATRIX

| Capability | ADMIN | MANAGER | CASHIER | SALESMAN |
|---|:---:|:---:|:---:|:---:|
| Dashboard | Full | Yes | Limited | Limited |
| POS | Yes | Yes | Yes | Yes |
| Sales Create | Yes | Yes | Yes | Yes |
| Sale Tracking | All | All | Own/Allowed | Own |
| Sale Edit | Yes | Allowed | Allowed | Draft/Own |
| Sale Reverse | Yes | Yes | No | No |
| Returns | Yes | Yes | Yes | Yes/Allowed |
| Refunds | Yes | Yes | Normal | No |
| Products View | Yes | Yes | POS | Yes |
| Product Create/Edit | Yes | Yes | No | No |
| Inventory View | Yes | Yes | Limited | Limited |
| Restock | Yes | Yes | No | No |
| Inventory Adjust | Yes | Optional Explicit | No | No |
| Purchases | Yes | Yes | No | No |
| Suppliers | Yes | Yes | No | No |
| Supplier Payment | Yes | Yes | No | No |
| Expenses | Yes | Yes | No | No |
| Wallet View | Full | Operational | Assigned | No |
| Wallet Adjust | Yes | No | No | No |
| Wallet Transfer | Yes | No | No | No |
| Customers | Yes | Yes | Yes | Yes |
| Customer Payment | Yes | Yes | Yes | No/Allowed |
| Users | Yes | No | No | No |
| Roles | Yes | No | No | No |
| Permissions | Yes | No | No | No |
| Devices | Yes | No | No | No |
| Reports | Full | Operational | Own/Basic | Own/Basic |
| Financial Reports | Yes | Yes | No | No |
| Settings | Yes | No | No | No |
| Security | Yes | No | No | No |
| Backup/Restore | Yes | No | No | No |
| Audit | Full | View | No | Own if allowed |
| Data Export | Yes | No | No | No |

Implemented through the centralized permission definitions (Section 26), never hardcoded into individual UI components.

---

# 81 — USER SCREEN

Displays: Name, Username, Role, Status, Created At, Last Activity. Password field only shown for creation/reset — the stored hash is never displayed. System-generated: `id`, `created_by`, `created_at`, `updated_at`.

---

# 82 — USER EVENT RULES

`USER_CREATED`, `USER_UPDATED`, `USER_ROLE_UPDATED`, `USER_STATUS_CHANGED`, `USER_PASSWORD_RESET`, `ROLE_PERMISSION_UPDATED` / `USER_PERMISSION_UPDATED`. All flow: `SQLite → Sync Queue → Supabase → pulled by other devices`. Same pipeline as every other table, no exception.

---

# 83 — SALE IDENTITY RULE

At sale creation, automatically capture `user_id`, `device_id`, `salesman_id`, `cashier_id` — never require manual typing of one's own identity. The authenticated current user remains the authoritative actor.

---

# 84 — BUSINESS TRANSACTION AUTHORIZATION ORDER

```text
Current User → Active? → Permission? → Validate Input → Validate Business Rules
    ↓
SQLite Transaction → Business Rows → Effects → Audit → Event
    ↓
Sync Queue → Commit
```

Failure at any point before commit = ZERO business effect.

---

# 85 — CRITICAL TRANSACTION TESTS

**Sales:** cash, card, bank, online, split, credit, partial credit, edit, reversal, double-reversal rejection.
**Returns/Refunds:** return, return+refund, refund without return.
**Inventory:** restock, adjustment, concurrent/offline movements from two devices.
**Financial:** expense + reversal, customer payment + reversal, supplier payment + reversal, wallet transfer.
**Reliability:** failed transaction, double click, duplicate request, retry, app restart, offline transaction, reconnect, duplicate sync push, missing sync pull, invalid payload rejection.
**Security:** device deactivated, user disabled, role change, permission change, cashier/salesman/manager attempting unauthorized action, unknown permission, invalid actor.

---

# 86 — ZERO PARTIAL EFFECT TEST

A failed sale results in: NO sale, NO inventory OUT, NO wallet IN, NO customer ledger effect, NO committed event, NO sync queue record. Same principle for every atomic business transaction.

---

# 87 — SYNC CONVERGENCE TEST

```text
Device A offline → Sale A
Device B offline → Sale B
```

After both sync with Supabase: **both devices end up with A + B.** No valid transaction disappears because another device's write had a later server timestamp. Financial/inventory events remain additive and traceable.

---

# 88 — DEVICE DEACTIVATION TEST

After Admin deactivates a device: no further sync pushes accepted from it (server-enforced), no new authorized business operation propagates from it. Historical local records on that device (and already-synced data from it) remain intact.

---

# 89 — ACCEPTANCE CRITERIA

```text
[ ] Admin automatically created on first setup (default admin/admin)
[ ] Manager/Cashier/Salesman created only when needed
[ ] Sale tracks salesman, cashier, authenticated user, and device
[ ] Supabase is business-data AND RBAC authority
[ ] Local SQLite is a synced offline cache, never an independent authority
[ ] No P2P, WebRTC, device pairing, or signaling code/docs remain anywhere
[ ] User creation/update/disable/role-change/permission-change all sync via the standard sync queue
[ ] Inactive device correctly blocked from further sync (server-enforced)
[ ] Password/PIN plaintext never stored, synced, or logged
[ ] Central authorization service exists; UI and business-layer both enforce it; Supabase RLS re-validates
[ ] Unknown permission = DENY; unauthorized action = ZERO EFFECT; no hardcoded admin bypass
[ ] Inventory/Wallet/Sales/Financial data never uses LWW — always immutable effects/events
[ ] Sale reversal reverses actual committed effects; double reversal impossible
[ ] Failed transactions produce zero effects; duplicate operations/events are idempotent (operation_id)
[ ] Offline POS works fully; initial bootstrap works; incremental sync transfers only changes
[ ] Reports use local SQLite cache; Audit is append-only; historical user identity preserved
[ ] Financial history is reversed, never destructively deleted; Products with history are archived
[ ] No legacy competing RBAC remains; no fake sync/authorization/SQLite remains
[ ] No duplication between this document and SUPABASE_MIGRATION_PLAN.md (schema/sync details live there; this document owns RBAC + transaction-integrity rules only)
```

---

# 90 — IMPLEMENTATION RULES

Before changing code: inspect the complete existing codebase, dependency structure, SQLite/DB implementation, schema/migrations, current auth, current RBAC, all permission checks, business services, transaction handling, inventory effects, wallet/ledger effects, audit system, event/sync-queue system, all Supabase references, existing tests. Do not create a parallel architecture. Do not blindly delete existing functionality — migrate it into the authoritative architecture defined here and in `SUPABASE_MIGRATION_PLAN.md`.

---

# 91 — LEGACY CODE MIGRATION

For every old RBAC/auth/P2P code path: DISCOVER → CLASSIFY (KEEP / REFACTOR / MIGRATE / REMOVE) → VERIFY CURRENT USAGE → MIGRATE → TEST → REMOVE ONLY WHEN SAFE. Per `SUPABASE_MIGRATION_PLAN.md` Section 8: P2P/WebRTC/pairing code is REMOVE by default, not KEEP or REFACTOR — there is no valid reason to retain it once Supabase is authoritative.

---

# 92 — NO DUPLICATE ARCHITECTURE

There must not be: local RBAC + Supabase RBAC as two competing systems; local transaction ledger + a separate cloud ledger; real sync + a leftover fake/legacy sync layer; two competing permission services. One authoritative implementation per responsibility, full stop.

---

# 93 — FINAL RESPONSIBILITY MODEL

```text
┌──────────────────────────────────────────────┐
│                  POS APP                      │
├──────────────────────────────────────────────┤
│ React + Vite + TypeScript                     │
│ UI + Domain + Business Services                │
├──────────────────────────────────────────────┤
│ Local Authorization Service (instant, offline) │
│ Users + Roles + Permissions                     │
├──────────────────────────────────────────────┤
│ Local SQLite                                    │
│ Offline Cache + Transactions + Audit            │
├──────────────────────────────────────────────┤
│ Event / Sync Queue (Outbox)                     │
│ Idempotent Change Delivery                      │
├──────────────────────────────────────────────┤
│ Supabase                                        │
│ Business Data + RBAC Authority + RLS + Storage  │
└──────────────────────────────────────────────┘
```

---

# 94 — FINAL GOLDEN RULES

```text
ADMIN = CONTROL         MANAGER = OPERATE
CASHIER = CHECKOUT      SALESMAN = SELL + TRACK SALES

SUPABASE = BUSINESS DATA + RBAC AUTHORITY
LOCAL SQLITE = OFFLINE CACHE, NOT AN INDEPENDENT AUTHORITY
SYNC QUEUE = CHANGE DELIVERY (device ↔ Supabase only, never device ↔ device)

UI CHECK = UX
BUSINESS-LAYER + RLS CHECK = SECURITY
UNKNOWN AUTHORIZATION = DENY

BUSINESS ACTION = AUTHORIZATION + VALIDATION + TRANSACTION + EFFECTS + AUDIT + EVENT + SYNC QUEUE
SUCCESS = ALL REQUIRED EFFECTS COMMIT       FAILURE = ZERO EFFECTS
REVERSE = EXACT OPPOSITE EFFECTS            DUPLICATE OPERATION = APPLY ONCE

INVENTORY / FINANCE = NEVER LWW
USER HISTORY = PRESERVE                     FINANCIAL HISTORY = REVERSE, NEVER DELETE
NORMAL SYNC = MISSING CHANGES ONLY          INITIAL JOIN = FULL AUTHORIZED BOOTSTRAP
```

---

# 95 — FINAL IMPLEMENTATION COMMAND

The implementation MUST modify the existing POS architecture — it must NOT create a parallel POS, RBAC, transaction, database, or sync system.

```text
INSPECT → PLAN → MIGRATE → IMPLEMENT → TEST → RECONCILE → VERIFY → REPORT
```

Every change preserves existing valid business functionality while moving authority fully to Supabase and removing every P2P/WebRTC/pairing/signaling remnant. Final application must be: OFFLINE-CAPABLE, SUPABASE-AUTHORITATIVE, TRANSACTION-SAFE, RBAC-CENTRALIZED, AUDITABLE, IDEMPOTENT, FAIL-CLOSED. No fake security, no fake sync, no fake database behavior, no duplicate RBAC, no partial financial transactions, no destructive financial-history deletion, no LWW-based financial/inventory reconciliation.

---

# CREDIT / UDHAR SYSTEM — Complete RBAC & Flow Reference

## Overview
Credit (Udhar) lets customers take goods without immediate payment. Outstanding balance tracked in `customer_ledger` and `customers.current_balance`.

## Global Settings (Settings → General)

| Setting | Key | Scope | Sync |
|---|---|---|---|
| Enable Credit Sales | `enable_credit_sales` | Global toggle | ✅ Synced to all devices via sync queue |
| Cashier Can Give Credit | `cashier_can_credit` | Restrict by role | ✅ Synced to all devices via sync queue |

## RBAC Permission Matrix

| Action | Admin | Manager | Cashier | Salesman |
|---|---|---|---|---|
| Enable Credit Sales (setting) | ✅ | ❌ | ❌ | ❌ |
| Cashier Can Give Credit (setting) | ✅ | ❌ | ❌ | ❌ |
| Create Credit Sale | ✅ | ✅ | ✅ (if `cashier_can_credit`=ON) | ✅ (if `cashier_can_credit`=ON) |
| Receive Customer Payment | ✅ | ✅ | ❌ | ❌ |
| View Customer Ledger | ✅ | ✅ | ✅ (own sales) | ❌ |
| View Credit in Financial Report | ✅ | ✅ | ❌ | ❌ |

## Credit Button Visibility Rule

```text
isCreditAllowed = true IF:
  1. app_settings.enable_credit_sales === true
  2. a customer is selected
  3. role !== 'cashier' OR app_settings.cashier_can_credit === true
```

## Credit Sale Flow (Day 1)

```text
Cashier selects customer → Settlement modal → "Credit" → Process Payment
    ↓
Atomic local SQLite transaction:
  1. INSERT sales (payment_method='credit', status='completed')
  2. INSERT sale_items
  3. INSERT inventory_ledger (INVENTORY_OUT) per item
  4. products.stock is a computed view over inventory_ledger — no direct write
  5. INSERT payments (mode='credit', sale_id=sale.id)
  6. payment_modes.balance NOT updated (credit ≠ physical cash)
  7. INSERT customer_ledger (type='sale', amount=total, balance_after=new_balance)
  8. UPDATE customers.current_balance += total  (or computed view, per final schema)
  9. INSERT sync_queue entry (operation_id, table='sales', payload incl. payment_method='credit')
```

Sync: Supabase receives the queued operation → applies once (idempotent) → other devices pull it on their next sync and apply the same 8 effects.

## Credit Repayment Flow (Day N)

```text
Admin/Manager → Customers → customer card → "Receive Payment" → amount + mode → submit
    ↓
Atomic local SQLite transaction:
  1. INSERT customer_ledger (type='payment', amount=repayment, balance_after=new_balance)
  2. UPDATE customers.current_balance -= repayment (or computed view)
  3. INSERT payments (sale_id=NULL, mode=repayment_mode, customer_id=customer.id)
  4. UPDATE payment_modes.balance += repayment
  5. INSERT sync_queue entry (operation_id, table='customer_ledger', event_type='CUSTOMER_PAYMENT')
```

Sync: same idempotent push/pull as any other table — no separate credit-specific sync path.

## Financial Report Credit Display

| Report Section | What Shows | Day |
|---|---|---|
| Sales page "Payment: Credit" filter | All credit sales | Sale day |
| Financial → Credit wallet card | Credit Given (total receivables) | Sale day |
| Financial → Cash wallet card | Credit Received (repayments in cash) | Repayment day |
| Customers → Ledger tab | Full debit/credit history | Both days |
| Overview → Total Revenue | Credit sales included | Sale day |

## Wallet Balance Rules

```text
Credit sale:      Cash wallet = 0 change, Credit receivable +amount
Credit repayment: Cash wallet +repayment_amount, Credit receivable -repayment_amount
```

`Credit wallet balance = Σ(credit sales) − Σ(credit repayments) = Outstanding receivable`

## Sync Verification Checklist

After any credit-related change, verify:
- [ ] Credit sale on Device A syncs to Supabase → pulled by Device B → customer balance updated
- [ ] Credit sale → Device B's `customer_ledger` has the matching entry
- [ ] Credit repayment on Device A → Device B customer balance decreases after pull
- [ ] Credit repayment → Device B's `payments` table has the entry (`sale_id` NULL)
- [ ] Financial report shows correct Credit wallet amount on all devices after sync
- [ ] Sales filter: "Credit" option visible when `enable_credit_sales` = ON, matching across devices
- [ ] No duplicate credit sale/repayment row created if sync retries (verify via `operation_id`)
## Cross-Device Sequence Numbers (ALL domains — invoice, PO, voucher, etc.)

> AGENTS.md §1.7.7 is the binding contract. Applies to EVERY auto-numbered domain, not just sales.

Rule: an auto-generated sequence number (invoice number, purchase-order number, expense/voucher
number, or any future counter) is **decided by the server, never trusted from the client as
final**. Devices generate an optimistic number offline (so the UI is never blocked), but the
authoritative, collision-proof number is assigned by `apply_bundle` at commit time.

- Every cross-device sequence column is registered in `sequence_registry(table_name, column_name)`.
  Adding a new auto-numbered domain = INSERT one row there — no per-module numbering code.
- On a `unique_violation` of a registered column, `apply_bundle` re-allocates the next free value
  (max+1, prefix/pad preserved) in the SAME transaction and returns it in `result.renumbered`.
  The sync worker patches the local row + in-memory store (zero-refresh, §2.10).
- A `duplicate key` / 23505 on a sequence column must NEVER surface to the user or park as a
  permanent Failed bundle. Retry on an already-failed bundle renumbers and completes.

### Sync Verification Checklist (sequence numbers)
- [ ] Two devices offline both create a record (sale/PO/expense) → both sync with DISTINCT
      server-assigned numbers, no error, no duplicate, no data loss.
- [ ] Retry on an already-failed `duplicate key` bundle succeeds by renumbering automatically.
- [ ] After sync, all devices show the SAME final number for that record.
- [ ] A new auto-numbered domain is added ONLY via a `sequence_registry` row (guard:
      `tests/sequenceRenumber.test.mjs`), never a device-local-only numbering scheme.

### Auto-Recovery of a Parked Collision (ZERO manual Retry/Discard)

> Learned from a real incident: after the server renumber shipped in code, two sales stayed
> stuck as **Failed** in Cloud Sync with `duplicate key value violates unique constraint`
> because migration **0025 had not been applied to that project's database** — the deployed
> `apply_bundle` was still the old, non-renumbering version. A committed migration is NOT a
> deployed migration.

Rules (permanent, generic — never per-record):
- **Deploy is part of the fix.** Any sequence/RPC change is only "done" once
  `node scripts/supabase-migrate.mjs` has applied it to the target project (verify with
  `--status`). A clone stays ready-to-use because the runner is idempotent and ledgered
  (`public._migrations`).
- **A duplicate-key (23505) sync error is RETRYABLE, not permanent.** `toSyncError` classifies
  it as transient so the SAME bundle (same `operation_id`) is re-pushed; the server renumber
  then assigns a free number and it completes. It must never be parked as permanent on the
  first collision.
- **Already-parked collisions self-heal.** `requeueRecoverable()` runs on every sync flush and
  re-arms any `failed` bundle whose error is a duplicate-key collision, so records stuck before
  the fix was deployed drain automatically with **zero** user action (no Retry, no Discard, no
  data loss). The final server-assigned number is patched back into the local row + store.
- **Bounded, so a genuine (non-sequence) duplicate can't loop.** Auto-recovery is capped at
  `MAX_RECOVERABLE_RETRIES`; after the budget is exhausted the bundle parks as `failed` for
  manual review. This keeps the auto-heal safe for the collision case without masking a real,
  unresolvable conflict.
- **Never repair the specific record by hand or in code (§1.6).** Fix the mechanism; let it
  resolve every stuck record across all auto-numbered domains.

Guard: `tests/sequenceRenumber.test.mjs` covers (a) a `failed` duplicate-key bundle auto-requeuing
and syncing with the server-assigned number, and (b) a non-recoverable duplicate parking at the
cap instead of looping.
