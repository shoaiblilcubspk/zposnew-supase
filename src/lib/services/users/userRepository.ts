// User Repository — Supabase-only cloud-direct (Phase 10b). Backed by `staff_users`.
// Login is username + password (hashed). No PIN `users` table, no P2P outbox, no Dexie.
// Granular per-user permission columns don't exist in staff_users — permissions default by role.

import { localQuery, localQueryOne, insertRow, updateRow } from '../../../data';
import { User } from '../../../types';
import { hashPin } from '../../auth/pinCrypto';

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
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;
  return {
    id: row.id,
    name: row.full_name || row.name || 'Staff Member',
    username: (row.username || '').toLowerCase(),
    email: row.email || '',
    role,
    active: Boolean(row.is_active ?? row.active ?? 1),
    avatar: row.avatar || undefined,
    // staff_users has no per-user permission columns → default by role.
    canEditPrice: isManager,
    canEditProduct: isManager,
    canGiveDiscount: true,
    canDeleteSale: isAdmin,
    canViewProfit: isManager,
    canManageStock: isManager,
    canManagePO: isManager,
    canViewRecords: true,
    canEditSale: isManager,
    canViewExpiry: row.can_view_expiry !== undefined ? Boolean(row.can_view_expiry) : true,
    requirePinOnSale: row.require_pin_on_sale !== undefined ? Boolean(row.require_pin_on_sale) : false,
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
