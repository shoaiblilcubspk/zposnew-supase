# 🎨 Zaynahs POS — UI/UX MASTER SPECIFICATION & RULES (LINEAR & ANTI-AI)

> **SINGLE SOURCE OF TRUTH FOR FRONTEND ARCHITECTURE & DESIGN SYSTEM**  
> **THE GOLDEN MANDATE:** The entire application — every route, modal, table, drawer, and tab — is built like an engineered, high-density professional tool (Linear / Vercel style).  
> **USE SHARED CODE — DO NOT CREATE THE SAME CODE AGAIN AND AGAIN.** All UI components strictly come from `src/shared/ui/` and `src/shared/modules/` (`src/components/pos/**` dense grid is the only local exemption). Hand-rolled page-local markup, custom buttons, alag-alag lookalikes = **STRICTLY BANNED**.

---

## 1. CORE LOOK & DESIGN TOKENS
* **Professional Linear-Style POS:** Clean, dense, ultra-fast, engineered surfaces.
* **Anti-AI / Anti-Template Appearance:** Zero pastel blobs, zero cartoon icons, zero SaaS templates.
* **No Gradients:** Banned across backgrounds, buttons, cards, text, and charts.
* **No Glassmorphism:** No backdrop-blur cards or translucent layered noise.
* **No Excessive Colors:** Monochromatic neutral greys (`bg-app`, `bg-surface`, `bg-surface-hover`) for 90% of UI.
* **1 Primary Accent Only:** Single accent color (Emerald / Indigo) strictly reserved for selected rows, active tabs, and primary action buttons.
* **Semantic Colors Only Where Required:** Success (Emerald), Warning (Amber), Error/Destructive (Rose).
* **Borders / Hairlines Over Shadows:** 1px hairline borders (`border-neutral-200 dark:border-white/[0.08]`) define surfaces. No drop shadows on flat cards or panels (`shadow-none`).
* **Shadows ONLY on Floating Overlays:** `shadow-2xl` on floating `Modal`, `BottomSheet`, `Popover`, and `DropdownMenu`.
* **High-Density & Readable Typography:** Root font size set to 15px (16px on large monitors, 14px on mobile) to eliminate microscopic/tiny text. Base text `text-[13.5px]`, standard rows and inputs `h-9` (36px). Letter spacing pulled in 1% (`tracking-[-0.01em]`). Numbers and codes use `tabular-nums font-mono`.
* **High Contrast Text (No Faded Gray):** Muted text `--color-text-muted` enforced at `#475569` (light mode) and `#cbd5e1` (dark mode). Washed out `text-neutral-400` on white or `text-neutral-500` on dark backgrounds for critical labels is strictly banned (WCAG AA >= 4.5:1 ratio).
* **Standard Control Heights:** Standard rows, buttons, and inputs `h-9` (36px). Compact controls `h-7` (28px).
* **Strict 4px Spacing Grid:** 4px, 8px, 12px, 16px, 20px, 24px. Nothing centered randomly.
* **16px–20px Standard Icons:** Action icons minimum `w-4 h-4` (16px), card/metric icons `w-5 h-5` (20px). Icons sit raw with high-contrast neutral colors. No colorful background tiles behind icons.
* **Prominent Store Logo:** Header store logo container `h-10 w-10 sm:h-11 sm:w-11` (40px–44px) with crisp border and `object-contain`.
* **Ultra-Compact Sync Status Pill:** Header sync widget footprint `< 60px` (`[🟢 Local]` or `[🟢 Local 7]`) with full diagnostics on click/hover to preserve maximum navigation space.
* **Tight Radiuses:** `rounded` (4px) on inputs, buttons, and badges; `rounded-md` (6px) on cards and panels. Fluffy `rounded-2xl`, `rounded-3xl`, and `rounded-[2rem]` are strictly prohibited.
* **100% Zero-Refresh Reactivity (0ms Screen Updates):** Tamam POS operations (Sales, Deletions, Restock, Adjustments, Wallets, Badges, Expenses, Payments, Ledger) ko 100% reactive hona lazmi hai — yani jo action hua, wo 0 millisecond me screen par reflect ho bina kisi refresh ke. Native desktop (EXE/DMG) aur mobile apps me refresh ka concept nahi hota. Disconnected static cache snapshots and manual refresh dependencies are strictly banned.

---

## 2. GLOBAL COMPONENTS (MANDATORY SHARED CODE USAGE)
Every view in the application must reuse the standardized components in `src/shared/ui/` and `src/shared/modules/`:

| Component | Source File | Standard Usage |
|---|---|---|
| **Sidebar & Topbar** | `src/components/layout/` | High-density navigation, app branding, terminal status |
| **Buttons & Icon Buttons** | `src/shared/ui/Button.tsx` | Hierarchy: `primary`, `secondary`, `ghost`, `danger`, `icon`, `link` |
| **Input Fields** | `src/shared/ui/Input.tsx` | High-density 32px text inputs with hairline borders |
| **Number & Currency Inputs** | `src/shared/ui/` & `formatCurrency` | Right-aligned numeric inputs with `tabular-nums` |
| **Search Bars** | `src/shared/modules/search-and-list/` | Search input with clear button, debounce, and loading state |
| **Select & Searchable Select** | `src/shared/ui/SearchableSelect.tsx` | Flat searchable combobox with keyboard arrow support |
| **Date & Date-Range Picker** | `src/shared/ui/DateRangePicker.tsx` | Reusable date filters with presets (Today, 7D, 30D, Custom) |
| **Toggle Switch & Checkbox** | `src/shared/ui/ToggleSwitch.tsx` | Compact 16px/24px boolean switches |
| **Badges & Status Tags** | `src/shared/ui/Badge.tsx` | Crisp 4px radius with icon + neutral text (NEVER colored candy pills) |
| **Modals & Drawers** | `src/shared/ui/Modal.tsx`, `BottomSheet.tsx` | Keyboard-accessible (`Esc`), focus-trapped dialogs |
| **Pagination** | `src/shared/ui/Pagination.tsx` | Numbered pagination (`Previous \| 1 2 3 ... 10 \| Next`) |
| **Empty State** | `src/shared/ui/EmptyState.tsx` | Informative title + single actionable CTA (no cartoon artwork) |
| **Skeleton Loader** | `src/shared/ui/SkeletonLoader.tsx` | Flat animated skeleton blocks for table/card hydration |
| **Toast Notifications** | `src/lib/sonner.ts` | Minimal notifications for confirmed actions (no spam) |
| **Media Library** | `src/shared/MediaLibrary.tsx` | Content-addressed local image selection & file ingestion |
| **Segmented Control** | `src/shared/ui/SegmentedControl.tsx` | Flat 32px segmented tabs with hairline active indicator |

