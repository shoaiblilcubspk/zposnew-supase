# 🗺️ Master Implementation Plan: Local-First P2P POS Architecture

> **Single Source of Truth for Implementation Phases**  
> **Governing Specifications:** `AGENTS.md`, `GEMINI.md`, `docs/RBAC_RULES.md`, `docs/LOCAL_FIRST_ARCHITECTURE.md`, `docs/USER & ROLE SETUP — FIRST INSTALL TO DAILY SALES.md`

---

## 1. Executive Summary & Architecture Mandate

Zaynahs POS is being transitioned into an autonomous, 100% offline-first, local-authoritative Point of Sale system replicated across terminals using incremental peer-to-peer (P2P) event synchronization over WebRTC data channels.

### Core Architectural Pillars
1. **Local-First SQLite as Single Authority:** Every transaction, inventory movement, payment, and permission check commits immediately to local SQLite in `< 10ms`.
2. **Incremental P2P Delta Sync:** Only missing events (`sequence > remoteKnownSeq`) are exchanged between paired terminals. Whole-database replacements are strictly banned after initial bootstrap.
3. **Event-Sourced Non-LWW Accounting:** Stock and financial balances are derived from append-only immutable ledgers (`inventory_transactions`, `wallets`, `ledger_entries`). Concurrent sales combine additively (negative stock/oversold permitted, zero dropped customer bills).
4. **Decentralized RBAC & 4 Canonical Roles:** Exactly 4 roles (`ADMIN`, `MANAGER`, `CASHIER`, `SALESMAN`). Local salted PIN verification (PBKDF2/Argon2id). Plaintext PINs are never stored, synced, or transmitted.
5. **Content-Addressed Local Media:** Images stored locally in `$APPDATA/images/` and exchanged in chunks over WebRTC data channels with SHA-256 hash deduplication. Zero cloud storage egress.
6. **Supabase = Signaling Only:** Supabase Realtime is strictly restricted to WebRTC SDP/ICE signaling and presence broadcasts. Zero business data is ever written to Supabase DB or Supabase Storage.

---

## 2. Phase Execution Order & Dependency Graph

```text
Phase 01: First-Run Onboarding & Shop Initialization
   ↓
Phase 02: Local SQLite Storage Engine Hardening
   ↓
Phase 03: Decentralized RBAC, 4 Roles & Central Authorization
   ↓
Phase 04: Event-Sourced Financial & Stock Flows (Non-LWW)
   ↓
Phase 05: Incremental P2P Event Synchronization Engine
   ↓
Phase 06: Ephemeral QR Device Pairing & Device Security
   ↓
Phase 07: Content-Addressed Local Media Engine
   ↓
Phase 08: Linear UI/UX Standards & Status Transparency
   ↓
Phase 09: Testing, Verification & Production Evidence
```

---

## 3. Implementation Phases Index

| Phase | Specification Document | Key Deliverables |
|:---|:---|:---|
| **Phase 01** | [`PHASE_01_FIRST_RUN_AND_SHOP_INIT.md`](./PHASE_01_FIRST_RUN_AND_SHOP_INIT.md) | First-run detection, Create Shop flow, Root Admin creation, Emergency Recovery Code, Device ECDSA Keypair, Root Device local commit. |
| **Phase 02** | [`PHASE_02_LOCAL_SQLITE_STORAGE_ENGINE.md`](./PHASE_02_LOCAL_SQLITE_STORAGE_ENGINE.md) | Native desktop SQLite + browser Wasm SQLite, atomic `<10ms` transactions, schema migrations, durable `sync_outbox` / `sync_inbox`. |
| **Phase 03** | [`PHASE_03_RBAC_USERS_AND_PERMISSIONS.md`](./PHASE_03_RBAC_USERS_AND_PERMISSIONS.md) | 4 Roles (`ADMIN`, `MANAGER`, `CASHIER`, `SALESMAN`), central `can(user, permission)`, PBKDF2 PIN hashing, progressive lockout, salesman attribution vs cashier checkout. |
| **Phase 04** | [`PHASE_04_EVENT_SOURCED_FINANCIAL_AND_STOCK_FLOWS.md`](./PHASE_04_EVENT_SOURCED_FINANCIAL_AND_STOCK_FLOWS.md) | Append-only inventory & financial ledgers, cash/card/bank/credit/split sales, returns, refunds, expenses, strict Non-LWW rule. |
| **Phase 05** | [`PHASE_05_INCREMENTAL_P2P_EVENT_SYNC.md`](./PHASE_05_INCREMENTAL_P2P_EVENT_SYNC.md) | Vector clocks, WebRTC DataChannels, delta-only replication (`sequence > remoteKnownSeq`), `event_id` deduplication, signaling-only Supabase. |
| **Phase 06** | [`PHASE_06_DEVICE_PAIRING_AND_SECURITY.md`](./PHASE_06_DEVICE_PAIRING_AND_SECURITY.md) | Ephemeral QR pairing, admin approval, ECDSA key exchange, trusted device mesh, new terminal snapshot bootstrap, device revocation. |
| **Phase 07** | [`PHASE_07_CONTENT_ADDRESSED_LOCAL_MEDIA.md`](./PHASE_07_CONTENT_ADDRESSED_LOCAL_MEDIA.md) | Local filesystem image store (`$APPDATA/images/`), SHA-256 content addressing, chunked WebRTC P2P binary transfer, zero cloud egress. |
| **Phase 08** | [`PHASE_08_UI_UX_AND_STATUS_TRANSPARENCY.md`](./PHASE_08_UI_UX_AND_STATUS_TRANSPARENCY.md) | Linear/Anti-AI density standards (13px text, 32px controls, hairline borders), filter label standard ("All"), transparent SyncStatusWidget. |
| **Phase 09** | [`PHASE_09_TESTING_VERIFICATION_AND_EVIDENCE.md`](./PHASE_09_TESTING_VERIFICATION_AND_EVIDENCE.md) | Unit/integration test suites, offline resilience verification, zero-bill-drop validation, `npx tsc --noEmit`, build evidence. |

---

## 4. Operational Governance Rules

1. **Strict Implementation Gate:** No production code modifications may begin until planning documents are approved.
2. **File Size Limit:** Maximum 300 lines per file (strictly enforced).
3. **No Duplicate UI Markup:** All UI primitives must come from `src/shared/ui/` or `src/shared/modules/`.
4. **Status Reporting:** Upon plan completion, output: `"PLANNING COMPLETE — WAITING FOR PHASE 01."`
