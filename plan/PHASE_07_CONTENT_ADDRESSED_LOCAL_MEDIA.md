# Phase 07: Content-Addressed Local Media & P2P Image Transfer

> **Reference:** `AGENTS.md` & `GEMINI.md`  
> **Mandate:** Zero Cloud Storage. Images stored in local filesystem ($APPDATA/images/) and replicated in chunks over WebRTC DataChannels with SHA-256 deduplication.

---

## 1. Objectives & Scope

Implement a local, content-addressed media pipeline. Images for products, categories, and receipts are stored on the local OS disk and synchronized peer-to-peer using chunked binary WebRTC data channels. Zero cloud storage or database bandwidth is consumed.

---

## 2. Storage Hierarchy & Content Addressing

```text
Product Image Selected via MediaLibrary
                  ↓
WebP Compression (20-50KB Target)
                  ↓
Calculate SHA-256 Hash (e.g. 7f83b165...)
                  ↓
Write Binary to Local Storage:
  • Desktop (Tauri): $APPDATA/images/7f83b165....webp
  • Browser Dev: IndexedDB Blob Store ('zaynahs_media_blobs')
                  ↓
Record Metadata in Local SQLite:
  INSERT INTO product_images (product_id, image_hash, local_path, mime_type, file_size)
  VALUES (?, '7f83b165...', 'images/7f83b165....webp', 'image/webp', 32410);
```

---

## 3. P2P Binary Chunking Protocol

```text
Terminal A (Has Image)                     Terminal B (Needs Image)
       │                                              │
       │ 1. Event Replicated: Product has Image       │
       │    image_hash: 7f83b165...                   │
       │─────────────────────────────────────────────►│
       │                                              │
       │                                     2. Check Local Disk:
       │                                        Does 7f83b165... exist?
       │                                        [ No: Request Image ]
       │                                              │
       │◄───────── 3. REQUEST_IMAGE(hash) ────────────│
       │                                              │
       │ 4. Read Local File & Split into 16KB Chunks  │
       │                                              │
       │ 5. Send MSG_HEADER (hash, total_bytes, chunks)
       │─────────────────────────────────────────────►│
       │                                              │
       │ 6. Send Binary Chunks [Chunk 1, 2, ... N]    │
       │═════════════════════════════════════════════►│
       │                                              │
       │                                     7. Reconstruct File
       │                                        Compute SHA-256
       │                                        Verify Checksum matches
       │                                        Save to $APPDATA/images/
       │                                              │
       │◄──────── 8. SEND_IMAGE_ACK(hash) ────────────│
```

---

## 4. Deduplication & Zero-Waste Rules

1. **Content-Addressed Deduplication:** Because file names match the SHA-256 hash, identical images across products or categories are stored only once on disk.
2. **Transfer Avoidance:** If a peer already has an image with the given hash, transfer is skipped entirely (`IMAGE_EXISTS`).
3. **No Base64 Blobs in SQLite:** Binary image blobs are NEVER stored directly in SQLite tables. SQLite stores only metadata and local file paths.

---

## 5. Verification & Acceptance Criteria

- [ ] Product images are saved in native OS app data directory (`$APPDATA/images/`).
- [ ] No image uploads are made to Supabase Storage or external cloud buckets.
- [ ] Images transfer between terminals in 16KB chunks over WebRTC.
- [ ] Reconstructed images verify SHA-256 checksum integrity.
- [ ] Already existing images are not re-transferred across the network.
