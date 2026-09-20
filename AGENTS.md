# AGENTS.md — AI Operating Manual (Local-First P2P Migration & Architecture)

> Single Source of Truth for AI Behavior, Development Workflow & Operational Rules.

---

## 1. Operating Identity & Core Mandate
- **Role:** Senior Staff Software Architect + Senior Full-Stack Engineer + Database Architect + Distributed Systems Engineer.
- **Mandate:** Preserve 100% of user-facing POS features while re-engineering the system into a Local-First, Offline-First, P2P Replicated POS architecture.
- **Strict Implementation Gate:** Do NOT start coding or modifying application files until planning is 100% complete and approved.

---

## 2. Fundamental Architectural Rules (Non-Negotiable)

### 2.1 Local-First Source of Truth
- The local SQLite database on each device is the **ONLY** authoritative source of truth.
- Zero cloud database dependency for POS operations. Commits occur locally in `< 10ms`.

### 2.2 Supabase Realtime = Signaling Only
- Supabase is strictly used for WebRTC peer discovery, presence, and SDP/ICE signaling.
- **NO business data, sales, stock, customers, or ledger rows may ever be saved to Supabase DB or Supabase Storage.**

### 2.3 Incremental P2P Event Synchronization
- Every user-facing mutation (products, prices, images, inventory, sales, returns, refunds, payments, customers, suppliers, expenses, wallets, ledger, users, permissions, settings, audit) MUST be represented by a durable local transaction/event in `sync_outbox`.
- Synchronized between authorized devices using **incremental P2P event synchronization** (only missing/new/changed events).
- **NEVER synchronize by blindly replacing the whole database.** Initial device join may perform a complete snapshot bootstrap, but every subsequent sync exchanges only missing events and required binary assets.

### 2.4 Event-Sourced Financial & Stock Ledger (No LWW)
- Stock and financial mutations MUST be append-only events (`INVENTORY_IN`, `INVENTORY_OUT`, `SALE_CREATED`, `LEDGER_TX`). Never mutate stock directly without an immutable ledger event.
- **Last-Write-Wins (LWW) is strictly prohibited for inventory, sales, payments, and financial balances.** Concurrent offline sales combine additively (negative stock/oversold permitted, zero bill drops).

### 2.5 Offline Multi-Device Safety & Convergence
- The system must guarantee safe offline operation across multiple devices and deterministic convergence after reconnection.
- No data may be lost, duplicated, overwritten incorrectly, leaked across shops, or applied twice.
- Every device, user, and event must have a unique identity (`SHOP_ID + DEVICE_ID + DEVICE_KEYPAIR`, `USER_ID`, `EVENT_ID`). All actions record `USER_ID + DEVICE_ID + EVENT_ID`.
- Synchronization must use durable outbox/inbox queues, idempotent Event IDs, acknowledgments, checkpoints/cursors, transactional application, retries, resume-after-crash, integrity hashes, conflict-resolution rules, and reconciliation.
- Only authorized devices belonging to the same `SHOP_ID` may exchange business data. Revoked devices/users must be rejected.

### 2.6 Full Existing-System Reengineering Rule
- **Do not treat existing architecture as authoritative.** If the current implementation is fundamentally wrong, broken, or contains temporary patches, redesign it cleanly. Preserve user-facing functionality and business requirements, not broken implementation details.
- Verify the complete lifecycle for every system:
  `Create → Read → Update → Delete/Deactivate → Transaction → Event → Outbox → P2P Sync → Receive → Validate → Apply → ACK → Report/Reconcile`.
- If an existing page, component, service, table, hook, or module is incorrectly connected, duplicated, or architecturally wrong, you are authorized to modify, move, split, merge, replace, or delete it after a 360-degree impact analysis.
- Remove all genuinely dead/unused code discovered during audits with verification.

### 2.7 Connected Domain & Financial Flow
- Never allow disconnected, random direct state updates. Maintain the clear financial and inventory chain:
  - `SALE` → Sale Tx → Inventory OUT → Payment IN → Wallet Update → Ledger Event → P2P Event → Reports.
  - `RETURN` → Inventory IN → Refund OUT → Wallet/Payment Reversal → Ledger → P2P → Reports.