---

## 3. BUTTON HIERARCHY & ACTIONS
Only the following 6 button variants are permitted:
1. **Primary (`variant="primary"`):** Accent background with high-contrast text. Strictly ONE primary action per screen/dialog.
2. **Secondary (`variant="secondary"`):** Flat neutral surface with 1px hairline border (`bg-surface hover:bg-surface-hover border-gray-200 dark:border-white/[0.08]`).
3. **Ghost (`variant="ghost"`):** Transparent background, subtle neutral hover tint.
4. **Destructive (`variant="danger"`):** Subdued rose outline or solid red strictly for permanent deletions, voiding, or revocations.
5. **Icon Button (`variant="icon"`):** 32px square container (`h-8 w-8`) with 16px centered icon.
6. **Link (`variant="link"`):** Subtle underlined text button for secondary navigation.

**Rules:**
- Display keyboard shortcuts on action buttons where applicable (`⌘K`, `C`, `Enter`, `Esc`).
- Loading states (`loading={true}`) replace the icon with an inline spinner without shifting button width.
- Disabled states (`disabled={true}`) show reduced opacity (`opacity-50 pointer-events-none`) with no hover reaction.
- No oversized buttons; no rainbow button collections.

---

## 4. SEARCH ARCHITECTURE
Every major searchable dataset (Products, Sales, Customers, Inventory, Staff) must follow:
- High-density search input with a clear button (`✕`), debounced typing, and instant clear.
- Full keyboard support: Arrow keys navigate suggestions, `Enter` selects, `Esc` dismisses.
- Global shortcut: `⌘K` / `Ctrl+K` opens the quick-command and product search palette from anywhere in the POS.
- Product search criteria: Name, SKU, Barcode, Product code, and Aliases.
- Zero-result state: Shows clean message and relevant CTA (`Add Product`).
- No needlessly complex nested multi-tiered query builders.

---

## 5. FILTERS
- Contextual and minimal: Date, Status, User/Staff, Device, Category, Payment Method, Customer/Supplier.
- Filters live in a compact 36px toolbar directly above data tables.
- Active filters show compact tags with a one-click clear button.
- Do not build 20-filter collapsible panels unless the dataset genuinely warrants it.

---

## 6. TABLES & DATA MATRICES
Tables are the operational core of the POS:
- **High-Density Rows:** Standard row height `h-8` (32px) or `h-9` (36px).
- **Column Alignment:**
  - Text, names, descriptions: **Left-aligned**.
  - Quantities, prices, totals, balances: **Right-aligned** with `tabular-nums font-mono`.
  - Statuses, badges, roles: **Centered**.
  - Action buttons: **Right-aligned**.
- **Hairline Dividers:** 1px hairline border (`border-gray-200 dark:border-white/[0.08]`), zero heavy shadow elevations.
- **Row States:**
  - Normal: `bg-surface`.
  - Hover: `hover:bg-surface-hover` (< 80ms transition).
  - Selected / Active: Subtle accent hairline or left border indicator.
  - Inactive / Disabled: `opacity-50`.
- **Sticky Headers:** Sticky `thead` during vertical scrolling.
- **Bulk Actions:** Checkbox column appears only when batch actions (e.g., bulk export, bulk category change) are supported.
- **Pagination:**
  - Simple numbered pagination: `Previous | 1 2 3 ... 10 | Next`.
  - Records count: `Showing 1–25 of 142 records`.
  - Configurable page size: `25 / 50 / 100` rows per page.
  - Previous/Next disabled on first/last page.
  - Do NOT use infinite scroll on financial or inventory tables.

---

## 7. CHARTS & DATA VISUALIZATIONS
Charts are strictly for understanding trends, never for visual decoration:
- **Line Chart:** Sales revenue, gross profit, and invoice volume over time (Daily, Weekly, Monthly).
- **Bar Chart:** Category comparisons, top-selling products, and terminal/salesman attribution.
- **Pie / Donut Chart:** Part-to-whole comparisons only when categories are ≤ 5 (e.g., Payment Mode distribution: Cash vs Card vs Wallet).
- **No Chart:** When a dense summary number or compact table is clearer, omit the chart entirely.
- **Rules:**
  - Zero rainbow charts. Use monochromatic shades of the primary accent + neutral greys.
  - Zero fake static data. Aggregations run directly in SQLite.
  - Tooltips show exact values formatted with `formatCurrency` and tabular numerals.
  - Charts must collapse cleanly and remain legible on mobile/tablet viewports.

---

## 8. DASHBOARD & METRIC HIERARCHY
Eliminate the "AI Dashboard Tell" (4 identical colorful cards with pastel icon tiles):
- **Asymmetric Metric Hierarchy:**
  - **1 Primary Hero Metric (Large):** Total Revenue / Net Profit (`text-2xl font-bold font-mono tracking-tight`).
  - **3 Secondary Supporting Metrics (Compact):** Invoices, Average Bill Value, Stock Valuation (`text-lg font-semibold tabular-nums`).
- **Visual Section:** Single trend line chart or compact sparkline.
- **Recent Activity Section:** Real-time recent sales ledger table showing timestamp, invoice ID, cashier, total, and payment method.
- **Strictly Banned:** 10 decorative metric boxes, colorful icon backgrounds, fake percentage badges, and decorative widgets.

---

## 9. FINANCIAL & OPERATIONAL REPORTING
Reporting must be **powerful internally but visually simple**:
`Filters → Summary Strip → Table → Optional Chart`

### Core POS Reports:
1. **Sales Summary Report:** Date range, User, Device, Payment Method, Total Invoices, Gross Sales, Refunds, Net Revenue.
2. **Inventory Movement Report:** Product, SKU, Opening Stock, IN, OUT, Adjustments, Returns, Closing Stock, Oversold Count.
3. **Payment & Wallet Report:** Cash in Till, Card Transactions, Online Wallets, Split Payments, Outflows.
4. **Expense Report:** Date, Category, Amount, Staff User, Payment Mode, Notes.
5. **Customer Ledger Report:** Date, Reference Invoice, Customer Name, Debit, Credit, Running Balance.

**Report UX Rules:**
- Reusable date filters (`Today`, `Last 7 Days`, `This Month`, `Custom`).
- Direct local SQLite query execution (`lib/reports/reportQueries.ts`).
- Clean CSV / PDF export capabilities without UI lag.
- Zero duplicate calculation logic; reports reflect authoritative ledger events.

