# Phase 04: Event-Sourced Financial & Stock Ledger Flows (Strict Non-LWW)

> **Reference:** `docs/RBAC_RULES.md` & `docs/LOCAL_FIRST_ARCHITECTURE.md`  
> **Mandate:** Financial and inventory mutations are append-only events. Last-Write-Wins (LWW) is strictly prohibited. Zero bill drops.

---

## 1. Objectives & Scope

Re-engineer all inventory and financial operations into event-sourced, append-only ledgers. Ensure that concurrent offline sales combine additively upon reconnection, customer credit and supplier payables remain completely traceable, and no bill is ever dropped or overwritten.

---

## 2. The Strict Non-LWW Architectural Rule

```text
❌ FORBIDDEN: Last-Write-Wins (LWW) on Inventory
   Terminal A sets stock = 5
   Terminal B sets stock = 2
   (Overwrites stock balance, losing sales history and audit trail)

✅ MANDATED: Append-Only Inventory Ledger (CRDT / Additive)
   Opening Balance: 10
   Terminal A sells 6  → Append INVENTORY_OUT (qty: 6)
   Terminal B sells 7  → Append INVENTORY_OUT (qty: 7)
   Reconciled Stock:   10 - 6 - 7 = -3 (Oversold: 3)
   Result: Zero dropped bills, 100% accurate financial accounting.
```

---

## 3. Complete Sale Transaction Pipeline

Every sale commits inside an atomic SQLite transaction:
```text
Sale Finalized
      ↓
BEGIN TRANSACTION
      ├── 1. INSERT INTO sales (id, invoice_no, total, discount, tax, salesman_id, cashier_id, status)
      ├── 2. INSERT INTO sale_items (sale_id, product_id, variant_id, qty, unit_price, cost_price)
      ├── 3. INSERT INTO inventory_transactions (type='INVENTORY_OUT', qty, product_id, reference_id)
      ├── 4. INSERT INTO payments (sale_id, method, amount, wallet_id)
      ├── 5. UPDATE wallets SET balance = balance + amount WHERE id = wallet_id
      ├── 6. (If Credit) INSERT INTO customer_ledger (customer_id, type='DEBIT', amount=unpaid)
      ├── 7. INSERT INTO audit_logs (action='SALE_CREATED', actor_id, device_id)
      └── 8. INSERT INTO sync_outbox (event_type='SALE_CREATED', payload=full_sale_graph)
COMMIT
```
* **Failure Guarantee:** If any step fails (e.g. disk full, constraint violation), the entire transaction rolls back (`ROLLBACK`). Zero partial rows or orphan effects remain.

---

## 4. Tender Types & Financial Flows

1. **Cash Sale:** Cash drawer balance increments; Cash IN event emitted.
2. **Card / Bank / Online Sale:** Bank wallet increments; matching tender record appended.
3. **Split Payment:**
   * Example: Total = Rs 10,000 (Cash Rs 4,000 + Bank Rs 6,000).
   * Generates two tender rows and updates respective wallets inside the same transaction.
4. **Credit Sale (Udhaar):**
   * Total = Rs 10,000, Customer pays Rs 3,000 now, Rs 7,000 balance.
   * Cash wallet receives Rs 3,000; `customer_ledger` receives a DEBIT entry of Rs 7,000.
   * Running receivable balance increments accurately.

---

## 5. Sale Edits, Reversals, Returns & Refunds

1. **Sale Edit:**
   * Never overwrite the committed sale.
   * Compute the exact delta (e.g. Qty changed from 2 to 1).
   * Emit an `INVENTORY_IN (qty: 1)` adjustment and reverse the price difference from the wallet.
2. **Sale Reversal / Void:**
   * The original sale record is marked `status = 'reversed'`.
   * An explicit reversal transaction commits: `INVENTORY_IN` for all items, `WALLET_OUT` for refunds.
   * **Double Reversal Prevention:** If already reversed, immediately reject any further reversal.
3. **Returns & Refunds:**
   * **Return with physical item:** `INVENTORY_IN` + `WALLET_OUT`.
   * **Return without refund (Store credit):** `INVENTORY_IN` + `customer_ledger` credit.
   * **Refund without return (Damaged goods):** `WALLET_OUT` only (no inventory increment).

---

## 6. Expenses & Supplier Purchases

* **Expenses:** `WALLET_OUT` with selected expense category. Reversals commit `WALLET_IN`.
* **Supplier Purchases:**
  * Bulk Purchase: `INVENTORY_IN` + Supplier payable credit in `supplier_ledger`.
  * Supplier Payment: `WALLET_OUT` + Supplier payable debit.
* **Wallet Transfers:**
  * Cash OUT and Bank IN commit atomically. If either leg fails, both roll back.

---

## 7. Verification & Acceptance Criteria

- [ ] Completed sales commit to local SQLite in `< 10ms`.
- [ ] Concurrent sales across offline terminals combine additively without dropped bills.
- [ ] Oversold inventory is accurately reported in negative stock reports.
- [ ] Customer ledger and supplier ledger balances match the sum of their transactions.
- [ ] Double reversal attempts are rejected with an explicit error.