### 2.8 Local Image Architecture
- No Base64 storage for normal images in SQLite.
- Images stored in local filesystem (`$APPDATA/images/`). SQLite stores metadata (hash, path, MIME, size).
- Images transfer via WebRTC P2P in chunks with SHA-256 integrity verification. If the same hash exists on the receiver, it is not re-transferred.

### 2.9 Decentralized User, Device & Admin Security
- Complete decentralized identity: `devices`, `users`, `roles`, and `permissions` in local SQLite.
- Local PIN authentication with salted cryptographic hashes (Argon2id/PBKDF2). **NEVER store or sync plaintext PINs.**
- Master recovery code generated locally on first launch for emergency admin PIN reset.
- Ephemeral, short-lived tokens for QR device pairing. NEVER put permanent secrets in QR codes.
- Admin controls: Add/remove devices, approve/revoke devices, user CRUD, role/permission assignment, PIN reset, backup/restore, audit logs.
- A revoked device/user must immediately lose authorization for future P2P synchronization and operations when peers learn of the revocation.

### 2.10 Zero-Cloud-Cost & Connection Optimization Rules (4 Golden Rules — 100% Free Tier)
To ensure the system stays permanently within free-tier limits with zero unexpected costs or connection leaks:
1. **Client ko hamesha "Singleton" banayein (Sab se bara reason):**
   - Never create a new client instance per call/render (50 tabs/refreshes = 50 leaked connections).
   - Maintain a single cached instance variable (`let clientInstance: SupabaseClient | null = null`) shared across the entire app lifecycle via `getSupabase()`.
2. **`useEffect` me Cleanup lazmi karein (Unsubscribe Rule):**
   - Jab bhi Realtime channel banayein, component band / unmount hone par use disconnect zaroor karein:
     `return () => { supabase.removeChannel(channel); };`
   - Har signaling/mesh service lifecycle hook me `untrack()` aur `removeChannel()` call karna compulsory hai.
3. **Har Table pe Realtime "ON" na karein (Signaling Only):**
   - Supabase Realtime sirf **zaroori ephemeral events** (presence, peer WebRTC SDP/ICE signaling broadcast) ke liye use karein.
   - Database tables (products, inventory, sales, customers, ledger) pe Realtime postgres_changes **100% OFF** rakhein. Local SQLite queries direct perform hoti hain.
4. **Live Video / Audio / Files direct DB se na bhejein (WebRTC P2P DataChannels):**
   - Binary media, product images aur live streams cloud database ya cloud storage se na bhejein.
   - Local filesystem storage (`$APPDATA/images/`) + chunked **WebRTC P2P DataChannels** use karein. Is se server bandwidth aur database load **zero (0)** rehta hai.
- **Result:** Singleton client + `removeChannel()` cleanup se 10,000+ users par bhi connection count hamesha safe, clean aur Supabase free tier ke andar rehta hai.

### 2.11 First-Run Authentication & Shop Initialization (Zero Cloud Auth Dependency)
- **Zero Cloud Auth Dependency:** Supabase Auth is completely decoupled. On first application launch, when no local shop exists in SQLite, the application provides a secure "Create New Shop" onboarding flow. No business or authentication data requires internet connectivity.
- **Root / Owner Device Authority:** The first successfully initialized device becomes the Shop's root/owner administrative device. Subsequent devices must join through secure device pairing and explicit admin approval.
- **Initial Setup Lifecycle:**
  `App First Launch → Check Local Shop (COUNT === 0) → CREATE NEW SHOP → Shop Name + Logo + Currency → Create Admin Account (Name + Username + PIN + Confirm PIN) → Generate Emergency Recovery Code → Generate SHOP_ID + DEVICE_ID → Generate Device ECDSA Keypair → Atomic SQLite Tx Commit → Admin + Root Device Saved Locally → Enter POS Dashboard`.
- **Secondary Device Join Lifecycle:**
  `New Device Install → JOIN EXISTING SHOP → Scan Admin Ephemeral QR Token → Admin Approves Request → Assign New Device ID → ECDSA Key Exchange → Initial Snapshot Bootstrap & Event Sync → Terminal Ready`.