---

## 10. POS SALES SCREEN (FASTEST SCREEN)
The sales terminal is the mission-critical interface of the entire store:
- **Execution Flow:** `Barcode / Search → Add to Cart → Discount → Customer → Tender Payment → Print / Complete`.
- **Keyboard-First Design:** Cashiers can complete a full transaction using only the keyboard (`F2` search, `F8` payment, `Enter` commit, `Esc` cancel).
- **Barcode Scanner Ingestion:** Continuous background scanner listener captures USB and Bluetooth barcode input instantly.
- **Cart Calculations:** Line item subtotal, item discount, invoice discount, tax, roundoff, and grand total calculate reactively.
- **Tender & Change Calculation:** Quick cash shortcut buttons (e.g. Exact, 500, 1000, 5000), cash received input, change due, and balance remaining.
- **Atomic Local Commit:** Sales commit to SQLite in `< 10ms`. Zero dropped bills, zero network blocking, zero spinner lag.
- **Speed Over Animation:** No bouncy fly-into-cart animations.

---

## 11. PRODUCT CATALOG UI
- **Basic Details:** Product Name, SKU, Category, Brand, Description.
- **Pricing:** Cost Price (COGS), Retail Sale Price, Wholesale Price, Tax Rate.
- **Inventory Control:** Current Stock, Minimum Stock Reorder Alert, Track Inventory toggle.
- **Barcode & Codes:** Barcode value, secondary barcode, QR identifier.
- **Media Asset:** Product image uploaded via `MediaLibrary`, stored locally in `$APPDATA/images/` and addressed by SHA-256 hash.
- **Variants & Modifiers:** Color/size variants and modifiers supported when configured.
- **Movement History:** Modal tab displaying append-only transaction logs for the item.

---

## 12. INVENTORY & STOCK LEDGER UI
- **Transaction Model:** `IN / OUT / ADJUST / RETURN / RESTOCK`.
- **Append-Only Movement Log:** Stock changes strictly occur via immutable `inventory_transactions`.
- **Conflict Transparency:** If two offline terminals oversell an item, the ledger clearly displays the negative oversold balance (`Oversold: -3`). Never hide stock discrepancies.
- **Stock Audit Flow:** Physical stock count vs system stock with variance notes and atomic adjustment event.

---

## 13. SALES HISTORY & INVOICE MANAGEMENT
- **Sales History Table:** Search by invoice ID or customer, date range filter, payment mode filter, cashier/salesman filter, status (`completed`, `refunded`, `partially_refunded`, `voided`), pagination.
- **Invoice Detail Modal:**
  - Header: Invoice ID, Date & Time, Cashier Name, Salesman Name, Terminal Device ID.
  - Customer profile: Name, phone, outstanding ledger balance.
  - Line items: Product name, SKU, unit price, quantity, discount, total.
  - Payment details: Tender method, cash received, change returned.
  - Actions: Reprint Receipt, Issue Refund / Return, Void Sale (Admin only), Audit Log.

---

## 14. USERS, ROLES & ACCESS CONTROL
- **User Directory:** Staff table displaying Name, Username, Role, Price Override status, Discount status, Active state, and Actions.
- **Role Hierarchy:**
  1. `admin`: Full administrative, device, financial, and user management authority.
  2. `manager`: Operational management, restock, inventory adjustments, price edits, discounts, reports.
  3. `cashier`: POS sales, cart discounts, customer lookup, receipt printing.
  4. `salesman`: Customer assistance, order creation, commission attribution.
- **Cryptographic PIN Security:** 4-to-6 digit numeric PIN hashed with PBKDF2/SHA-256 (100,000 iterations). Plaintext PINs are NEVER stored or synced.
- **Progressive Lockout:** 3 failed attempts = warning, 5 failed attempts = 30s delay, 10 failed attempts = account locked.
- **Soft Delete Only:** Deactivating a user sets `active = 0` (`status = 'disabled'`). Historical sales and audit logs remain intact.
- **Detailed Specification:** See `docs/RBAC_RULES.md`.

---

## 15. DEVICES & CLOUD SYNC MANAGEMENT
- **Device Management:** Device Name, Device ID, Active Staff User, Last Seen, Cloud Sync State.
- **Terminal Setup:**
  - Devices sign in with staff credentials (username + password).
  - Devices are assigned a local `device_id` on first launch for audit log attribution.
  - Zero P2P device pairing or QR token exchange required.
- **Staff Access Control:** Admin can manage staff roles and deactivate accounts from Settings.

---

## 16. CLOUD SYNC STATUS UI
Keep the UI simple and non-intrusive for counter staff:
- **Global Header Widget:**
  - `🟢 Synced` (All local mutations committed to Supabase).
  - `🔄 Syncing` (Pushing queued bundles or pulling cloud updates).
  - `🟡 Offline` (Terminal operating 100% autonomously offline).
  - `🔴 Error` (Cloud connection or sync queue error).
- **Popover Details:** Pending sync queue count, last successful sync timestamp, network status.
- **Zero Technical Jargon:** Never expose raw SQL errors, JWT tokens, or internal RPC payloads to cashiers.

---

## 17. POPUPS, MODALS, DRAWERS & DIALOGS (DESKTOP & RESPONSIVE)
Every dialog in the application must strictly adhere to desktop-grade engineering, keyboard accessibility, and Anti-AI principles:

### 17.1 Ergonomics & Dimensions
* **Flat Engineered Surfaces:** Solid `bg-surface`, 1px hairline border (`border-gray-200 dark:border-white/[0.08]`). No interior card shadows.
* **Controlled Depth:** Shadows (`shadow-2xl`) are strictly permitted on the floating dialog container itself over a `bg-black/70 backdrop-blur-sm` overlay.
* **Tight Desktop Radiuses:** `rounded-lg` (8px) for modals and dialogs; `rounded-md` (6px) for popovers and dropdown menus. Fluffy `rounded-2xl` or `rounded-[2rem]` are strictly banned.
* **Deterministic MaxWidth Hierarchy:**
  * `maxWidth="sm"` (384px): Confirmation dialogs, destructive warnings, fast PIN prompts.
  * `maxWidth="md"` (448px): Quick customer create, wallet selection, quick adjustments.
  * `maxWidth="lg"` (512px): Standard entity forms (Staff User, Supplier, Discount rule).
  * `maxWidth="xl"` (576px): Dual-column forms (Product Catalog edit, Inventory restock).
  * `maxWidth="2xl"` (672px): Dense matrices, Invoice details with itemized table, Media Library.

