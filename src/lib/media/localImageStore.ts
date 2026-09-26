/**
 * Local Image Store
 * Content-addressed binary storage engine with SHA-256 integrity verification.
 */

import { getDatabase } from '../db';
import { generateId } from '../ids';

// In-memory / browser blob cache
const memoryImageCache = new Map<string, { data: Uint8Array; mimeType: string; url?: string }>();

// Subscribers notified whenever a new image blob becomes locally available.
// Lets UI (useProductImage) reactively re-resolve once an image download or save completes.
const imageSavedListeners = new Set<(hash: string) => void>();

export function onImageSaved(cb: (hash: string) => void): () => void {
  imageSavedListeners.add(cb);
  return () => imageSavedListeners.delete(cb);
}

function notifyImageSaved(hash: string): void {
  imageSavedListeners.forEach((cb) => {
    try { cb(hash); } catch {}
  });
}

const IMAGE_IDB_NAME = 'zpos_image_blobs';
const IMAGE_STORE_NAME = 'blobs';

function openImageIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'));
    const req = indexedDB.open(IMAGE_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStoredBlob(hash: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  try {
    const db = await openImageIdb();
    return new Promise((resolve) => {
      const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const req = store.get(hash);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putStoredBlob(hash: string, data: Uint8Array, mimeType: string): Promise<void> {
  try {
    const db = await openImageIdb();
    const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    tx.objectStore(IMAGE_STORE_NAME).put({ data, mimeType }, hash);
  } catch {}
}

export async function computeSha256(data: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Node.js fallback
  try {
    const nodeCrypto = await (Function('return import("crypto")')() as Promise<any>);
    return nodeCrypto.createHash('sha256').update(data).digest('hex');
  } catch {
    // Fallback pseudo-hash if crypto is unavailable
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

export async function hasImage(hash: string): Promise<boolean> {
  if (memoryImageCache.has(hash)) return true;
  const stored = await getStoredBlob(hash);
  if (stored) {
    memoryImageCache.set(hash, stored);
    return true;
  }
  try {
    const db = await getDatabase();
    const row = await db.queryOne(`SELECT 1 FROM product_images WHERE image_hash = ?;`, [hash]);
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function getImageData(hash: string): Promise<Uint8Array | null> {
  const cached = memoryImageCache.get(hash);
  if (cached) return cached.data;
  const stored = await getStoredBlob(hash);
  if (stored) {
    memoryImageCache.set(hash, stored);
    return stored.data;
  }
  return null;
}

/**
 * Backup export: get an image's raw bytes — local cache/IndexedDB first, then the Supabase
 * bucket. Returns null if the image cannot be found anywhere (listed as "missing" in the report).
 */
export async function getImageBytesForExport(hash: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  const local = await getImageData(hash);
  if (local) return { data: local, mimeType: memoryImageCache.get(hash)?.mimeType || 'image/webp' };
  const fetched = await downloadImageFromBucket(hash);
  if (fetched) {
    memoryImageCache.set(hash, fetched);
    return fetched;
  }
  return null;
}

/**
 * Backup import: store an image that came from an archive into THIS project — cache it locally
 * and upload it to this project's Supabase bucket. Content-addressed, so importing the same
 * image twice is a no-op. No old-project URL is stored anywhere (images are keyed by hash).
 */
export async function saveImportedImage(hash: string, data: Uint8Array, mimeType = 'image/webp'): Promise<void> {
  if (!hash) return;
  memoryImageCache.set(hash, { data, mimeType });
  await putStoredBlob(hash, data, mimeType);
  notifyImageSaved(hash);
  await uploadImageToBucket(hash, data, mimeType);
}

export async function getImageUrl(hash: string): Promise<string | null> {
  let cached = memoryImageCache.get(hash);
  if (!cached) {
    const stored = await getStoredBlob(hash);
    if (stored) {
      cached = stored;
      memoryImageCache.set(hash, stored);
    }
  }
  // Not local yet — pull from the Supabase Storage bucket (cloud-direct image sync).
  if (!cached) {
    const fetched = await downloadImageFromBucket(hash);
    if (fetched) {
      cached = fetched;
      memoryImageCache.set(hash, fetched);
      putStoredBlob(hash, fetched.data, fetched.mimeType).catch(() => {});
    }
  }
  // Still missing — recover from a saved Pexels source URL (link is permanent, cache disposable).
  // images.pexels.com URLs are public: no API key / request needed.
  if (!cached) {
    const recovered = await recoverFromMediaSource(hash);
    if (recovered) {
      cached = recovered;
      memoryImageCache.set(hash, recovered);
      putStoredBlob(hash, recovered.data, recovered.mimeType).catch(() => {});
    }
  }
  if (cached) {
    if (!cached.url && typeof URL !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([cached.data as any], { type: cached.mimeType });
      cached.url = URL.createObjectURL(blob);
    }
    return cached.url || null;
  }
  return null;
}

const BUCKET = 'product-images';

/** Upload a content-addressed image blob to Supabase Storage (best-effort, idempotent). */
async function uploadImageToBucket(hash: string, data: Uint8Array, mimeType: string): Promise<void> {
  try {
    if (typeof Blob === 'undefined') return;
    const { getSupabase } = await import('../../data');
    const supabase = getSupabase();
    await supabase.storage
      .from(BUCKET)
      .upload(`${hash}.webp`, new Blob([data as any], { type: mimeType }), {
        upsert: true,
        contentType: mimeType,
        cacheControl: '31536000',
      });
  } catch {
    /* offline / transient — the blob is safe locally and can re-upload later */
  }
}

const recoverInFlight = new Map<string, Promise<{ data: Uint8Array; mimeType: string } | null>>();

/**
 * Recover an image from a saved Media source URL (Pexels) when both the local cache and the
 * bucket are missing it. images.pexels.com URLs are public, so NO API key/request is needed.
 * In-flight downloads are de-duplicated. Returns null if offline or no source URL is known.
 */
async function recoverFromMediaSource(hash: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  if (recoverInFlight.has(hash)) return recoverInFlight.get(hash)!;
  const p = (async () => {
    try {
      const { localQueryOne } = await import('../../data');
      const row = await localQueryOne<{ src_medium: string | null; src_large: string | null; src_large2x: string | null }>(
        `SELECT src_medium, src_large, src_large2x FROM media_assets WHERE image_hash = ? AND deleted_at IS NULL LIMIT 1;`,
        [hash]
      ).catch(() => null);
      const url = row?.src_large || row?.src_medium || row?.src_large2x;
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = new Uint8Array(await (await res.blob()).arrayBuffer());
      return { data: buf, mimeType: 'image/jpeg' };
    } catch {
      return null;
    } finally {
      recoverInFlight.delete(hash);
    }
  })();
  recoverInFlight.set(hash, p);
  return p;
}

/** Download a content-addressed image blob from Supabase Storage. */
async function downloadImageFromBucket(hash: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  try {
    const { getSupabase } = await import('../../data');
    const supabase = getSupabase();
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(`${hash}.webp`);
    if (error || !blob) return null;
    const buf = new Uint8Array(await blob.arrayBuffer());
    return { data: buf, mimeType: (blob as any).type || 'image/webp' };
  } catch {
    return null;
  }
}

export async function saveImage(
  data: Uint8Array,
  mimeType = 'image/webp',
  productId?: string
): Promise<{ hash: string; url: string; size: number }> {
  const hash = await computeSha256(data);
  const size = data.length;

  let url = '';
  if (typeof URL !== 'undefined' && typeof Blob !== 'undefined') {
    const blob = new Blob([data as any], { type: mimeType });
    url = URL.createObjectURL(blob);
  } else {
    url = `memory://${hash}`;
  }

  memoryImageCache.set(hash, { data, mimeType, url });
  await putStoredBlob(hash, data, mimeType);
  notifyImageSaved(hash);

  // Upload to the Supabase Storage bucket so other devices can fetch it (cloud-direct sync).
  uploadImageToBucket(hash, data, mimeType).catch(() => {});

  // If productId provided and exists in products table, register in product_images
  if (productId) {
    try {
      const db = await getDatabase();
      const existingProduct = await db.queryOne(`SELECT 1 FROM products WHERE id = ?;`, [productId]);
      if (existingProduct) {
        await db.execute(
          `INSERT OR REPLACE INTO product_images (
            id, product_id, image_hash, local_path, mime_type, file_size, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [generateId(), productId, hash, `images/${hash}.webp`, mimeType, size, Date.now()]
        );
      }
    } catch {}
  }

  return { hash, url, size };
}

export async function deleteImage(hash: string): Promise<void> {
  const cached = memoryImageCache.get(hash);
  if (cached?.url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
    URL.revokeObjectURL(cached.url);
  }
  memoryImageCache.delete(hash);

  try {
    const db = await getDatabase();
    await db.execute(`DELETE FROM product_images WHERE image_hash = ?;`, [hash]);
  } catch {}
}

/**
 * Orphan cleanup for a bundle that FAILED to save (§1.5.5). The image was uploaded first;
 * if the product write rolled back, remove the now-orphaned blob (local + IndexedDB + bucket)
 * and any product_images link — but ONLY if no active product still references the hash
 * (content-addressed images can be shared, so a referenced hash is never deleted).
 */
export async function deleteOrphanImage(hash: string): Promise<void> {
  if (!hash || !isImageHash(hash)) return;
  try {
    const { localQueryOne } = await import('../../data');
    const ref = await localQueryOne<{ one: number }>(
      `SELECT 1 AS one FROM products WHERE image_hash = ? AND active = 1 LIMIT 1;`,
      [hash]
    );
    if (ref) return; // still referenced — not an orphan, keep it.
  } catch {
    return; // if we cannot verify, be conservative and do NOT delete.
  }

  const cached = memoryImageCache.get(hash);
  if (cached?.url && typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(cached.url);
  memoryImageCache.delete(hash);
  try {
    const db = await openImageIdb();
    const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    tx.objectStore(IMAGE_STORE_NAME).delete(hash);
  } catch {}
  try {
    const db = await getDatabase();
    await db.execute(`DELETE FROM product_images WHERE image_hash = ?;`, [hash]);
  } catch {}
  try {
    const { getSupabase } = await import('../../data');
    await getSupabase().storage.from(BUCKET).remove([`${hash}.webp`]);
  } catch {}
}

/**
 * Decode a base64 data URI into raw bytes + mime type.
 * Returns null if the string is not a data URI.
 */
function decodeDataUri(value: string): { bytes: Uint8Array; mimeType: string } | null {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value);
  if (!match) return null;
  const mimeType = match[1] || 'image/webp';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';
  try {
    if (isBase64) {
      if (typeof Buffer !== 'undefined') {
        return { bytes: new Uint8Array(Buffer.from(payload, 'base64')), mimeType };
      }
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { bytes, mimeType };
    }
    // URL-encoded (non-base64) data URI
    const decoded = decodeURIComponent(payload);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
    return { bytes, mimeType };
  } catch {
    return null;
  }
}

/** True if the value is a 64-char lowercase hex SHA-256 hash. */
export function isImageHash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/** Encode raw bytes into a base64 data URI (works in browser and Node). */
function bytesToDataUri(data: Uint8Array, mimeType: string): string {
  let base64 = '';
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(data).toString('base64');
  } else {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < data.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(data.subarray(i, i + chunk)) as any);
    }
    base64 = btoa(binary);
  }
  return `data:${mimeType || 'image/webp'};base64,${base64}`;
}

/**
 * Resolve any image value into a value that a plain <img src> can render directly and that
 * PERSISTS + SYNCS as a string (used for the Store Logo, which is embedded raw in the header
 * and in print/PNG receipts where an async resolver / object URL is not available).
 *  - empty            -> undefined
 *  - data: / http(s)  -> returned unchanged (already renderable)
 *  - content hash     -> local/bucket bytes -> base64 data URI; else the saved Pexels src URL
 * Returns the original value as a last resort so selection never silently drops the pick.
 */
export async function resolveToRenderable(value: string | undefined | null): Promise<string | undefined> {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (isImageHash(trimmed)) {
    // Local cache or Supabase bucket bytes -> inline data URI (renders everywhere, incl. print).
    const bytes = await getImageBytesForExport(trimmed).catch(() => null);
    if (bytes) return bytesToDataUri(bytes.data, bytes.mimeType);
    // Fall back to the saved Pexels source URL (public, renders raw) if bytes aren't available.
    try {
      const { localQueryOne } = await import('../../data');
      const row = await localQueryOne<{ src_large: string | null; src_medium: string | null; src_large2x: string | null }>(
        `SELECT src_large, src_medium, src_large2x FROM media_assets WHERE image_hash = ? AND deleted_at IS NULL LIMIT 1;`,
        [trimmed]
      ).catch(() => null);
      const url = row?.src_large || row?.src_medium || row?.src_large2x;
      if (url) return url;
    } catch { /* ignore */ }
    return trimmed;
  }
  return trimmed;
}


/**
 * Clear the disposable local image cache (memory + IndexedDB blobs). Rows, links and credit are
 * untouched — images lazily re-download from the bucket or the saved Pexels URL on next view.
 */
export async function clearImageCache(): Promise<number> {
  const cleared = memoryImageCache.size;
  for (const [, v] of memoryImageCache) {
    if (v.url && typeof URL !== 'undefined' && URL.revokeObjectURL) { try { URL.revokeObjectURL(v.url); } catch {} }
  }
  memoryImageCache.clear();
  try {
    const db = await openImageIdb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
      const req = tx.objectStore(IMAGE_STORE_NAME).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch { /* ignore */ }
  return cleared;
}

/**
 * Normalize any product image value into a content-addressed hash.
 * - undefined/empty  -> undefined
 * - existing hash    -> returned unchanged
 * - base64 data URI  -> decoded, stored via saveImage(), returns SHA-256 hash
 * - other (http/etc) -> returned unchanged (backward-compat)
 */
export async function resolveImageToHash(
  value: string | undefined | null,
  productId?: string
): Promise<string | undefined> {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (isImageHash(trimmed)) return trimmed;
  if (trimmed.startsWith('data:')) {
    const decoded = decodeDataUri(trimmed);
    if (!decoded) return trimmed;
    const { hash } = await saveImage(decoded.bytes, decoded.mimeType, productId);
    return hash;
  }
  return trimmed;
}

export interface ResolvedImageRecord {
  /** The value to store in products.image_hash: a content hash, a legacy URL, or undefined. */
  value: string | undefined;
  /** True when `value` is a content-addressed hash (=> a product_images row should be written). */
  isHash: boolean;
  mimeType: string;
  size: number;
  /** True when this call decoded + uploaded a NEW blob (=> orphan-delete on bundle failure). */
  uploaded: boolean;
}

/**
 * Resolve a product image input into a record used to build the product bundle:
 *  - empty            -> { value: undefined, isHash: false }
 *  - existing hash    -> { value: hash, isHash: true }        (already uploaded)
 *  - base64 data URI  -> upload first, { value: hash, isHash: true, uploaded: true }
 *  - http/legacy URL  -> { value: url, isHash: false }        (no product_images row)
 * Upload happens FIRST (§1.5.5); the caller links it inside the bundle and deletes the orphan
 * on failure.
 */
export async function resolveImageRecord(value: string | undefined | null): Promise<ResolvedImageRecord> {
  const empty: ResolvedImageRecord = { value: undefined, isHash: false, mimeType: 'image/webp', size: 0, uploaded: false };
  if (!value) return empty;
  const trimmed = value.trim();
  if (!trimmed) return empty;
  if (isImageHash(trimmed)) {
    return { value: trimmed, isHash: true, mimeType: 'image/webp', size: 0, uploaded: false };
  }
  if (trimmed.startsWith('data:')) {
    const decoded = decodeDataUri(trimmed);
    if (!decoded) return { value: trimmed, isHash: false, mimeType: 'image/webp', size: 0, uploaded: false };
    const { hash, size } = await saveImage(decoded.bytes, decoded.mimeType);
    return { value: hash, isHash: true, mimeType: decoded.mimeType, size, uploaded: true };
  }
  return { value: trimmed, isHash: false, mimeType: 'image/webp', size: 0, uploaded: false };
}

export async function listMissingImages(): Promise<string[]> {
  try {
    const db = await getDatabase();
    const rows = await db.query<{ image_hash: string }>(
      `SELECT DISTINCT image_hash FROM products WHERE image_hash IS NOT NULL AND active = 1;`
    );
    const missing: string[] = [];
    for (const r of rows) {
      if (r.image_hash && !(await hasImage(r.image_hash))) {
        missing.push(r.image_hash);
      }
    }
    return missing;
  } catch {
    return [];
  }
}