- **Credential & Secret Protection:** NEVER transfer plaintext PINs, passwords, or permanent private keys through QR or P2P synchronization. PINs are salted and hashed locally (Argon2id/PBKDF2).
- **Core Security Capabilities:**
  * First-run detection (`isFirstLaunch()`)
  * Create shop (`shop` table)
  * Create initial admin (`users` table with role `admin`)
  * Secure local PIN authentication (with progressive lockout protection)
  * Offline emergency recovery code mechanism
  * `SHOP_ID`, `DEVICE_ID`, and device keypair generation
  * Trusted-device registration (`devices` table)
  * Secure new-device pairing with short-lived tokens
  * Explicit admin device approval & device revocation
  * Admin replacement & root emergency recovery
  * Local session lock / logout
  * Local role-based permissions (`admin`, `manager`, `cashier`, `salesman`)
  * Tamper-evident local audit log events
  * 100% autonomous offline operation from initial first launch.

### 2.12 Decentralized Users, Roles, Permissions & Device Security
- **Local User Lifecycle:** After initial shop creation, Admin creates staff operators (Managers, Cashiers, Salesmen) locally. No cloud auth or internet required.
- **Credential Protection:** User PINs (4-6 digits) are salted and hashed locally (PBKDF2/Argon2id). Plaintext PINs are NEVER synced over P2P, NEVER saved in SQLite, and NEVER exposed in QR tokens. Only cryptographic credential material is replicated.
- **P2P Event Sourcing:** Every user mutation generates a durable outbox event (`USER_CREATED`, `USER_UPDATED`, `USER_ROLE_UPDATED`, `USER_PIN_RESET`, `USER_STATUS_CHANGED`). These events replicate across authorized terminals.
- **Attribution Chain:** Every business action (sales, returns, payments, inventory movements) records `USER_ID + DEVICE_ID + EVENT_ID`.
- **Soft Deletes Only:** Users are NEVER hard-deleted. Deactivating a user sets `active = 0` (`status = 'disabled'`), which immediately revokes terminal login locally and on all peer devices upon sync without breaking foreign key audit trails.
- **Full Admin Controls:** Add user, edit user, disable/enable, role change (`admin`, `manager`, `cashier`, `salesman`), granular permission overrides, PIN reset, and audit trail viewing.
- **Reference Specification:** See `docs/USER & ROLE SETUP — FIRST INSTALL TO DAILY SALES.md` and `docs/USERS_AND_ROLES.md` for complete lifecycle, first-install setup, progressive lockout, permission matrix, and salesman/cashier split flows.

### 2.13 Database Schema, Import/Export & Backup Synchronization Rule (Mandatory)
- **Zero Schema Desynchronization:** Whenever any database table, migration, column, or entity is added, modified, or removed in local SQLite, the AI agent MUST synchronously update:
  1. Full Database Backup & Restore (`src/lib/backup/backupEngine.ts` and `restoreEngine.ts`).
  2. Product Catalog / Entity Import & Export (`src/lib/services/products/productExportImport.ts`).
  3. Automated Cloud Backup Snapshot (`src/lib/backup/cloudBackupService.ts`).
- **No Entity Left Behind:** Never leave any new business table out of backup/restore or serialization.
- **Cross-Platform Parity:** Backup archives (`.zpos` AES-256) and catalog files (JSON / Excel / ZIP with images) must work seamlessly across Mac (DMG), Windows (EXE), and Mobile.

### 2.14 Automated Supabase Provisioning (Zero Manual Dashboard Steps)
- **100% API-Driven Setup:** The AI agent MUST perform all Supabase infrastructure setup automatically via the Supabase Management API using `SUPABASE_MGMT_API_KEY` from `.env.local`.
- **Never Ask User to Manually Configure Cloud:** Never ask the user to manually create projects, create storage buckets, or copy keys from the web dashboard.
- **Reference:** Governed strictly by `docs/SUPABASE_SETUP.md`.

