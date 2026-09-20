# P2P Sync Rules — Zaynahs POS Complete Reference Guide
> **Single Source of Truth** for ALL P2P sync rules, shareable vs device-local classification,
> known bugs & permanent fixes, diagnostic patterns, and post-change verification.
>
> AI Agent MUST read this before ANY P2P-related feature, fix, or field change.
> Last Updated: 2026-09-18

---

## 🔴 MANDATORY RULE — Agent Must Follow Before Any Change

1. Read this document in full before any P2P-related work.
2. Run the **Section 6 Post-Change Checklist** after every feature, fix, or schema change.
3. No change is "done" until it passes the checklist. No exceptions.

---

## ✅ 1. ALL-TIME SHAREABLE — Must Sync to All Devices Automatically

Every mutation = `commitLocalTransaction()` → `sync_outbox` → P2P WebRTC → remote event handler → SQLite commit → 0ms Zustand store refresh.

### 🏪 Store Identity
| Field | SQLite Key | Notes |
|---|---|---|
| Store Name | `storeName` | Dukaan ka naam |
| Store Phone | `storePhone` | Raabta number |
| Store Email | `storeEmail` | Business email |
| Store Website | `storeWebsite` | URL |
| Store Address | `storeAddress` | Physical address |
| Store Logo | `storeLogo` | Image hash/path — ADD and REMOVE both propagate |

**Critical:** Logo remove karna bhi ek explicit user action hai. `storeLogo = ''` (empty string) must propagate to all devices just like adding a logo. Timestamp decides winner — newer action always wins.

### 📦 Catalog & Stock
| Entity | Event Handler | Notes |
|---|---|---|
| Products | `catalogEventHandlers.ts` | Name, Barcode, SKU, Price, Cost, Category, Supplier, image_hash |
| Product Images | `p2pImageTransfer.ts` | WebRTC DataChannels, chunked, SHA-256 verified — NOT base64 in SQLite |
| Categories | `catalogEventHandlers.ts` | Name, Color, Icon |
| **Bundles & Deals** | `bundleEventHandlers.ts` | BUNDLE_CREATED, BUNDLE_UPDATED, BUNDLE_DELETED — SQLite `bundles` + `bundle_items` tables — fully P2P synced |
| Discounts | `discountEventHandlers.ts` | DISCOUNT_CREATED, DISCOUNT_UPDATED, DISCOUNT_DELETED |
| Suppliers | `supplierEventHandlers.ts` | Name, Phone, Email, Address, Balance |
| Stock Ledger | `inventoryEventHandlers.ts` | INVENTORY_IN, INVENTORY_OUT, AUDIT (all append-only) |

### 🧾 Sales & Finance
| Entity | Event Handler | Notes |
|---|---|---|
| Sales & Invoices | `salesEventHandlers.ts` | Invoice No, Items, Total, Tax, Extra Charges |
| Payments | `salesEventHandlers.ts` | Cash, Card, Online, Split Wallet |
| **Credit Sales** | `salesEventHandlers.ts` | paymentMethod='credit' — also updates customer_ledger + current_balance on peer |
| Sale Edits | `saleEditEventHandlers.ts` | Item add/remove, price/discount change |
| Sale Voids | `reversalEventHandlers.ts` | Void → inventory reversal → ledger event |
| Customers | `customerEventHandlers.ts` | List, credit limit, ledger, balance |
| **Credit Repayments** | `customerEventHandlers.ts` | entityType=CUSTOMER_LEDGER, eventType=CUSTOMER_PAYMENT — updates customer_ledger + payments(sale_id=NULL) + customer.current_balance |
| Expenses | `expenseEventHandlers.ts` | Kharchay, categories, wallet accounts |

### 🎯 Finance Rules & Receipt (all shareable)
Tax Rate, Tax ID, Currency, Country, Invoice Prefix/Counter/Padding, Retail/Wholesale Enabled, Negative Stock allow/disallow, Sound feedback, ALL receipt template/paper/header/footer/toggle/font/margin settings.

### 👤 Users & Security
Users/Staff, Roles (Admin/Manager/Cashier/Salesman), salted PIN hashes (PBKDF2/Argon2id — plaintext NEVER synced), Device approvals, ECDSA keys.

---

## 🔒 2. DEVICE-LOCAL — Never Syncs, Each Terminal Keeps Its Own

Defined in `src/lib/services/settings/settingsHelper.ts → DEVICE_LOCAL_SETTINGS_KEYS`.

| Key | Reason |
|---|---|
| `theme` | Light/Dark — Counter 1 dark, Counter 2 light |
| `posGridColumns` | Monitor size dependent (tablet=3, LED=6) |
| `iconStyle` | 3D Tactile vs System icons |
| `interfaceMode` | Touch POS vs Desktop Keyboard |
| `touchKeyboardEnabled` | Only for touchscreen terminals |
| `receiptPrinter` | USB/Bluetooth printer on THIS machine |
| `enableKotPrinter` | Kitchen printer on THIS terminal |
| `autoSaveReceiptPng` | Receipt PNG saved to THIS machine |
| `autoBackup` | Local backup to THIS machine |

---

## 🔑 3. Core Merge Algorithm — mergeRemoteSettingsIntoLocal()

**File:** `src/lib/services/settings/settingsHelper.ts`

