# Zaynahs POS — Master Rules (Supabase-Only Cloud-Direct Architecture)

> Single source of truth for ALL AI agents. Short, clear, no band-aids.

---

## 🏢 Business Scope
- **Universal POS** — Clothing, Pharmacy, Restaurant, Retail, Electronics, Grocery. No niche-hardcoding.
- **Terminology:** product / item / category / variant / modifier / addon
- **Single-tenant:** 1 Store = Autonomous Cloud-Connected Terminal. No workspace_id, no shift_id.
- **Language:** Roman Urdu responses, short, direct action.

---

## 🏗️ Architecture

### Target Stack
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Desktop:** Electron (Native SQLite + OS Filesystem)
- **Mobile:** Capacitor (Native SQLite Plugin)
- **Local Database:** SQLite mirror cache (`zaynahs_cloud.sqlite`)
- **Cloud Database:** Supabase PostgreSQL (Single source of truth, RLS enabled on all tables)
- **Sync Engine:** Client write-through + local `sync_queue` + background `syncWorker` (device↔Supabase only, never device↔device)
- **State:** Zustand stores (`src/stores/`) — one store per domain
- **Data Layer:** `src/data/` (atomic write, sync worker, pull sync, local schema)
- **UI:** Shared components from `src/shared/ui/` and `src/shared/modules/`

### Stock & Transaction Architecture
- **Supabase PostgreSQL = Single authoritative source of truth.** Local SQLite = High-performance offline cache.
- Stock changes ONLY via append-only `inventory_ledger` (`IN`, `OUT`, `ADJUST`, `AUDIT`). Direct stock mutation is strictly forbidden.
- Current stock is ALWAYS a computed aggregate (`SUM(quantity)` from `inventory_ledger`), never a directly-edited field.
- **Atomic Action Bundles (Hard Rule):** Every multi-table mutation (sale, refund, void, stock adjustment, product creation) commits in ONE atomic transaction locally via `atomicWrite` and pushes as ONE idempotent Postgres RPC call using `operation_id` (UUID v4).
- **Offline First:** POS operates 100% offline seamlessly. Bills commit locally in `< 10ms` to SQLite and enqueue in `sync_queue`. Upon internet reconnection, the sync worker pushes queued bundles to Supabase.

### Sync Model
- Local Action → `atomicWrite([...ops], { operation_id, action })` → Commit SQLite + `sync_queue` in ONE transaction.
- Background worker pushes bundle to Supabase RPC (`UNIQUE(operation_id)` enforces idempotency).
- Periodic pull sync fetches server updates using `updated_at` timestamps and updates local SQLite mirror.
- P2P / WebRTC / device-to-device sync is **STRICTLY BANNED**. All data flows device ↔ Supabase only.

### 🖥️ Local Runtime & Desktop Execution Rule
- **Flexible Runtime:** Run via `npm run dev` or `npm run electron:dev` based on development workflow needs. Shared architecture ensures logic parity across browser and desktop.
- **Local SQLite & AppData location:** SQLite DB and binary media are stored in OS native app-data directory:
  `$APPDATA / ~/Library/Application Support/<app-id>/` (`zaynahs_cloud.sqlite`, `images/`, `receipts/`, `backups/`).
- **Production Packaging:** Production installers (EXE/DMG/APK/IPA) are built at release time, not required after routine feature edits.

### 🌐 Cloud Connection & Free-Tier Optimization Rules
1. **Singleton Client:** Supabase client hamesha cached singleton instance rahe (`getSupabase()`). Har call par naya client create karna strictly banned hai (prevents connection leaks).
2. **`useEffect` Cleanup:** Realtime channel subscription create hone par unmount callback me `supabase.removeChannel(channel)` lazmi call ho.
3. **No Heavy Realtime on DB Tables:** Postgres table level realtime 100% OFF. Supabase data fetch via standard REST/RPC and background pull sync.
4. **Media Storage:** Product images upload to Supabase Storage (`product-images` private bucket) and cache locally in filesystem.

---

## 📏 Code Rules

### File Size & Code Limits
- **MAX 300 lines per file.** If bigger → split into sub-components/modules immediately. No excuses.
- Repositories & Data services: one file per entity in `src/lib/services/` interfacing with `src/data/`
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
- **Staff Users & Role-Based Access:**
  - Login via username + password against `staff_users` table (seeded with default admin).
  - PIN codes and license keys are completely eliminated.
  - Roles: `admin`, `manager`, `cashier`, `salesman`.
  - Permissions are enforced server-authoritatively via Supabase RLS and client-side guards.
- **Row Level Security (RLS):**
  - EVERY table in Supabase has RLS enabled with explicit policies.
  - Client operations run using authenticated staff session / ANON key with RLS protection.
- **Device Identity:**
  - Simple local `device_id` generated on first run for audit trail attribution (`created_by`, `device_id`). No cryptographic P2P pairing keys.

---

## ⚡ Key Principles
1. **Data integrity > everything.** Financial and inventory movements are append-only.
2. **Zero bill drops.** A sale committed locally is permanent; queued bundle retries until Supabase ACK.
3. **Idempotency via `operation_id`.** Every multi-table action carries a UUID v4 `operation_id`. Replay returns original result without duplication.
4. **Soft deletes & Tombstones.** Deleting records sets `deleted_at = now()` / `is_active = false`.
5. **Universal code.** Clean, shop-agnostic architecture.
6. **Time formatting.** Always `formatAppTime/Date/DateTime` from `src/lib/dateUtils.ts`.
7. **Strict compliance:** Do exactly what the user explicitly instructs. No half-measures.
8. **Schema & Backup/Import Sync:** Whenever database schema or tables change, Supabase migrations, localSchema mirror, and Backup/Restore MUST be updated synchronously.
9. **100% Zero-Refresh Reactivity (0ms Screen Updates):** Tamam POS operations (Sales, Deletions, Restock, Adjustments, Wallets, Badges, Expenses, Ledger) ko 100% reactive hona lazmi hai — yani jo action hua, wo 0 millisecond me screen par reflect ho bina kisi refresh ke.
10. **Cross-Platform Parity (EXE / DMG / APK / IPA), Smooth-Fast 60 FPS & Zero-Cache Mandate:** Windows (.exe), macOS (.dmg), Android (.apk), and iOS (.ipa) builds share 100% identical business logic. Stale browser/service worker caches are strictly prohibited; 0ms reactive UI updates are backed solely by authoritative local SQLite mirror.
11. **Permanent Architectural Fix (Zero Band-Aids):** Kabhi bhi kisi calculation, stock mismatch, ya logic bug par temporary patch ya superficial band-aid na lagayein. Har issue ko uske fundamental architectural root cause par solve karein.

---

## 📁 Feature Workflow
1. Supabase Migration (`supabase/migrations/xxxx_*.sql`) + update `supabase/MASTER_SCHEMA.sql` and `supabase/SCHEMA.md`
2. Local Schema Mirror (`src/data/localSchema.ts`)
3. Types (`types/index.ts`)
4. Data Service / Repository (`src/lib/services/` -> `src/data/`)
5. Zustand store update
6. UI Component (shared UI, under 300 lines)
7. Backup & Import/Export sync update