### 17.2 Structure & Layout Anatomy
* **Header:**
  * Title: 14px–15px font-semibold text (`text-gray-900 dark:text-white tracking-[-0.01em]`).
  * Subtitle: 11px neutral mono/uppercase subtitle describing the exact context or ID.
  * Close action: 16px neutral close button (`✕`) with `aria-label="Close dialog"`.
* **Body:**
  * Max height capped at `max-h-[80vh] overflow-y-auto` with clean hairline scrollbars.
  * High-density 13px typography (`text-[13px]`), 32px standard inputs (`h-8`), 4px grid spacing.
* **Sticky Footer:**
  * Pinned to bottom of the dialog with hairline top border (`border-t border-gray-200 dark:border-white/[0.08]`).
  * Layout: Cancel / Discard button on the left (`variant="ghost"`), Primary / Confirm button on the right (`variant="primary"` or `variant="danger"`).
  * Action displays shortcut hints: `<kbd>Esc</kbd>` to cancel, `<kbd>Enter</kbd>` or `<kbd>⌘S</kbd>` to commit.

### 17.3 Specialized Dialog Types
1. **Form Modals:** Controlled inputs, auto-focus on the first field, disabled submit when form is invalid or unchanged.
2. **Confirmation Dialogs:** Short explanation of the action, neutral secondary button + focused confirm action.
3. **Destructive Confirmations:** Red danger action (`variant="danger"`), clear explanation of irreversible effects (e.g. "Voiding invoice #1042 will restore stock and reverse payment"). Never silently delete.
4. **Detail / Audit Modals:** Dual-pane or tabular view displaying immutable event history, invoice line items, and device attribution.
5. **Command Palette (`⌘K`):** Floating search palette, instant keyboard navigation with arrow keys, instant item selection on `Enter`.
6. **Drawers & Slide-Overs:** Right-side or bottom slide-over panels for cart summary on mobile/tablet. Hairline left/top border.
7. **Context Menus & Popovers:** Anchored directly to trigger button, auto-flip to stay within viewport bounds, dismiss on outside click or `Esc`.

### 17.4 Anti-AI Rules for Popups
* ❌ **NO PASTEL ICON TILES:** Do NOT place decorative pastel circles (pink, purple, cyan) with oversized icons at the top of modals.
* ❌ **NO POPUP INSIDE POPUP:** Never trigger a confirmation popup on top of an already open modal. Use inline confirmation buttons or step toggles.
* ❌ **NO GRADIENT HEADERS OR BUTTONS:** Keep modal headers solid and neutral.
* ❌ **NO CENTERING CONTENT RANDOMLY:** Form labels left-aligned, numbers right-aligned, actions right-aligned.
* ❌ **NO WASTED WHITESPACE:** Keep padding tight (`p-4` to `p-6` max). A desktop POS operator should never have to scroll excessively to fill out a 4-field form.

### 17.5 Mobile Safe-Area & Bottom-Nav Clearance (MANDATORY — fix once, applies everywhere)
Every popup/modal/sheet MUST keep a consistent gap from the device edges on mobile (PWA +
installed app) — never flush against the status bar/notch at the top or the floating bottom
navigation / home indicator at the bottom. This is enforced ONCE in the shared components, not
per-screen:

* **Single source of truth:** `src/shared/ui/Modal.tsx` (and `BottomSheet.tsx`, which wraps it)
  and the global `src/shared/ui/DialogProvider.tsx`. Any new dialog MUST use these — no
  hand-rolled `fixed inset-0` overlay with its own (missing) insets.
* **Top gap:** `pt-[calc(0.75rem + env(safe-area-inset-top))]` — clears the notch/status bar plus
  a small fixed nudge, on all screen sizes.
* **Bottom gap:** `pb-[calc(0.75rem + env(safe-area-inset-bottom) + var(--bottom-nav-clearance))]`
  with a `md:` override that drops the nav reserve on desktop. It clears BOTH the home indicator
  (`env(safe-area-inset-bottom)`) AND the floating bottom nav.
* **Bottom-nav token (single source):** `--bottom-nav-height`, `--bottom-nav-gap`, and the derived
  `--bottom-nav-clearance` live in `src/styles/base.css`. `MobileBottomNav.tsx` consumes
  `--bottom-nav-height` / `--bottom-nav-gap` so the pill height is defined in exactly one place;
  modals reserve `--bottom-nav-clearance`. The token collapses to `0` at `≥768px` (nav is
  `md:hidden`), so desktop modals are unaffected.
* **Panel height tracks the insets:** the dialog `max-h` subtracts the same top + bottom insets +
  nav clearance so a tall modal stays fully on-screen and internally scrollable — the header
  (title + ✕) and sticky footer (actions) always remain visible/reachable.
* **`viewport-fit=cover`** must stay set in `index.html` so `env(safe-area-inset-*)` resolves on
  notched devices.
* **Never** add a mobile-only centering/full-bleed rule that removes these insets, and never
  hard-code the nav height (`58px`) anywhere but the token.

---

## 18. DELETIONS, VOIDS & TOMBSTONES
Never silently destroy business data:
- **Destructive Action Flow:** `Click Delete → Confirmation Dialog with clear consequences → Soft Delete / Tombstone → Audit Log Event`.
- **Audit Trails:** Deleting a product, user, or expense generates an immutable tombstone event replicated across all terminals.
- **Destructive Button Styling:** Uses `variant="danger"` (Rose/Red) strictly for destructive operations.

---

## 19. TOAST NOTIFICATIONS & USER FEEDBACK (APPLE DYNAMIC ISLAND PILL)
- Universal Apple Dynamic Island floating pill (`rounded-full`, OLED black glass `rgba(10, 10, 12, 0.94)` with `backdrop-filter: blur(28px)`, hairline border `rgba(255, 255, 255, 0.16)`).
- Centered top entrance with iOS spring physics animation (`dynamicIslandEntrance`).
- Subtle glowing micro-indicators (Emerald success, Rose error, Amber warning, Sky blue info).
- Auto-dismiss within 2.5 seconds without cluttered stacked close buttons.
- Identical high-end tactile experience across Desktop, Mac DMG, Windows EXE, and Mobile.

---

## 20. LOADING STATES & SKELETONS
- Every asynchronous operation follows: `Idle → Loading → Success / Error`.
- **Skeleton Loaders:** Use `<SkeletonLoader />` matching the exact layout of the target table or form card.
- **No Generic Spinners:** Full-page spinning wheels are banned. Buttons show an inline loading spinner while retaining their label width.
- Never fake loading delays; UI responds instantly once local SQLite commits.

