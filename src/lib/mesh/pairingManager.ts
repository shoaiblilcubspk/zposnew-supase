/**
 * QR Code Device Pairing Handshake & Mesh Governance
 * Generates signed ephemeral pairing tokens and manages terminal authorization/revocation.
 */

import { query, queryOne, execute, TABLES } from '../db';
import { getDeviceId, getShopId, getDeviceProfile } from './deviceIdentity';
import { getOrCreateDeviceKeypair, signData, verifySignature } from '../crypto/deviceKeypair';
import { safeRandomUUID } from '../crypto/uuid';
import { commitLocalTransaction } from '../events';
import type { PairingPayload, PairingBootstrapData, PairedDeviceRecord } from './pairingTypes';

export type { PairingPayload, PairingBootstrapData, PairedDeviceRecord };

/**
 * Generate a cryptographically signed, ephemeral QR pairing token (valid for 120 seconds).
 */
export async function generatePairingToken(validitySeconds = 120): Promise<PairingBootstrapData> {
  const shopId = await getShopId();
  if (!shopId) {
    throw new Error('Store is not initialized. Complete first-launch setup first.');
  }

  const shopRow = await queryOne<{ name: string; currency: string }>(
    `SELECT name, currency FROM ${TABLES.SHOP} WHERE id = ?;`,
    [shopId]
  );

  const activeUsers = await query<any>(
    `SELECT id, name, username, pin_hash, role, email, avatar, active, created_at, updated_at
     FROM ${TABLES.USERS} WHERE active = 1;`
  );

  const adminDeviceId = await getDeviceId();
  const { publicKeyHex } = await getOrCreateDeviceKeypair();
  const now = Date.now();
  const expiresAt = now + validitySeconds * 1000;
  const nonce = safeRandomUUID().substring(0, 8);
  const pin6 = Math.floor(100000 + Math.random() * 900000).toString();

  const payloadToSign = `${shopId}:${adminDeviceId}:${publicKeyHex}:${nonce}:${pin6}:${expiresAt}`;
  const signature = await signData(payloadToSign);

  const adminU = (activeUsers || []).find((u: any) => u.role === 'admin') || (activeUsers || [])[0];
  const payload: PairingPayload = {
    shopId,
    adminDeviceId,
    adminPublicKey: publicKeyHex,
    nonce,
    pin6,
    expiresAt,
    signature,
    adminUser: adminU ? {
      id: adminU.id,
      name: adminU.name,
      username: adminU.username,
      pin_hash: adminU.pin_hash,
      role: adminU.role,
      active: 1,
      email: adminU.email,
    } : undefined,
  };

  const tokenString = btoa(JSON.stringify(payload));
  return {
    tokenString,
    pin6,
    expiresAt,
    payload,
    shopProfile: {
      name: shopRow?.name || 'Zaynahs POS',
      currency: shopRow?.currency || 'PKR',
    },
    initialUsers: activeUsers || [],
  };
}

/**
 * Validate an incoming pairing token string from QR code.
 */
export async function verifyPairingToken(tokenString: string): Promise<PairingPayload> {
  let payload: PairingPayload;
  try {
    payload = JSON.parse(atob(tokenString));
  } catch {
    throw new Error('Invalid QR code format.');
  }

  if (!payload.shopId || !payload.adminDeviceId || !payload.expiresAt || !payload.signature) {
    throw new Error('Malformed pairing token.');
  }

  if (Date.now() > payload.expiresAt) {
    throw new Error('Pairing QR code has expired. Please refresh the QR code on the primary terminal.');
  }

  const payloadToVerify = payload.pin6
    ? `${payload.shopId}:${payload.adminDeviceId}:${payload.adminPublicKey}:${payload.nonce}:${payload.pin6}:${payload.expiresAt}`
    : `${payload.shopId}:${payload.adminDeviceId}:${payload.adminPublicKey}:${payload.nonce}:${payload.expiresAt}`;
  const isValid = await verifySignature(payloadToVerify, payload.signature, payload.adminPublicKey);

  if (!isValid) {
    throw new Error('Cryptographic signature verification failed on pairing token.');
  }

  return payload;
}

/**
 * Register a newly paired terminal into local SQLite and emit a sync event.
 */
