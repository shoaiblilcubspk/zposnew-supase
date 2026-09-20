/**
 * Device Identity Management
 * Tracks terminal identity, unique DEVICE_ID, and cryptographic credentials in local SQLite.
 */

import { queryOne, execute, TABLES } from '../db';
import { getOrCreateDeviceKeypair } from '../crypto/deviceKeypair';

export interface DeviceProfile {
  deviceId: string;
  shopId?: string;
  name: string;
  role: 'primary' | 'terminal';
  publicKey: string;
  isRevoked: boolean;
  pairedAt: number;
}

let cachedDeviceId: string | null = null;

export function setCachedDeviceId(id: string | null): void {
  cachedDeviceId = id;
  if (id && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('zpos_device_id', id);
    } catch {}
  }
}

/**
 * Get or assign this physical device's unique identifier.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // 1. Check browser-isolated localStorage FIRST (client-specific, never overwritten by synced SQLite tables)
  if (typeof localStorage !== 'undefined') {
    try {
      const storedId = localStorage.getItem('zpos_device_id');
      if (storedId) {
        cachedDeviceId = storedId;
        return cachedDeviceId;
      }
    } catch {}
  }

  // 2. Check SQLite settings
  const setting = await queryOne<{ value: string }>(
    `SELECT value FROM ${TABLES.SETTINGS} WHERE key = 'device_id';`
  );
  if (setting?.value) {
    cachedDeviceId = setting.value;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('zpos_device_id', cachedDeviceId);
      } catch {}
    }
    return cachedDeviceId;
  }

  // 3. Generate clean unique device ID for this terminal
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  cachedDeviceId = `TERM-${randomSuffix}`;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('zpos_device_id', cachedDeviceId);
    } catch {}
  }

  await execute(
    `INSERT OR REPLACE INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES ('device_id', ?, ?);`,
    [cachedDeviceId, Date.now()]
  );

  return cachedDeviceId;
}

/**
 * Get active store SHOP_ID from local SQLite.
 */
export async function getShopId(): Promise<string | null> {
  const shop = await queryOne<{ id: string }>(`SELECT id FROM ${TABLES.SHOP} LIMIT 1;`);
  return shop?.id ?? null;
}

/**
 * Get full profile of current device including cryptographic public key.
 */
export async function getDeviceProfile(): Promise<DeviceProfile> {
  const deviceId = await getDeviceId();
  const shopId = (await getShopId()) || undefined;
  const { publicKeyHex } = await getOrCreateDeviceKeypair();

  const row = await queryOne<{
    device_id: string;
    name: string;
    role: string;
    public_key: string;
    is_revoked: number;
    paired_at: number;
  }>(`SELECT * FROM ${TABLES.DEVICES} WHERE device_id = ?;`, [deviceId]);

  if (row) {
    return {
      deviceId: row.device_id,
      shopId,
      name: row.name,
      role: (row.role || 'terminal') as 'primary' | 'terminal',
      publicKey: row.public_key || publicKeyHex,
      isRevoked: Boolean(row.is_revoked),
      pairedAt: row.paired_at,
    };
  }

  // If record does not exist in devices table yet, register as primary/terminal
  const now = Date.now();
  const isPrimary = deviceId === 'PC-MAIN';
  await execute(
    `INSERT OR IGNORE INTO ${TABLES.DEVICES} (device_id, name, role, public_key, paired_at) 
     VALUES (?, ?, ?, ?, ?);`,
    [deviceId, isPrimary ? 'Primary Terminal' : 'Secondary Terminal', isPrimary ? 'primary' : 'terminal', publicKeyHex, now]
  );

  return {
    deviceId,
    shopId,
    name: isPrimary ? 'Primary Terminal' : 'Secondary Terminal',
    role: isPrimary ? 'primary' : 'terminal',
    publicKey: publicKeyHex,
    isRevoked: false,
    pairedAt: now,
  };
}
