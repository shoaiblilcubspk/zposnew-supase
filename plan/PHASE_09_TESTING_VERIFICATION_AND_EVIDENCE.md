# Phase 09: Testing, Verification & Production Evidence Protocol

> **Reference:** `AGENTS.md` & `GEMINI.md`  
> **Mandate:** Zero unverified assertions. Every phase must provide verifiable terminal logs, passing automated test suites, and clean production builds.

---

## 1. Objectives & Scope

Define the complete testing matrix and verification protocols for the Local-First P2P POS system. Validate transactional atomicity, offline resilience, additive stock convergence, cryptographic authorization, and zero-error TypeScript compilation.

---

## 2. Automated Test Matrix

### A. SQLite & Driver Unit Tests
* Verify `TauriSqliteDriver` and `WasmSqliteDriver` both adhere to `ISqliteDriver`.
* Verify transaction rollback on error:
  ```typescript
  test('transaction rolls back on failure with zero committed rows', async () => {
    await expect(db.transaction(async (tx) => {
      await tx.execute('INSERT INTO products ...');
      throw new Error('Forced failure');
    })).rejects.toThrow();
    const count = await db.query('SELECT COUNT(*) as c FROM products');
    expect(count[0].c).toBe(0);
  });
  ```

### B. RBAC & Authorization Tests
* Verify `can(user, permission)` returns `true` for Admin on all permissions.
* Verify Cashier is blocked from `inventory.adjust`, `users.manage`, `devices.manage`.
* Verify Salesman can create draft/cart and assign `SALESMAN_ID`, but cannot perform drawer adjustments.
* Verify disabled user (`status = 'disabled'`) is denied all operations (`can()` returns `false`).
* Verify progressive lockout triggers after 3, 5, and 10 failed PIN attempts.

### C. Financial & Stock Ledger Tests
* **Zero Bill Drop Test:** Simulate two terminals selling the last 3 items simultaneously:
  * Terminal 1 sells 2 items (`INVENTORY_OUT: 2`).
  * Terminal 2 sells 3 items (`INVENTORY_OUT: 3`).
  * Verify both sales succeed locally.
  * Reconcile: `Opening 3 - 2 - 3 = -2 (Oversold = 2)`. Both sales exist; zero dropped bills.
* **Double Reversal Rejection Test:** Verify second reversal call on a reversed sale throws an error.
* **Customer Ledger Test:** Verify Credit sale creates a debit entry and increments outstanding balance.

### D. P2P Replication & Idempotency Tests
* **Delta Sync Test:** Verify sender queries only `sequence > remoteKnownSeq`.
* **Idempotency Test:** Ingest duplicate `event_id` into `sync_inbox`; verify it returns an ACK and does not double-increment inventory or wallets.
* **Image Transfer Test:** Stream a 30KB image in 16KB chunks over DataChannel; verify SHA-256 integrity upon assembly.

---

## 3. Production Verification Protocol

Before declaring any phase complete:
1. **TypeScript Typecheck:**
   ```bash
   npx tsc --noEmit
   ```
   * Must exit with code 0 and zero errors.
2. **Production Bundle Build:**
   ```bash
   npm run build
   ```
   * Must build the Vite distribution bundle with zero missing imports or syntax errors.
3. **File Size Compliance:**
   * Verify all modified and created source code files are strictly `<= 300 lines`.
4. **Shared Component Rule:**
   * Verify zero bespoke buttons, cards, or inputs were added outside of `src/shared/ui/`.

---

## 4. Acceptance Sign-Off Checklist

- [ ] Unit tests pass: `npm test`.
- [ ] TypeScript passes: `npx tsc --noEmit`.
- [ ] Vite build passes: `npm run build`.
- [ ] No file exceeds 300 lines.
- [ ] No direct Supabase DB table queries remain in application services.
- [ ] Status report emitted: `"PLANNING COMPLETE — WAITING FOR PHASE 01."`