```
INPUT: local (this device's settings), remote (received from peer)

Step 1: Calculate identity scores
  localIsReal  = getStoreIdentityScore(local)  >= 3
  remoteIsReal = getStoreIdentityScore(remote) >= 3

Step 2: Decide whether to apply remote
  IF (!remoteIsReal AND localIsReal):
    → PROTECT local — remote is blank/fresh device placeholder
    → Apply ONLY non-identity shareable fields (tax, receipt, etc.)
    → SKIP: storeName, storePhone, storeEmail, storeWebsite, storeAddress, storeLogo

  ELIF (remoteIsReal AND !localIsReal):
    → Local is placeholder → apply ALL remote shareable fields

  ELSE (both real OR both placeholder):
    → TIMESTAMP DECIDES — newer updatedAt wins
    → ⚠️ CRITICAL: Use new Date(x).getTime(), NOT Number(x)!
      Number("2026-09-18T18:38:00Z") = NaN → NaN >= NaN = FALSE → merge never runs!
    → Apply ALL shareable fields (including empty storeLogo for logo removal)

Step 3: Always preserve DEVICE_LOCAL_SETTINGS_KEYS from local (never from remote)
```

---

## 🔑 4. Identity Score Formula — getStoreIdentityScore()

```typescript
score = 0
phone    && phone   !== '+92 3XX XXXXXXX'    → +2
email    && !email.includes('mystore.com')    → +2
address  && !address.includes('Main Street')  → +2
website  && !website.includes('mystore.com')  → +1
logo     && !isDefaultLogo(logo)             → +1

isReal        = score >= 3   // Has at least one real contact field
isPlaceholder = score < 3    // Blank/default device
```

---

## 🔑 5. Snapshot Bootstrap Rule

- `SNAPSHOT_REQUEST` is **STRICTLY for initial device bootstrap ONLY** (0 products AND 0 users).
- Established devices with data NEVER send or receive snapshot requests during normal operation.
- `periodicSweep()` only sends SNAPSHOT_REQUEST when: `products.count === 0 AND users.count === 0`.
- `forceFullMeshReconcile()` uses incremental event sync + entity reconcile — NOT snapshot.
- `SNAPSHOT_REQUEST` on established devices → placeholder settings overwrite real identity → STRICTLY PROHIBITED.

---

## ✅ 6. Post-Change Verification Checklist (MANDATORY)

Run this after EVERY feature addition, field change, schema change, or bug fix.

### 6.1 Data Flow Chain
For every new entity/field:
- [ ] TypeScript types updated (`types/index.ts`)
- [ ] SQLite migration/schema column added
- [ ] Repository CRUD queries include new field
- [ ] `commitLocalTransaction()` outbox event payload includes field
- [ ] Remote event handler (`*EventHandlers.ts`) reads and commits field
- [ ] Zustand store updated after remote apply
- [ ] UI/Modal/Receipt/Report shows new field
- [ ] Backup/Restore (`.zpos`) includes field
- [ ] Import/Export (catalog JSON/Excel) includes field

### 6.2 Settings-Specific
- [ ] Field in `SHAREABLE_SETTINGS_KEYS` OR `DEVICE_LOCAL_SETTINGS_KEYS`? (never both, never neither)
- [ ] `settingsService.update()` includes field in payload with `updatedAt = new Date()`
- [ ] `handleRemoteSettingsEvent()` applies via `mergeRemoteSettingsIntoLocal()`
- [ ] Logo REMOVE on Device 1 → Device 2 removes within 5s (timestamp merge test)
- [ ] Device-local settings (theme, grid, icons) do NOT change on remote devices
- [ ] Timestamp comparison uses `new Date(x).getTime()` — not `Number(x)`

### 6.3 Product Images
- [ ] Image uploaded → `image_hash` saved to products table
- [ ] `image_hash` in PRODUCT outbox event payload
- [ ] Remote handler updates `image_hash` on receiving device
- [ ] P2P image transfer initiated for missing hashes (`p2pImageTransfer.ts`)
- [ ] Image NOT stored as base64 in SQLite (filesystem: `$APPDATA/images/`)

### 6.4 Inventory Correctness
- [ ] Every stock mutation creates an `INVENTORY_IN/OUT` ledger event (never direct `UPDATE products SET stock`)
- [ ] `recomputeStockFromLedger()` produces correct sums on both devices
- [ ] INITIAL transaction created ONLY at product creation — never with `p.stock` value (double-count risk)
- [ ] Sale void → stock reverted correctly via `RETURN` or `itx_void_` ledger entry
- [ ] `itx_sale_${itemId}` IDs are deterministic — `INSERT OR IGNORE` prevents duplicates

### 6.5 Sync Timing & Reactivity
- [ ] Change on Device 1 → appears on Device 2 within 5 seconds (no manual refresh)
- [ ] Settings change → UI updates on Device 2 WITHOUT page reload (0ms, native app behavior)
- [ ] No `window.location.reload()` in business logic
- [ ] No manual "refresh" buttons for data that should be reactive
- [ ] `refreshAllStoresFromLocalDb()` called after every `applyEventBatch()`

### 6.6 Anti-Regression
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] No `SNAPSHOT_REQUEST` sent during periodic sweep when products > 0
- [ ] `Number(dateString)` never used for date comparison (use `new Date(x).getTime()`)
- [ ] Reconcile manifest `hasRealSettings` reflects correct identity score

---

## 🐛 7. Known Bugs — Root Causes & Permanent Fixes

