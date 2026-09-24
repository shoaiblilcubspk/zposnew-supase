/**
 * Automated Local Documents Backup Engine
 * Saves scheduled, AES-256 encrypted SQLite backups to Documents/ZaynahsPOS/backups/.
 * Features auto-retention purging to delete old backups and retain the last N snapshots.
 */

import { createEncryptedBackup } from './backupEngine';
import { getDeviceProfile } from '../deviceIdentity';

export type LocalBackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface LocalBackupConfig {
  enabled: boolean;
  frequency: LocalBackupFrequency;
  autoDeleteOld: boolean;
  keepCount: number;
  lastBackupAt: number | null;
  lastBackupStatus: 'success' | 'failed' | 'idle';
  lastBackupError: string | null;
  lastBackupSize: number | null;
  lastBackupFilename: string | null;
}

const STORAGE_KEY = 'zpos_local_doc_backup_config';
const BACKUP_SUBDIR = 'ZaynahsPOS/backups';

export function getLocalBackupConfig(): LocalBackupConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    enabled: false,
    frequency: 'daily',
    autoDeleteOld: true,
    keepCount: 3,
    lastBackupAt: null,
    lastBackupStatus: 'idle',
    lastBackupError: null,
    lastBackupSize: null,
    lastBackupFilename: null,
  };
}

export function saveLocalBackupConfig(updates: Partial<LocalBackupConfig>): LocalBackupConfig {
  const current = getLocalBackupConfig();
  const next = { ...current, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

async function isElectronEnvironment(): Promise<boolean> {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}

export async function runLocalDocumentsBackup(password?: string): Promise<{
  success: boolean;
  filename?: string;
  sizeBytes?: number;
  path?: string;
  error?: string;
}> {
  try {
    const profile = await getDeviceProfile();
    const shopId = profile?.shopId || 'default-shop';
    const backupSecret = password || `zpos_local_${shopId.slice(0, 12)}`;

    // 1. Generate encrypted backup snapshot
    const { jsonString, filename, archive } = await createEncryptedBackup(backupSecret);
    const sizeBytes = archive.sizeBytes;
    const isElectron = await isElectronEnvironment();

    let savedPath = `Documents/${BACKUP_SUBDIR}/${filename}`;

    if (isElectron) {
      try {
        const electronAPI = window.electronAPI!;
        const documentsPath = await electronAPI.fs.getDocumentsPath();
        const backupDir = `${documentsPath}/${BACKUP_SUBDIR}`;

        // Ensure directory exists in Documents
        await electronAPI.fs.mkdir(backupDir, true);

        // Write new backup file
        const fullPath = `${backupDir}/${filename}`;
        await electronAPI.fs.writeFile(fullPath, jsonString);

        // Auto-delete old backups if enabled
        const config = getLocalBackupConfig();
        if (config.autoDeleteOld) {
          try {
            const entries = await electronAPI.fs.readdir(backupDir);
            const backupFiles = entries
              .filter((e: string) => e.startsWith('POS-BACKUP-') && e.endsWith('.zpos'))
              .sort((a: string, b: string) => b.localeCompare(a)); // Descending by filename date

            if (backupFiles.length > config.keepCount) {
              const toDelete = backupFiles.slice(config.keepCount);
              for (const oldFile of toDelete) {
                await electronAPI.fs.unlink(`${backupDir}/${oldFile}`);
              }
            }
          } catch {}
        }

        savedPath = fullPath;
      } catch (fsErr: any) {
        throw new Error(`Electron filesystem write failed: ${fsErr.message}`);
      }
    } else {
      // Browser fallback: trigger file download & store in IndexedDB
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    saveLocalBackupConfig({
      lastBackupAt: Date.now(),
      lastBackupStatus: 'success',
      lastBackupError: null,
      lastBackupSize: sizeBytes,
      lastBackupFilename: filename,
    });

    return {
      success: true,
      filename,
      sizeBytes,
      path: savedPath,
    };
  } catch (err: any) {
    const errMsg = err.message || 'Local backup failed';
    saveLocalBackupConfig({
      lastBackupStatus: 'failed',
      lastBackupError: errMsg,
    });
    return { success: false, error: errMsg };
  }
}

export async function checkAndTriggerScheduledLocalBackup(): Promise<void> {
  const config = getLocalBackupConfig();
  if (!config.enabled) return;

  const now = Date.now();
  const lastAt = config.lastBackupAt || 0;
  const elapsed = now - lastAt;

  const intervals: Record<LocalBackupFrequency, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  const requiredInterval = intervals[config.frequency] || intervals.daily;
  if (elapsed >= requiredInterval) {
    await runLocalDocumentsBackup();
  }
}
