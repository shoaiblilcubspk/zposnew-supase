# Phase 08: Linear UI/UX Standards & Sync Status Transparency

> **Reference:** `docs/UI_RULES.md`, `docs/MODULES.md` & `AGENTS.md`  
> **Mandate:** High-density Linear aesthetics (13px, 32px rows, hairline borders, single accent). Fix false "3 pending" error indicator. Standardize filter labels to "All".

---

## 1. Objectives & Scope

Refine the frontend user experience to adhere strictly to the Linear & Anti-AI professional design system. Resolve visual bugs, browser autofill styling issues, zero-count pagination glitches, and make the top-bar sync widget completely transparent so offline local saving is never mistaken for a pending failure.

---

## 2. Resolving the "3 Pending" Bug in `SyncStatusWidget`

### The Problem
* When products, categories, or sales are saved locally, they commit to SQLite in `< 10ms`.
* Concurrently, `sync_outbox` receives an event with `is_synced = 0`.
* If the terminal is operating standalone (0 connected peers), `SyncStatusWidget` previously showed a spinning reload icon with `🔄 3 pending`.
* **User impact:** The user assumed that local persistence failed or was blocked!

### The Solution
Update `SyncStatusWidget.tsx` to provide clear, two-layer status:
```text
┌──────────────────────────────────────────────────────────────┐
│ Case 1: Standalone Mode (0 Peers Connected)                  │
│ [🟢 Local: Saved]   [⚪ 3 to sync (Standalone)]             │
│ (Green dot confirms local SQLite commit. No spinning icon.)  │
├──────────────────────────────────────────────────────────────┤
│ Case 2: Active Mesh (Peers Connected & Syncing)              │
│ [🟢 Local: Saved]   [🔄 Syncing (2 peers)]                   │
├──────────────────────────────────────────────────────────────┤
│ Case 3: Fully Replicated Mesh                                │
│ [🟢 Local: Saved]   [⚡ In Sync (2 peers)]                   │
└──────────────────────────────────────────────────────────────┘
```

### Sync & Mesh Inspector Modal
Clicking the widget opens an inspection modal displaying:
* Local `DEVICE_ID` and public key fingerprint.
* List of connected peers in the mesh, latency, and last acknowledged sequence number.
* Pending outbox queue table with event types and inspectable JSON payloads.
* Actions: "Trigger P2P Sync" and "Export Sync Diagnostics".

---

## 3. Linear & Anti-AI Design System Standards

1. **High-Density Typography:**
   * 13px base text (`text-[13px]`) with pulled-in letter spacing (`tracking-[-0.01em]`).
   * Primary font: Google Font `Inter`.
   * Monospace numbers & tabular data: Google Font `JetBrains Mono` (`tabular-nums font-mono`).
2. **Flat Engineered Surfaces:**
   * Cards and panels use `shadow-none`.
   * 1px hairline border at 8% opacity (`border-white/[0.08]`).
   * Depth achieved through discrete surfaces: `bg-app`, `bg-surface`, `bg-surface-hover`.
3. **Single Accent Color:**
   * Neutral greys for 90% of the UI.
   * Single flat accent (Emerald/Indigo) reserved strictly for selected rows and primary actions.
   * Zero purple-to-blue neon gradients.
4. **Filter Label Standardization:**
   * All dropdowns and filter selectors show `"All"` (e.g. replacing `"ALL SUPPLIERS"`, `"ALL CATEGORIES"`, `"ALL USERS"`, `"All Sales"`).
5. **Zero-Count Pagination Standard:**
   * When a table has 0 records, display `"Showing 0 of 0"`, never `"Showing 1–0 of 0"` or `"Showing 0–0 of 0"`.
6. **Dark Mode Autofill Override:**
   * Apply WebKit box-shadow override to prevent Chrome from painting bright white backgrounds over dark inputs.

---

## 4. Verification & Acceptance Criteria

- [ ] Standalone mode displays `Local: Saved` with a calm green indicator (no spinning error icon).
- [ ] Clicking the status widget opens the Sync & Mesh Inspector modal.
- [ ] All filter dropdowns across inventory, transactions, expenses, and reports show `"All"`.
- [ ] Empty tables display `"Showing 0 of 0"` in pagination footers.
- [ ] Product grid displays high-contrast, fully opaque `NO STOCK` badges.
- [ ] Chrome autofill does not turn inputs white in dark mode.