export async function registerPairedDevice(device: {
  deviceId: string;
  name: string;
  role?: 'primary' | 'terminal';
  publicKey: string;
}): Promise<void> {
  const now = Date.now();
  const currentDeviceId = await getDeviceId();

  await commitLocalTransaction({
    entityType: 'SETTINGS',
    entityId: device.deviceId,
    operation: 'CREATE',
    eventType: 'DEVICE_REGISTERED',
    deviceId: currentDeviceId,
    userId: 'system',
    payload: {
      deviceId: device.deviceId,
      name: device.name,
      role: device.role || 'terminal',
      publicKey: device.publicKey,
      pairedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.DEVICES} (
          device_id, name, role, public_key, is_revoked, paired_at
        ) VALUES (?, ?, ?, ?, 0, ?);`,
        [device.deviceId, device.name, device.role || 'terminal', device.publicKey, now]
      );
    },
  });
}

/**
 * Revoke an authorized terminal. Immediately drops replication, closes connection and blocks future events.
 */
export async function revokeDevice(deviceId: string): Promise<void> {
  const currentDeviceId = await getDeviceId();
  if (deviceId === currentDeviceId) {
    throw new Error('Cannot revoke the currently active terminal.');
  }

  // Sever active WebRTC session immediately
  try {
    const { getP2PMesh } = await import('./p2pMesh');
    getP2PMesh().disconnectPeer(deviceId);
  } catch {}

  await commitLocalTransaction({
    entityType: 'SETTINGS',
    entityId: deviceId,
    operation: 'UPDATE',
    eventType: 'DEVICE_REVOKED',
    deviceId: currentDeviceId,
    userId: 'admin',
    payload: {
      deviceId,
      isRevoked: 1,
      revokedAt: Date.now(),
    },
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.DEVICES} SET is_revoked = 1 WHERE device_id = ?;`,
        [deviceId]
      );
    },
  });
}

/**
 * Restore a previously revoked terminal back to Active status.
 */
export async function unrevokeDevice(deviceId: string): Promise<void> {
  const currentDeviceId = await getDeviceId();

  await commitLocalTransaction({
    entityType: 'SETTINGS',
    entityId: deviceId,
    operation: 'UPDATE',
    eventType: 'DEVICE_UNREVOKED',
    deviceId: currentDeviceId,
    userId: 'admin',
    payload: {
      deviceId,
      isRevoked: 0,
      unrevokedAt: Date.now(),
    },
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.DEVICES} SET is_revoked = 0 WHERE device_id = ?;`,
        [deviceId]
      );
    },
  });
}

/**
 * Permanently delete / remove a paired terminal record from local SQLite.
 */
export async function deletePairedDevice(deviceId: string): Promise<void> {
  const currentDeviceId = await getDeviceId();
  if (deviceId === currentDeviceId) {
    throw new Error('Cannot delete the currently active terminal.');
  }

  try {
    const { getP2PMesh } = await import('./p2pMesh');
    getP2PMesh().disconnectPeer(deviceId);
  } catch {}

  await execute(`DELETE FROM ${TABLES.DEVICES} WHERE device_id = ?;`, [deviceId]);
}

/**
 * Retrieve all registered terminals in the local shop mesh.
 */
export async function getPairedDevices(): Promise<PairedDeviceRecord[]> {
  const rows = await query<{
    device_id: string;
    name: string;
    role: string;
    public_key: string;
    last_seen: number;
    is_revoked: number;
    paired_at: number;
  }>(`SELECT * FROM ${TABLES.DEVICES} ORDER BY is_revoked ASC, paired_at ASC;`);

  return rows.map((r) => ({
    deviceId: r.device_id,
    name: r.name,
    role: (r.role || 'terminal') as 'primary' | 'terminal',
    publicKey: r.public_key,
    lastSeen: r.last_seen,
    isRevoked: Boolean(r.is_revoked),
    pairedAt: r.paired_at,
  }));
}

// Check if device is authorized and not revoked. Auto-registers new terminals.
export async function isDeviceAuthorized(deviceId: string): Promise<boolean> {
  try {
    const currentDeviceId = await getDeviceId();
    if (deviceId === currentDeviceId) return true;

    const row = await queryOne<{ is_revoked: number }>(
      `SELECT is_revoked FROM ${TABLES.DEVICES} WHERE device_id = ?;`,
      [deviceId]
    );
    if (!row) {
      await execute(
        `INSERT OR IGNORE INTO ${TABLES.DEVICES} (device_id, name, role, public_key, is_revoked, paired_at)
         VALUES (?, ?, 'terminal', '', 0, ?);`,
        [deviceId, `Terminal-${deviceId.slice(0, 6)}`, Date.now()]
      );
      return true;
    }
    return row.is_revoked === 0;
  } catch (err) {
    console.warn('[isDeviceAuthorized] Fallback allow device:', deviceId, err);
    return true;
  }
}

// Promote local terminal to Primary Master for emergency disaster recovery
export async function promoteToPrimaryTerminal(): Promise<void> {
  const currentDeviceId = await getDeviceId();
  const profile = await getDeviceProfile();
  if (!profile) throw new Error('Device profile not found.');

  await commitLocalTransaction({
    entityType: 'SETTINGS',
    entityId: currentDeviceId,
    operation: 'UPDATE',
    eventType: 'DEVICE_PROMOTED_PRIMARY',
    deviceId: currentDeviceId,
    userId: 'admin',
    payload: { deviceId: currentDeviceId, role: 'primary' },
    execute: async (tx) => {
      // Demote existing primary terminals
      await tx.execute(`UPDATE ${TABLES.DEVICES} SET role = 'terminal' WHERE role = 'primary';`);
      // Promote this device to primary
      await tx.execute(`UPDATE ${TABLES.DEVICES} SET role = 'primary' WHERE device_id = ?;`, [currentDeviceId]);
    },
  });
}

