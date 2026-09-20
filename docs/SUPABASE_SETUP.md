# Supabase Setup Guide: 100% Automated API Provisioning (ap-south-1)

> **Core Mandate:** ZERO MANUAL DASHBOARD ACTIONS. The AI agent and automated provisioning script (`scripts/setup-supabase.mjs`) configure everything via the Supabase Management API using `SUPABASE_MGMT_API_KEY` from `.env.local`.  
> **Architectural Role:** Supabase is strictly used for (1) **WebRTC P2P mesh signaling** (presence & handshake) and (2) **Automated Encrypted SQLite Backups** (`pos-backups` private bucket). Zero business data is ever saved to Supabase PostgreSQL.

---

## 1. 1-Command Automated Provisioning

Whenever setting up on a new clone or environment, simply have `SUPABASE_MGMT_API_KEY=sbp_...` in `.env.local` and run:

```bash
node scripts/setup-supabase.mjs
```

### What the Automated Script Does Automatically:
1. **Checks or Creates Project:** Creates a project in `ap-south-1` (Mumbai, India) if `SUPABASE_REF` is not set.
2. **Retrieves Keys:** Fetches `anon` and `service_role` keys via the Supabase Management API.
3. **Configures `.env.local`:** Automatically writes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. **Provisions Storage Bucket:** Creates the private `pos-backups` bucket (50MB limit, `.zpos` / JSON mime types).
5. **Applies Storage Policies:** Executes SQL via the Management API to allow authenticated and anon backup upload/read/update/delete.

---

## 2. Infrastructure Specifications

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Region** | `ap-south-1` (Mumbai, India) | Lowest latency for South Asia (< 35ms signaling) |
| **Pricing Tier** | Free Tier ($0/mo) | 100% compliant with Free Tier limits |
| **Storage Bucket** | `pos-backups` (Private) | Stores daily/weekly/monthly encrypted `.zpos` snapshots |
| **Realtime Policy** | Signaling Only | Table `postgres_changes` is 100% **OFF** |

---

## 3. Storage Bucket Configuration (`pos-backups`)

Created automatically by `scripts/setup-supabase.mjs`.

* **Bucket ID:** `pos-backups`
* **Public:** `false` (Private bucket)
* **File Size Limit:** 52,428,800 bytes (50MB)
* **Allowed MIME Types:** `['application/json', 'application/octet-stream']`
* **Policies:**
  - `Allow Anon Upload Backups`: `INSERT` for `anon, authenticated`
  - `Allow Anon Read Backups`: `SELECT` for `anon, authenticated`
  - `Allow Anon Update Backups`: `UPDATE` for `anon, authenticated`
  - `Allow Anon Delete Backups`: `DELETE` for `anon, authenticated`

---

## 4. Realtime Signaling Configuration (Zero Database Realtime)

To guarantee that Supabase Realtime stays 100% within free-tier limits:

1. **Table Changes (postgres_changes):** Keep **100% DISABLED**.
   * Do NOT add any tables to `supabase_realtime` publication.
2. **Broadcast & Presence:** Enabled on client channels:
   ```ts
   // Realtime is used strictly for WebRTC SDP & ICE exchange
   const channel = supabase.channel(`p2p_mesh_${shopId}`, {
     config: { broadcast: { self: false }, presence: { key: deviceId } }
   });
   ```

---

## 5. Automated Cloud Backup Feature Workflow

1. **Root Admin Settings:**
   * Go to **Settings → Backup & Restore**.
   * Under **Automated Cloud Backup (Supabase)**, toggle to **Enabled**.
   * Choose Frequency: **Daily** (default) | **Weekly** | **Monthly**.
2. **Execution:**
   * The app checks the last backup timestamp against the chosen frequency.
   * If due, it creates an AES-256 encrypted SQLite database snapshot (`.zpos`).
   * Uploads file to `pos-backups/shop_<shopId>/backup_<timestamp>.zpos`.
   * Only lightweight SQLite data is uploaded (zero heavy image files).
3. **Manual Trigger:**
   * Root Admin can click **"Backup to Cloud Now"** at any time to verify upload.
