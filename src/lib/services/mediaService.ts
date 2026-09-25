/**
 * Media Service — the reusable image library (uploads + Pexels picks), backed by media_assets.
 * A Pexels pick is: download the large image, compress via the existing WebP pipeline, cache +
 * upload to the bucket, then record ONE atomic bundle (deduped by pexels_id). The LINK + credit
 * are permanent; the local blob is a disposable cache (re-download from the saved src URL).
 */

import { localQuery, localQueryOne, insertRow, updateRow } from '../../data';
import { safeRandomUUID } from '../crypto/uuid';
import { compressImage } from '../../shared/imageCompression';
import { saveImage } from '../media/localImageStore';
import type { PexelsPhoto } from './pexelsService';

export interface MediaAsset {
  id: string;
  source: 'upload' | 'pexels';
  imageHash: string | null;
  pexelsId: string | null;
  photographer: string | null;
  photographerUrl: string | null;
  pageUrl: string | null;
  alt: string | null;
  avgColor: string | null;
  srcUrls: { original?: string; large2x?: string; large?: string; medium?: string; portrait?: string; tiny?: string };
}

function mapRow(r: any): MediaAsset {
  return {
    id: r.id, source: r.source, imageHash: r.image_hash, pexelsId: r.pexels_id,
    photographer: r.photographer, photographerUrl: r.photographer_url, pageUrl: r.page_url,
    alt: r.alt, avgColor: r.avg_color,
    srcUrls: { original: r.src_original, large2x: r.src_large2x, large: r.src_large, medium: r.src_medium, portrait: r.src_portrait, tiny: r.src_tiny },
  };
}

export async function listMedia(): Promise<MediaAsset[]> {
  const rows = await localQuery<any>(`SELECT * FROM media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC;`).catch(() => []);
  return rows.map(mapRow);
}

async function urlToCompressedBytes(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image (${res.status})`);
  const blob = await res.blob();
  const file = new File([blob], 'pexels.jpg', { type: blob.type || 'image/jpeg' });
  const compressed = await compressImage(file, 800, 800, 0.7);
  const buf = new Uint8Array(await compressed.arrayBuffer());
  return { bytes: buf, mime: compressed.type || 'image/webp' };
}

/** Save a Pexels photo into the Media library (dedup by pexels_id). Returns the image hash. */
export async function saveFromPexels(photo: PexelsPhoto): Promise<MediaAsset> {
  const pexelsId = String(photo.id);
  const existing = await localQueryOne<any>(
    `SELECT * FROM media_assets WHERE pexels_id = ? AND deleted_at IS NULL LIMIT 1;`, [pexelsId]
  );
  if (existing) return mapRow(existing);

  // Upload FIRST (compress → hash → bucket), then link inside the bundle (§1.5.5).
  const srcUrl = photo.src.large2x || photo.src.large || photo.src.original;
  const { bytes, mime } = await urlToCompressedBytes(srcUrl);
  const { hash } = await saveImage(bytes, mime);

  const row = await insertRow('media_assets', {
    id: safeRandomUUID(),
    source: 'pexels',
    image_hash: hash,
    pexels_id: pexelsId,
    photographer: photo.photographer || null,
    photographer_url: photo.photographer_url || null,
    page_url: photo.url || null,
    alt: photo.alt || null,
    avg_color: photo.avg_color || null,
    width: photo.width || null,
    height: photo.height || null,
    src_original: photo.src.original || null,
    src_large2x: photo.src.large2x || null,
    src_large: photo.src.large || null,
    src_medium: photo.src.medium || null,
    src_portrait: photo.src.portrait || null,
    src_tiny: photo.src.tiny || null,
  });
  return mapRow(row);
}

/** Soft-delete a media asset (syncs everywhere; the link/credit row is tombstoned). */
export async function deleteMedia(id: string): Promise<void> {
  await updateRow('media_assets', id, { deleted_at: new Date().toISOString() });
}