### 2.15 100% Zero-Refresh Reactivity Mandate (0ms Screen Updates)
- **Zero Manual Refresh:** Tamam POS operations (Sales, Deletions, Restock, Adjustments, Wallets, Badges, Expenses, Ledger) ko 100% reactive hona lazmi hai — yani jo action hua, wo 0 millisecond me screen par reflect ho bina kisi refresh ke.
- **Native Desktop & Mobile Architecture:** Native desktop (Mac DMG, Windows EXE) aur mobile apps me browser refresh ka koi concept nahi hota. Disconnected static cache snapshots and manual refresh dependencies are strictly prohibited.
- **Continuous Store Synchronization:** Every mutation immediately updates authoritative SQLite and triggers atomic Zustand store synchronization, guaranteeing instantaneous UI reflection across all routes.

### 2.16 Cross-Platform Parity (Windows EXE, macOS DMG, Android APK, iOS IPA), Smooth-Fast 60 FPS & Zero-Cache Mandate
- **Multi-Platform Native Target:** Complete build readiness and functional identity across:
  - **Windows:** Desktop installer (`.exe` / `.msi`).
  - **macOS:** Universal DMG installer (`.dmg` / App bundle).
  - **Android:** Native APK (`.apk` via Capacitor).
  - **iOS:** Native IPA (`.ipa` via Capacitor).
- **100% Architecture & Logic Parity:** All platforms share identical business logic, stores, schema, and offline capabilities. Native SQLite drivers interface directly with OS native storage (`TauriSqliteDriver` on desktop, Capacitor SQLite on mobile).
- **Ultra Smooth & Fast (60 FPS Performance):** Zero UI thread blocking. Fast barcode scanning, instantaneous cart calculation, and sub-10ms SQLite transactions.
- **Zero-Cache Mandate:** No stale browser or service worker caches. Offline functionality is 100% governed by local SQLite, not artificial HTTP/PWA cache storage. Stale service worker interception is strictly prohibited.
- **Universal LAN & WAN Replication:** Full real-time synchronization runs across devices on the same LAN without internet (offline mesh via WebRTC / local SSE) and across different networks when internet is available (via Supabase signaling).

### 2.17 Permanent Architectural Fix Mandate (Zero Band-Aids & Complete Lifecycle Linkage)
- **Zero Temporary Band-Aids:** Whenever any calculation error, stock mismatch, sign inversion, or business logic bug is discovered (e.g. sale void/delete calculations, inventory adjustments, wallet/ledger balances, refund payouts), applying isolated, superficial band-aids or temporary UI-only patches is **STRICTLY PROHIBITED**.
- **Root-Cause Architectural Resolution:** Every bug MUST be solved at its fundamental architectural origin with a permanent, mathematically provable fix.
- **360-Degree Linked System Integrity:** The AI agent MUST trace and permanently update the complete lifecycle across all linked layers and domains:
  `UI Action → Transaction Coordinator → Append-Only Ledger → Outbox Event → P2P Mesh Sync → Peer Receiver → State Store (Zustand) → Local DB (SQLite/Dexie) → Reconciler → Reports`.
- **Zero Flow Breakage:** No linked system may be left disconnected or using conflicting logic. All places sharing mathematical, inventory, or financial relationships must remain 100% synchronized, deterministic, and idempotent.

### 2.18 Continuous P2P Sync & Full-Stack Parity Verification Mandate (Zero Missing Fields)
- **Zero Omitted Fields Across Layers:** Whenever any new entity, feature, field, or attribute is added or modified (e.g. product attributes, variants, IMEI/serial, expiry dates, salesman attribution, discounts, permissions, metadata), the AI agent MUST synchronously update and verify the COMPLETE chain without leaving any layer behind:
  `TypeScript Types → SQLite Migration & Schema → Repository CRUD Queries → Outbox Event Generation (sync_outbox) → P2P WebRTC Sync Transfer → Remote Event Handlers (*EventHandlers.ts) → Peer Local SQLite Commit → Zustand Store Sync → UI / Cart / Modals / Receipts / Reports → Backup & Restore (.zpos) → Product Catalog Import / Export`.
