# Phase 02: Local SQLite Storage Engine Hardening

> **Reference:** `docs/LOCAL_FIRST_ARCHITECTURE.md` & `GEMINI.md`  
> **Mandate:** Local SQLite is the ONLY authoritative source of truth. Zero cloud DB queries for POS operations. Commits occur locally in `< 10ms`.

---

## 1. Objectives & Scope

Re-engineer the core database layer into a robust, high-performance local SQLite storage engine with zero cloud database dependency. All business domain services (`products`, `inventory`, `sales`, `customers`, `expenses`, `users`, `settings`) interface directly with this engine.

---

## 2. Storage Drivers & Parity Architecture

```text
               Shared React UI / Business Services
                                ↓
                 Local Database Service Adapter
                                ↓
        ┌──────────────────────────────────────────────┐
        │                                              │
 Desktop (Tauri)                               Browser Dev Fallback
        ↓                                              ↓
 TauriSqliteDriver                              WasmSqliteDriver
 (tauri-plugin-sql)                             (sql.js WASM)
        ↓                                              ↓
 $APPDATA/database.sqlite                       IndexedDB Binary Blob
 (Native OS Filesystem)                         (zaynahs_pos_sqlite_store)
```

### Unified Driver Interface
```typescript
export interface ISqliteDriver {
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T>;
}
```

---

## 3. Core Database Schema & Migrations

### Complete Table Manifest
1. `shop` — Store identity, currency, branding.
2. `devices` — Paired terminals, ECDSA public keys, trust status.
3. `users` — Local operators, salted PIN hashes, roles, active status.
4. `roles` & `permissions` — System permission definitions and role mappings.
5. `products` — Items, barcodes, SKUs, pricing, categories, tax, active flag.
6. `product_variants` — Sizes, colors, options, variant barcodes.
7. `categories` — Product categories hierarchy and display orders.
8. `inventory_transactions` — Append-only stock movements (`INVENTORY_IN`, `INVENTORY_OUT`, `AUDIT`).
9. `sales` — Completed receipts, totals, tax, discounts, payment status.
10. `sale_items` — Snapshot line items, unit costs, sold prices, discounts.
11. `payments` — Tender details (Cash, Card, Bank, Credit), wallet associations.
12. `wallets` — Cash drawer, bank accounts, digital payment balances.
13. `customers` — Profiles, phone numbers, credit limits, balances.
14. `customer_ledger` — Append-only debits, credits, running receivables.
15. `suppliers` — Vendor profiles, terms, payable balances.
16. `supplier_ledger` — Purchases, payments, running payables.
17. `expenses` — Operating expenses, categories, payment wallets.
18. `audit_logs` — Immutable action history with actor and device attribution.
19. `sync_outbox` — Locally generated events pending remote P2P dispatch.
20. `sync_inbox` — Received remote events processed or queued.
21. `tombstones` — Soft-delete markers for deleted entities.

---

## 4. Transaction Atomicity & Performance Mandate

1. **Atomic Commits:** Financial and inventory mutations must execute inside an explicit `BEGIN TRANSACTION ... COMMIT` block.
2. **Execution Timing:** Average local write latency must be `< 10ms`.
3. **No Partial State:** If any query fails within a transaction, the entire transaction is rolled back (`ROLLBACK`).
4. **Outbox Synchronization:** Every business mutation writes an immutable event into `sync_outbox` inside the **same transaction**.

---

## 5. Verification & Acceptance Criteria

- [ ] Native desktop SQLite persists to `$APPDATA/database.sqlite`.
- [ ] Browser fallback persists binary SQLite database into IndexedDB.
- [ ] Database schema migrations run sequentially and record applied versions in `schema_migrations`.
- [ ] Direct Supabase database queries (`supabase.from(...)`) are eliminated from all domain services.
- [ ] Transactions commit in `< 10ms` with zero UI freezing.