### Bug 1 — Periodic SNAPSHOT_REQUEST → Settings Blinking Every 5 Seconds
**Files:** `src/lib/sync/syncEngine.ts` — `periodicSweep()`
**Symptom:** Logo, store name, phone reset/blink every ~5 seconds.
**Root Cause:** Every 5s, ALL peers received `SNAPSHOT_REQUEST`. Fresh devices with placeholder settings sent snapshot → established device's real settings overwritten.
**Fix:**
```typescript
// OLD (wrong): Only checked products count
if ((pRow?.count ?? 0) === 0) { sendSnapshotRequest(); }

// NEW (correct): Both products AND users must be 0
if ((pRow?.count ?? 0) === 0 && (uRow?.count ?? 0) === 0) { sendSnapshotRequest(); }
// + explicit return to skip normal sync until snapshot applied
```

### Bug 2 — snapshotEngine Blind INSERT OR REPLACE for Settings
**File:** `src/lib/sync/snapshotEngine.ts`
**Symptom:** New device joining overwrites real store identity (logo, name, phone) with default placeholders.
**Root Cause:** `app_settings` was applied with raw `INSERT OR REPLACE` — no merge, no score check.
**Fix:** Settings snapshot now passes through `mergeRemoteSettingsIntoLocal()` before writing:
```typescript
// OLD: await db.execute(`INSERT OR REPLACE INTO app_settings ...`)

// NEW: Score-aware merge first, then write
const merged = mergeRemoteSettingsIntoLocal(localSettings, snapshotSettings);
await db.execute(`INSERT OR REPLACE INTO app_settings VALUES (?, ?)`, ['app_settings', JSON.stringify(merged)]);
```

### Bug 3 — Logo Removal Ping-Pong (Score-Based Winner Was Wrong)
**File:** `src/lib/services/settings/settingsHelper.ts` — `mergeRemoteSettingsIntoLocal()`
**Symptom:** User removes logo on Device 1 → Device 2 pushes old logo back → infinite ping-pong, logo keeps reappearing.
**Root Cause:** Old logic used raw SCORE to decide winner:
```
Device 1 removes logo: score 8 → 7 (still real!)
Device 2 still has logo: score 8
remoteScore(7) < localScore(8) → Device 2 "wins" → pushes old logo back → ping-pong!
```
**Fix:** Score is ONLY for placeholder vs real detection (threshold = 3). Both-real → timestamp:
```typescript
// OLD (wrong): score comparison
shouldApplyRemoteIdentity = remoteScore > localScore || (remoteScore === localScore && ...);

// NEW (correct): score only for placeholder detection; timestamp for real vs real
if (!remoteIsReal && localIsReal) shouldApplyRemoteIdentity = false;
else if (remoteIsReal && !localIsReal) shouldApplyRemoteIdentity = true;
else {
  // BOTH real OR both placeholder → timestamp wins
  const remoteTime = new Date(remote.updatedAt).getTime();
  const localTime  = new Date(local?.updatedAt || 0).getTime();
  shouldApplyRemoteIdentity = remoteTime >= localTime;
}
```

### Bug 4 — Number(isoDateString) = NaN → Merge NEVER Applied
**File:** `src/lib/services/settings/settingsHelper.ts` — `mergeRemoteSettingsIntoLocal()`
**Symptom:** Logo removal on Device 1 NEVER appears on Device 2. Settings changes from one device silently ignored by the other.
**Root Cause:**
```javascript
updatedAt stored as ISO string: "2026-09-18T18:38:00.000Z"
Number("2026-09-18T18:38:00.000Z") = NaN   // JavaScript cannot parse ISO dates via Number()
NaN >= NaN = false                          // Comparison always FALSE
shouldApplyRemoteIdentity = false           // Merge silently skipped!
```
**Fix — Use `new Date(x).getTime()` instead of `Number(x)`:**
```typescript
// WRONG (was causing silent merge failure):
shouldApplyRemoteIdentity = Number(remote.updatedAt || 0) >= Number(local?.updatedAt || 0);

// CORRECT (works for ISO strings AND Unix timestamps):
const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
const localTime  = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
shouldApplyRemoteIdentity = remoteTime >= localTime;
```
**General Rule:** NEVER use `Number()` to compare dates in this codebase. Always use `new Date(x).getTime()` or `Date.parse(x)`.

### Bug 5 — INITIAL Transaction Created With p.stock → Inventory Double-Counting
**File:** `src/lib/sync/reconcilerOps.ts` — `recomputeStockFromLedger()` step 3.5
**Symptom:** Stock inflates automatically after P2P sync without any restock action (e.g. 60 becomes 110).
**Root Cause:**
```
Product: stock=60 (10 INITIAL + 50 INVENTORY_IN restock)
Step 3.5: checks if itx_init_ exists → if NOT found (race condition):
  Creates itx_init_ with qty = p.stock = 60  ← WRONG!
Ledger sum: 60 (wrong INITIAL) + 50 (INVENTORY_IN) = 110 ← DOUBLE COUNT!
```
**Fix:**
```typescript
// OLD (wrong): Created INITIAL using current inflated stock
WHERE NOT EXISTS (SELECT 1 FROM inventory_transactions WHERE product_id = p.id AND (type='INITIAL' OR id LIKE 'itx_init_%'))
const initialQty = Number(p.stock) || 0; // p.stock already includes restocks!

// NEW (correct): Only for products with ZERO transactions, always qty=0
WHERE NOT EXISTS (SELECT 1 FROM inventory_transactions WHERE product_id = p.id)
// qty = 0 (not p.stock) — correct stock arrives via P2P inventory events
```
**General Rule:** NEVER use `p.stock` as an INITIAL transaction quantity in reconcile/recompute functions. `p.stock` = computed output. INITIAL = input at product creation time.

