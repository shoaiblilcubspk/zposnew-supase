# 🚀 Zaynahs POS — System & Environment Setup Guide (Local-First P2P)

> Single source of truth for running, developing, and deploying Zaynahs POS under the **Local-First P2P** architecture.

---

## 1. System Overview

Zaynahs POS operates as an autonomous, local-first point of sale system.
- **Data Persistence:** Local SQLite database per device (zero cloud DB dependency for terminal transactions).
- **Multi-Device Mesh:** Devices communicate peer-to-peer over WebRTC data channels using append-only event logs.
- **Signaling Server:** Supabase Realtime is used solely for peer discovery and WebRTC handshake signaling. No business transactions or tables exist in the cloud.
- **Desktop Target:** Tauri (Rust + Native SQLite)
- **Mobile Target:** Capacitor (Android / iOS with Native SQLite Plugin)

---

## 2. Prerequisites & Environment Setup

### Required Tools
- **Node.js:** v18+ or v20+
- **npm:** v9+
- **Rust & Cargo:** (For desktop Tauri builds)
- **Android Studio / Xcode:** (For mobile Capacitor builds)

### Environment Variables (`.env.local`)
Only signaling credentials are required:

```env
# Supabase Realtime Signaling Only (No DB / No Storage)
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 3. Development Commands

### Local Web Development / Preview
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# TypeScript type verification
npx tsc --noEmit

# Production bundle build
npm run build
```

### Desktop Development (Tauri)
```bash
# Run desktop dev environment
npm run tauri dev

# Build desktop release (.exe / .dmg)
npm run tauri build
```

### Mobile Development (Capacitor)
```bash
# Sync web build to native containers
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```

---

## 4. First Launch & Admin Bootstrap Flow

When launching on a new machine / terminal for the first time:
1. **Initialize Local DB:** App detects clean state and creates SQLite tables and default settings automatically.
2. **Shop Setup:** Enter Store Name, Currency, Address, and Contact details.
3. **Master Recovery Code:** System generates a 24-character cryptographic recovery code for emergency offline admin PIN reset.
4. **Admin Account:** Set initial Admin PIN (hashed and salted locally in SQLite).
5. **Assign Device ID:** Primary device is registered as `PC-MAIN` or `TERMINAL-01`.

---

## 5. Adding Secondary Terminals (Pairing Flow)

1. On the primary device (Admin), open **Settings → Device Mesh → Pair New Device**.
2. A secure pairing QR code containing a short-lived handshake token is displayed.
3. On the new device, select **"Join Existing Shop"** and scan the QR code.
4. Devices establish a WebRTC connection via Supabase Realtime signaling.
5. Primary device sends initial full snapshot of master records (products, customers, settings, current inventory balance).
6. Once checksum is verified, the secondary device is assigned a unique `DEVICE_ID` and begins autonomous operation.

---

## 6. Daily Operations & Verification Checklist

- **Bill Commit Speed:** Every completed sale commits to local SQLite in `< 10ms`.
- **Offline Reliability:** Turn off Wi-Fi/Internet; POS continues billing, receipt printing, and customer ledger management without interruption.
- **P2P Sync:** Reconnect network; outbox events are dispatched to online peers and acknowledged automatically.
- **Daily Backup:** Automated or manual export of encrypted SQLite snapshot (`POS-YYYY-MM-DD.backup`) to external drive or storage.