---

## 21. EMPTY STATES
Every list, table, and search result must gracefully handle 0 records:
- **Structure:** Clean icon (`w-8 h-8` neutral grey), short descriptive title (e.g. `No products found`), and ONE clear CTA button (e.g. `Add Product`).
- **Prohibited:** Decorative cartoons, fluffy empty-state illustrations, or blank empty white boxes.

---

## 22. OFFLINE OPERATION & AUTONOMY
- The POS is **100% Offline-First**. All sales, inventory updates, customer balances, and reports work autonomously without an internet connection.
- A clean, unobtrusive badge indicates `Offline`, but the terminal NEVER displays blocking "No Internet Connection" modals or disables sales.

---

## 23. RESPONSIVE DESIGN (DESKTOP, TABLET, MOBILE)
- **Desktop (Primary):** High-density tables, collapsible sidebar, full keyboard shortcuts, dual-pane POS grid.
- **Tablet (Countertop):** Touch-friendly 36px buttons, adaptive column visibility, drawer-based filters.
- **Mobile (Handheld / Pocket POS):**
  - **Modern Apple Floating Capsule Dock (`MobileBottomNav.tsx`):** Elevated floating glass pill (`rounded-[24px]`, `backdrop-blur-2xl`, `bg-white/80 dark:bg-[#121214]/85`, `shadow-xl`) centered above bottom safe-area (`bottom-[calc(env(safe-area-inset-bottom,0px)+8px)]`).
  - **Active State:** Soft monochromatic capsule highlight (`bg-black/[0.04] dark:bg-white/[0.08]`), `scale-105` icon lift, and separate glowing emerald micro-dot underneath text (zero label collision, zero line strikes through text).
  - **Tactile Physics:** `active:scale-90 transition-all duration-200 ease-out` spring feel for native iOS app sensation.
  - **Shared Icon Usage:** All tab icons strictly come from `RealIcon` registry (`pos`, `sales`, `inventory`, `customers`, `more`), with `/Icons/More menu.png` for More options.
  - **Stacked Card Views:** Compact cards for transaction/inventory tables on mobile with full-screen checkout modal.
- **Single Design System:** All viewports use the exact same tokens, colors, components, and SQLite queries. Never fork business logic for mobile.

---

## 24. KEYBOARD SHORTCUT SYSTEM
- `⌘K` / `Ctrl+K`: Global search & command palette.
- `⌘S` / `Ctrl+S`: Save form changes.
- `⌘L` / `Ctrl+L`: Lock terminal session.
- `F2`: Focus POS product search bar.
- `F8`: Open payment tender modal.
- `Esc`: Close open modal, popover, or drawer.
- `Enter`: Confirm safe dialogs.
- Keycap hints (`<kbd>`) rendered directly inside buttons and search inputs.

---

## 25. MOTION, SPEED & TRANSITIONS
- **Hover Transitions:** ≤ 80ms (`ease-out`).
- **Modal / Drawer Transitions:** ≤ 150ms (`ease-out`).
- **No Spring Bouncing:** Zero overshoot, zero physics-simulated bouncy animations.
- **No Animated Gradients:** Backgrounds remain rock-solid and static.
- POS feels instantaneous and tactile.

---

## 26. ACCESSIBILITY & CONTRAST
- High-contrast text: `text-neutral-900` on light surfaces, `text-white` on dark surfaces.
- Visible focus rings: 2px hairline focus ring (`focus:ring-2 focus:ring-primary/40 focus:outline-none`).
- Semantic HTML tags: `table`, `thead`, `tbody`, `button`, `label`, `input`, `dialog`.
- Screen-reader labels (`aria-label`) on all icon-only buttons.
- Never convey critical state using color alone; pair color with an icon or explicit text.

---

## 27. ANTI-AI DESIGN RULES (STRICTLY PROHIBITED)
Every screen and component must eliminate the common AI template tells:
- ❌ **NO PURPLE / BLUE GRADIENT BACKGROUNDS** — Use solid neutral surfaces (`bg-app`, `bg-surface`).
- ❌ **NO GRADIENT BUTTONS** — Flat primary accent color only.
- ❌ **NO GLASSMORPHISM** — No frosted-glass, `backdrop-blur` cards, or semi-transparent messy backgrounds.
- ❌ **NO PASTEL ICON TILES** — Icons sit raw in neutral grey; the metric number is the hero.
- ❌ **NO BUBBLY CARDS** — `rounded-2xl`, `rounded-3xl`, and `rounded-[2rem]` are banned. Use `rounded-md` (6px).
- ❌ **NO HUGE HEADINGS & WASTED WHITESPACE** — 13px base text, tight professional padding.
- ❌ **NO COLORED CANDY PILL BADGES** — Status uses a subtle icon + neutral text with hairline border.
- ❌ **NO 3D ILLUSTRATIONS OR BLOBS** — Clean, serious engineering UI.
- ❌ **NO CARD DROP SHADOWS** — Flat hairline border (`border-white/[0.08]`) instead of shadows.

---

## 28. SIMPLICITY & COMPLEXITY DISCIPLINE
- **Implement the simplest correct solution.**
- Simple UI ≠ incomplete functionality. Every required feature is present, but without gratuitous layers.
- Do NOT build unrequested abstractions, extra settings tabs, redundant filters, or unnecessary popups.

---

## 29. LOCAL DATA ARCHITECTURE & FLOW
- **Zero Static / Fake Production Data:** UI components never render hardcoded dummy arrays.
- **Connected Architecture:**
  ```text
  React UI (Shared Component)
         ↓
  Domain Zustand Store (`src/stores/`)
         ↓
  Domain Service (`src/lib/services/`)
         ↓
  Local Authoritative SQLite DB (`src/data/localDb.ts`)
         ↓
  Atomic Write Bundle (`sync_queue`)
         ↓
  Cloud Sync Worker (`Supabase RPCs`)
  ```
- Reports and charts query local SQLite aggregations directly.

---

## 30. FINAL ACCEPTANCE CHECKLIST
Before considering any UI or frontend task complete, verify:
- [ ] Every page, tab, form, button, and popup functions properly.
- [ ] 100% of UI components are imported from `src/shared/ui/` and `src/shared/modules/`.
- [ ] Zero duplicate component code exists across routes.
- [ ] All data is queried from and persisted to local SQLite.
- [ ] Zero gradients, zero pastel icon tiles, and zero fluffy bubbly radiuses.
- [ ] High density is preserved: 13px text, 32px rows, hairline borders, single accent color.
- [ ] Keyboard navigation and shortcuts work smoothly.
- [ ] Type checking passes with 0 errors: `npx tsc --noEmit`.
- [ ] Automated test suite passes with 100% success: `npm test`.

