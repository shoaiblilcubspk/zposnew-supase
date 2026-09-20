# LAN & WAN P2P Guide — Zaynahs POS

> **To-the-Point Operational Guide for Same LAN (Offline) & Different LAN (Multi-Location) P2P Synchronization.**

---

## 📌 1. Quick Overview

| Scenario | Network Setup | Internet Needed? | Supabase Role | Data Speed |
|---|---|---|---|---|
| **Same LAN** | Same Wi-Fi Router / Switch / LAN Cable | **NO (100% Offline)** | None (Bypassed) | Sub-millisecond (< 1ms) |
| **Different LAN** | Different Shops, Home, Branch, Mobile Data | **YES (for handshake only)** | WebRTC Signaling Only | High Speed (Direct P2P) |

---

## 🏠 2. Same LAN (100% Offline — No Internet)

### How It Works
```text
[ PC 1 (Cashier) ] ◄─── (Local Wi-Fi / Switch) ───► [ PC 2 (Manager) ]
        ▲                                                    ▲
        └─────────────────── [ PC 3 (Kitchen / Store) ] ─────┘
                    (100% Direct LAN — Zero Internet)
```

1. **Discovery & Signaling:** Devices find each other on the local network via `LocalSignalingTransport` (Local LAN SSE Relay + BroadcastChannel).
2. **Data Transfer:** Direct WebRTC DataChannel connects using local IP addresses (`192.168.x.x` / `10.x.x.x`).
3. **Supabase Dependency:** **ZERO.** Even if the broadband cable is unplugged, sales, inventory, prints, and sync continue indefinitely.
4. **Bandwidth / Cost:** 0 cloud cost, 0 server egress, unmetered local throughput.

---

## 🌐 3. Different LAN (Multi-Branch / Home / Cloud WAN)

### How It Works
```text
[ Branch 1 (Shop) ]                                    [ Branch 2 (Warehouse) ]
        │                                                        │
        │──► 1. Handshake Signal (Supabase Realtime) ◄───────────│
        │    (Shop ID: `mesh-signaling:shop_123`)                │
        │                                                        │
        │◄══════════════════════════════════════════════════════►│
             2. Direct WebRTC P2P Highway (STUN / TURN)
             (All Sales, Items, Prices, Images Sync Here)
```

1. **Discovery (Handshake):**
   - Supabase Realtime channel `mesh-signaling:${shopId}` connects both devices.
   - Devices exchange lightweight WebRTC SDP Offer/Answer and ICE candidates.
2. **Connection Traversal (NAT & Firewalls):**
   - **STUN Server:** Discovers public IP addresses for standard home/office routers.
   - **TURN Server (`iceConfig.ts`):** Relays traffic automatically if strict/symmetric NAT or corporate firewalls block direct connection.
3. **Data Transfer:**
   - Once connected, **all business data** (sales, products, images, ledger) travels direct via WebRTC DataChannels.
   - **NO business data ever touches Supabase DB or Supabase Storage.**

---

## ⚡ 4. Core Synchronization Rules

| Domain | Rule | Behavior |
|---|---|---|
| **Catalog & Settings** | **Last Save Wins** | Evaluated via `safeTs(updatedAt)` timestamp. Highest timestamp wins across all LANs. |
| **Sales & Payments** | **Append-Only (No LWW)** | Sales from offline terminals never overwrite each other; both commit additively. |
| **Stock & Inventory** | **Immutable Ledger** | Calculated from `inventory_transactions`. Overselling is tracked, zero bills dropped. |
| **Images & Media** | **Chunked P2P + SHA-256** | Images sync chunk-by-chunk over DataChannels. Existing hash on receiver skips re-download. |
| **Outbox Durability** | **Guaranteed Delivery** | Unsynced events stay in `sync_outbox` (SQLite) and auto-replicate upon reconnect. |

---

## 🛠️ 5. Network Requirements & Ports

### Same LAN Requirements:
- All terminals connected to the same Wi-Fi router, Ethernet switch, or hotspot.
- Router setting **"AP Isolation" / "Client Isolation" must be disabled** so local devices can communicate with each other.
- Windows/Mac Firewall: Allow incoming connections for the POS application.

### Different LAN Requirements:
- Working internet connection on all locations during connection setup.
- WebRTC standard UDP ports allowed (handled automatically by standard routers).
- If on strict corporate/enterprise network, outbound HTTPS (port 443) and TURN (ports 3478 / 5349) must be open.

---

## 🔍 6. Quick Diagnostic Checklist

### If Devices Don't Connect on Same LAN:
1. **Check IP Subnet:** Ensure both devices have IPs in the same subnet (e.g. `192.168.1.X` and `192.168.1.Y`).
2. **Check Router AP Isolation:** In router admin settings, disable "AP Isolation" / "Guest Mode Isolation".
3. **Check OS Firewall:** Ensure local firewall (Windows Defender / macOS Firewall) is not blocking node/app ports.
4. **Ping Test:** Open Terminal/CMD on PC 1 and run `ping <PC 2 IP>`.

### If Devices Don't Connect on Different LAN:
1. **Check Internet:** Verify both locations can browse the internet.
2. **Check Supabase Keys:** Verify `.env.local` has valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Check Shop ID:** Both devices must belong to the exact same `shop_id`.
4. **Check Device Authorization:** Primary terminal must have approved the secondary device in **Settings → Devices**.
5. **Check TURN Relay:** If on mobile 4G/5G hotspot or strict ISP NAT, ensure TURN configuration in `src/lib/mesh/iceConfig.ts` is reachable.
