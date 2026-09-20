/**
 * Automated Encrypted Backup Engine
 * Creates consistent transactional SQLite database snapshots encrypted with AES-256-GCM.
 */

import { getDatabase } from '../db';
import { getDeviceProfile } from '../mesh/deviceIdentity';
import { computeSha256 } from '../media/localImageStore';

export interface EncryptedBackupArchive {
  format: 'ZPOS_BACKUP_V1';
  shopId: string;
  deviceId: string;
  timestamp: number;
  checksum: string; // SHA-256 of unencrypted SQLite binary
  salt: string;     // Hex-encoded PBKDF2 salt
  iv: string;       // Hex-encoded 12-byte AES-GCM IV
  ciphertext: string; // Base64-encoded encrypted database
  sizeBytes: number;
}

const PBKDF2_ITERATIONS = 100_000;

function bufferToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bufferToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function deriveKey(password: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function createEncryptedBackup(password: string): Promise<{
  archive: EncryptedBackupArchive;
  jsonString: string;
  filename: string;
}> {
  if (!password || password.length < 4) {
    throw new Error('Backup password must be at least 4 characters');
  }

  const db = await getDatabase();
  const profile = await getDeviceProfile();

  // 1. Export SQLite database binary
  let dbBinary: Uint8Array;
  if (db.exportBinary) {
    dbBinary = await db.exportBinary();
  } else {
    throw new Error('Current SQLite driver does not support binary export');
  }

  // 2. Calculate unencrypted SHA-256 checksum for integrity verification
  const checksum = await computeSha256(dbBinary);

  // 3. Generate salt & IV
  const saltBytes = new Uint8Array(16);
  const ivBytes = new Uint8Array(12);
  crypto.getRandomValues(saltBytes);
  crypto.getRandomValues(ivBytes);

  // 4. Derive AES-256-GCM key and encrypt
  const aesKey = await deriveKey(password, saltBytes);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes as any },
    aesKey,
    dbBinary as any
  );

  const ciphertext = bufferToBase64(new Uint8Array(encryptedBuffer));
  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];

  const shopId = profile?.shopId || 'default-shop';
  const deviceId = profile?.deviceId || 'default-device';

  const archive: EncryptedBackupArchive = {
    format: 'ZPOS_BACKUP_V1',
    shopId,
    deviceId,
    timestamp: now,
    checksum,
    salt: bufferToHex(saltBytes),
    iv: bufferToHex(ivBytes),
    ciphertext,
    sizeBytes: dbBinary.length,
  };

  const jsonString = JSON.stringify(archive, null, 2);
  const filename = `POS-BACKUP-${shopId.slice(0, 8)}-${dateStr}.zpos`;

  return { archive, jsonString, filename };
}