---

## 31. CROSS ICONS, SELECT DROPDOWNS, PAGINATION & MODAL STANDARDS (MANDATORY)

To prevent visual regressions and ensure 100% uniformity across all screens:

### 31.1 Thumbnail & Asset Dismiss / Cross Buttons ("Red Cross Fix")
- **BANNED:** Never use standard `<Button>` components for image thumbnail or preview dismiss buttons (it creates stretched/tall rectangular red buttons).
- **STANDARD:** Always use a native, sleek circular 20px close badge:
  ```tsx
  <button
    type="button"
    onClick={onRemove}
    title="Remove"
    className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 bg-neutral-900/80 hover:bg-rose-600 text-white"
  >
    <X className="w-3 h-3 stroke-[2.5]" />
  </button>
  ```

### 31.2 Select Dropdowns & Dark Mode Theme Contrast
- **BANNED:** Never apply global CSS rules that force `background-color: white !important` on selects matching `bg-white` classes, which produces invisible white text on white boxes in dark mode.
- **STANDARD:** All `<Select>` and `<select>` elements must use:
  ```css
  bg-white dark:bg-surface text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/[0.08]
  ```
- Dropdown `<option>` elements must explicitly define background and text color to ensure WebKit / Chromium renders them cleanly:
  ```tsx
  <option className="bg-white dark:bg-[#18181b] text-neutral-900 dark:text-white" value="...">...</option>
  ```

### 31.3 Pagination & "Per Page" Selector Standard
- **Active Page Button:**
  - Standard: `bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-none border border-emerald-600` (Harsh pitch-black squares banned).
- **Inactive Page Buttons:**
  - `border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06]`
- **"Per Page" Selector:**
  - Right padding (`!pr-7`) must always accommodate the chevron icon without text overlap.
  - Sizing: `w-20 !h-7 !min-h-0 !text-[12px] !py-0 !pl-2.5 !pr-7 font-mono`
- **Total Counter Text:**
  - `text-[12px] font-medium text-neutral-600 dark:text-neutral-300 tabular-nums` (Clean sans font, not typewriter mono).

### 31.4 Modal & Popup Dialog Typography & Alignment
- **Modal Titles:** Always clean English Title Case (`"New Product"`, `"Edit Customer"`, `"Expense Details"`). Raw snake_case strings (`"register_new_product"`) are strictly banned.
- **Modal Close Button:** Prominent, high-contrast, comfortable clickable hit target:
  ```tsx
  <button
    onClick={onClose}
    title="Close (Esc)"
    className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.08] transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.1]"
  >
    <X className="w-4 h-4 stroke-[2.2]" />
  </button>
  ```
- **Form Field Labels:** High-contrast `text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1`. Never washed out `text-neutral-500` or tiny uppercase tracking that requires squinting.
- **No Tooltip Clutter:** Eliminate unnecessary `?` circle icons next to self-explanatory inputs. Reserve tooltips strictly for complex accounting fields.
- **Section Headers:** Clean hairline line divider:
  ```tsx
  <h3 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2">
    <span className="w-4 h-px bg-neutral-300 dark:bg-white/10"></span>
    Section Title
  </h3>
  ```

### 31.5 Category & Supplier Data Integrity
- Categories and suppliers are durable entities stored in local SQLite (`categories` and `suppliers` tables) and synchronized via cloud sync queue.
- **NEVER** derive categories or suppliers purely from `products.map(p => p.category)`. Deleting a product must NEVER delete or hide its category or supplier from the system.

---

## 32. 3D & RICH COLORED ICON SYSTEM (HEADER, SUB-TABS & FILTER CHIPS)
Monochromatic all-gray icons make complex workflows hard to navigate and cause eye fatigue ("faded look"). The application uses a tasteful, curated **Rich Colored Icon System**:

### 32.1 Header Navigation Color Palette
Each top-level domain has a persistent, dedicated vibrant color identity:
- **POS / Register:** `text-emerald-500` (Transaction & Cash flow)
- **Sales / Ledger:** `text-blue-500` (Invoices & Records)
- **Expenses / Outflow:** `text-amber-500` (Cash burn & Utilities)
- **Inventory / Catalog:** `text-indigo-500` (Stock & Variants)
- **Customers / CRM:** `text-cyan-500` (Customer directory & Receivables)
- **Discounts / Promos:** `text-rose-500` (Promotions & Coupons)
- **Reports & Analytics:** `text-teal-500` (BI & Metrics)
- **Suppliers / Vendor:** `text-orange-500` (Vendor network & Payables)
- **Users / Staff:** `text-sky-500` (Operator credentials & Roles)

### 32.2 Sub-Tabs Colored Identifiers
Sub-tab segmented controls in major modules (Inventory, Reports, Settings) apply distinct domain color accents to icons:
- **Inventory Sub-tabs:**
  - Products: `text-emerald-500`
  - History / Transactions: `text-blue-500`
  - Restock / Purchase Orders: `text-amber-500`
  - Bundles & Deals: `text-purple-500`
  - Category Groups: `text-indigo-500`
  - Media Library: `text-rose-500`
- **Reports Sub-tabs:**
  - Overview / Sales: `text-emerald-500`
  - Inventory: `text-blue-500`
  - Customers: `text-indigo-500`
  - Expenses: `text-amber-500`
  - Financial: `text-purple-500`
  - Salesmen: `text-cyan-500`
  - Suppliers: `text-rose-500`
- **Settings Sub-tabs:**
  - General Settings: `text-emerald-500`
  - Cloud Sync: `text-cyan-500`
  - Receipt Design: `text-blue-500`
  - Security & Account: `text-amber-500`
  - Backup & Restore: `text-purple-500`
  - How To Use Guide: `text-indigo-500`

### 32.3 Filter Chips & Dropdown Selects
Filter triggers above data tables (`SearchableSelect` / `DateRangePicker`) render colored icons and high-contrast labels:
- Label text: `text-neutral-700 dark:text-neutral-300 font-medium mr-0.5`
- Value text: `font-semibold text-neutral-900 dark:text-white`
- Icon: Passed via `iconColor` prop (`text-rose-500`, `text-blue-500`, `text-indigo-500`, `text-amber-500`, `text-emerald-500`, `text-purple-500`).