- **Pre-Commit Verification Protocol:** No feature addition or bug fix is complete until P2P synchronization event schemas, local DB columns, and remote ingestion handlers are explicitly verified for 100% field parity. Under no circumstance may a field be saved locally without also being replicated across peer devices in the outbox payload and committed in remote event handlers.

### 2.19 P2P Shareable vs Device-Local Settings (Mandatory Classification)
**Reference Specification:** See `docs/P2P_SYNC_RULES.md` — this is the **single authoritative document** for ALL P2P sync rules, shareable/local classification, known bugs & fixes, diagnostic guides, and post-change verification checklists.

**Before making any P2P-related change, the AI agent MUST read `docs/P2P_SYNC_RULES.md` in full.**

**Hard Rules Summary (details in P2P_SYNC_RULES.md):**
- ✅ **SHAREABLE** (sync to ALL devices): Store Identity (name/phone/email/website/address/logo), Products, Categories, Suppliers, Stock Ledger, Sales, Payments, Voids, Customers, Expenses, Wallets, Discounts, Tax, Currency, Invoice settings, Receipt layout, Users, PIN hashes (salted only), Device approvals.
- 🔒 **DEVICE-LOCAL** (never syncs): `theme`, `posGridColumns`, `iconStyle`, `interfaceMode`, `touchKeyboardEnabled`, `receiptPrinter`, `enableKotPrinter`, `autoSaveReceiptPng`, `autoBackup`.
- **Logo ADD and REMOVE both propagate** to all devices via timestamp — explicit user actions always win.
- **`SNAPSHOT_REQUEST` strictly for initial bootstrap only** (0 products AND 0 users). Never on established devices.
- **Timestamp comparison MUST use `new Date(x).getTime()`** — NEVER `Number(x)` for ISO date strings (NaN bug).
- **Post-Change Checklist:** After every feature/fix — run Section 6 checklist in `docs/P2P_SYNC_RULES.md`.

### 2.20 Deep Root-Cause Engineering & Silent Bug Elimination Mandate (The Claude Standard)
- **Zero Superficial Checks:** Whenever any bug, sync failure, state mismatch, or unexpected behavior occurs, the AI agent is STRICTLY PROHIBITED from doing high-level superficial inspections, cosmetic patches, or guessing. You MUST evaluate actual runtime values and trace code execution line by line.
- **Silent Bug Hunting (Universal Categories to Check):**
  1. **Date & Timestamp Parsing:** Never use `Number(date)` or direct string comparison. ISO strings formatted differently or passed to `Number()` silently evaluate to `NaN`, making `<` and `>` comparisons silently fail. ALWAYS use `safeTs()` from `src/lib/utils/safeTimestamp.ts`.
  2. **Network & NAT Traversal (Different LAN / WAN):** Never assume direct STUN will connect devices on different routers/ISPs. Strict and Symmetric NATs block direct peer-to-peer WebRTC connections. TURN relay fallback (`iceConfig.ts`) is mandatory.
  3. **Type Coercion & Mathematical Traps:** In financial/ledger operations, beware of string numbers (`"10" + 5 = "105"`), floating-point arithmetic errors (`0.1 + 0.2 !== 0.3`), division by zero, and `NaN` propagation. Always sanitize and parse numbers explicitly.
  4. **P2P Queue & Serialization Barriers:** Ensure messages, outbox records, and binary chunks do not exceed WebRTC DataChannel packet boundaries. Check JSON serialization, deserialization, chunk reassembly, and idempotent ACK tracking.
  5. **Silent Promise & Fallback Failures:** Never write empty `.catch(() => {})` blocks without logging or recovery. If a peer channel drops, ensure the fallback relay (e.g., local LAN SSE or signaling transport) executes predictably without message loss.
  6. **Reactivity & State Sync Traps:** Stale closures, missing dependency arrays in hooks, unmounted WebSocket listeners leaking connections, and out-of-sync Zustand stores must be systematically eliminated.
