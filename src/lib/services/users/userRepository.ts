// User Repository — Supabase-only cloud-direct (Phase 10b). Backed by `staff_users`.
// Login is username + password (hashed). No PIN `users` table, no P2P outbox, no Dexie.
// Per-user privileges are persisted in the `permissions` JSON column so they sync to every
// device and drive enforcement; when a flag is absent we fall back to the role default.

import { localQuery, localQueryOne, insertRow, updateRow } from '../../../data';
import { User } from '../../../types';
import { hashPin } from '../../auth/pinCrypto';

/** The per-user privilege flags stored in staff_users.permissions (JSON). */
const PERMISSION_KEYS = [
  'canEditPrice', 'canEditProduct', 'canGiveDiscount', 'canDeleteSale', 'canViewProfit',
  'canManageStock', 'canManagePO', 'canViewRecords', 'canEditSale', 'canViewExpiry',
  'requirePinOnSale',
] as const;
type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** Role defaults used only when a user's permissions map has no explicit value for a flag. */
function roleDefaults(role: User['role']): Record<PermissionKey, boolean> {
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;
  return {
    canEditPrice: isManager,
    canEditProduct: isManager,
    canGiveDiscount: true,
    canDeleteSale: isAdmin,
    canViewProfit: isManager,
    canManageStock: isManager,
    canManagePO: isManager,
    canViewRecords: true,
    canEditSale: isManager,
    canViewExpiry: true,
    requirePinOnSale: false,
  };
}

function parsePermissions(raw: any): Partial<Record<PermissionKey, boolean>> {
  if (!raw) return {};
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/** Build the permissions JSON object from a User/CreateUserInput-like source (only set keys). */
function buildPermissions(src: Record<string, any>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of PERMISSION_KEYS) {
    if (src[k] !== undefined) out[k] = Boolean(src[k]);
  }
  return out;
}

export interface CreateUserInput {
  name: string;
  username: string;
  pin: string;
  role: 'admin' | 'manager' | 'cashier' | 'salesman';
  email?: string;
  avatar?: string;
  canEditPrice?: boolean;
  canEditProduct?: boolean;
  canGiveDiscount?: boolean;
  canDeleteSale?: boolean;
  canViewProfit?: boolean;
  canManageStock?: boolean;
  canManagePO?: boolean;
  canViewRecords?: boolean;
  canEditSale?: boolean;
  canViewExpiry?: boolean;
  requirePinOnSale?: boolean;
}

