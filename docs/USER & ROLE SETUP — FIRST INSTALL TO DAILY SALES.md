# USER & ROLE SETUP — COMPLETE ARCHITECTURE & IMPLEMENTATION GUIDE
> Local-First, Offline-First, P2P Replicated POS Architecture  
> Single Source of Truth for Store Setup, Device Pairing, User Roles & Daily Sales Operations.

---

## 📑 TABLE OF CONTENTS
1. [Store & Device Topography (Shop 1 vs Shop 2, Main PC vs Terminals)](#1-store--device-topography)
2. [First-Run Setup & Root Shop Initialization](#2-first-run-setup--root-shop-initialization)
3. [Multi-Terminal Device Pairing & Trust Architecture](#3-multi-terminal-device-pairing--trust-architecture)
4. [Daily Operational Flow (Privacy Login, Fast Lock & Shift Switching)](#4-daily-operational-flow)
5. [Data Clear, App Deletion & Reinstallation Security Model](#5-data-clear-app-deletion--reinstallation-security-model)
6. [Offline Cryptographic PIN Engine & Mobile LAN HTTP Reliability](#6-offline-cryptographic-pin-engine)
7. [User Roles, Permissions, Sale PIN Gate & Security Isolation](#7-user-roles-permissions--lifecycle-management)
8. [Sales Attribution: Salesman vs Cashier Split Architecture](#8-sales-attribution-salesman-vs-cashier-split-architecture)
9. [Mobile UI/UX Layout Standards & Anti-AI Rules](#9-mobile-uiux-layout-standards--anti-ai-rules)
10. [Event-Sourced P2P Synchronization & Ledger Chain](#10-event-sourced-p2p-synchronization--ledger-chain)
11. [Checkout PIN Gate & Settlement Security](#11-checkout-pin-gate--settlement-security)
12. [Summary: Key Principles Cheatsheet](#-summary-key-principles-cheatsheet)

---

## 1. STORE & DEVICE TOPOGRAPHY

### 1.1 Shop 1 (Dukan A) — Mesh Topography
```text
                  ┌─────────────────────────────────┐
                  │       SHOP 1 (Dukan A)          │
                  │   Unique Cryptographic SHOP_ID  │
                  └─────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  COUNTER 01      │    │  COUNTER 02      │    │  MOBILE TERMINAL │
│  (Primary PC)    │    │  (Secondary PC)  │    │  (Phone / Tab)   │
│  Root Admin Host │    │  Cashier Desk    │    │  Floor Salesman  │
│  is_root = 1     │    │  is_trusted = 1  │    │  is_trusted = 1  │
│  Real SQLite DB  │    │  Real SQLite DB  │    │  Wasm/Capacitor  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         ▲                        ▲                        ▲
         └──────── WebRTC P2P DataChannels Mesh ───────────┘
```

### 1.2 Shop 2 (Dukan B) — 100% Isolated / No Link
```text
┌─────────────────────────────────┐
│       SHOP 2 (Dukan B)          │  ◄── Complete Cryptographic Isolation
│   Different Unique SHOP_ID      │      (Different ECDSA Keys, Different Room)
└─────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  SHOP 2 COUNTER  │  ◄── Dukan 1 ke kisi terminal se connect nahi ho sakta.
│  Root Admin Host │      P2P discovery aur event payloads strictly reject hote hain.
└──────────────────┘
```

- **Shop 1 ≠ Shop 2:** Har dukan ka apna unique `SHOP_ID` hota hai jo first install par cryptographically generate hota hai.
- **Zero Cross-Talk:** WebRTC signaling aur P2P mesh network strictly `SHOP_ID` scoped hota hai. Dukan 2 ka koi bhi device Dukan 1 ka data na dekh sakta hai aur na hi connect ho sakta hai.

---

## 2. FIRST-RUN SETUP & ROOT SHOP INITIALIZATION

### 2.1 First Launch Detection
App start hone par local SQLite database check karta hai:
```sql
SELECT COUNT(*) FROM shops;
```
- **Agar count === 0:** Screen par clean **Side-by-Side Dual Tabs** display hoti hain:
  1. **Tab 1: `Join Existing Store`** (Secondary terminals ke liye).
  2. **Tab 2: `Create New Store`** (First-time shop setup / Root Owner ke liye).

### 2.2 Create New Store (Root Setup Flow)
Root device (Primary PC) par Shop Owner yeh data enter karta hai:
1. **Software License Key** — genuine 16-character key (`ZPOS-XXXX-XXXX-YYYY-YYYY`) generated via `tools/license-generator.html`.
2. **Store Name** (e.g. *Zaynahs Collection*)
3. **Store Currency** (e.g. *PKR, USD, SAR*)
4. **Admin Full Name & Username** (e.g. *Shoaib Admin*)
5. **Admin PIN (4-6 digits)** & Confirm PIN

### 2.3 Atomic Local SQLite Initialization
"Create Store" par click karne par system ek atomic SQLite transaction mein:
```text
1. SHOP_ID generate karta hai (UUIDv4)
2. Root DEVICE_ID generate karta hai (e.g., DEV-ROOT-XXXX)
3. Root Device ECDSA Keypair generate karta hai (Public/Private Keys)
4. Admin User record create karta hai (ROLE = ADMIN, ACTIVE = 1)
5. Admin PIN ko PBKDF2-SHA256 (100,000 iterations) + 16-byte random salt se hash karta hai
6. 24-Character Master Emergency Recovery Code generate karta hai (XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)
7. Recovery code ka salted PBKDF2 hash SQLite mein save karta hai
8. Root device ko `devices` table mein `is_root = 1, is_trusted = 1, is_revoked = 0` register karta hai
```

### 2.4 Master Emergency Recovery Code Rules
- **Purpose:** Emergency Admin PIN reset (agar Admin PIN bhool jaye ya 10 consecutive failed attempts par account lock ho jaye).
- **Plaintext Security:** Recovery code normal database ya P2P events mein **kabhi bhi plaintext save nahi hota**. Sirf salted cryptographic hash save hota hai.
- **Strict Authority:** Sirf Shop Owner (Root Admin) ke paas hota hai. Manager, Cashier, aur Salesman ko is code ka zero access hota hai.
- **Code Rotation:** Agar recovery code leak ho jaye, toh Admin **Settings ⚙️ ➔ Security ➔ Master Recovery Code** mein ja kar apna Admin PIN daal kar naya code generate/rotate kar sakta hai. Purana code instantly cancel ho jata hai.

---

## 3. MULTI-TERMINAL DEVICE PAIRING & TRUST ARCHITECTURE

### 3.1 Trust Architecture: Keypair + Admin Approval
> **Crucial Rule:** Shop Code ya Cashier PIN **device authorization nahi hai**. Device authorization **Device ECDSA Keypair + Admin Approval** se hoti hai.

```text
Step 1: New Terminal (Counter 2 ya Mobile) install hota hai.
        ↓
Step 2: Terminal par "Join Existing Store" select hota hai.
        ↓
Step 3: Terminal par 6-Digit Shop Pairing PIN enter hota hai ya Primary PC ka QR Code scan hota hai.
        ↓
Step 4: Primary PC (Admin) ki screen par Authorization Modal popup hota hai:
        "New Device Connection Request: Counter-02 (IP / Fingerprint). Approve?"
        ↓
Step 5: Admin "Approve Terminal" button click karta hai.
        ↓
Step 6: Primary PC device ko assign karta hai:
        - Unique DEVICE_ID (e.g., DEV-SEC-XXXX)
        - Device ECDSA Public Key SQLite `devices` table mein register karta hai (`is_trusted = 1, is_revoked = 0`)
        ↓
Step 7: Secondary Terminal apna Private Key local secure storage mein permanently save karta hai.
        ↓
Step 8: Snapshot Bootstrap over WebRTC DataChannel:
        Products, Categories, Users (Cashiers/Salesmen), Settings locally sync ho jate hain.
        ↓
Terminal ab "TRUSTED DEVICE" ban chuka hai.
```

### 3.2 Device Revocation, Lifecycle & Security Policy (Revoke Ke Baad Kia Hota Hai)
Admin jab kisi device (e.g. Counter 2 ya Staff Phone) ko **Revoke** karta hai:

1. **Device ke saath kia hota hai:**
   - **Instant Connection Drop:** Us device ka active WebRTC P2P DataChannel foran terminate ho jata hai (`getP2PMesh().disconnectPeer(deviceId)`).
   - **Data Access Blocked:** Us device se aane wala har WebRTC signal, presence handshake, aur sync event drop ho jata hai (`isDeviceAuthorized = false`).
   - **No POS Sync:** Woh terminal na nayi sales mesh network par bhej sakti hai aur na hi remote products ya inventory receive kar sakti hai.

2. **Revoked Record table mein rehna chahiye ya nahi:**
   - **Haan, record table mein "Revoked" status ke saath rehna zaroori hai:**
     - **Security Blocklist:** Agar woh revoked phone/PC dobara purani keys se connect karne ki koshish kare, system foran use pehchan kar block kar deta hai.
     - **Audit Trail:** Admin ko pata rehta hai ke kon sa device kab pair hua tha aur kab revoke kiya gaya.
   - **Admin Controls (Restore vs Delete):**
     - **"Restore" (Un-revoke):** Agar ghalti se revoke ho gaya ho ya temporary staff dubara join kare, Admin ek click se use wapis **Active** kar sakta hai.
     - **"Delete" (Forget Record):** Agar koi purana, broken ya duplicate terminal ho (jaise Counter 2 testing ke doraan teen dafa pair hua) aur Admin list saaf karna chahe, toh **Delete** button daba kar us record ko SQLite se permanently remove kar sakta hai.

---

## 4. DAILY OPERATIONAL FLOW (ROZANA KA ROUTINE)

### 4.1 Daily Login: Privacy-Preserving Staff Login (Username/Email + PIN)
Jab Counter 2 ya Mobile phone ek dafa Admin se approve ho jata hai:
- **Rozana subah app kholne par QR Code scan karne ki ZERO zaroorat hai.**
- **Rozana Admin approval lene ki ZERO zaroorat hai.**
- Device ke local SQLite / IndexedDB mein uska registered `DEVICE_ID` aur private key mojood hota hai.

#### 🛡️ Privacy & Confidentiality Standards (Zero Public Operator Listing):
Purane system mein login screen par tamam staff members ke cards (`[Shoaib] [ali]`) aur role badges (`[ADMIN]`) khulay aam display hote the, jo privacy aur security ke khilaf tha (counter par khara customer dekh sakta tha ke shop ka admin kon hai aur staff list kia hai).
- **Public List 100% Eliminated:** Login screen par koi bhi operator cards, staff names, ya admin badges display nahi hote.
- **Secure Credentials:** Operator apna **Username ya Email** enter karta hai aur apna **4-6 digit Security PIN** daalta hai.
- **Terminal Continuity (`pos_last_username`):** Terminal us specific hardware par last logged-in operator ka username safely remember rakhti hai taake rozana bar bar lambi email na likhni parhe, jabke kisi doosre shakhs ko baki tamam users ki list expose nahi hoti.
- **PIN-Only Quick Match:** Agar username field blank ho aur operator direct apna PIN enter kare, system registered active users ke cryptographic hashes se direct lookup karta hai.

```text
┌────────────────────────────────────────────────────────┐
│                      ZAYNAHS POS                       │
│           Secure Local Terminal Authentication         │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Username or Email                                    │
│   ┌────────────────────────────────────────────────┐   │
│   │ cashier1@zaynahs.com                           │   │
│   └────────────────────────────────────────────────┘   │
│                                                        │
│   Security PIN (4–6 Digits)                            │
│                     [ • • • • ]                        │
│                                                        │
│            [ 1 ]       [ 2 ]       [ 3 ]               │
│            [ 4 ]       [ 5 ]       [ 6 ]               │
│            [ 7 ]       [ 8 ]       [ 9 ]               │
│            [ C ]       [ 0 ]       [ ⌫ ]               │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │               UNLOCK TERMINAL                  │   │
│   └────────────────────────────────────────────────┘   │
│                                                        │
│       🔒 100% Local Cryptographic Verification         │
└────────────────────────────────────────────────────────┘
```
- Cashier apna 4-6 digit PIN enter karta hai.
- System `< 10ms` mein locally authenticate karta hai aur POS screen open ho jati hai.

### 4.2 Terminal Fast Lock & Shift Switching (`⌘L` / Lock Icon)
Busy counter shifts mein cashiers change hote hain:
1. Active cashier lock button dabata hai (ya `⌘L` shortcut).
2. Screen foran lock ho jati hai taake koi customer counter par chher-chhar na kar sake.
3. Agla cashier aakar apna PIN enter karta hai.
4. **Zero Reconnect Cost:** Screen lock hone par background WebRTC P2P DataChannels aur local SQLite connection drop nahi hote.

---

## 5. DATA CLEAR, APP DELETION & REINSTALLATION SECURITY MODEL

### 5.1 Agar Browser Data Clear Ho Jaye ya App Delete/Reinstall Ho:
```text
Browser Data Wipe / App Uninstall
        ↓
Local SQLite Database + Device Private Key Erased
        ↓
App Fresh State mein khulegi ("Join Existing Store")
        ↓
Security Check:
Device ke paas private key nahi hai, is liye yeh UNVERIFIED DEVICE ban chuki hai.
        ↓
1-Time Admin Approval (QR Scan / Pairing Code) Mandatory Again.
        ↓
Admin PC par approval request aati hai. Admin approve karega.
        ↓
Nayi keys generate honi aur database snapshot sync ho jaega.
        ↓
Cashier apna purana PIN daal kar foran login ho jaega.
```

### 5.2 Theft & Piracy Protection Guarantee
- Agar kisi chhor ya bahar ke bande ko aapki dukan ka **Shop Code** aur **Cashier PIN** pata bhi chal jaye, woh apne naye phone par app install karke **kabhi login nahi kar sakta**.
- Kyunki jab tak Shop Owner apne Main PC se us naye device ko **Approve** na kare, system kisi bhi unverified device ko data transfer nahi karta.

---

## 6. OFFLINE CRYPTOGRAPHIC PIN ENGINE

### 6.1 Cross-Platform Mobile HTTP Challenge & Pure-JS Fallback
- **Standard Behavior:** Modern web browsers (iOS Safari, Android Chrome) local network par HTTP origins (`http://192.168.43.166:5173/`) par `crypto.subtle` (Web Crypto API) ko disable kar dete hain.
- **Problem:** Agar Admin ne PC par 100,000 iterations wala PBKDF2 hash banaya tha, toh mobile phone par `crypto.subtle` na hone ki wajah se "Invalid PIN" ka error aata tha.
- **Engineered Solution (`src/lib/auth/pinCrypto.ts`):**
  - Integrated pure-JS **`@noble/hashes`** (`pbkdf2.js` + `sha2.js`).
  - Native `crypto.subtle` available ho (Desktop Tauri, HTTPS, Capacitor) toh hardware Web Crypto use hota hai.
  - Non-secure context (Mobile LAN HTTP) ho toh pure-JS PBKDF2 run hota hai (~175ms execution time).
  - Byte-for-byte exact hash match guaranteed on all platforms.

### 6.2 Progressive Lockout Protection
Brute-force PIN attacks ko rokne ke liye progressive lockout system active hai:
- **3 Failed Attempts:** Warning notification ("Incorrect PIN. 2 attempts remaining before temporary delay").
- **5 Consecutive Failed Attempts:** 30-second exponential backoff lockout timer.
- **10 Consecutive Failed Attempts:** Terminal permanently locked. Unlocking requires **Admin PIN** or **24-Character Master Emergency Recovery Code**.

---

## 7. USER ROLES, PERMISSIONS & LIFECYCLE MANAGEMENT

### 7.1 Built-in Role Hierarchy
1. **ADMIN:** Full system authority. Settings, licenses, user CRUD, device pairing/revocation, ledger, backups, audit logs.
2. **MANAGER:** Catalog management, stock adjustments, purchase orders, refunds, operational discounts, sales reports.
3. **CASHIER:** POS sales counter, payment collection, till opening/closing, receipt reprint, viewing own sales.
4. **SALESMAN:** Customer assistance, cart building, sales creation with commission/attribution tracking.

### 7.2 Granular Permissions Matrix
| Privilege Key | Feature / Action | Admin | Manager | Cashier | Salesman |
|---|---|---|---|---|---|
| `canEditPrice` | Price Override on POS Cart | ✅ Yes | ✅ Yes | ❌ Default Locked | ❌ No |
| `canGiveDiscount` | Line Item & Cart Discounts | ✅ Yes | ✅ Yes | ✅ Allowed | ❌ No |
| `canEditProduct` | Modify Product Catalog | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| `canEditSale` | Edit Completed Invoices | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| `canDeleteSale` | Void / Delete Sale | ✅ Yes | ❌ Locked | ❌ No | ❌ No |
| `canManageStock` | Stock Adjustments & Counts | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| `canManagePO` | Supplier Purchase Orders | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| `canViewRecords` | Sales History & Reports | ✅ Full | ✅ Full | ✅ Own Shift Only | ❌ No |
| `canViewProfit` | Margins & Net Profit | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| `requirePinOnSale` | Require PIN on Sale Save (Settlement) | ⚙️ Self-Only | ⚙️ Configurable | ⚙️ Configurable | ⚙️ Configurable |

### 7.3 Soft-Deletes Only (Zero Foreign Key Breakage)
- Users ko SQLite se kabhi bhi hard-delete nahi kiya jata.
- User deactivate karne par `active = 0` (`status = 'disabled'`) set hota hai.
- Is se historical sales, commissions, aur audit logs ka link permanent rehta hai.
- Deactivated user ka terminal login locally aur peer devices par foran revoke ho jata hai.

### 7.4 Require PIN on Sale Save (`requirePinOnSale`)
Busy retail counters par aksar cashiers counter chhor kar stock lane ya customer guide karne chale jate hain. Aise mein unattended terminal se koi doosra banda ya customer bill punch karke save na kar sake:
- **Operational Privilege Toggle:** Admin har staff member ke liye **"Require PIN on Sale Save"** toggle configure kar sakta hai (`Staff Management ➔ Edit User ➔ Operational Privileges`).
- **Database Architecture:** Local SQLite `users` table mein `require_pin_on_sale INTEGER DEFAULT 0` column store hota hai.
- **P2P Replication:** Yeh setting durable outbox events (`USER_CREATED`, `USER_UPDATED`) ke zariye tamam paired terminals par replicate hoti hai.
- **Settlement Interception:** Jab bhi yeh operator checkout par **"Process Payment"**, mobile **"SAVE"**, ya keyboard **[Enter]** dabata hai, system direct sale save karne ke bajaye **CheckoutPinVerifyModal** open karta hai. Operator jab tak apna valid 4-6 digit PIN verify nahi karega, sale database mein commit nahi hogi.

### 7.5 Admin-on-Admin Security Isolation (Peer Admin Protection)
Agar ek shop mein do ya teen Administrators hon (e.g. Shop Owner + Senior Director):
- **Problem (Privilege Escalation):** Agar ek Admin doosre Admin ka PIN badal sake ya us par sale restrictions laga sake, toh counter par peer admin lockout ya rogue takeover ho sakta hai.
- **Strict Architectural Security Guard:**
  1. **Peer Admin PIN Tamper-Proof:** Ek Admin kisi doosre Admin ka PIN **kabhi bhi dekh ya change nahi kar sakta**.
     - UI mein security alert banner display hota hai:  
       `🔒 Security Protected: Only this Administrator can modify their own PIN.`
     - PIN input fields disabled aur locked rehte hain.
  2. **Peer Admin Sale Gate Protected:** Ek Admin kisi doosre Admin ka `requirePinOnSale` toggle enable ya disable nahi kar sakta (setting disabled rehti hai).
  3. **Self-Modification Authority:** Logged-in Admin sirf aur sirf apna **zaati (own)** PIN aur apna **zaati** `requirePinOnSale` toggle tabdeel kar sakta hai.
  4. **Subordinate Authority:** Admin ko tamam non-admin staff members (**Managers, Cashiers, Salesmen**) ke PIN reset karne aur unki `requirePinOnSale` settings tabdeel karne ka 100% full ikhtiyar hota hai.
  5. **Backend Data Sanitization:** UI bypass ya script injection se bhi agar koi payload bheja jaye, system backend repository level par peer admin ke PIN aur operational flags ko reject kar deta hai.

### 7.6 Bill Edit, Differential Settlement & Wallet/Stock Lifecycle (`canEditSale`)
- **Authority Gate (`canEditSale`):** Sirf **Admin** aur **Manager** ko completed bills edit karne ki ijazat hoti hai. Cashier ya Salesman ke liye yeh action restricted rehta hai.
- **Original Payment Mode Restoration:** Jab bhi koi bill POS cart mein edit ke liye load hota hai aur checkout khulta hai, checkout settlement modal usi exact payment method aur split configuration (amounts & wallets) ko restore karta hai jis par bill originally save hua tha.
- **Append-Only Stock Ledger Differential:**
  1. Purane bill ke items `inventory_transactions` mein `INVENTORY_IN` event ke sath stock mein wapis return hote hain.
  2. Edited bill ke naye items `INVENTORY_OUT` event ke sath ledger se deduct hote hain.
  3. Jo item nikala gaya uska stock restore ho jata hai, aur jo naya add hua uska stock deduct ho jata hai. Authoritative stock hamesha ledger ke mathematically computed `SUM(quantity)` se update hota hai.
- **Wallet In/Out & Differential Math:**
  1. **Purani Payment Reversal:** Purane bill ki tamam payments (chahe Cash ho ya Split) respective wallets (`payment_modes`) se 100% minus hoti hain (`balance = balance - amount`). Purane records `payments` table se delete hote hain.
  2. **Nayi Payment Application:** Edited bill ki nayi payment settings (e.g. half online + half card ya naya wallet) `payments` table mein insert hoti hain aur unke balances add hote hain (`balance = balance + amount`).
  3. **Example:** Agar pehle Cash par Rs 500 ka bill save tha, phir edit karke bill Rs 300 ka kar diya gaya aur split (Online 150 + Card 150) choose kiya gaya, toh Cash wallet se pura Rs 500 minus hoga aur Online mein Rs 150 aur Card mein Rs 150 add hoga.
- **Audit & Watermark:** Edited bills par audit trace watermark `*** EDITED FROM INV #... ***` receipts, modal preview, aur notes mein permanently attach rehta hai.

---

## 8. SALES ATTRIBUTION: SALESMAN VS CASHIER SPLIT ARCHITECTURE

### 8.1 Dual Attribution Model
Retail aur fashion stores mein sales staff customer ko attend karta hai aur cashier counter par payment leta hai:
```text
Customer Enters Store
        ↓
Salesman Ahmed attends customer & adds items to Cart
        ↓
Salesman selects his name in POS: [ Salesman: Ahmed ]
        ↓
Sale transferred / sent to Checkout Till
        ↓
Cashier Ali receives cash/card payment
        ↓
Sale Finalized & Committed
```

### 8.2 Invoice Attribution Record
Every sale records full multi-dimensional attribution:
```text
Invoice #1042 Attribution:
- SALE_ID:       INV-2026-001042
- SALESMAN_ID:   USR-AHMED-01      (Sales commission credited here)
- CASHIER_ID:    USR-ALI-02        (Cash till drawer balanced here)
- USER_ID:       USR-ALI-02        (Current session actor)
- DEVICE_ID:     DEV-POS-COUNTER-1 (Hardware terminal)
- EVENT_ID:      EVT-SALE-XXXX     (P2P Outbox replication ID)
- TOTAL:         Rs 8,500
- CREATED_AT:    2026-09-15 14:30:00
```
- **Single Operator Flow:** Agar ek hi shakhs salesman bhi hai aur cashier bhi, system automatically set karta hai:
  `SALESMAN_ID = CASHIER_ID = USER_ID`. Zero duplicate entries.

---

## 9. MOBILE UI/UX LAYOUT STANDARDS & ANTI-AI RULES

### 9.1 Mobile Bottom Navigation (`MobileBottomNav.tsx`)
- **Strictly Icons Only on Mobile:** Mobile screen (`< 768px`) par bottom bar mein text labels bilkul nahi aate (sirf clean icons).
- **5-Column Grid (`grid-cols-5`):** Tamam action buttons (POS, Sales, Products, Customers, Menu) equal width aur perfectly centered hote hain.
- **Active Visual Feedback:** Active tab par subtle pill highlight (`bg-white/[0.08]`) aur centered green indicator dot (`w-1 h-1 rounded-full bg-emerald-500`) display hota hai.
- **Zero Cutoff:** Zero text truncation, zero label collision.

### 9.2 Mobile Wallet & Metric Cards (`TransactionHeaderCards.tsx`)
- Mobile viewports par cards 3-column compact grid (`grid-cols-3`) mein arrange hote hain.
- Negative margin overlaps (`-mt-5`) khatam kar ke standard spacing di gayi hai taake icons labels ke upar na chadhhein.
- High-contrast typography (`text-white`, `text-neutral-400`).

### 9.3 Main Container Padding (`AppContent.tsx`)
- Mobile screens par `<main>` container ko bottom padding `pb-16 md:pb-0` di gayi hai taake fixed mobile bottom navigation page ke aakhri buttons ya table rows ko obstruct na kare.

---

## 10. EVENT-SOURCED P2P SYNCHRONIZATION & LEDGER CHAIN

### 10.1 Append-Only Financial & Stock Ledger
- Local SQLite database har device ka single authoritative source of truth hai.
- Stock changes sirf append-only ledger events se hoti hain:
  `SALE` ➔ `INVENTORY_OUT` ➔ `PAYMENT_IN` ➔ `WALLET_TX` ➔ `LEDGER_TX`.
- **Zero Dropped Bills:** Agar do offline cashiers aakhri item ek hi waqt mein bech dein, dono sales commit hoti hain. Sync hone par ledger `Oversold` state calculate karta hai—kisi cashier ka bill drop nahi hota.

### 10.2 Outbox / Inbox Replication Lifecycle
```text
Local Mutation
      ↓
Atomic SQLite Transaction (< 10ms)
      ↓
Create Event in `sync_outbox`
      ↓
Background P2P Worker transmits over WebRTC DataChannel
      ↓
Peer verifies:
1. SHOP_ID matches
2. Device is trusted (is_revoked = 0)
3. Event deduplication (event_id exists check)
      ↓
Commit to Peer's Local SQLite Database
      ↓
Send ACK back to Sender
```

### 10.3 Device ID Isolation & Realtime Mesh Mechanics
P2P mesh replication ki 100% stability ke liye system mein teen foundational protections active hain:
1. **Hardware / Client Isolation (`localStorage` Priority):**
   - Har device apna unique identifier (`zpos_device_id`) browser/client-level isolated `localStorage` mein store karti hai.
   - Secondary terminal SQLite database reload ya sync hone par kabhi bhi Primary PC ka `PC-MAIN` ID inherit nahi karti, jis se dual-identity collision 100% prevent rehta hai.
2. **Early ICE Candidate Buffering:**
   - Signaling channel se aane wale ICE candidates agar WebRTC `OFFER` se pehle deliver ho jayein, toh system unhe `earlyCandidates` memory queue mein buffer karta hai aur session initialize hote hi drain kar deta hai. NAT traversal packet loss zero rehta hai.
3. **Instant Event Push on Commit (< 10ms):**
   - Har transaction commit (`commitLocalTransaction`) hone ke foran baad `pushPendingEventsToPeers()` execute hota hai. Cashier ki sale finalize hote hi tamamm online mesh terminals par real-time reflect ho jati hai.

---

## 11. CHECKOUT PIN GATE & SETTLEMENT SECURITY

### 11.1 Operational Challenge: Unattended Counter & Bill Tampering
Busy retail aur hospitality environments mein cash counters par multi-user challenges aate hain:
- Cashier receipt print karte waqt counter chhor kar customer ke bags pack karne chala jata hai.
- Unattended terminal par koi floor salesman ya customer aakar baghair authorization bill save kar sakta hai.
- Cash drawer balancing mein ghaltiyan aati hain agar ek cashier kisi doosre cashier ke account se bill punch kar de.

### 11.2 Checkout Settlement Interception Architecture (`CheckoutPinVerifyModal`)
Is maslay ke permanent hal ke liye system mein checkout settlement level par cryptographic PIN gate lagaya gaya hai:

```text
Cashier Builds Cart & Enters Settlement Modal
                    ↓
Cashier clicks "Process Payment" (Desktop) / "SAVE" (Mobile) / Presses [Enter]
                    ↓
System checks: `profile?.requirePinOnSale` === true?
         │
         ├── [NO / False] ───────────────────────────────────────────┐
         │                                                           ▼
         └── [YES / True]                               Direct SQLite Commit (< 10ms)
                    ↓                                                │
       Open `CheckoutPinVerifyModal`                                 ▼
                    ↓                                        Receipt Print & Outbox Sync
       Operator enters 4–6 Digit Security PIN
                    ↓
       `verifyUserPin(userId, pin)` executes local PBKDF2 verify
         │
         ├── [INVALID PIN] ──► Shake Animation + Red Error Banner
         │                     (Payment BLOCKED, Zero Database Writes)
         │
         └── [VALID PIN] ────► Authorization Success (< 10ms)
                                     ↓
                               Close Modal
                                     ↓
                               Commit Sale to SQLite
                                     ↓
                               Update Inventory & Ledger
                                     ↓
                               Broadcast P2P Outbox Event
                                     ↓
                               Display / Print Receipt
```

### 11.3 UI/UX Standards (Linear & Anti-AI Compliance)
- **Compact & High-Contrast:** Engineered modal layout with dark surface (`bg-surface`), 1px subtle hairline border (`border-white/[0.08]`), aur zero drop shadows.
- **Dual Input Modes:**
  - **Touch / Mouse Keypad:** 0–9 tactile buttons, `Clear` button, aur single-char `Backspace` icon.
  - **Hardware Keyboard Support:** Counter keyboards par `0-9` se digits add hote hain, `Backspace` se edit hota hai, `Enter` se submit, aur `Escape` se modal cancel ho jata hai.
- **PIN Dot Indicators:** Dynamic visual dots with active fill highlight (`bg-primary scale-110 shadow-primary/30`).
- **Cryptographic Security Guarantee:**
  - PIN plaintext form mein kabhi bhi outbox events, session logs, ya receipt metadata mein include nahi hota.
  - Verification local SQLite `users` table ke salted PBKDF2 hash ke against perform hoti hai (`verifyUserPin`).

---

## 12. PRODUCT EXPIRY TRACKING & PERMISSION GATE (`canViewExpiry`)

### 12.1 Universal Expiry Architecture
- **Configurable Presets:** Product add/edit form provides quick presets (+3 Months Default, +6 Months, +1 Year) and a custom date picker.
- **Alert Threshold Days:** Customizable warning threshold (default 30 days) stored locally in SQLite `products.expiry_alert_days`.
- **Granular Permission Control:** `canViewExpiry` field on `users` table:
  - Admins: 100% full access to view expiry dates, alerts, and badges.
  - Managers / Cashiers / Salesmen: Expiry badges and filters are only visible if the admin has explicitly enabled `canViewExpiry` for their user profile.

### 12.2 POS Cart Warnings & Inventory Filters
- **Cart Warning:** Adding an expired or expiring item triggers a prominent warning toast to the cashier before sale completion.
- **Inventory Filter Suite:** Rapid filtering by `All`, `Standard`, `Variable`, `Services`, `Serialized`, `Expiring Soon`, and `Expired`.
- **High-Contrast Badges:** Red badges for expired items (`Expired Xd ago`), Amber for items expiring within threshold (`Exp. in Xd`).

---

## 13. SALESMAN ATTRIBUTION LIFECYCLE & NEGATIVE STOCK

### 13.1 Salesman Attribution Chain
- **Checkout Attribution:** At checkout, cashier or dedicated salesman can be selected. Sales are recorded with both `cashier` and `salesmanId` / `salesmanName`.
- **Receipts & Sale Preview:** Both Cashier and Salesman are displayed on printed receipts (`SM: [Name]`) and the Sale Breakdown modal.
- **Edit & Resave Flow:** Editing a completed sale pre-selects the existing salesman. Any change or removal updates `/reports/salesmen` stats in real-time.
- **P2P Replication:** `salesman_name` and `customer_name` columns replicate over P2P outbox events with 100% field parity.

### 13.2 True Negative Stock Representation
- When inventory track is enabled and stock drops below zero (e.g., `-5` from offline concurrent sales or manual overselling), POS product cards explicitly display `-5` in bold `font-mono tabular-nums` red badge instead of the ambiguous generic `"NO STOCK"` text.

---

## 🏁 SUMMARY: KEY PRINCIPLES CHEATSHEET
1. **Pehli Dafa (Counter 1):** Create Shop ➔ License Key ➔ Admin PIN ➔ Master Recovery Code ➔ Ready.
2. **Pehli Dafa (Counter 2 / Mobile):** Join Store ➔ Pairing Code / QR ➔ Admin Approval ➔ Trusted.
3. **Rozana (Daily Operations):** App start ➔ Cashier PIN daalein ➔ Direct POS. No QR. No Approval.
4. **App Delete / Data Clear:** Unverified state ➔ 1-Time Admin Approval again ➔ Sync restored.
5. **Mobile Navigation:** Bottom menu displays **ONLY ICONS**, perfectly centered, no text cutoff.
6. **PIN Security:** Pure-JS `@noble/hashes` PBKDF2 ensures 100% login success even on LAN HTTP.
7. **Attribution:** Har sale par Salesman aur Cashier dono track hote hain.
8. **Privacy Login Screen:** Terminal lock screen par public operator cards aur admin badges 100% hidden rehte hain; username/email + PIN se private login hota hai.
9. **Checkout PIN Gate (`requirePinOnSale`):** Jis operator ka setting ON ho, woh bill finalized karne se pehle apna security PIN verify kiye baghair sale save nahi kar sakta.
10. **Admin-on-Admin Isolation:** Ek Admin doosre Admin ka PIN reset ya settings tamper nahi kar sakta; sirf apna modify kar sakta hai, jabke baqi non-admin staff (Managers, Cashiers, Salesmen) ko full manage kar sakta hai.
11. **Expiry Tracking (`canViewExpiry`):** Expiry dates, alert thresholds (+3m preset), aur POS warning toasts granular permission gate ke tehat operate karte hain.
12. **Barcode Engine Persistence:** Barcode generator ki tamam settings (sizes, columns, toggles, dimensions, zoom) locally persist hoti hain.
13. **Continuous P2P Sync Mandate:** Har new attribute local SQLite se outbox event aur peer DB handlers tak 100% synced rehti hai.