- **Deep Full-Stack & Transport Layer Investigation:** In distributed, offline-first, and P2P systems, never stop at the UI or store layer. Trace down to the exact transport layer:
  - Is WebRTC failing due to Symmetric NAT / firewall? Verify STUN vs TURN relay availability.
  - Are timestamps parsing into valid epoch integers via `safeTs()` or silently breaking comparisons?
  - Are SQLite queries executing within atomic transactions or leaking dirty reads?
  - Is an event being dropped in the outbox queue, serialization frame, or peer receiver?
- **Universal Root-Cause Utilities:** When an issue is identified, do not patch just the single reporting file. Create or update centralized, battle-tested utilities (e.g. `safeTimestamp.ts`, `iceConfig.ts`) and sweep the ENTIRE codebase to ensure 100% consistent immunity.
- **Rigorous Verification Protocol:** Run static type checks (`npx tsc --noEmit`), trace all call sites, test edge-case data shapes, and verify offline-to-online reconnection cycles before declaring any task complete.

### 2.21 Mandatory Next Version Bump & Universal Build Naming Rule (Zero Stale Versions)
- **Mandatory Version Bump Across All Files:** Har update, feature change, bug fix, ya rebuild se pehle version number ko semver standard ke mutabiq bump karna (`1.0.0` → `1.0.1` / `1.1.0`) strictly compulsory hai across **ALL** files simultaneously:
  1. `package.json` (`"version": "x.y.z"`) & `package-lock.json`.
  2. `src-tauri/tauri.conf.json` (`"version": "x.y.z"`).
  3. `android/app/build.gradle` (`versionCode` incremented, `versionName "x.y.z"`).
  4. `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION = x.y.z`, `CURRENT_PROJECT_VERSION` incremented).
- **Mandatory Version in ALL Binary & Package Filenames:**
  - Kisi bhi binary, package, ya artifact ko generic name (jaise `app-debug.apk` ya generic `App.ipa`) dena strictly prohibited hai.
  - Har installer aur output binary ke name me version number lazmi shamil hoga taake cashiers, clients aur testing devices par update ka turant pata chale:
    - **Android:** `Zaynahs-POS-v<version>.apk`
    - **iOS:** `Zaynahs-POS-v<version>.ipa`
    - **macOS:** `Zaynahs-POS-v<version>.dmg`
    - **Windows:** `Zaynahs-POS-v<version>-Setup.exe` aur `Zaynahs-POS-v<version>.msi`
- **GitHub Actions & Releases Par Parity:** GitHub Actions artifacts aur Release tags hamesha `v<version>` ke sath generate aur publish honge. Kabhi bhi previous/old version number reuse nahi hoga.

---


## 3. Development vs Build Workflow (Flexible & Lightweight)

During development, use either standard browser dev mode (`npm run dev`) or Tauri dev mode (`npm run tauri dev`) based on convenience and the task at hand. Both environments share 100% of the business logic, storage abstraction, and state management.

Full production installer packaging (EXE/DMG/APK/IPA) is reserved strictly for release/deployment milestones, not required after routine feature edits.

### 3.1 Local Storage & Execution Hierarchy
```text
React UI (Shared Business Logic)
   ↓
Storage Abstraction Layer (Tauri Native SQLite / Browser Wasm SQLite)
   ↓
Local OS / Browser Storage
   ├── database.sqlite       (Authoritative local source of truth)
   ├── images/               (Locally stored content-addressed images)
   ├── product-images/       (Cached & chunked product assets)
   ├── receipts/             (Rendered/generated receipt backups)
   ├── backups/              (AES-256 encrypted .zpos archives)
   └── sync/                 (Outbox/inbox cursors & checkpoints)
```

### 3.2 Flexible Testing & Platform Uniformity
- **Single Source of Business Logic:** Browser dev mode and Tauri dev mode share 100% identical business logic, stores, schema, and calculations. Storage driver dynamically switches (`TauriSqliteDriver` on desktop, `WasmSqliteDriver` in browser fallback).
- **Flexible Testing:** Developers may validate features using either `npm run dev` or `npm run tauri dev`. Both are valid for testing logic, synchronization, and UI flows.
- **Production Packaging:** Full installer builds (Windows EXE/MSI, macOS DMG, Linux AppImage, Android APK, iOS IPA) are executed at release time without blocking daily development.

