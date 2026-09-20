// User Repository (Local-First SQLite & P2P Event Sourcing)
import { query, queryOne } from '../../db';
import { TABLES } from '../../db/schemaConstants';
import { User } from '../../../types';
import { commitLocalTransaction } from '../../events/transactionManager';
import { hashPin } from '../../auth/pinCrypto';
import { safeRandomUUID } from '../../crypto/uuid';
import { localDb } from '../../localDb';

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
    name: row.name || 'Staff Member',
    username: (row.username || '').toLowerCase(),
    email: row.email || '',
    role,
    active: Boolean(row.active ?? 1),
    avatar: row.avatar || undefined,
    canEditPrice: row.can_edit_price !== undefined ? Boolean(row.can_edit_price) : isManager,
    canEditProduct: row.can_edit_product !== undefined ? Boolean(row.can_edit_product) : isManager,
    canGiveDiscount: row.can_give_discount !== undefined ? Boolean(row.can_give_discount) : true,
    canDeleteSale: row.can_delete_sale !== undefined ? Boolean(row.can_delete_sale) : isAdmin,
    canViewProfit: row.can_view_profit !== undefined ? Boolean(row.can_view_profit) : isManager,
    canManageStock: row.can_manage_stock !== undefined ? Boolean(row.can_manage_stock) : isManager,
    canManagePO: row.can_manage_po !== undefined ? Boolean(row.can_manage_po) : isManager,
    canViewRecords: row.can_view_records !== undefined ? Boolean(row.can_view_records) : true,
    canEditSale: row.can_edit_sale !== undefined ? Boolean(row.can_edit_sale) : isManager,
    canViewExpiry: row.can_view_expiry !== undefined ? Boolean(row.can_view_expiry) : true,
    requirePinOnSale: row.require_pin_on_sale !== undefined ? Boolean(row.require_pin_on_sale) : false,
    createdAt: row.created_at ? new Date(Number(row.created_at)) : new Date(),
    updatedAt: row.updated_at ? new Date(Number(row.updated_at)) : new Date(),
  };
}

export const mapSqliteUser = mapRowToUser;

export async function createUser(
  input: CreateUserInput,
  actorUserId = 'system',
  actorDeviceId = 'PC-MAIN'
): Promise<User> {
  const cleanUsername = input.username.trim().toLowerCase();
  if (!cleanUsername) throw new Error('Username is required.');
  if (!input.pin || input.pin.length < 4) throw new Error('PIN must be at least 4 digits.');

  const existing = await queryOne(`SELECT 1 FROM ${TABLES.USERS} WHERE username = ?;`, [cleanUsername]);
  if (existing) throw new Error(`User with username "${cleanUsername}" already exists.`);

  const id = `USR-${safeRandomUUID().substring(0, 8).toUpperCase()}`;
  const now = Date.now();
  const { fullHash: pinHash } = await hashPin(input.pin);

  const newUser: User = {
    id,
    name: input.name.trim(),
    username: cleanUsername,
    email: input.email?.trim() || '',
    role: input.role,
    active: true,
    avatar: input.avatar,
    canEditPrice: input.canEditPrice ?? (input.role === 'admin' || input.role === 'manager'),
    canEditProduct: input.canEditProduct ?? (input.role === 'admin' || input.role === 'manager'),
    canGiveDiscount: input.canGiveDiscount ?? true,
    canDeleteSale: input.canDeleteSale ?? (input.role === 'admin'),
    canViewProfit: input.canViewProfit ?? (input.role === 'admin' || input.role === 'manager'),
    canManageStock: input.canManageStock ?? (input.role === 'admin' || input.role === 'manager'),
    canManagePO: input.canManagePO ?? (input.role === 'admin' || input.role === 'manager'),
    canViewRecords: input.canViewRecords ?? true,
    canEditSale: input.canEditSale ?? (input.role === 'admin' || input.role === 'manager'),
    canViewExpiry: input.canViewExpiry ?? true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };

  return commitLocalTransaction({
    entityType: 'USER',
    entityId: id,
    operation: 'CREATE',
    eventType: 'USER_CREATED',
    payload: {
      id,
      name: newUser.name,
      username: newUser.username,
      pin_hash: pinHash, // Cryptographic hash ONLY, zero plaintext PIN
      role: newUser.role,
      active: 1,
      email: newUser.email,
      avatar: newUser.avatar,
      permissions: {
        canEditPrice: newUser.canEditPrice,
        canEditProduct: newUser.canEditProduct,
        canGiveDiscount: newUser.canGiveDiscount,
        canDeleteSale: newUser.canDeleteSale,
        canViewProfit: newUser.canViewProfit,
        canManageStock: newUser.canManageStock,
        canManagePO: newUser.canManagePO,
        canViewRecords: newUser.canViewRecords,
        canEditSale: newUser.canEditSale,
        canViewExpiry: newUser.canViewExpiry,
        requirePinOnSale: newUser.requirePinOnSale,
      },
      created_at: now,
      updated_at: now,
    },
    userId: actorUserId,
    deviceId: actorDeviceId,
    execute: async (tx) => {
      await tx.execute(
        `INSERT INTO ${TABLES.USERS} (
          id, name, username, pin_hash, role, active, avatar, email, require_pin_on_sale, can_view_expiry, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?);`,
        [id, newUser.name, newUser.username, pinHash, newUser.role, newUser.avatar || null, newUser.email || null, input.requirePinOnSale ? 1 : 0, newUser.canViewExpiry ? 1 : 0, now, now]
      );
      try {
        await localDb.users.put(newUser);
      } catch {}
      return newUser;
    },
  });
}

