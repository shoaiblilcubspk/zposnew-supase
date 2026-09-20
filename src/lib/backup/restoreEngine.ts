/**
 * Encrypted Backup Restore Engine
 * Decrypts AES-256-GCM backup archives, verifies SHA-256 checksums, and restores SQLite database.
 */

import { getDatabase } from '../db';
import { computeSha256 } from '../media/localImageStore';
import { EncryptedBackupArchive, deriveKey } from './backupEngine';

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function base64ToBuffer(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface RestoreResult {
  success: boolean;
  shopId: string;
  timestamp: number;
  sizeBytes: number;
}

export async function restoreFromBackup(
  backupContent: string | EncryptedBackupArchive,
  password: string
): Promise<RestoreResult> {
  let archive: EncryptedBackupArchive;
  if (typeof backupContent === 'string') {
    try {
      archive = JSON.parse(backupContent);
    } catch {
      throw new Error('Invalid backup archive format (JSON parse error)');
    }
  } else {
    archive = backupContent;
  }

  if (archive.format !== 'ZPOS_BACKUP_V1') {
    throw new Error(`Unsupported backup format: ${archive.format}`);
  }

  if (!archive.salt || !archive.iv || !archive.ciphertext || !archive.checksum) {
    throw new Error('Corrupted backup archive: missing required encryption parameters');
  }

  const saltBytes = hexToBuffer(archive.salt);
  const ivBytes = hexToBuffer(archive.iv);
  const ciphertextBytes = base64ToBuffer(archive.ciphertext);

  // 1. Derive decryption key
  const aesKey = await deriveKey(password, saltBytes);

  // 2. Decrypt ciphertext
  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as any },
      aesKey,
      ciphertextBytes as any
    );
  } catch (_decryptErr) {
    throw new Error('Decryption failed: Incorrect backup password or corrupted file');
  }

  const dbBinary = new Uint8Array(decryptedBuffer);

  // 3. Verify SHA-256 integrity checksum
  const calculatedChecksum = await computeSha256(dbBinary);
  if (calculatedChecksum !== archive.checksum) {
    throw new Error('Integrity check failed: Decrypted database checksum does not match archive metadata');
  }

  // 4. Import and replace local SQLite database
  const db = await getDatabase();
  if (!db.importBinary) {
    throw new Error('Current SQLite driver does not support binary import/restore');
  }

  await db.importBinary(dbBinary);

  // 5. Run SQLite integrity check
  try {
    const check = await db.queryOne<{ integrity_check: string }>(`PRAGMA integrity_check;`);
    if (check && check.integrity_check !== 'ok') {
      throw new Error(`SQLite database corrupted: ${check.integrity_check}`);
    }
  } catch (err: any) {
    if (err.message?.includes('corrupted')) throw err;
  }

  return {
    success: true,
    shopId: archive.shopId,
    timestamp: archive.timestamp,
    sizeBytes: dbBinary.length,
  };
}
