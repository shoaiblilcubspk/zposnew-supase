# Phase 03: Decentralized RBAC, 4 Canonical Roles & Central Authorization

> **Reference:** `docs/RBAC_RULES.md` & `docs/USER & ROLE SETUP — FIRST INSTALL TO DAILY SALES.md`  
> **Mandate:** Zero Cloud RBAC/JWT dependency. Centralized local authorization engine with 4 canonical roles.

---

## 1. Objectives & Scope

Implement a fully decentralized Role-Based Access Control (RBAC) and user management system operating entirely within local SQLite. Provide secure local PIN authentication, progressive lockout protection, and distinct roles for Admin, Manager, Cashier, and Salesman.

---

## 2. Canonical 4-Role Architecture

```text
┌─────────────────┐  Full Authority
│      ADMIN      │  All settings, users, devices, pricing, security, root recovery.
└────────┬────────┘
         │ Creates
┌────────┴────────┐  Operational Management
│     MANAGER     │  Products, inventory restock, discounts, operational reports.
└────────┬────────┘
         │ Operates
    ┌────┴─────────────────────────────┐
    ▼                                  ▼
┌──────────────┐                 ┌──────────────┐
│   CASHIER    │                 │   SALESMAN   │
│   Checkout   │                 │ Selling Only │
│  Take Money  │                 │  Track Sales │
│ Print Receipt│                 │ Cart / Draft │
└──────────────┘                 └──────────────┘
```

### Responsibility Matrix
* **ADMIN:** Full control, shop settings, users CRUD, device pairing/revocation, security, root recovery.
* **MANAGER:** Daily operations, inventory restock/adjust, product editing, operational reports, staff supervision.
* **CASHIER:** POS checkout, taking payments (Cash, Card, Bank, Credit), receipts, own sales lookup.
* **SALESMAN:** Customer assistance, product recommendations, sales attribution (`SALESMAN_ID`), cart preparation, sales performance tracking.

---

## 3. Salesman Attribution vs Cashier Checkout Flow

Every sale transaction captures distinct actor roles:
```text
Customer interacts with Salesman (Ahmed)
                 ↓
Salesman creates sale / draft (SALESMAN_ID = Ahmed)
                 ↓
Customer brings items to checkout counter
                 ↓
Cashier (Ali) takes payment & completes sale (CASHIER_ID = Ali)
                 ↓
Sale Record Saved:
  • SALESMAN_ID: Ahmed (Credited for commission / sales performance)
  • CASHIER_ID: Ali (Responsible for drawer cash balance)
  • DEVICE_ID: PC-MAIN
  • USER_ID: Ali (Authenticated actor at commit time)
```
* **Salesman Self-Checkout:** If the salesman completes checkout directly, `SALESMAN_ID = Ahmed` and `CASHIER_ID = Ahmed`.
* **Mid-Sale Reassignment:** If salesman changes mid-transaction, emit a `SALESMAN_ASSIGNED` event.

---

## 4. Central Authorization Engine & Service Layer Enforcement

### Central `can()` Evaluator
```typescript
export function can(user: UserSession, permission: PermissionCode): boolean {
  if (!user || user.status !== 'active') return false;
  if (user.role === 'admin') return true;
  
  // Explicit user override check
  if (user.permissionOverrides?.[permission] !== undefined) {
    return user.permissionOverrides[permission];
  }
  
  // Default role permission mapping
  return ROLE_DEFAULT_PERMISSIONS[user.role]?.includes(permission) ?? false;
}
```

### Fail-Closed Security Mandate
* UI visibility checks (`hasPermission()`) improve user experience by hiding disabled actions.
* **Business services MUST independently check `can()` before committing any sensitive mutation.**
* If authorization fails, throw an unauthorized error; zero database changes commit.

---

## 5. PIN Security, Progressive Lockout & Session Locks

1. **PIN Storage:** Salted PBKDF2-HMAC-SHA256 (100k iterations). Plaintext PIN is never stored or synchronized.
2. **Progressive Lockout:**
   * **3 failed attempts:** 30-second cooldown timer.
   * **5 failed attempts:** 5-minute cooldown timer.
   * **10 failed attempts:** Terminal lockout requiring Admin Master Recovery Code or active Admin override.
3. **Session Auto-Lock:** Configurable idle timeout (2 min, 5 min, 15 min, or Never).

---

## 6. User Lifecycle & P2P Event Synchronization

* **Soft Deletes Only:** Hard deletion of users with historical transaction references is prohibited. Deactivation sets `status = 'disabled'` (`active = 0`).
* **Replicated User Events:**
  * `USER_CREATED` — Replicates new staff profile (with salted PIN hash, never plaintext).
  * `USER_UPDATED` — Replicates profile changes.
  * `USER_ROLE_UPDATED` — Immediate permission adjustment across all terminals.
  * `USER_STATUS_CHANGED` — Immediate revocation of terminal login across the mesh.
  * `USER_PIN_RESET` — Replicates new salted PIN verifier.

---

## 7. Verification & Acceptance Criteria

- [ ] All 4 roles can be created, edited, and disabled in the UI.
- [ ] Sales record captures both `SALESMAN_ID` and `CASHIER_ID`.
- [ ] Disabled users are instantly blocked from logging in.
- [ ] Progressive lockout triggers cooldowns at 3 and 5 failed attempts, and terminal lock at 10.
- [ ] Service layer blocks unauthorized actions even if triggered directly via API.
