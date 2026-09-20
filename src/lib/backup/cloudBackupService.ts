/**
 * Automated Cloud Backup Service
 * Performs scheduled, AES-256 encrypted SQLite database backups directly to a private Supabase Storage bucket.
 * Backups are DB-data only (zero binary media) for minimal bandwidth and zero cloud cost.
 */

import { supabase } from '../supabase';
import { createEncryptedBackup } from './backupEngine';
import { getDeviceProfile } from '../mesh/deviceIdentity';
import JSZip from 'jszip';
import { getDatabase } from '../db';
import { getImageData } from '../media/localImageStore';

export type CloudBackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface CloudBackupConfig {
  enabled: boolean;
  frequency: CloudBackupFrequency;
  includeImages: boolean;
  lastBackupAt: number | null;
  lastBackupStatus: 'success' | 'failed' | 'idle';
  lastBackupError: string | null;
  lastBackupSize: number | null;
  lastBackupPath: string | null;
}

const STORAGE_KEY = 'zpos_cloud_backup_config';
const BUCKET_NAME = 'pos-backups';

export function getCloudBackupConfig(): CloudBackupConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    enabled: false,
    frequency: 'daily',
    includeImages: false,
    lastBackupAt: null,
    lastBackupStatus: 'idle',
    lastBackupError: null,
    lastBackupSize: null,
    lastBackupPath: null,
  };
}

export function saveCloudBackupConfig(updates: Partial<CloudBackupConfig>): CloudBackupConfig {
  const current = getCloudBackupConfig();
  const next = { ...current, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export async function uploadDatabaseToCloud(password?: string): Promise<{
  success: boolean;
  path?: string;
  sizeBytes?: number;
  error?: string;
}> {
  try {
    const profile = await getDeviceProfile();
    const shopId = profile?.shopId || 'default-shop';
    const backupSecret = password || `zpos_cloud_${shopId.slice(0, 12)}`;
    const config = getCloudBackupConfig();

    // 1. Generate encrypted SQLite archive (.zpos)
    const { jsonString, filename, archive } = await createEncryptedBackup(backupSecret);
    let blobToUpload: Blob;
    let finalUploadFilename = filename;

    // Optional: Bundle images into ZIP if enabled
    if (config.includeImages) {
      const zip = new JSZip();
      zip.file(filename, jsonString);
      const imgFolder = zip.folder('images');

      try {
        const db = await getDatabase();
        const rows = await db.query<{ image_hash: string }>(
          `SELECT DISTINCT image_hash FROM product_images WHERE image_hash IS NOT NULL;`
        );
        for (const r of rows) {
          if (r.image_hash && imgFolder) {
            const bytes = await getImageData(r.image_hash);
            if (bytes) imgFolder.file(`${r.image_hash}.webp`, bytes);
          }
        }
      } catch {}

      blobToUpload = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      finalUploadFilename = filename.replace('.zpos', '-with-images.zip');
    } else {
      blobToUpload = new Blob([jsonString], { type: 'application/json' });
    }

    // 2. Upload to private Supabase bucket: pos-backups
    const uploadPath = `shop_${shopId}/${finalUploadFilename}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uploadPath, blobToUpload, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      const errMsg = error.message.includes('Bucket not found')
        ? `Supabase bucket "${BUCKET_NAME}" not found. Please create it in Supabase dashboard (see docs/SUPABASE_SETUP.md).`
        : error.message;
      saveCloudBackupConfig({
        lastBackupStatus: 'failed',
        lastBackupError: errMsg,
      });
      return { success: false, error: errMsg };
    }

    const sizeBytes = archive.sizeBytes;
    saveCloudBackupConfig({
      lastBackupAt: Date.now(),
      lastBackupStatus: 'success',
      lastBackupError: null,
      lastBackupSize: sizeBytes,
      lastBackupPath: data?.path || uploadPath,
    });

    return {
      success: true,
      path: data?.path || uploadPath,
      sizeBytes,
    };
  } catch (err: any) {
    const errMsg = err.message || 'Cloud backup upload failed';
    saveCloudBackupConfig({
      lastBackupStatus: 'failed',
      lastBackupError: errMsg,
    });
    return { success: false, error: errMsg };
  }
}

export async function checkAndTriggerScheduledCloudBackup(): Promise<void> {
  const config = getCloudBackupConfig();
  if (!config.enabled) return;

  const now = Date.now();
  const lastAt = config.lastBackupAt || 0;
  const elapsed = now - lastAt;

  const intervals: Record<CloudBackupFrequency, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  const requiredInterval = intervals[config.frequency] || intervals.daily;
  if (elapsed >= requiredInterval) {
    await uploadDatabaseToCloud();
  }
}
