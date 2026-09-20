# Phase 01: First-Run Onboarding & Shop Initialization

> **Reference:** `docs/USER & ROLE SETUP — FIRST INSTALL TO DAILY SALES.md` & `docs/RBAC_RULES.md`  
> **Mandate:** Zero Cloud Auth Dependency. 100% autonomous local setup committing directly to local SQLite in `< 10ms`.

---

## 1. Objectives & Scope

When Zaynahs POS is launched for the first time on a new terminal or machine, there is zero existing database state. The application must detect this first-run condition and present a streamlined, offline onboarding wizard that initializes the shop, creates the root administrative authority, and registers the primary device.

---

## 2. Architectural Flow & Lifecycle

```text
App First Launch
       ↓
Check Local SQLite (COUNT from shop === 0)
       ↓
Present Welcome Screen:
   [ Create New Shop ]  or  [ Join Existing Shop ]
       ↓ (Select: Create New Shop)
Step 1: Shop Profile
   • Shop Name (Required)
   • Currency (Default: PKR / Symbol)
   • Business Type / Address / Phone (Optional)
   • Shop Logo (Optional, processed via local MediaLibrary)
       ↓
Step 2: Create Root Admin Account
   • Admin Full Name
   • Admin Username / Identifier
   • 4-6 Digit Security PIN
   • Confirm PIN
       ↓
Step 3: Security & Cryptographic Identity Generation
   • System generates UUID-v4 SHOP_ID (e.g. SHOP-8F42...)
   • System generates DEVICE_ID (e.g. PC-MAIN)
   • System generates Device ECDSA Keypair (Public/Private)
   • System generates 24-character High-Entropy Offline Recovery Code
   • Admin PIN is salted & hashed locally using PBKDF2-HMAC-SHA256
       ↓
Step 4: Atomic Local SQLite Transaction Commit
   • INSERT INTO shop (id, name, currency, logo_hash, created_at)
   • INSERT INTO devices (id, shop_id, device_name, public_key, status, is_root)
   • INSERT INTO users (id, name, role='admin', pin_hash, salt, status='active', is_root=1)
   • INSERT INTO sync_outbox (SHOP_CREATED, DEVICE_REGISTERED, USER_CREATED)
       ↓
Step 5: Recovery Code Presentation
   • Display emergency recovery code on screen with copy/print action
   • User confirms: "I have securely saved my recovery code"
       ↓
Navigate to POS Dashboard (Session Authenticated as Root Admin)
```

---

## 3. Database Schema & Tables Involved

### `shop` Table
```sql
CREATE TABLE IF NOT EXISTS shop (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PKR',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs',
  address TEXT,
  phone TEXT,
  logo_path TEXT,
  logo_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### `devices` Table
```sql
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('trusted', 'pending', 'revoked')),
  is_root INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shop(id)
);
```

### `users` Table (Initial Admin Row)
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier', 'salesman')),
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'disabled')),
  is_root INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (shop_id) REFERENCES shop(id)
);
```

---

## 4. Key Security & Cryptographic Rules

1. **Zero Plaintext PIN Storage:** Plaintext PIN is never stored in SQLite, never logged, and never included in outbox events.
2. **PBKDF2-HMAC-SHA256 PIN Hashing:** 100,000 iterations with a cryptographically secure 16-byte random salt generated via `crypto.getRandomValues()`.
3. **ECDSA Device Keypair:** Generated locally using Web Crypto API (`ECDSA P-256`). Private key is kept local and never exported. Public key is registered in `devices`.
4. **Master Offline Recovery Code:** Formatted as `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`. Used exclusively for emergency offline PIN reset if the root admin forgets their PIN.
5. **Atomic Commit:** All initial records (Shop, Device, Admin User, Outbox events) must commit inside a single `BEGIN TRANSACTION ... COMMIT`. If any step fails, roll back completely.

---

## 5. Verification & Acceptance Criteria

- [ ] First launch check returns `isFirstLaunch: true` on an empty SQLite database.
- [ ] Onboarding wizard displays with clean Linear styling (no purple gradients, flat surfaces, hairline borders).
- [ ] Submitting the wizard commits all records in `< 10ms` to local SQLite.
- [ ] Master recovery code is displayed and confirmed.
- [ ] Application immediately transitions into authenticated Admin dashboard.
- [ ] Refreshing the browser or restarting Tauri dev mode does NOT show the onboarding wizard again.
