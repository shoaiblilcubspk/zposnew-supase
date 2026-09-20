# Zaynahs POS — Master Rules (Local-First P2P)

> Single source of truth for ALL AI agents. Short, clear, no band-aids.

---

## 🏢 Business Scope
- **Universal POS** — Clothing, Pharmacy, Restaurant, Retail, Electronics, Grocery. No niche-hardcoding.
- **Terminology:** product / item / category / variant / modifier / addon
- **Single-tenant:** 1 Store = Autonomous Mesh Network. No workspace_id, no shift_id.
- **Language:** Roman Urdu responses, short, direct action.

---

## 🏗️ Architecture

### Target Stack
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Desktop:** Tauri (Rust runtime + Native SQLite)
- **Mobile:** Capacitor (Native SQLite Plugin)
- **Local Database:** SQLite (Complete, autonomous local DB per device)
- **Sync Engine:** Event-Sourced P2P via WebRTC Data Channels (Outbox/Inbox)
- **Signaling Only:** Supabase Realtime (presence & WebRTC handshakes only — **NO Cloud Database**)
- **State:** Zustand stores (`src/stores/`) — one store per domain
- **Services:** `src/lib/services/` — one file per entity (interfacing directly with local storage engine)
- **UI:** Shared components from `src/shared/ui/` and `src/shared/modules/`

### Stock & Transaction Architecture
- **Local SQLite = Single authoritative source of truth on each terminal.**
- Stock changes ONLY via append-only `inventory_transactions` (`INVENTORY_IN`, `INVENTORY_OUT`, `AUDIT`).
- Every sale, return, and payment commits locally in `< 10ms` inside a single atomic SQLite transaction.
- **Offline First:** POS operates 100% offline indefinitely. Terminal never blocks a sale due to network or cloud issues.
- **Stock Conflicts (P2P):** If two offline terminals sell the last items simultaneously, both sales commit. On sync, ledger calculates `Oversold` state — zero dropped bills, zero data loss.

### Sync Model
- Local change → Atomic SQLite Tx → Create Event → Save to `sync_outbox`.
- Background P2P worker sends missing events over WebRTC.
- Receiving peer checks `event_id` deduplication, validates signature, and commits to local SQLite.
- Supabase Cloud DB is **NOT** used for products, sales, inventory, customers, or reports.

### 🖥️ Local Runtime & Desktop Execution Rule
- **Flexible Runtime:** Run via `npm run dev` or `npm run tauri dev` based on development workflow needs. Shared architecture ensures logic parity across browser and desktop.
- **Local SQLite & AppData location:** SQLite DB and binary media are stored in OS native app-data directory:
  `$APPDATA / ~/Library/Application Support/<app-id>/` (`database.sqlite`, `images/`, `receipts/`, `backups/`, `sync/`).
- **Production Packaging:** Production installers (EXE/DMG/APK/IPA) are built at release time, not required after routine feature edits.

### 🌐 4 Golden Rules for Connection & Free-Tier Optimization
1. **Singleton Client:** Supabase client hamesha cached singleton instance rahe (`getSupabase()`). Har call par naya client create karna strictly banned hai (prevents connection leaks).
2. **`useEffect` Cleanup:** Realtime subscription create hone par unmount callback me `supabase.removeChannel(channel)` lazmi call ho.
3. **No Heavy Realtime on DB Tables:** Postgres table level realtime 100% OFF. Supabase sirf WebRTC SDP/ICE signaling aur presence broadcast ke liye use hoga.
4. **Media / Assets over WebRTC P2P:** Binary data aur images local filesystem + WebRTC P2P DataChannels se sync honge, cloud storage ya cloud DB se nahi (0 server egress/storage cost).

---

## 📏 Code Rules

### File Size & Code Limits
- **MAX 300 lines per file.** If bigger → split into sub-components/modules immediately. No excuses.
- Services: one file per entity in `src/lib/services/`
- Components: split into sub-components in sub-folders. Ensure logic is isolated.

### State Management
- Zustand stores in `src/stores/` — one store per domain
- NO `useReducer` for app state
- Components subscribe ONLY to the state they need: `useProductsStore(s => s.products)`

### Reports
- Reports ALWAYS query local SQLite database directly with date filters.
- NEVER calculate totals from in-memory array.

### Drafts
- Status `pending` / notes contain `DRAFT_SALE` = saved cart.
- NEVER touch stock, customer balance, or revenue for drafts.