---

## 33. TYPOGRAPHY HIERARCHY & CONTRAST STANDARDS
To ensure maximum readability in both bright retail environments and dim terminal setups, adhere to this strict hierarchy:

| Element | Class Definition | Usage Rules |
|---|---|---|
| **Page / Dialog Title (H1/H2)** | `text-[15px] sm:text-[16px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]` | Primary header on screens and modal dialogues |
| **Section Header (H3)** | `text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider` | Form and matrix dividing headers |
| **Primary Numbers & Currency** | `text-2xl sm:text-3xl font-bold font-sans tabular-nums text-neutral-900 dark:text-white` | Net payable, revenue, total profit. **NEVER use `font-mono` on primary customer totals** to avoid dotted/slashed zeros |
| **Standard Body Text** | `text-[13px] font-medium text-neutral-900 dark:text-neutral-100` | Standard table cell text, list items, options |
| **Secondary / Sub-text** | `text-[12px] font-normal text-neutral-600 dark:text-neutral-300` | Explanations, timestamps, helper text (Must satisfy WCAG AA >= 4.5:1 ratio) |
| **Form Field Labels** | `text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1` | Input, select, and switch descriptors |
| **Codes, SKUs, Barcodes** | `font-mono text-[12px] text-neutral-800 dark:text-neutral-200 tabular-nums` | Technical identifiers, invoices, serial numbers |
| **Status Tags & Badges** | `text-[11px] font-medium px-2 py-0.5 rounded` | Pill status with icon and neutral text |

---

## 34. STRICT 2-COLOR ACTION BUTTON PALETTE
To maintain a cohesive, clean professional appearance with zero rainbow visual noise:

1. **Primary Action (Strictly 1 per view/modal):**
   - **Color:** Brand Emerald (`bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-none`).
   - **Usage:** "Save Product", "Process Payment", "Print Receipt", "Create User", "Apply Changes".
2. **Secondary Action:**
   - **Color:** Neutral Flat Surface (`bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.06] font-medium`).
   - **Usage:** "Cancel", "Close", "New Sale", "Share", "Back", "Choose Image".
3. **Destructive Action (Explicit Confirmation Required):**
   - **Color:** Subdued Rose (`text-rose-600 hover:bg-rose-500/10 border border-rose-500/20` or `bg-rose-600 text-white` for irreversible delete).
   - **Usage:** "Delete Product", "Void Sale", "Revoke Device".
4. **Banned Button Practices:**
   - Pitch-black buttons in light mode (`bg-neutral-900 text-white`).
   - Neon purple, magenta, or gradient buttons.
   - Multiple primary buttons competing on the same screen.

---

## 35. THERMAL RECEIPT PRINT PREVIEW & CONTAINMENT
Print checkout previews must look like actual paper receipts, properly framed and contained:
- **Modal Width:** For 80mm & 58mm thermal receipts, dialog width is strictly `maxWidth="sm"` (480px). Never use `maxWidth="lg"` or `"md"` which stretches the dialog into a cavernous empty void.
- **Viewport Containment:** The receipt container uses `max-h-[58vh] sm:max-h-[65vh] overflow-y-auto custom-scrollbar` with top alignment.
- **No Over-Zooming:** The receipt starts neatly at the top of the container with `py-2 sm:py-4`, preserving the store header, logo, and invoice metadata without clipping or forced 200% magnification.
- **Standard Action Bar:** Fixed footer containing "New Sale [ESC]", "Share [S]", and "Print Receipt [↵]" styled with the strict 2-color button hierarchy.

---

---

## 36. TACTILE 3D ICONS & HIERARCHICAL SIZING (OVERFLOW & SUB-TAB RULES)
To maintain visual clarity, hierarchy, and a physical tactile feel:
1. **Main Header Navigation Tabs:**
   - Standard capsule chip buttons remain compact: `h-8 max-h-8` (32px), `px-3 rounded-full`.
   - Prominent 3D icons: `size={32}` centered inside a dedicated `w-7 h-7 flex items-center justify-center overflow-visible` container.
   - Sits strictly before the label text without any overlapping or text collision (`gap-1.5` to `gap-2`).
2. **Sub-Tabs & POS Category Filter Chips (Reports, Settings, Inventory, POS Categories):**
   - Standard compact chips: `h-8 rounded-full text-[12px] px-3`.
   - Sub-tab icons are strictly smaller than the header tabs: compact `size={20}` (`RealIcon size={20}`) inside `shrink-0 flex items-center justify-center`.
   - Contained neatly inside the chip boundary without bulging or overflowing, preserving secondary visual weight.
3. **Settlement / Payment Method Tender Cards:**
   - Card container dimensions remain stable: `h-16 sm:h-[68px] rounded-xl border px-2 pb-2 pt-1 overflow-visible`.
   - Big tactile 3D payment icons (`size={46}`) positioned with `absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2`.
   - ONLY the 3D icons pop out and visibly overflow from the top border of the card with `drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]`.
   - Card grid applies `pt-3.5 sm:pt-4 gap-y-4` to ensure overflowing icons have ample clearance from labels and between multi-row wraps on mobile.
4. **Desktop Header Actions & Profile:**
   - Compact on mobile (`h-8.5`), comfortable on desktop (`h-9.5 md:h-10`).
   - Profile avatar: `w-7.5 h-7.5` to `w-8 h-8` with status dot cleanly anchored on the outer ring (`-bottom-0.5 -right-0.5`), NEVER clipped inside `overflow-hidden`.

---

## 37. 100% ZERO-REFRESH REACTIVE INVENTORY & FINANCES (AUTHORITATIVE SQLITE PARITY)
To guarantee seamless operation on native desktop (Mac DMG, Windows EXE) and mobile apps where browser refresh does not exist:
1. **Zero-Refresh Stock Reactivity:**
   - Whenever any sale, return, edit, restock, or adjustment commits to local SQLite, the exact affected products MUST be synchronously refreshed into Zustand `useProductsStore` via `productsService.getById(id)` in **0 milliseconds**.
   - NEVER read stale Dexie `localDb.products` cache when updating in-memory stores after a transaction.
   - Authoritative SQLite values must match in-memory Zustand stores 100% of the time without requiring a page refresh.
2. **Double-Commit Guard:**
   - `useActionGuard` protects all sales and payment actions from double-clicks while guaranteeing instant local state updates.

---

## 38. NATIVE APP MOBILE CARD ARCHITECTURE & ALIGNED TOOLBARS
To guarantee a true native mobile app feel across all smartphone and tablet screens (< lg):

