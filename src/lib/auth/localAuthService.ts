/**
 * Local Authentication Service — Supabase-only cloud-direct (Phase 10b).
 * Username/password staff accounts backed by `staff_users` in the local mirror (synced from
 * Supabase). Login hash-compare happens on-device (offline-accurate). No PIN `users` table,
 * no P2P, no Dexie. Default admin (admin/admin) is seeded server-side (migration 0007).
 */

import { localQuery, localQueryOne, insertRow } from '../../data';
import { User } from '../../types';
import { hashPin, verifyPin, generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } from './pinCrypto';
import { mapRowToUser as mapDbRowToUser, createUser } from '../services/users/userRepository';

let failedAttempts = 0;
let lockoutUntil = 0;

const RECOVERY_KEY = 'pos_master_recovery_hash';

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
    const row = await localQueryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM staff_users WHERE is_active = 1;`);
    return (row?.count ?? 0) === 0;
  } catch {
    return true;
  }
}

export async function getActiveStaffUsers(): Promise<AuthUserInfo[]> {
  try {
    const rows = await localQuery<any>(
      `SELECT id, full_name, username, role, avatar, email, is_active
       FROM staff_users WHERE is_active = 1 ORDER BY role = 'admin' DESC, full_name ASC;`
    );
    return rows.map((r) => ({
      id: r.id, name: r.full_name || r.username, username: r.username, role: r.role,
      avatar: r.avatar || undefined, email: r.email || undefined, active: Boolean(r.is_active),
    }));
  } catch {
    return [];
  }
}

export function getLockoutRemainingSeconds(): number {
  const now = Date.now();
  return lockoutUntil > now ? Math.ceil((lockoutUntil - now) / 1000) : 0;
}

export function recordFailedAttempt(): number {
  failedAttempts++;
  if (failedAttempts >= 5) lockoutUntil = Date.now() + 30_000;
  return failedAttempts;
}

export function resetFailedAttempts(): void {
  failedAttempts = 0;
  lockoutUntil = 0;
}

/** Login by username (or name/email) + password. Offline-accurate local hash compare. */
export async function loginWithPin(pin: string, identifierOrUserId?: string): Promise<User> {
  const remainingLockout = getLockoutRemainingSeconds();
  if (remainingLockout > 0) throw new Error(`Terminal locked due to too many attempts. Please wait ${remainingLockout}s.`);

  let userRow: any;
  if (identifierOrUserId && identifierOrUserId.trim()) {
    const clean = identifierOrUserId.trim().toLowerCase();
    userRow = await localQueryOne<any>(
      `SELECT * FROM staff_users
       WHERE (id = ? OR LOWER(TRIM(username)) = ? OR LOWER(TRIM(full_name)) = ? OR LOWER(TRIM(email)) = ?) AND is_active = 1;`,
      [identifierOrUserId.trim(), clean, clean, clean]
    );
  } else {
    const all = await localQuery<any>(`SELECT * FROM staff_users WHERE is_active = 1;`);
    for (const u of all) {
      if (await verifyPin(pin, u.password_hash)) { userRow = u; break; }
    }
  }

  if (!userRow) { recordFailedAttempt(); throw new Error('Invalid credentials. Please check your username and password.'); }

  const isValid = await verifyPin(pin, userRow.password_hash);
  if (!isValid) { recordFailedAttempt(); throw new Error('Invalid credentials. Please check your username and password.'); }

  resetFailedAttempts();
  return mapDbRowToUser(userRow);
}

/** Verify a password for a specific staff id (checkout authorization / sensitive ops). */
export async function verifyUserPin(userId: string, pin: string): Promise<boolean> {
  if (!userId || !pin) return false;
  try {
    const row = await localQueryOne<{ password_hash: string }>(
      `SELECT password_hash FROM staff_users WHERE id = ? AND is_active = 1;`, [userId]
    );
    if (!row?.password_hash) return false;
    return verifyPin(pin, row.password_hash);
  } catch {
    return false;
  }
}

/** First-run onboarding: create the store settings row + the first admin account. */
export async function bootstrapAdmin(config: SetupConfig): Promise<{ user: User; recoveryCode: string }> {
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashRecoveryCode(recoveryCode);
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(RECOVERY_KEY, recoveryHash); } catch {}

  // Store identity + currency via store_settings (single row).
  try {
    const existing = await localQueryOne<{ id: string }>(`SELECT id FROM store_settings LIMIT 1;`);
    if (!existing) {
      await insertRow('store_settings', {
        id: '00000000-0000-4000-8000-000000000001',
        store_name: config.shopName,
        currency: config.currency || 'PKR',
        store_logo: config.logoUrl || null,
      });
    }
  } catch (e) {
    console.warn('[bootstrapAdmin] store_settings init skipped:', (e as Error).message);
  }

  const user = await createUser({
    name: config.adminName,
    username: config.adminUsername.toLowerCase(),
    pin: config.adminPin,
    role: 'admin',
  });

  return { user, recoveryCode };
}

export async function resetAdminPinWithRecoveryCode(recoveryCode: string, newPin: string): Promise<boolean> {
  let recoveryHash: string | null = null;
  try { if (typeof localStorage !== 'undefined') recoveryHash = localStorage.getItem(RECOVERY_KEY); } catch {}
  if (!recoveryHash) throw new Error('Recovery code is not available on this device.');

  const ok = await verifyRecoveryCode(recoveryCode, recoveryHash);
  if (!ok) throw new Error('Invalid emergency recovery code.');

  const { fullHash: newHash } = await hashPin(newPin);
  const admins = await localQuery<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'admin';`);
  const { updateRow } = await import('../../data');
  for (const a of admins) await updateRow('staff_users', a.id, { password_hash: newHash });
  return true;
}

export { mapDbRowToUser };