---

## 🎨 UI Rules (Linear & Anti-AI Standard)
- **MANDATORY SOURCE OF TRUTH:** Har frontend aur UI change se pehle **`docs/UI_RULES.md`** aur **`docs/MODULES.md`** read aur follow karna strictly compulsory hai. Tamam UI rules, tokens, anti-AI standards, cross badges, selects, dark mode, aur dialog specifications strictly `docs/UI_RULES.md` se liye jaenge.
- ALL UI from `src/shared/ui/` and `src/shared/modules/` — `src/components/pos/` dense grid is the ONLY exemption. Hand-rolled page-local markup, custom buttons, alag-alag lookalikes = **STRICTLY BANNED**.
- **1 Place For Everything (No Scattered Styling):** Har UI/UX element — typography tokens, font sizes, text contrast/colors, action icons, popup modals, inputs, form fields, badges, buttons, cards — MUST be defined and imported from a single shared location (`src/shared/ui/`, `src/shared/icons/`, `src/styles/components.css`). 1 jagah update karne se poore app me 100% reflect hona chahiye.
- **Linear Density:** 13px base text (`text-[13px]`), 32px standard rows (`h-8`), -1% letter spacing (`tracking-[-0.01em]`).
- **Engineered Flat Surfaces:** No card drop shadows (`shadow-none`). 1px hairline border at 8% (`border-white/[0.08]`). 3 background shades (`bg-app`, `bg-surface`, `bg-surface-hover`).
- **Single Accent:** 1 accent color (selected row + primary button only). All else in grey. Status = icon + neutral text, NOT colored pills.
- **Strict 4px Grid & Alignment:** 16px icons centered on text. Labels left, numbers right (`tabular-nums font-mono`). Nothing centered.
- **Anti-AI Rules & Specifics:** Zero gradients, zero pastel icon tiles, asymmetric metrics, tight radiuses, circular cross dismiss badges on images, accessible dark mode selects, numbered pagination, and Title Case modals — detailed in **`docs/UI_RULES.md`**.
- Loaders: `<SkeletonLoader />` only. No generic spinners.
- Modals: center on mobile (`items-center justify-center`). Form modals `maxWidth="lg"|"xl"` + `md:grid-cols-2`.
- Media: ALL image uploads via `MediaLibrary` component. Direct file-pickers banned.

---

## 🔐 Auth & Security
- **First-Run Authentication & Shop Initialization:**
  - Supabase Auth completely decoupled — zero cloud dependency.
  - On first launch (when no local shop exists), application presents "Create New Shop" flow.
  - Shop identity (`SHOP_ID`), root admin account, first device (`DEVICE_ID`), and ECDSA keypair are created in atomic local SQLite transaction.
  - Initial device is registered as the root/owner administrative device.
  - Subsequent terminals join via ephemeral QR pairing + explicit admin approval.
  - Plaintext PINs, passwords, and private keys are NEVER transmitted over P2P or QR.
- **Local PIN Authentication:** Fast login via salted Argon2id/PBKDF2 PIN hash stored in local SQLite with progressive lockout.
- **Roles & Permissions:**
  - **Admin:** Full access, user CRUD, device pairing, PIN reset, sensitive settings, staff management.
  - **Manager:** Operational control, inventory restock, discounts, sales, reports.
  - **Cashier:** Terminal sales, receipts, customer lookup.
  - **Salesman:** Sales creation with commission/attribution.
- **Decentralized User Management & P2P Lifecycle:**
  - Users are created in local SQLite with salted PIN hash (PBKDF2/Argon2id).
  - User mutations generate durable events (`USER_CREATED`, `USER_UPDATED`, `USER_ROLE_UPDATED`, `USER_PIN_RESET`, `USER_STATUS_CHANGED`) in `sync_outbox`.
  - Plaintext PINs are NEVER transferred over P2P or QR.
  - All operations record attribution: `USER_ID + DEVICE_ID + EVENT_ID`.
  - Soft Deletes Only: Users are never hard-deleted; deactivating sets `active = 0` (`status = 'disabled'`), immediately revoking login locally and across all synced terminals.