1. **Strictly No Horizontal Table Scrolling on Mobile:**
   - Wide desktop `<table>` elements with horizontal scrollbars (`overflow-x-auto`) are **strictly prohibited** on mobile screens.
   - All management pages (Staff/Users, Customers, Suppliers, Expenses, Discounts, Salesmen, Transactions, Inventory) must provide dual layout:
     - `hidden lg:block`: Engineered high-density desktop data table.
     - `lg:hidden`: Native app-style responsive card grid / stack (`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5`).

2. **Mobile Card Anatomy (Native App Standard):**
   - **Card Container:** `p-3 sm:p-3.5 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col justify-between`.
   - **Card Header:** Primary identifier (Avatar / RealIcon + Title/Name + Subtitle/Code) on the left, with action buttons pinned to the top right (`shrink-0 flex items-center gap-1`).
   - **Card Metrics:** Compact key-value grid (`grid grid-cols-2 gap-2` or `grid grid-cols-3 gap-1.5`) with hairline dividers (`border-y border-neutral-100 dark:border-white/[0.04]`).
   - **Card Footer:** Border-top divider (`pt-2 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between`) displaying primary status badge, dates, or financial totals with `tabular-nums font-mono`.

3. **Universal Header Actions Right-Alignment:**
   - Header primary actions (`+ Add Customer`, `+ Add Supplier`, `+ Add Staff`, `+ Add Expense`, `+ Add Discount`, `Export`) must remain on the **same horizontal row as the title** (`flex items-center justify-between gap-2`).
   - Title container has `min-w-0` with `truncate` on headers.
   - Action buttons have `shrink-0`, ensuring they never wrap into an orphaned second row on the left.

4. **Balanced 2-Column Mobile Filter Grids:**
   - Filter dropdowns (`SearchableSelect`, `DateRangePicker`, `SegmentedControl`) must never stack into 7+ single-column vertical rows.
   - Mobile filters must be structured in pairs (`grid grid-cols-2 gap-2`), maintaining clean visual alignment without text clipping.

5. **Apple Dynamic Island Sonner Toast Architecture (Universal Centered Capsule):**
   - **Zero 1-Side Cutoff Guarantee:** Toaster container (`[data-sonner-toaster]`) must span `left: 0 !important; right: 0 !important; width: 100vw !important;` with `display: flex; flex-direction: column; align-items: center;`. This guarantees horizontal symmetry on both mobile and desktop.
   - **Full Text Visibility & Centering:** The toast element (`[data-sonner-toast]`) is `position: relative !important; margin: 0 auto !important; width: fit-content !important; min-width: 0 !important; max-width: min(calc(100vw - 28px), 760px) !important; justify-content: flex-start !important;` so text starts naturally from the left without flex-center overflow clipping on either side.
   - **Apple Island Aesthetics:** Dynamic capsule (`border-radius: 20px`), `background: rgba(10, 10, 12, 0.95)`, `backdrop-filter: blur(28px) saturate(200%)`, 1px border at `rgba(255, 255, 255, 0.16)`, subtle double inset shadow, and emerald/rose/amber glowing status icons.
   - **Typography & Wrapping (Zero Truncation):** Title & description text is `text-[13px] font-semibold tracking-[-0.015em] text-[#f8fafc]` with `white-space: normal !important; word-break: break-word !important; overflow: visible !important;`. The entire notification text is always 100% visible and never half-hidden or cut off with ellipses.
   - **Mobile Top Clearance:** Anchored at `top: max(env(safe-area-inset-top, 14px), 14px)` floating gracefully as a true native Dynamic Island.

6. **Payment Tender Cards Tactile Float & Zero-Touch Alignment:**
   - **Tactile Overflow Anchor:** 3D icons sit cleanly anchored higher up across the top border with `-top-3` (mobile) and `sm:-top-3.5` (desktop).
   - **Scale & Clearance:** Mobile icon size `size={42}`, desktop `size={50}`. Card height is `h-[70px] sm:h-[74px]`. This guarantees a generous ~16px of clear, visible breathing room between the bottom of the 3D icon and the top of the text label.
   - **Hover Float (No Text Collisions):** On hover/active, the icon floats UPWARDS with `group-hover:-translate-y-1 group-hover:scale-105`. It overflows elegantly ABOVE the card border rather than expanding downwards into the text.
   - **Mobile 2x2 Grid Spacing:** The grid container enforces `pt-4 sm:pt-4.5 gap-y-5 sm:gap-y-5 grid-cols-2 sm:grid-cols-4` so the second row's top icons never collide with the first row's bottom border. Text is pinned at the bottom with `pb-2.5 text-[12px] sm:text-[12.5px] font-bold`.

7. **Apple-Style Floating Cart Pill & Bottom Nav Clearance:**
   - The floating cart pill must strictly use Apple's glassmorphic floating capsule aesthetic:
     `h-[54px] px-3 rounded-[22px] bg-white/90 dark:bg-[#121214]/90 backdrop-blur-2xl backdrop-saturate-[180%] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_10px_30px_-4px_rgba(0,0,0,0.12)]`.
   - **Zero Overlap Clearance:** Must be placed strictly at `bottom-[calc(env(safe-area-inset-bottom,0px)+74px)]` so it floats with a clean 8px gap above `MobileBottomNav` (`h-[58px]` at bottom 8px) with **zero clipping, zero touching, and zero overlap**.
   - **Aligned Footprint:** Matches `MobileBottomNav` footprint with `left-3 right-3 max-w-md mx-auto`.
   - **Dynamic Visibility:** Rendered only when items exist (`appCart.length > 0`). Pitch-black styling in light mode is strictly banned.

8. **NATIVE CARD STYLE ALWAYS FOR MOBILE DOMAINS (MANDATORY):**
   - **Zero Desktop Tables on Mobile:** Under no circumstances may an HTML `<table>` with horizontal scrolling be rendered on mobile viewports (`< lg`).
   - Every view (Users/Staff, Customers, Suppliers, Expenses, Discounts, Salesmen, Transactions, Inventory) MUST ALWAYS render native card layouts on mobile (`lg:hidden`). All AI agents and engineers must enforce this rule without exception.

---

### FINAL DESIGN PRINCIPLE
**Precision > Decoration**  
**Function > Visual Noise**  
**Speed > Animation**  
**Real Data > Fake Data**  
**Simple Logic > Unnecessary Complexity**  
**Consistency > Novelty**  
**Professional POS > AI SaaS Template**