### Bug 6 — forceFullMeshReconcile Sent SNAPSHOT_REQUEST to All Peers
**File:** `src/lib/sync/syncEngine.ts` — `forceFullMeshReconcile()`
**Symptom:** Manual Force Sync triggered placeholder overwrite on established devices.
**Fix:** Removed `SNAPSHOT_REQUEST` from `forceFullMeshReconcile()`. Now uses incremental event sync + entity reconcile ONLY.

### Bug 7 — settingsService.get() Score-Based Merge Was Wrong
**File:** `src/lib/services/settingsService.ts`
**Symptom:** After logo removal, old logo reappeared on the SAME device from Dexie cache.
**Root Cause:** Score comparison between SQLite and Dexie — lower-score-but-newer SQLite data (after logo removal) would lose to older-but-higher-score Dexie cache.
**Fix:** SQLite is authoritative, always wins over Dexie. Device-local keys injected from localStorage last:
```typescript
const merged = { ...(dexie || {}), ...(sqlite || {}) };
for (const key of DEVICE_LOCAL_SETTINGS_KEYS) {
  if (localPrefs[key] !== undefined) merged[key] = localPrefs[key];
}
```

---

## 🔮 8. Future-Risk Issues & Pre-emptive Fixes

### Risk A — New Settings Field Added But Not In SHAREABLE_SETTINGS_KEYS
**Symptom:** New field saved locally but never propagates to other devices.
**Prevention:** Any new settings field MUST be added to EITHER `SHAREABLE_SETTINGS_KEYS` OR `DEVICE_LOCAL_SETTINGS_KEYS` in `settingsHelper.ts` before the feature is considered complete. Run Section 6.2 checklist.

### Risk B — Sale Also Creates INVENTORY_OUT Event → Double Deduction
**Symptom:** After sale, stock goes more negative than expected (e.g. sold 1, stock drops by 2).
**Root Cause:** If sale commit creates both a `SALE` outbox event AND an `INVENTORY_OUT` outbox event, the peer applies `INVENTORY_OUT` via `inventoryEventHandlers` PLUS `insertReconciledSale` creates `itx_sale_` → double deduction.
**Prevention:** Sale commit should create ONE outbox event (`SALE`). Stock deduction is computed deterministically in `reconcilerOps.insertReconciledSale()`. No separate `INVENTORY_OUT` event for sales.

### Risk C — Duplicate Event IDs → Idempotency Failure
**Symptom:** Same change applied twice on peer, causing double mutations.
**Prevention:** Every `commitLocalTransaction()` call must generate a cryptographically unique `event_id`. `sync_inbox` deduplication (`SELECT 1 FROM sync_inbox WHERE event_id = ?`) guards against this. Never reuse event IDs.

### Risk D — New Device Receives Real Settings Then Gets Overwritten by Periodic Sweep
**Symptom:** New device correctly receives real settings via snapshot, but 5 seconds later settings reset.
**Root Cause:** Would happen if SNAPSHOT_REQUEST was still sent during periodicSweep (Bug 1).
**Prevention:** Bug 1 fix ensures this can't happen. But verify after any changes to `periodicSweep()`.

### Risk E — Product Image Not Propagating to New Device
**Symptom:** Products sync correctly but images show placeholder on peer.
**Root Cause:** `image_hash` synced in product event, but P2P image transfer not initiated for that hash.
**Prevention:** On receiving a PRODUCT event with `image_hash`, `p2pImageTransfer.ts` must check if image exists locally. If not, request from sender peer. Verify in Section 6.3.

### Risk F — reconcilePayloadApplier Applies Sale Inventory Twice
**Symptom:** Inventory deductions doubled on receiving device during reconcile.
**Prevention:** `reconcilePayloadApplier.ts` has guard:
```typescript
if (it.reference_type === 'SALE') continue; // Skip — handled by insertReconciledSale
```
This must NOT be removed. Sales inventory is always handled authoritatively by `insertReconciledSale()`.

### Risk G — Zustand Store Not Updated After P2P Event → UI Stays Stale
**Symptom:** Device receives P2P event, SQLite updated correctly, but UI doesn't reflect change.
**Root Cause:** `refreshAllStoresFromLocalDb()` not called after event batch, OR store not subscribing to the data.
**Prevention:** `syncEngine.ts → handleEventBatch()` calls `refreshAllStoresFromLocalDb()` after every batch. Verify this is never removed. For settings: `handleRemoteSettingsEvent()` must call `useSettingsStore.getState().setSettings(merged)` AND dispatch `settings-updated` custom event.

### Risk H — ISO Date String Comparison Using Number() → Silent NaN
**Symptom:** Any timestamp-based merge logic silently fails; newer data never wins.
**Prevention (Hard Rule):** NEVER use `Number(x)` to compare dates anywhere in this codebase. Every date comparison must use `new Date(x).getTime()`. Apply this to any NEW timestamp comparison written in the future.
```typescript
// BANNED:
if (Number(a.updatedAt) > Number(b.updatedAt))

// REQUIRED:
if (new Date(a.updatedAt).getTime() > new Date(b.updatedAt).getTime())
```

---

## 🚫 9. Zero-Refresh Reactivity — EXE/DMG/APK Mandate

Native desktop (EXE/DMG) and mobile apps (APK/IPA) have **NO concept of browser page refresh.**
Every data change — sale, product, inventory, settings, logo, customer, expense — MUST appear on ALL connected device screens within **0 milliseconds** without any reload.

**Correct reactive flow:**
```
User action → Local SQLite commit (< 10ms)
           → Zustand store.setX() call → React re-renders instantly (0ms)
           → sync_outbox event → P2P mesh → remote device
           → remote SQLite commit → remote Zustand store.setX() → remote UI re-renders (0ms)
```