- **Recovery Code:** Master recovery code generated locally on first launch for emergency admin PIN reset without cloud dependency.
- **P2P Security:** End-to-end encrypted WebRTC channels with per-device keypairs.
- **Detailed Specification:** See `docs/USER & ROLE SETUP — FIRST INSTALL TO DAILY SALES.md` and `docs/USERS_AND_ROLES.md`.

---

## ⚡ Key Principles
1. **Data integrity > everything.** Financial and inventory movements are append-only.
2. **Zero bill drops.** A sale committed by a cashier is permanent and never rolled back by remote sync.
3. **Idempotent event sync.** Every event has a unique `event_id`. Duplicate arrival = no-op.
4. **Soft deletes & Tombstones.** Deleting records sets `active = false` with `tombstones` entry.
5. **Universal code.** Clean, shop-agnostic architecture.
6. **Time formatting.** Always `formatAppTime/Date/DateTime` from `src/lib/dateUtils.ts`.
7. **Strict compliance:** Do exactly what the user explicitly instructs. No half-measures.
8. **Schema & Backup/Import Sync:** Whenever database schema or tables change, Backup/Restore (`.zpos`) and Product Catalog Import/Export MUST be updated synchronously.
9. **100% Automated Cloud Setup:** Supabase setup (Indian region `ap-south-1` project, keys, `pos-backups` bucket, RLS policies) is executed automatically via Management API (`node scripts/setup-supabase.mjs`) using `SUPABASE_MGMT_API_KEY` from `.env.local`. Zero manual dashboard steps.
10. **100% Zero-Refresh Reactivity (0ms Screen Updates):** Tamam POS operations (Sales, Deletions, Restock, Adjustments, Wallets, Badges, Expenses, Ledger) ko 100% reactive hona lazmi hai — yani jo action hua, wo 0 millisecond me screen par reflect ho bina kisi refresh ke. Native desktop (EXE/DMG) aur mobile apps me refresh ka koi concept nahi hota. Disconnected static snapshots and manual reload dependencies are strictly prohibited.
11. **Cross-Platform Parity (EXE / DMG / APK / IPA), Smooth-Fast 60 FPS & Zero-Cache Mandate:** Windows (.exe), macOS (.dmg), Android (.apk), and iOS (.ipa) builds share 100% identical business logic. Stale browser/service worker caches are strictly prohibited; 0ms reactive UI updates are backed solely by authoritative local SQLite. All POS data replicates in real time across LAN without internet and over WAN with internet.
12. **Permanent Architectural Fix (Zero Band-Aids):** Kabhi bhi kisi calculation, stock mismatch, ya logic bug par temporary patch ya superficial band-aid na lagayein. Har issue ko uske fundamental architectural root cause par solve karein aur us se link tamam systems (`UI → Tx Coordinator → Ledger → Outbox → P2P Mesh → Remote Handler → Store → LocalDB → Reconciler → Reports`) ko complete 360-degree synchronize karein taake flow kabhi break na ho.
13. **Continuous P2P Sync & Full-Stack Parity Verification Mandate:** Koi bhi new feature ya field (product attributes, expiry dates, salesman attribution, user permissions, serial/IMEI, barcodes) add ya update hone par uska complete chain (`Types → SQLite Schema & Migration → CRUD Queries → Outbox Event → P2P Mesh Sync → Remote Event Handlers → Zustand Store → UI & Receipts → Reports → Backup/Restore & Import/Export`) lazmi 100% synchronized aur verified hona chahiye. Koi bhi field local DB me save hokar P2P sync ya reporting me drop nahi honi chahiye.
14. **Deep Root-Cause Engineering & Silent Bug Elimination (Claude Standard):** Kabhi bhi superficial code reading ya guessing na karein. JavaScript aur distributed systems mein silent bugs (jaise `Number(date)` returning `NaN`, Symmetric NAT blocking WebRTC without TURN, type coercion mismatches, silent JSON drops, clock skew, outbox queue stalls) bina kisi error ke system ko tor dete hain. Har issue ko line-by-line actual runtime values trace karke mathematical/architectural origin par pakdein, centralized battle-tested utility banayein (e.g. `safeTs()`, `iceConfig.ts`), aur pure codebase mein sweep karke 100% immune karein.

---

## 📁 Feature Workflow
1. Local Database Model / Table update
2. Types (`types/index.ts`)
3. Service file (`src/lib/services/`)
4. Zustand store update
5. UI Component (shared UI, under 300 lines)
6. Backup & Import/Export sync update
7. Docs update
