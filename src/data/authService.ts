/**
 * Auth service (cloud-direct) — Section 6 of the migration plan.
 *
 * - Username/password staff accounts. NO license keys, NO device pairing (removed in Phase 11).
 * - Login checks the LOCAL mirror `staff_users` copy (offline-accurate, Section 6.3): the
 *   password hash compare happens on-device. Because staff_users syncs via the same queue as
 *   every other table, the local copy is always current — one code path, online or offline.
 * - Account create/change/deactivate go through the SAME write-through + queue path as
 *   products/customers (Section 6.4). No bespoke auth sync.
 * - Passwords stored as PBKDF2 "salt:hash:fallback" (pinCrypto.ts). NEVER plaintext.
 *
 * Session is app-level (Section 6.5): after a local check succeeds we hold {staff_id, role,
 * login time} in memory for permission checks + audit attribution — not Supabase Auth.
 */

import { localQuery, localQueryOne } from './localDb';
import { insertRow, updateRow, softDeleteRow } from './writeThrough';
import { hashPin, verifyPin } from '../lib/auth/pinCrypto';

export type StaffRole = 'admin' | 'manager' | 'cashier' | 'salesman';

export interface StaffUserRow {
  id: string;
  operation_id: string;
  username: string;
  password_hash: string;
  role: StaffRole;
  full_name: string | null;
  email: string | null;
  avatar: string | null;
  is_active: number;
  can_view_expiry: number;
  require_pin_on_sale: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  staff_id: string;
  username: string;
  role: StaffRole;
  full_name: string | null;
  login_at: string;
}

let currentSession: Session | null = null;

// ---- Progressive lockout (in-memory, per device) ----
let failedAttempts = 0;
let lockoutUntil = 0;

export function getLockoutRemainingSeconds(): number {
  const now = Date.now();
  return lockoutUntil > now ? Math.ceil((lockoutUntil - now) / 1000) : 0;
}

function recordFailure(): void {
  failedAttempts++;
  if (failedAttempts >= 5) lockoutUntil = Date.now() + 30_000;
}

function resetFailures(): void {
  failedAttempts = 0;
  lockoutUntil = 0;
}

// ---- Reads ----

export async function listStaff(): Promise<StaffUserRow[]> {
  return localQuery<StaffUserRow>(
    `SELECT * FROM staff_users WHERE is_active = 1 ORDER BY role = 'admin' DESC, username ASC`
  );
}

export async function getStaffByUsername(username: string): Promise<StaffUserRow | null> {
  return localQueryOne<StaffUserRow>(
    `SELECT * FROM staff_users WHERE LOWER(TRIM(username)) = ? AND is_active = 1`,
    [username.trim().toLowerCase()]
  );
}

export function getSession(): Session | null {
  return currentSession;
}

export function logout(): void {
  currentSession = null;
}

// ---- Login (offline-accurate, local hash compare) ----

export async function login(username: string, password: string): Promise<Session> {
  const wait = getLockoutRemainingSeconds();
  if (wait > 0) throw new Error(`Too many attempts. Wait ${wait}s.`);

  const user = await getStaffByUsername(username);
  if (!user) { recordFailure(); throw new Error('Invalid username or password.'); }

  const ok = await verifyPin(password, user.password_hash);
  if (!ok) { recordFailure(); throw new Error('Invalid username or password.'); }

  resetFailures();
  currentSession = {
    staff_id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    login_at: new Date().toISOString(),
  };
  return currentSession;
}

/** Verify a password for a specific staff id (checkout authorization / sensitive ops). */
export async function verifyStaffPassword(staffId: string, password: string): Promise<boolean> {
  if (!staffId || !password) return false;
  const row = await localQueryOne<{ password_hash: string }>(
    `SELECT password_hash FROM staff_users WHERE id = ? AND is_active = 1`, [staffId]
  );
  if (!row?.password_hash) return false;
  return verifyPin(password, row.password_hash);
}

// ---- Account management (synced like any other table) ----

export interface CreateStaffInput {
  username: string;
  password: string;
  role: StaffRole;
  full_name?: string;
  email?: string;
  can_view_expiry?: boolean;
  require_pin_on_sale?: boolean;
}

export async function createStaff(input: CreateStaffInput): Promise<StaffUserRow> {
  const existing = await localQueryOne<{ id: string }>(
    `SELECT id FROM staff_users WHERE LOWER(TRIM(username)) = ?`, [input.username.trim().toLowerCase()]
  );
  if (existing) throw new Error(`Username "${input.username}" already exists.`);

  const { fullHash } = await hashPin(input.password);
  return insertRow('staff_users', {
    username: input.username.trim().toLowerCase(),
    password_hash: fullHash,
    role: input.role,
    full_name: input.full_name ?? null,
    email: input.email ?? null,
    is_active: 1,
    can_view_expiry: input.can_view_expiry === false ? 0 : 1,
    require_pin_on_sale: input.require_pin_on_sale ? 1 : 0,
  }) as unknown as Promise<StaffUserRow>;
}

export async function changePassword(staffId: string, newPassword: string): Promise<void> {
  const { fullHash } = await hashPin(newPassword);
  await updateRow('staff_users', staffId, { password_hash: fullHash });
}

export async function updateStaff(
  staffId: string,
  patch: Partial<Pick<StaffUserRow, 'role' | 'full_name' | 'email' | 'can_view_expiry' | 'require_pin_on_sale'>>
): Promise<void> {
  await updateRow('staff_users', staffId, patch as any);
}

/** Soft-disable (Section 2.12): never hard delete — preserves audit FK trail. */
export async function deactivateStaff(staffId: string): Promise<void> {
  await softDeleteRow('staff_users', staffId, 'is_active');
}

/** First-run helper: true when only the seeded default admin exists (or none). */
export async function isDefaultAdminOnly(): Promise<boolean> {
  const rows = await localQuery<{ username: string }>(`SELECT username FROM staff_users WHERE is_active = 1`);
  return rows.length === 0 || (rows.length === 1 && rows[0].username === 'admin');
}