**Strictly PROHIBITED:**
- `window.location.reload()` in any business logic path
- Manual "Refresh" buttons for data that should be reactive
- `setTimeout(() => fetchData(), 500)` hacks to "wait for sync"
- Components reading directly from SQLite without Zustand subscription
- Stale snapshots — always read from authoritative Zustand store

**For settings specifically — 0ms chain:**
1. `settingsService.update()` → SQLite + Dexie + outbox event
2. `useSettingsStore.getState().setSettings(updated)` → immediate Zustand update
3. `window.dispatchEvent(new CustomEvent('settings-updated'))` → form re-reads
4. `useSettingsFormImpl.ts` listens → re-populates form without reload

---

## 📁 10. Key Files Reference

| File | Purpose |
|---|---|
| `src/lib/services/settings/settingsHelper.ts` | `SHAREABLE_SETTINGS_KEYS`, `DEVICE_LOCAL_SETTINGS_KEYS`, `getStoreIdentityScore()`, `mergeRemoteSettingsIntoLocal()` |
| `src/lib/services/settings/settingsEventHandlers.ts` | Remote `SETTINGS_UPDATED` handler — merge, persist, fire 0ms UI update |
| `src/lib/services/settingsService.ts` | Local settings read/write + P2P outbox commit |
| `src/lib/sync/syncEngine.ts` | Periodic sweep (snapshot bootstrap only), event batch handling, forceFullMeshReconcile |
| `src/lib/sync/snapshotEngine.ts` | Full snapshot generate/apply (initial device join only) — settings use score-merge |
| `src/lib/sync/entityReconciler.ts` | Bidirectional entity manifest reconcile |
| `src/lib/sync/reconcilerOps.ts` | `recomputeStockFromLedger()` — stock computed from ledger sum, INITIAL created only for zero-tx products |
| `src/lib/sync/reconcilePayloadApplier.ts` | Transactional commit of reconcile payloads — skips SALE inventory (handled by insertReconciledSale) |
| `src/lib/sync/storeSync.ts` | `refreshAllStoresFromLocalDb()` — 0ms Zustand refresh after any DB change |
| `src/lib/sync/eventDispatcher.ts` | Routes P2P events to domain handlers |
| `src/lib/mesh/useMeshBootstrap.ts` | Registers ALL domain event handlers on app start |
| `src/lib/media/p2pImageTransfer.ts` | Product/logo image P2P chunked transfer |
| `src/lib/services/catalog/catalogEventHandlers.ts` | PRODUCT/CATEGORY remote events — creates INITIAL tx on first product receive |
| `src/lib/services/inventory/inventoryEventHandlers.ts` | INVENTORY_IN/OUT remote events — ledger append + stock recompute |

---

## 📴 11. Offline Conflict Resolution — Last Save Wins (All Pages)

### Core Rule
> **Jab bhi koi device offline ho aur changes kare, reconnect hone par jo device ne LAST (sabse baad mein) changes save kiye ho, uski settings/data SABI devices pe apply ho gi.**

This is enforced via `updatedAt` timestamp on every entity. The device that pressed **Save** last wins.

### How It Works Across All Pages

```
OFFLINE SCENARIO:
  Device A (offline) → edits product price: Rs 150 → saves at 14:30
  Device B (offline) → edits same product price: Rs 200 → saves at 14:45
  
RECONNECT:
  P2P sync fires → compare updatedAt:
    Device A: 14:30  |  Device B: 14:45
  Device B's 14:45 > Device A's 14:30 → Device B's price (Rs 200) wins on ALL devices ✅
```

### Entity-Specific Rules

| Entity | Conflict Resolution | Implementation |
|---|---|---|
| **Settings** (store identity, logo, tax, receipt) | `new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime()` → remote wins if newer | `mergeRemoteSettingsIntoLocal()` in `settingsHelper.ts` |
| **Products** | `updatedAt` timestamp in catalog event payload — newer event overwrites older | `catalogEventHandlers.ts` → `INSERT OR REPLACE` with updatedAt check |
| **Customers** | `updatedAt` timestamp — newer edit wins | `customerRepository.ts` → `commitLocalTransaction()` |
| **Expenses** | Append-only — no conflict (each expense is unique) | `expenseRepository.ts` |
| **Sales** | Append-only — NO LWW. Both offline sales commit. Ledger combines additively. | `localSaleCommit.ts` |
| **Inventory** | Append-only events — NO LWW. Both offline restocks combine (additive). | `stockMovementCommit.ts` |
| **Users** | `updatedAt` timestamp — newer PIN reset / role change wins | `userRepository.ts` |

### Save Button Architecture (ALL Pages)

**Rule:** Every form in the app saves ONLY on explicit button click — not on field change.

```
User edits form (any page)
    ↓ isDirty = true (form in progress, protected from remote overwrite)
User clicks Save / Submit / Update System
    ↓
commitLocalTransaction() — atomic local SQLite write
    ↓ updatedAt = new Date() (exact save moment)
sync_outbox event created
    ↓
P2P mesh delivers to all connected peers
    ↓
Disconnected peers receive on reconnect (outbox persists until ACK'd)
    ↓
Remote handler: new Date(remote.updatedAt) > new Date(local.updatedAt) → apply
    ↓
All devices converge to the latest save ✅
```

### Offline Queue — Changes Never Lost
- `sync_outbox` is a **durable local SQLite table** — survives app restarts, crashes, and network outages.
- Events remain in outbox until the receiving peer sends an ACK.
- When device reconnects → outbox sends ALL pending events in chronological order.
- Receiving peer deduplicates by `event_id` (`INSERT OR IGNORE INTO sync_inbox`) → idempotent.

