/**
 * Local Image Store
 * Content-addressed binary storage engine with SHA-256 integrity verification.
 */

import { getDatabase } from '../db';
import { generateId } from '../localDb';

// In-memory / browser blob cache
const memoryImageCache = new Map<string, { data: Uint8Array; mimeType: string; url?: string }>();

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

export async function getImageUrl(hash: string): Promise<string | null> {
  let cached = memoryImageCache.get(hash);
  if (!cached) {
    const stored = await getStoredBlob(hash);
    if (stored) {
      cached = stored;
      memoryImageCache.set(hash, stored);
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
