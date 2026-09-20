/**
 * Local Authentication Service
 * Manages PIN authentication, first-launch admin setup, and emergency recovery in local SQLite.
 */

import { query, queryOne, execute, transaction } from '../db';
import { TABLES } from '../db/schemaConstants';
import { User } from '../../types';
import { hashPin, verifyPin, generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } from './pinCrypto';
import { getOrCreateDeviceKeypair } from '../crypto/deviceKeypair';
import { safeRandomUUID } from '../crypto/uuid';
import { mapRowToUser as mapDbRowToUser } from '../services/users/userRepository';

let failedAttempts = 0;
let lockoutUntil = 0;

export interface SetupConfig {
  shopName: string;
  currency: string;
  adminName: string;
  adminUsername: string;
  adminPin: string;
  logoUrl?: string;
}

export interface AuthUserInfo {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'cashier' | 'salesman';
  active: boolean;
  avatar?: string;
  email?: string;
}

export async function isFirstLaunch(): Promise<boolean> {
  try {
    const shopRow = await queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM ${TABLES.SHOP};`);
    const userRow = await queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM ${TABLES.USERS};`);
    if ((shopRow?.count ?? 0) === 0 || (userRow?.count ?? 0) === 0) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function getActiveStaffUsers(): Promise<AuthUserInfo[]> {
  try {
    return await query<AuthUserInfo>(
      `SELECT id, name, username, role, avatar, email, active 
       FROM ${TABLES.USERS} 
       WHERE active = 1 
       ORDER BY role = 'admin' DESC, name ASC;`
    );
  } catch {
    return [];
  }
}

export function getLockoutRemainingSeconds(): number {
  const now = Date.now();
  if (lockoutUntil > now) {
    return Math.ceil((lockoutUntil - now) / 1000);
  }
  return 0;
}

export function recordFailedAttempt(): number {
  failedAttempts++;
  if (failedAttempts >= 5) {
    lockoutUntil = Date.now() + 30_000; // 30 second lockout
  }
  return failedAttempts;
}

export function resetFailedAttempts(): void {
  failedAttempts = 0;
  lockoutUntil = 0;
}

export async function loginWithPin(pin: string, identifierOrUserId?: string): Promise<User> {
  const remainingLockout = getLockoutRemainingSeconds();
  if (remainingLockout > 0) {
    throw new Error(`Terminal locked due to too many attempts. Please wait ${remainingLockout}s.`);
  }

  // 1. Fetch user record
  let userRow: any;
  if (identifierOrUserId && identifierOrUserId.trim()) {
    const clean = identifierOrUserId.trim().toLowerCase();
    userRow = await queryOne(
      `SELECT * FROM ${TABLES.USERS} 
       WHERE (id = ? OR LOWER(TRIM(username)) = ? OR LOWER(TRIM(name)) = ? OR LOWER(TRIM(email)) = ?) AND active = 1;`,
      [identifierOrUserId.trim(), clean, clean, clean]
    );
  } else {
    // If no identifier provided, check if PIN matches any active user
    const allUsers = await query(`SELECT * FROM ${TABLES.USERS} WHERE active = 1;`);
    for (const u of allUsers) {
      const isMatch = await verifyPin(pin, u.pin_hash);
      if (isMatch) {
        userRow = u;
        break;
      }
    }
  }

  if (!userRow) {
    recordFailedAttempt();
    throw new Error('Invalid credentials. Please check your username/email and PIN.');
  }

  // 2. Verify PIN
  const isValid = await verifyPin(pin, userRow.pin_hash);
  if (!isValid) {
    recordFailedAttempt();
    throw new Error('Invalid credentials. Please check your username/email and PIN.');
  }

  resetFailedAttempts();

  // 3. Map to domain User model
  return mapDbRowToUser(userRow);
}

/**
 * Verify whether a given PIN is correct for a specific user ID.
 * Used for checkout authorization and sensitive operations.
 */
export async function verifyUserPin(userId: string, pin: string): Promise<boolean> {
  if (!userId || !pin) return false;
  try {
    const userRow = await queryOne<{ pin_hash: string }>(
      `SELECT pin_hash FROM ${TABLES.USERS} WHERE id = ? AND active = 1;`,
      [userId]
    );
    if (!userRow || !userRow.pin_hash) return false;
    return await verifyPin(pin, userRow.pin_hash);
  } catch {
    return false;
  }
}

export async function bootstrapAdmin(config: SetupConfig): Promise<{ user: User; recoveryCode: string }> {
  const shopId = `SHOP-${safeRandomUUID().substring(0, 8).toUpperCase()}`;
  const deviceId = 'PC-MAIN';
  const adminId = safeRandomUUID();
  const recoveryCode = generateRecoveryCode();
  const now = Date.now();

  const { publicKeyHex } = await getOrCreateDeviceKeypair();
  const { fullHash: pinHash } = await hashPin(config.adminPin);
  const recoveryHash = await hashRecoveryCode(recoveryCode);

  await transaction(async (tx) => {
    // 1. Create Shop Profile
    await tx.execute(
      `INSERT INTO ${TABLES.SHOP} (
        id, name, currency, master_recovery_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      [shopId, config.shopName, config.currency || 'PKR', recoveryHash, now, now]
    );

    // 2. Register Root / Primary Device
    await tx.execute(
      `INSERT INTO ${TABLES.DEVICES} (
        device_id, name, role, public_key, paired_at
      ) VALUES (?, ?, ?, ?, ?);`,
      [deviceId, 'PC-MAIN (Root Device)', 'primary', publicKeyHex, now]
    );

    // 3. Create First Admin User
    await tx.execute(
      `INSERT INTO ${TABLES.USERS} (
        id, name, username, pin_hash, role, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [adminId, config.adminName, config.adminUsername.toLowerCase(), pinHash, 'admin', 1, now, now]
    );

    // 4. Save Default Settings
    await tx.execute(
      `INSERT INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES 
       ('shop_id', ?, ?),
       ('shop_name', ?, ?),
       ('currency', ?, ?),
       ('device_id', ?, ?);`,
      [shopId, now, config.shopName, now, config.currency || 'PKR', now, deviceId, now]
    );

    // 5. Append Genesis Events to sync_outbox
    try {
      const { createOutboxEvent } = await import('../events/eventFactory');
      const shopEvt = await createOutboxEvent({
        entityType: 'SHOP',
        entityId: shopId,
        operation: 'CREATE',
        eventType: 'SHOP_CREATED',
        deviceId,
        userId: adminId,
        payload: { id: shopId, name: config.shopName, currency: config.currency || 'PKR', createdAt: now },
      }, tx);
      await tx.execute(
        `INSERT INTO sync_outbox (event_id, device_id, sequence, entity_type, entity_id, operation, payload, created_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [shopEvt.event_id, shopEvt.device_id, shopEvt.sequence, shopEvt.entity_type, shopEvt.entity_id, shopEvt.operation, shopEvt.payload, shopEvt.created_at]
      );

      const devEvt = await createOutboxEvent({
        entityType: 'DEVICE',
        entityId: deviceId,
        operation: 'CREATE',
        eventType: 'DEVICE_REGISTERED',
        deviceId,
        userId: adminId,
        payload: { deviceId, name: 'PC-MAIN (Root Device)', role: 'primary', publicKeyHex, pairedAt: now },
      }, tx);
      await tx.execute(
        `INSERT INTO sync_outbox (event_id, device_id, sequence, entity_type, entity_id, operation, payload, created_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [devEvt.event_id, devEvt.device_id, devEvt.sequence, devEvt.entity_type, devEvt.entity_id, devEvt.operation, devEvt.payload, devEvt.created_at]
      );

      const usrEvt = await createOutboxEvent({
        entityType: 'USER',
        entityId: adminId,
        operation: 'CREATE',
        eventType: 'USER_CREATED',
        deviceId,
        userId: adminId,
        payload: { id: adminId, name: config.adminName, username: config.adminUsername.toLowerCase(), role: 'admin', pin_hash: pinHash, pinHash, active: 1, createdAt: now },
      }, tx);
      await tx.execute(
        `INSERT INTO sync_outbox (event_id, device_id, sequence, entity_type, entity_id, operation, payload, created_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [usrEvt.event_id, usrEvt.device_id, usrEvt.sequence, usrEvt.entity_type, usrEvt.entity_id, usrEvt.operation, usrEvt.payload, usrEvt.created_at]
      );
    } catch (e) {
      console.warn('Genesis outbox event write skipped:', e);
    }
  });

  // Refresh sync status store pending count
  try {
    const { useSyncStatusStore } = await import('../sync/syncStatusStore');
    useSyncStatusStore.getState().refreshPendingCount().catch(() => {});
  } catch {}

  const adminRow = await queryOne(`SELECT * FROM ${TABLES.USERS} WHERE id = ?;`, [adminId]);
  const user = mapDbRowToUser(adminRow);
  return { user, recoveryCode };
}

export async function resetAdminPinWithRecoveryCode(recoveryCode: string, newPin: string): Promise<boolean> {
  const shop = await queryOne<{ master_recovery_hash: string }>(
    `SELECT master_recovery_hash FROM ${TABLES.SHOP} LIMIT 1;`
  );

  if (!shop || !shop.master_recovery_hash) {
    throw new Error('Shop master profile not found.');
  }

  const isCodeValid = await verifyRecoveryCode(recoveryCode, shop.master_recovery_hash);
  if (!isCodeValid) {
    throw new Error('Invalid emergency recovery code.');
  }

  const { fullHash: newPinHash } = await hashPin(newPin);
  await execute(
    `UPDATE ${TABLES.USERS} SET pin_hash = ?, updated_at = ? WHERE role = 'admin';`,
    [newPinHash, Date.now()]
  );

  return true;
}

export { mapDbRowToUser };