### Prohibited Patterns (Anti-Rules)
- ❌ Auto-save on `onChange` for any business field (makes offline conflict resolution unreliable)
- ❌ `window.location.reload()` after save — 0ms Zustand reactive update is mandatory
- ❌ `Number(dateString)` for timestamp comparison → NaN → conflict resolution breaks (Bug 4)
- ❌ `SNAPSHOT_REQUEST` on established devices → replaces entire state → offline work lost
- ❌ LWW for sales/inventory → concurrent offline sales must combine additively, never overwrite

### P2P_SYNC_RULES Verification for Offline Conflicts
After any new entity or field — verify:
1. `commitLocalTransaction()` sets `updatedAt = new Date()` in payload
2. Remote event handler compares `new Date(remote.updatedAt).getTime()` vs `new Date(local.updatedAt).getTime()`
3. Newer timestamp's data applies
4. `sync_outbox` retains event until ACK received
5. Test: save on Device A, disconnect Device B, change same field on Device B, reconnect → later save wins

---

## 🌐 12. Different LAN / WAN Connectivity — 0-Risk WebRTC

### Problem
```
Same LAN:      Device A ←→ Device B  (direct WebRTC) ✅
Different LAN: Device A (Home WiFi) → Router NAT → Internet ← Router NAT ← Device B (Office)
               Strict NAT = STUN fails = NO direct connection ❌
```

### Fix: STUN + TURN Relay (iceConfig.ts)
```
STUN servers → try direct P2P (free, fast, works ~80% of cases)
     ↓ fails (strict NAT / different ISP)
TURN servers → relay traffic via TURN server (100% connectivity guarantee)
```

**Rule:** `iceTransportPolicy: 'all'` — browser tries STUN first, auto-falls-back to TURN. No manual intervention needed.

**Env override** (production credentials):
```env
VITE_TURN_URL=turn:your-turn-server.com:80
VITE_TURN_USER=your-username
VITE_TURN_PASS=your-credential
```

### Connection Matrix (After Fix)

| Scenario | Before Fix | After Fix |
|---|---|---|
| Same LAN | ✅ Direct WebRTC | ✅ Direct WebRTC |
| Different LAN, open NAT | ✅ STUN | ✅ STUN |
| Different LAN, strict NAT | ❌ Fail | ✅ TURN relay |
| Different LAN, symmetric NAT | ❌ Fail | ✅ TURN relay |
| Corporate firewall (port 443) | ❌ Fail | ✅ TURNS (TLS 443) |
| Offline → reconnect via internet | ✅ Outbox delivers | ✅ Outbox delivers |

---

## ⏰ 13. Zero NaN Timestamp Bug — safeTs() Mandatory Rule

### Root Cause
```typescript
// ❌ BROKEN — JavaScript ISO strings return NaN from Number()
Number("2026-09-18T14:30:00.000Z")  // → NaN
Number(new Date())                   // → NaN  ← Common mistake
NaN > 1726678200000                  // → false (wrong comparison result!)

// Result: Last-Save-Wins comparison silently breaks
// Older data overwrites newer data — conflict resolution unreliable
```

### Fix — `safeTs()` from `src/lib/utils/safeTimestamp.ts`
```typescript
import { safeTs, nowMs } from '../../utils/safeTimestamp';

// ✅ Handles ALL formats: Unix ms, ISO string, Date object, null/undefined
safeTs("2026-09-18T14:30:00.000Z")  // → 1726678200000 ✅
safeTs(1726678200000)                // → 1726678200000 ✅
safeTs(new Date())                   // → current ms    ✅
safeTs(null, Date.now())             // → fallback       ✅
```

### MANDATORY RULE
> **NEVER use `Number(dateValue)` for timestamp conversion. ALWAYS use `safeTs(dateValue)`.** Any `Number(x)` where x might be a Date or ISO string = potential NaN = potential data loss.

### Files Fixed (All NaN timestamp bugs resolved)
| File | Old (broken) | New (correct) |
|---|---|---|
| `settingsEventHandlers.ts` | `Number(p.updatedAt)` | `safeTs(p.updatedAt, nowMs())` |
| `snapshotEngine.ts` | `Number(merged.updatedAt)` | `safeTs(merged.updatedAt, now)` |
| `reconcilePayloadApplier.ts` | `Number(merged.updatedAt)` | `safeTs(merged.updatedAt, now)` |
| `reconcilerQueries.ts` | `Number(rs.updatedAt)` | `safeTs(rs.updatedAt, 0)` |
| `saleEditEventHandlers.ts` | `Number(p.timestamp)` | `safeTs(p.timestamp, Date.now())` |
| `settingsHelper.ts` | `Number(dateString)` | `new Date(x).getTime()` |