---

## 4. Code Standards & Professional Engineering

- **Professional Engineering:** Write code like a professional human engineering team maintaining a long-lived production system: clear names, small focused functions, predictable control flow, explicit types, proper error handling, no fake TODO implementations, no placeholder business logic, and no boilerplate.
- **Max File Size:** 300 lines MAX. Split into focused sub-modules if approaching 300 lines.
- **USE SHARED CODE — DO NOT CREATE THE SAME CODE AGAIN AND AGAIN:** ALL UI components must strictly come from `src/shared/ui/` and `src/shared/modules/` (except dense POS grid in `src/components/pos/`). Hand-rolled page-local markup, custom buttons, alag-alag lookalikes = **STRICTLY BANNED**. Re-use existing primitives.
- **State Management:** Domain-isolated Zustand stores (`src/stores/`). No ad-hoc `useReducer`.
- **Time/Dates:** Always use helpers from `src/lib/dateUtils.ts`. Never raw unformatted timestamps.

### 4.1 Linear & Anti-AI Professional UI/UX Standards (Mandatory)
- **MANDATORY SOURCE OF TRUTH — `docs/UI_RULES.md` & `docs/MODULES.md`:**  
  All UI rules, design tokens, color guidelines, button behaviors, typography, dark mode contrast, cross badges, dialogs, and component rules are strictly governed by **`docs/UI_RULES.md`**. Before writing or modifying ANY frontend component, page, or modal, reading and adhering to `docs/UI_RULES.md` is strictly compulsory.
- **Linear Decisions:** 13px base text (`text-[13px]`), 32px standard rows (`h-8`), letter spacing pulled in 1% (`tracking-[-0.01em]`). Flat engineered surfaces with 1px hairline border at 8% (`border-white/[0.08]`) and 0 card shadows (`shadow-none`).
- **One Accent Color:** Monochromatic neutral greys for 90% of UI. Exactly ONE accent color (Emerald / Indigo) strictly for selected rows and primary actions. Status is an icon + neutral text, NEVER colored candy pills.
- **Anti-AI Dashboard Rules:** Zero gradients, zero pastel icon tiles, asymmetric metric hierarchy, tight radiuses, and high-contrast typography. Refer to **`docs/UI_RULES.md`** for exhaustive specifications.

### 4.2 Centralized Single-Source UI/UX & Shared Module Architecture (Mandatory Rule)
- **1 Single Place For Everything (No Scattered Styling):** All UI/UX elements — typography tokens, font sizes, text contrast/colors, action icons, popup modals, inputs, form fields, badges, buttons, cards, and dividers — MUST be defined in and imported from a single shared location (`src/shared/ui/`, `src/shared/icons/`, `src/styles/`).
- **Alag-Alag Custom System Strictly Banned:** Writing inline hardcoded font sizes (`text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`), scattered low-contrast greys (`text-gray-400`, `text-neutral-500` on dark), direct scattered SVG/lucide imports with custom sizes, and ad-hoc form markups across separate files is **STRICTLY BANNED**.
- **1-Point Update Guarantee:** Whenever any font size, text visibility, icon, or modal styling needs an update, it MUST be changed in **1 single shared file** (`src/shared/ui/typography.ts`, `src/shared/icons/`, `src/styles/components.css`, `src/shared/ui/`) so that the entire app updates everywhere automatically from 1 place.

---

## 5. Phase Execution & Verification Protocol
- **Dependency-Aware Ordering:** Execute steps logically with sound foundational dependencies.
- **Atomic Progress:** Keep changes small, focused, and clear.
- **Lightweight Verification:** Verify code health (e.g., `npx tsc --noEmit` or dev server check) to ensure no regressions.

---

## 6. Communication Guidelines
- **Language:** Roman Urdu, technical, direct, professional.
- **Style:** Clear action, no fluff, no back-and-forth ambiguity.
- **Status Reporting:** When planning is complete, report: `"PLANNING COMPLETE — WAITING FOR PHASE 01."`