export function mapRowToUser(row: any): User {
  const role = (row.role || 'cashier') as User['role'];
  const defaults = roleDefaults(role);
  const perms = parsePermissions(row.permissions);
  const flag = (k: PermissionKey): boolean => (perms[k] !== undefined ? Boolean(perms[k]) : defaults[k]);
  return {
    id: row.id,
    name: row.full_name || row.name || 'Staff Member',
    username: (row.username || '').toLowerCase(),
    email: row.email || '',
    role,
    active: Boolean(row.is_active ?? row.active ?? 1),
    avatar: row.avatar || undefined,
    canEditPrice: flag('canEditPrice'),
    canEditProduct: flag('canEditProduct'),
    canGiveDiscount: flag('canGiveDiscount'),
    canDeleteSale: flag('canDeleteSale'),
    canViewProfit: flag('canViewProfit'),
    canManageStock: flag('canManageStock'),
    canManagePO: flag('canManagePO'),
    canViewRecords: flag('canViewRecords'),
    canEditSale: flag('canEditSale'),
    // Legacy dedicated columns still honoured if the JSON map omits them.
    canViewExpiry: perms.canViewExpiry !== undefined ? Boolean(perms.canViewExpiry)
      : (row.can_view_expiry !== undefined ? Boolean(row.can_view_expiry) : defaults.canViewExpiry),
    requirePinOnSale: perms.requirePinOnSale !== undefined ? Boolean(perms.requirePinOnSale)
      : (row.require_pin_on_sale !== undefined ? Boolean(row.require_pin_on_sale) : defaults.requirePinOnSale),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export const mapSqliteUser = mapRowToUser;

export async function createUser(input: CreateUserInput, _actor = 'system', _dev = 'PC-MAIN'): Promise<User> {
  const cleanUsername = input.username.trim().toLowerCase();
  if (!cleanUsername) throw new Error('Username is required.');
  if (!input.pin || input.pin.length < 4) throw new Error('Password/PIN must be at least 4 characters.');

  const existing = await localQueryOne(`SELECT 1 FROM staff_users WHERE username = ?;`, [cleanUsername]);
  if (existing) throw new Error(`User with username "${cleanUsername}" already exists.`);

  const { fullHash } = await hashPin(input.pin);
  const row = await insertRow('staff_users', {
    username: cleanUsername,
    password_hash: fullHash,
    role: input.role,
    full_name: input.name.trim(),
    email: input.email?.trim() || null,
    avatar: input.avatar || null,
    is_active: 1,
    can_view_expiry: input.canViewExpiry === false ? 0 : 1,
    require_pin_on_sale: input.requirePinOnSale ? 1 : 0,
    permissions: JSON.stringify(buildPermissions(input as Record<string, any>)),
  });
  return mapRowToUser(row);
}

export async function updateUser(id: string, updates: Partial<User>, _actor = 'system', _dev = 'PC-MAIN'): Promise<User> {
  const existing = await localQueryOne<any>(`SELECT * FROM staff_users WHERE id = ?;`, [id]);
  if (!existing) throw new Error(`User ${id} not found.`);
  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.full_name = updates.name;
  if (updates.role !== undefined) patch.role = updates.role;
  if (updates.active !== undefined) patch.is_active = updates.active ? 1 : 0;
  if (updates.avatar !== undefined) patch.avatar = updates.avatar || null;
  if (updates.email !== undefined) patch.email = updates.email || null;
  if (updates.canViewExpiry !== undefined) patch.can_view_expiry = updates.canViewExpiry ? 1 : 0;
  if (updates.requirePinOnSale !== undefined) patch.require_pin_on_sale = updates.requirePinOnSale ? 1 : 0;

  // Merge any changed per-user privilege flags into the permissions JSON (persisted + synced).
  const incoming = buildPermissions(updates as Record<string, any>);
  if (Object.keys(incoming).length > 0) {
    const merged = { ...parsePermissions(existing.permissions), ...incoming };
    patch.permissions = JSON.stringify(merged);
  }

  if (Object.keys(patch).length > 0) await updateRow('staff_users', id, patch);
  return mapRowToUser({ ...existing, ...patch });
}

export async function updateUserRole(id: string, newRole: User['role']): Promise<User> {
  return updateUser(id, { role: newRole });
}

export async function setUserStatus(id: string, active: boolean): Promise<User> {
  await updateRow('staff_users', id, { is_active: active ? 1 : 0 });
  const row = await localQueryOne<any>(`SELECT * FROM staff_users WHERE id = ?;`, [id]);
  return mapRowToUser(row);
}

export async function resetUserPin(id: string, newPin: string): Promise<void> {
  if (!newPin || newPin.length < 4) throw new Error('New password/PIN must be at least 4 characters.');
  const { fullHash } = await hashPin(newPin);
  await updateRow('staff_users', id, { password_hash: fullHash });
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const rows = await localQuery<any>(`SELECT * FROM staff_users ORDER BY role = 'admin' DESC, full_name ASC;`);
    return rows.map(mapRowToUser);
  } catch { return []; }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const row = await localQueryOne<any>(`SELECT * FROM staff_users WHERE id = ?;`, [id]);
    return row ? mapRowToUser(row) : null;
  } catch { return null; }
}

export async function getActiveStaff(): Promise<User[]> {
  try {
    const rows = await localQuery<any>(`SELECT * FROM staff_users WHERE is_active = 1 ORDER BY role = 'admin' DESC, full_name ASC;`);
    return rows.map(mapRowToUser);
  } catch { return []; }
}
