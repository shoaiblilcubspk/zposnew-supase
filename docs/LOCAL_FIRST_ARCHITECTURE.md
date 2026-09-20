# Local-First P2P Architecture Guide — Zaynahs POS

> **Single Source of Truth for Architecture:** Local-First, Event-Sourced, P2P Replicated POS System.
> **Scope:** How the POS works across Desktop (Tauri) and Mobile (Capacitor).

---

## 1. Core Principles

1. **Local-First Always:** Every write commits immediately to local SQLite in under 10ms. Zero network dependency for core terminal operations.
2. **Event-Sourced Ledger:** Transactions are append-only events (`INVENTORY_OUT`, `SALE_CREATED`, `LEDGER_TX`). No silent overwrites, no financial data leakage.
3. **P2P Synchronization:** Devices exchange missing events directly over WebRTC data channels.
4. **Supabase Role:** **Signaling Only.** Supabase Realtime is used solely for device discovery and WebRTC handshake offers/answers. NO business data or transactions are stored in Supabase DB.
5. **Zero Cloud Database Dependency:** Terminal functions 100% offline indefinitely. When network returns, devices sync peers directly.

---

## 2. Platform Architecture

```text
Shared Frontend (React + Vite + TypeScript)
 ├── Desktop: Tauri (Rust + Native SQLite)
 │    ├── Windows (.exe / MSI)
 │    ├── macOS (.dmg)
 │    └── Linux (.AppImage / .deb)
 │
 └── Mobile: Capacitor (Native SQLite Plugin)
      ├── Android (.apk)
      └── iOS (.ipa)
```

---

## 3. Local SQLite Schema

Every device maintains a complete, autonomous SQLite database:

```text
SQLite Database
├── shop (shop profile, config, keys)
├── devices (paired devices, device_id, public keys)
├── users (admin, manager, cashier, salted PIN hashes)
├── roles (RBAC permissions matrix)
├── products (items, variants, barcodes, pricing, active flag)
├── product_images (local path, image hash, sync metadata)
├── customers (profiles, credit limits, contact info)
├── sales (completed sales, invoice numbers, timestamps)
├── sale_items (line items, pricing, discounts)
├── payments (payment methods, amounts, references)
├── inventory_transactions (IN / OUT / AUDIT movements)
├── ledger (debits, credits, balances)
├── sync_outbox (locally generated events pending delivery)
├── sync_inbox (received remote events applied or pending)
├── tombstones (immutable deleted record markers)
└── settings (terminal configs, hardware settings, receipt layout)
```

---

## 4. Device Pairing & Mesh Network

### First Admin Device Setup
```text
First Launch → Shop Name & Branding → Generate SHOP_ID + Pairing Secret
            → Generate Master Recovery Code → Create Admin PIN
            → Assign DEVICE_ID: PC-MAIN → Initialize SQLite → Ready
```

### Second Device Pairing (QR Code)
```text
New Device → "Join Existing Shop"
          → Admin Device generates secure Pairing QR
          → New Device scans QR → Secure Auth Handshake
          → Assign DEVICE_ID (e.g. PHONE-COUNTER-1)
          → Exchange Public Keys
          → Initial Full Snapshot Sync → Verify Checksum → Operational
```

---

## 5. Event Sourcing & Synchronization Engine

Every state change creates an immutable event in `sync_outbox`:

```json
{
  "event_id": "UUID-v4",
  "device_id": "PHONE-COUNTER-1",
  "sequence": 1042,
  "entity_type": "SALE",
  "entity_id": "INV-2026-0089",
  "operation": "CREATE",
  "payload": { ... },
  "created_at": 1726260000000
}
```

### Normal Sync Flow
```text
Local Change → SQLite Transaction → Create Event → Save to sync_outbox
            → P2P WebRTC Channel → Remote Peer sync_inbox
            → Validate Signature & Deduplicate (event_id check)
            → Apply SQLite Transaction Locally → ACK → Synced
```

### Signaling via Supabase Realtime
- Supabase Realtime presence detects online devices in the same `shop_id`.
- WebRTC SDP offer/answer and ICE candidates are exchanged via signaling channels.
- Once connected, data flows directly peer-to-peer (or via TURN relay when symmetric NAT blocks direct P2P).

---

## 6. Conflict Resolution Rules

### A. Master Data (Products, Categories, Settings)
- Deterministic Last-Write-Wins (LWW) based on logical timestamp / version vector + device tie-breaker.
- Physical deletes are prohibited: soft delete via `active = false`, `deleted_at`, and `tombstones`.

### B. Stock & Inventory (CRDT / Append-Only)
- Stock is **NEVER** synced as `stock = stock - qty`.
- Each sale writes an `INVENTORY_OUT` event.
- If two offline devices sell the last available items simultaneously:
  - Both sales are accepted (Zero dropped customer bills).
  - On reconnect, events combine: `6 - 5 - 4 = -3 (Oversold = 3)`.
  - Reports accurately reflect: Device A sold 5, Device B sold 4, Oversold = 3.
  - Zero data loss, complete auditability.

---

## 7. Authentication & Security

- **PIN-Based Local Auth:** Salted and hashed PIN verification directly against local SQLite.
- **Roles:**
  - **Admin:** Full control, pairings, settings, user management, reports, security, root recovery.
  - **Manager:** Operational control, products, inventory, discounts, sales, operational reports.
  - **Cashier:** POS sales, checkout, taking payments, receipt printing, customer lookup.
  - **Salesman:** Customer handling, product selling, sale preparation, sale attribution (`SALESMAN_ID`), sales activity tracking.
- **Admin PIN Recovery:** High-entropy master recovery code (offline verification).
- **Transport Security:** WebRTC peer channels are end-to-end encrypted (DTLS/SRTP).

---

## 8. Backups & Disaster Recovery

- Automated daily encrypted SQLite snapshots (`POS-YYYY-MM-DD.backup`).
- Contains database snapshot, image store, and sync sequence vectors.
- Can be saved to local USB storage or encrypted cloud drive.

---

## 9. Zero-Cache System & Multi-Platform Native Architecture (EXE / DMG / APK / IPA)

### 9.1 Multi-Platform Parity
- **Targets:**
  - **Windows:** `.exe` / `.msi` desktop installer.
  - **macOS:** `.dmg` / App bundle.
  - **Android:** `.apk` mobile package.
  - **iOS:** `.ipa` mobile package.
- **Native Runtime Integration:**
  - Native SQLite driver (`tauri-plugin-sql` on desktop, Capacitor SQLite on mobile).
  - Storage resides in native OS application directory (`$APPDATA` / `~/Library/Application Support/` / Android App Data).
  - Sub-10ms transactional commits and 60 FPS smooth rendering.

### 9.2 Zero-Cache Mandate
- **No Stale Browser Caches:** Business data and UI states NEVER depend on Service Worker CacheStorage or stale HTTP caching.
- **Authoritative Local SQLite:** All state is read directly from local SQLite and synced to domain Zustand stores in 0ms.
- **Self-Destroying Service Worker:** Any previously registered service workers are automatically unregistered and purged on application startup.
- **LAN & WAN Real-Time Sync:** Operates 100% offline on the same LAN without internet via direct WebRTC data channels or local SSE relay, and across WANs when internet is present via Supabase signaling. All sales, stock, and ledger updates converge deterministically.

