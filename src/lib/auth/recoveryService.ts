/**
 * Recovery & PIN/password change — Supabase-only cloud-direct (Phase 10b).
 * Backed by `staff_users` in the local mirror. The emergency recovery code hash is stored
 * device-locally (localStorage) since the cloud schema has no recovery column. No P2P, no Dexie.
 */

import { localQuery, localQueryOne, updateRow } from '../../data';
import { generateRecoveryCode, hashRecoveryCode, verifyPin, hashPin } from './pinCrypto';

const RECOVERY_KEY = 'pos_master_recovery_hash';

/**
 * Rotate the 24-character emergency recovery code. Requires the Admin password.
 * The new hash replaces the previous one (old code is immediately invalidated).
 */
export async function rotateRecoveryCode(adminPin: string): Promise<string> {
  if (!adminPin || adminPin.length < 4) throw new Error('Admin password must be at least 4 characters.');

  const admin = await localQueryOne<{ password_hash: string }>(
    `SELECT password_hash FROM staff_users WHERE role = 'admin' AND is_active = 1 LIMIT 1;`
  );
  if (!admin?.password_hash) throw new Error('Active Admin account not found.');

  const ok = await verifyPin(adminPin, admin.password_hash);
  if (!ok) throw new Error('Incorrect Admin password. Authorization failed.');

  const newRecoveryCode = generateRecoveryCode();
  const newRecoveryHash = await hashRecoveryCode(newRecoveryCode);
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(RECOVERY_KEY, newRecoveryHash); } catch {}

  return newRecoveryCode;
}

/** Change a staff member's password after verifying the current one. */
export async function changeUserPin(userId: string, currentPin: string, newPin: string): Promise<boolean> {
  if (!newPin || newPin.length < 4) throw new Error('New password must be at least 4 characters.');

  const user = await localQueryOne<{ password_hash: string }>(
    `SELECT password_hash FROM staff_users WHERE id = ? AND is_active = 1;`, [userId]
  );
  if (!user?.password_hash) throw new Error('User not found.');

  const isCurrentValid = await verifyPin(currentPin, user.password_hash);
  if (!isCurrentValid) throw new Error('Current password is incorrect.');

  const { fullHash } = await hashPin(newPin);
  await updateRow('staff_users', userId, { password_hash: fullHash });
  return true;
}

// Reference to keep the import used if a caller lists all admins in future flows.
export async function listAdminIds(): Promise<string[]> {
  const rows = await localQuery<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'admin';`);
  return rows.map((r) => r.id);
}
