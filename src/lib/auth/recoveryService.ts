import { queryOne, execute, transaction } from '../db';
import { TABLES } from '../db/schemaConstants';
import { generateRecoveryCode, hashRecoveryCode, verifyPin } from './pinCrypto';
import { commitLocalTransaction } from '../events';
import { getDeviceId } from '../mesh/deviceIdentity';

/**
 * Rotates the 24-character emergency recovery code for the shop in local SQLite.
 * Requires verification of the Admin's PIN to prevent unauthorized rotation.
 * The old recovery code is immediately invalidated.
 */
export async function rotateRecoveryCode(adminPin: string): Promise<string> {
  if (!adminPin || adminPin.length < 4) {
    throw new Error('Admin PIN must be at least 4 digits.');
  }

  // 1. Verify Admin credentials in local SQLite
  const admin = await queryOne<{ pin_hash: string }>(
    `SELECT pin_hash FROM ${TABLES.USERS} WHERE role = 'admin' AND active = 1 LIMIT 1;`
  );

  if (!admin || !admin.pin_hash) {
    throw new Error('Active Admin account not found in local database.');
  }

  const isPinValid = await verifyPin(adminPin, admin.pin_hash);
  if (!isPinValid) {
    throw new Error('Incorrect Admin PIN. Authorization failed.');
  }

  // 2. Generate a brand new 24-character recovery code
  const newRecoveryCode = generateRecoveryCode();
  const newRecoveryHash = await hashRecoveryCode(newRecoveryCode);
  const deviceId = await getDeviceId();
  const now = Date.now();

  // 3. Atomically commit the new recovery hash to the local SQLite shop record + outbox event
  await commitLocalTransaction({
    entityType: 'SHOP',
    entityId: 'shop',
    operation: 'UPDATE',
    eventType: 'RECOVERY_CODE_ROTATED',
    deviceId,
    userId: 'admin',
    payload: { masterRecoveryHash: newRecoveryHash, rotatedAt: now },
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.SHOP} SET master_recovery_hash = ?, updated_at = ?;`,
        [newRecoveryHash, now]
      );
    },
  });

  return newRecoveryCode;
}

/**
 * Changes a user's PIN in local SQLite with current PIN verification.
 */
export async function changeUserPin(
  userId: string,
  currentPin: string,
  newPin: string
): Promise<boolean> {
  if (!newPin || newPin.length < 4) {
    throw new Error('New PIN must be at least 4 digits.');
  }

  const user = await queryOne<{ pin_hash: string }>(
    `SELECT pin_hash FROM ${TABLES.USERS} WHERE id = ? AND active = 1;`,
    [userId]
  );

  if (!user || !user.pin_hash) {
    throw new Error('User not found in local database.');
  }

  const isCurrentValid = await verifyPin(currentPin, user.pin_hash);
  if (!isCurrentValid) {
    throw new Error('Current PIN is incorrect.');
  }

  const { hashPin } = await import('./pinCrypto');
  const { fullHash: newPinHash } = await hashPin(newPin);
  const deviceId = await getDeviceId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'USER',
    entityId: userId,
    operation: 'UPDATE',
    eventType: 'USER_PIN_CHANGED',
    deviceId,
    userId,
    payload: { userId, pinHash: newPinHash, updatedAt: now },
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.USERS} SET pin_hash = ?, updated_at = ? WHERE id = ?;`,
        [newPinHash, now, userId]
      );
    },
  });

  return true;
}