export async function updateUser(
  id: string,
  updates: Partial<User>,
  actorUserId = 'system',
  actorDeviceId = 'PC-MAIN'
): Promise<User> {
  const existing = await queryOne(`SELECT * FROM ${TABLES.USERS} WHERE id = ?;`, [id]);
  if (!existing) throw new Error(`User ${id} not found.`);

  const now = Date.now();
  const merged = { ...mapRowToUser(existing), ...updates, updatedAt: new Date(now) };

  return commitLocalTransaction({
    entityType: 'USER',
    entityId: id,
    operation: 'UPDATE',
    eventType: updates.role && updates.role !== existing.role ? 'USER_ROLE_UPDATED' : 'USER_UPDATED',
    payload: {
      id,
      name: merged.name,
      username: merged.username,
      role: merged.role,
      active: merged.active ? 1 : 0,
      email: merged.email,
      avatar: merged.avatar,
      permissions: {
        canEditPrice: merged.canEditPrice,
        canEditProduct: merged.canEditProduct,
        canGiveDiscount: merged.canGiveDiscount,
        canDeleteSale: merged.canDeleteSale,
        canViewProfit: merged.canViewProfit,
        canManageStock: merged.canManageStock,
        canManagePO: merged.canManagePO,
        canViewRecords: merged.canViewRecords,
        canEditSale: merged.canEditSale,
        canViewExpiry: merged.canViewExpiry,
        requirePinOnSale: merged.requirePinOnSale,
      },
      updated_at: now,
    },
    userId: actorUserId,
    deviceId: actorDeviceId,
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.USERS} SET 
          name = ?, role = ?, active = ?, avatar = ?, email = ?, require_pin_on_sale = ?, can_view_expiry = ?, updated_at = ?
         WHERE id = ?;`,
        [merged.name, merged.role, merged.active ? 1 : 0, merged.avatar || null, merged.email || null, merged.requirePinOnSale ? 1 : 0, merged.canViewExpiry ? 1 : 0, now, id]
      );
      try {
        await localDb.users.put(merged);
      } catch {}
      return merged;
    },
  });
}

export async function updateUserRole(
  id: string,
  newRole: 'admin' | 'manager' | 'cashier' | 'salesman',
  actorUserId = 'system',
  actorDeviceId = 'PC-MAIN'
): Promise<User> {
  return updateUser(id, { role: newRole }, actorUserId, actorDeviceId);
}

export async function setUserStatus(
  id: string,
  active: boolean,
  actorUserId = 'system',
  actorDeviceId = 'PC-MAIN'
): Promise<User> {
  const now = Date.now();
  return commitLocalTransaction({
    entityType: 'USER',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'USER_STATUS_CHANGED',
    payload: { id, active: active ? 1 : 0, updated_at: now },
    userId: actorUserId,
    deviceId: actorDeviceId,
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.USERS} SET active = ?, updated_at = ? WHERE id = ?;`,
        [active ? 1 : 0, now, id]
      );
      const user = await queryOne(`SELECT * FROM ${TABLES.USERS} WHERE id = ?;`, [id]);
      const mapped = mapRowToUser(user);
      try {
        await localDb.users.update(id, { active, updatedAt: new Date(now) });
      } catch {}
      return mapped;
    },
  });
}

export async function resetUserPin(
  id: string,
  newPin: string,
  actorUserId = 'system',
  actorDeviceId = 'PC-MAIN'
): Promise<void> {
  if (!newPin || newPin.length < 4) throw new Error('New PIN must be at least 4 digits.');
  const now = Date.now();
  const { fullHash: pinHash } = await hashPin(newPin);

  await commitLocalTransaction({
    entityType: 'USER',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'USER_PIN_RESET',
    payload: { id, pin_hash: pinHash, updated_at: now },
    userId: actorUserId,
    deviceId: actorDeviceId,
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.USERS} SET pin_hash = ?, updated_at = ? WHERE id = ?;`,
        [pinHash, now, id]
      );
    },
  });
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const rows = await query(
      `SELECT * FROM ${TABLES.USERS} ORDER BY role = 'admin' DESC, name ASC;`
    );
    return rows.map(mapRowToUser);
  } catch {
    return [];
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const row = await queryOne(`SELECT * FROM ${TABLES.USERS} WHERE id = ?;`, [id]);
    return row ? mapRowToUser(row) : null;
  } catch {
    return null;
  }
}

export async function getActiveStaff(): Promise<User[]> {
  try {
    const rows = await query(
      `SELECT * FROM ${TABLES.USERS} WHERE active = 1 ORDER BY role = 'admin' DESC, name ASC;`
    );
    return rows.map(mapRowToUser);
  } catch {
    return [];
  }
}