### Post-Change Checklist
After any new event handler or reconciler code:
1. Search for `Number(` in new code — if argument might be Date/ISO string → replace with `safeTs()`
2. `ls.updated_at` from SQLite INTEGER column → `Number()` is fine (it's already a number)
3. `rs.updatedAt` from P2P JSON payload → **must use `safeTs()`** (JSON serializes Date as ISO string)
4. `p.updatedAt` from event payload → **must use `safeTs()`**

---

## ⚡ 14. PERMANENT SYSTEM ARCHITECTURE RULES — Always Follow (Zero Exceptions)

> Yeh rules is session mein discovered aur fixed bugs se bane hain.
> Har naya AI agent, har naya developer — in rules ko tod nahi sakta.

---

### RULE P1 — Last Save Wins (Multi-Device Conflict Resolution)

```
Jo device ne sabse BAAD mein Save button click kiya → uski values sab devices pe apply hongi.
updatedAt timestamp = conflict ka final judge.
```

**Implementation Requirement:**
- Har entity (settings, product, customer, user, supplier) mein `updatedAt = Date.now()` SAVE ke waqt set ho
- Remote event handler mein: `if (safeTs(remote.updatedAt) >= safeTs(local.updatedAt)) → apply remote`
- Offline devices ka outbox SQLite mein durable rahega — reconnect hone par deliver hoga
- 3 devices, 3 alag LANs, 3 alag times — sabse latest timestamp wala wins — **no exceptions**

---

### RULE P2 — safeTs() Mandatory (Never Number() for Dates)

```typescript
// ❌ BANNED forever
Number(p.updatedAt)        // NaN if ISO string → conflict resolution silently breaks
Number(new Date())         // NaN → wrong winner selected

// ✅ ALWAYS use
import { safeTs, nowMs } from '../../utils/safeTimestamp';
safeTs(p.updatedAt)        // handles ISO string, Unix ms, Date object, null — never NaN
```

**Location:** `src/lib/utils/safeTimestamp.ts` — single utility, mandatory everywhere.

**Rule:** Before committing any event handler or reconciler code — search for `Number(` — if argument is timestamp/date → replace with `safeTs()`.

---

### RULE P3 — TURN Relay Required (Different LAN = 100% Connectivity)

```
STUN only    → fails on strict NAT, corporate firewall, different ISP → devices can't sync
STUN + TURN  → TURN relay guarantees connection in 100% of network scenarios
```

**Current Config:** `src/lib/mesh/iceConfig.ts`
- STUN: Cloudflare, Google, Twilio (fast, free)
- TURN: Open Relay Project (`openrelay.metered.ca`) — HTTP/HTTPS/TLS ports
- `iceTransportPolicy: 'all'` — auto STUN→TURN fallback

**Env Override** (for production TURN credentials):
```
VITE_TURN_URL=turn:your-server.com:80
VITE_TURN_USER=username
VITE_TURN_PASS=credential
```

---

### RULE P4 — Save Button Only (No Auto-Save on Field Change)

```
User edits form field → isDirty = true → remote P2P events MUST NOT overwrite form
User clicks Save/Submit → commitLocalTransaction() → outbox → P2P → all devices
```

**Settings Form:** `isDirty` ref in `useSettingsFormImpl.ts`
- `setFormData()` → marks dirty → protects form from remote overwrite
- `setFormDataDirect()` → no dirty → for instant-save UI prefs (theme, receipt toggles)
- `handleDiscard()` → clears dirty → reloads last saved settings

**All Pages Rule:** Modals, product forms, customer forms, expense forms — all save ONLY on explicit button click. No `onChange` auto-saves for business data.

---

### RULE P5 — Outbox Durability (No Event Lost)

```
Save → sync_outbox (SQLite) → deliver via WebRTC → ACK received → delete from outbox
                ↑
         Survives: app restart, crash, 1 hour offline, network change
```

- Events stay in outbox until ACK received from peer
- Reconnect (same LAN or different LAN via TURN) → outbox replays all pending events
- `event_id` deduplication on receiver → idempotent → no double-apply

---

### RULE P6 — 0ms Zustand Reactivity (No Refresh Ever)

```
commitLocalTransaction() → useSettingsStore.getState().setSettings(merged)
                        → window.dispatchEvent('settings-updated', merged)
                        → All components react instantly — 0ms
```

- **Banned:** `window.location.reload()`, `router.refresh()`, manual page reload
- **Banned:** polling loops to check for updates
- **Mandatory:** Zustand store update immediately after every SQLite write

---

### RULE P7 — No LWW for Sales/Inventory (Additive Only)

```
Device A offline: sells 5 items → INVENTORY_OUT -5
Device B offline: sells 3 items → INVENTORY_OUT -3
Both reconnect → ledger = -5 + -3 = -8 total sold (both bills preserved) ✅

NEVER: Device B's sale overwrites Device A's sale ❌
NEVER: Stock recalculated from snapshot replacing both ❌
```

Sales and inventory = **append-only events**. Last-Save-Wins only applies to editable entities (settings, products, customers, users).

---

### RULE P8 — settings-updated Event Guard (isDirty)

```
Remote P2P pushes SETTINGS_UPDATED event
↓
handleRemoteSettingsEvent() fires
↓
window.dispatchEvent('settings-updated', mergedSettings)
↓
useSettingsFormImpl.ts listener checks: if (!isDirty.current) → apply to form
                                        if (isDirty.current)  → SKIP (user is editing)
```

Logo, store name, phone, address — never overwrite in-progress form edits. User's work is always protected until they explicitly click Save.

---

### Quick Reference — What Wins When

| Scenario | Winner |
|---|---|
| Device A saves at 14:00, Device B saves at 14:02 | Device B (14:02 > 14:00) |
| 3 devices, all different times | Highest `updatedAt` wins |
| Device offline 1 hour, then reconnects | Outbox delivers, timestamp decides |
| Two devices sell simultaneously (inventory) | BOTH bills kept (additive) |
| User editing form + remote update arrives | Form protected (isDirty) |
| Same LAN sync | Direct WebRTC P2P |
| Different LAN sync | STUN → TURN relay fallback |

---

## 🏠🏢 15. Different LAN — Complete Rules & Scenarios

> Yeh section specifically un scenarios ke liye hai jab devices alag networks pe hain.
> Same shop, alag jagah, alag internet connection — sab kuch kaise kaam karta hai.

---

### 15.1 Different LAN Connection Flow (Step by Step)

```
PC1 (Home WiFi) ─────── Internet ─────── PC2 (Office Broadband)
       │                    │                      │
       │         Supabase Realtime           (Signaling Only)
       │         (SDP/ICE signaling)               │
       └──── WebRTC Offer/Answer exchange ─────────┘
                           │
              STUN → try direct P2P connection
                           │
               ✅ Success (open NAT) → Direct P2P DataChannel
               ❌ Fail (strict NAT)  → TURN relay kicks in
                                       ↓
                           TURN server relays data
                           PC1 → TURN → PC2 ✅
```

**Rule:** Supabase sirf "hello, kahan ho?" ke liye. Actual data kabhi Supabase se nahi guzarta.

---

### 15.2 Connection Types & What Happens

| Network Type | Connection Result | Data Path |
|---|---|---|
| Same LAN (same router) | Direct WebRTC | PC1 → PC2 (LAN) |
| Different LAN, open NAT (home routers) | STUN P2P | PC1 → Internet → PC2 |
| Different LAN, strict NAT (ISP/corporate) | TURN relay | PC1 → TURN server → PC2 |
| Mobile data (4G/5G) ↔ WiFi | TURN relay (usually) | PC1 → TURN → PC2 |
| Behind VPN | Depends on VPN type | STUN or TURN |
| Offline completely | Outbox waits | Delivers on reconnect |

---

### 15.3 Data Sync Rules — Different LAN Pe

**Rule 1 — Supabase sirf signaling:**
```
✅ Supabase Realtime: SDP/ICE exchange (few bytes, ephemeral)
❌ Supabase DB: business data kabhi nahi (products, sales, settings, etc.)
```

**Rule 2 — Outbox persistence:**
```
Offline hoye → changes SQLite outbox mein save → app band karo, crash ho — koi baat nahi
Reconnect → outbox sab events deliver karta hai in order
```

**Rule 3 — Last save wins across any LAN:**
```
PC1 (Home LAN) saves at 14:00 → outbox event: updatedAt=14:00
PC2 (Office LAN) saves at 14:05 → outbox event: updatedAt=14:05
Both reconnect via internet (TURN relay if needed)
→ safeTs(14:05) > safeTs(14:00) → PC2 wins on ALL devices ✅
```

**Rule 4 — No data loss:**
```
Even if TURN fails momentarily → events queue in outbox → retry on next connection
Even if app closes → SQLite durable → events survive restart
```

---

### 15.4 Different LAN — STRICTLY PROHIBITED

```
❌ Sending product images / logos directly via Supabase DB or Storage
❌ Polling Supabase DB for changes (postgres_changes Realtime on business tables)
❌ Storing sync cursors/checkpoints in Supabase
❌ Using Supabase as data relay when WebRTC is not connected
❌ Treating "not connected via WebRTC" as "data lost"
```

---

### 15.5 Configuration — Different LAN Ready

**File:** `src/lib/mesh/iceConfig.ts`

```typescript
// STUN — fast, free, works for open NAT (~80% cases)
{ urls: 'stun:stun.cloudflare.com:3478' },
{ urls: 'stun:stun.l.google.com:19302' },

// TURN — relay, works for ALL NAT types (100% guarantee)
{ urls: 'turn:openrelay.metered.ca:80',  username: '...', credential: '...' },
{ urls: 'turn:openrelay.metered.ca:443', username: '...', credential: '...' },
{ urls: 'turns:openrelay.metered.ca:443',username: '...', credential: '...' }, // TLS

iceTransportPolicy: 'all'   // auto STUN→TURN fallback, no manual config
bundlePolicy: 'max-bundle'  // single connection, efficient
```

**Custom TURN credentials** (`.env.local`):
```env
VITE_TURN_URL=turn:your-own-turn-server.com:80
VITE_TURN_USER=your-username
VITE_TURN_PASS=your-credential
```

---

### 15.6 Different LAN — Offline Scenario Rules

```
Scenario: 3 shops, 3 cities, all offline at same time

PC1 (Lahore) → offline → manager edits product price: Rs 1500 → Save → outbox
PC2 (Karachi) → offline → same product price: Rs 2000 → Save → outbox  
PC3 (Islamabad) → online → same product price: Rs 1800 → Save → delivers live to others

1 hour later — all reconnect via internet:
  TURN relay establishes WebRTC channels
  Outboxes exchange missing events
  safeTs comparison: PC2 saved last (14:45) vs PC1 (14:30) vs PC3 (14:20)
  PC2 (14:45) wins → Rs 2000 on ALL devices ✅
  
  Sales? ALL preserved — additive (no overwrite) ✅
  Inventory? ALL movements preserved — additive ✅
  Settings? Last save wins ✅
```

---

### 15.7 Verification — Different LAN Test Protocol

After any P2P-related change, test:

1. **Basic different LAN test:**
   - Device A: disconnect from LAN (use mobile hotspot)
   - Device B: on office WiFi
   - Make change on Device A → Save
   - Check Device B receives change ✅

2. **Offline + reconnect test:**
   - Device A: turn off internet
   - Make change → Save (goes to outbox)
   - Turn internet back on
   - Device B should receive within 5-10 seconds ✅

3. **Conflict test:**
   - Both devices offline
   - Both change same field
   - Device A saves at T1, Device B saves at T2 (T2 > T1)
   - Reconnect → Device B's value on both ✅

4. **No data loss test:**
   - Make 10 changes offline
   - Reconnect → all 10 events delivered in order ✅
