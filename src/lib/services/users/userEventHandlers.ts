/**
 * User & Permissions Remote P2P Event Handlers
 * Receives remote staff creations, role updates, PIN resets, and deactivations.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { TABLES } from '../../db/schemaConstants';
import { localDb } from '../../localDb';

export async function handleRemoteUserEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const userId = event.entity_id || p.id;

  if (event.operation === 'DELETE') {
    // Soft delete + create tombstone so peers won't re-activate this user
    await tx.execute(`UPDATE ${TABLES.USERS} SET active = 0, updated_at = ? WHERE id = ?;`, [now, userId]);
    await tx.execute(
      `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('USER', ?, ?, ?);`,
      [userId, now, event.device_id]
    );
    try {
      await localDb.users.update(userId, { active: false, updatedAt: new Date(now) });
    } catch {}
    return;
  }

  // ─── Tombstone Guard ──────────────────────────────────────────────────────────
  // If this device already soft-deleted this user (tombstone exists), reject any
  // remote event that would re-activate them. Tombstone always wins over a remote update.
  const tombstone = await tx.queryOne<{ deleted_at: number }>(
    `SELECT deleted_at FROM tombstones WHERE entity_type = 'USER' AND entity_id = ?;`, [userId]
  );
  if (tombstone) {
    // Only allow if it's an explicit DELETE (already handled above) or STATUS_CHANGED to inactive
    const isDeactivation = p.active === false || p.active === 0;
    if (!isDeactivation) return; // Reject re-activation attempt
  }

  // Handle PIN reset event
  if ((p.pin_hash || p.pinHash) && !p.name) {
    const newHash = p.pin_hash || p.pinHash;
    await tx.execute(
      `UPDATE ${TABLES.USERS} SET pin_hash = ?, updated_at = ? WHERE id = ?;`,
      [newHash, now, userId]
    );
    return;
  }

  // Handle Status change event
  if (p.active !== undefined && p.name === undefined) {
    const activeVal = p.active ? 1 : 0;
    await tx.execute(
      `UPDATE ${TABLES.USERS} SET active = ?, updated_at = ? WHERE id = ?;`,
      [activeVal, now, userId]
    );
    try {
      await localDb.users.update(userId, { active: Boolean(activeVal), updatedAt: new Date(now) });
    } catch {}
    return;
  }

  // Insert or Update complete user profile
  const activeVal = p.active !== undefined ? (p.active ? 1 : 0) : 1;
  const existing = await tx.queryOne(`SELECT pin_hash, username FROM ${TABLES.USERS} WHERE id = ?;`, [userId]);
  const pinHash = p.pin_hash || p.pinHash || existing?.pin_hash || 'DEFAULT_LOCKED_PIN_HASH';
  const username = (p.username || existing?.username || p.name || '').toLowerCase();

  const requirePin = p.permissions?.requirePinOnSale !== undefined
    ? (p.permissions.requirePinOnSale ? 1 : 0)
    : (p.require_pin_on_sale ? 1 : 0);
  const canViewExpiry = p.permissions?.canViewExpiry !== undefined
    ? (p.permissions.canViewExpiry ? 1 : 0)
    : 1;

  await tx.execute(
    `INSERT OR REPLACE INTO ${TABLES.USERS} (
      id, name, username, pin_hash, role, active, email, avatar, require_pin_on_sale, can_view_expiry, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      userId,
      p.name || 'Staff Operator',
      username,
      pinHash,
      p.role || 'cashier',
      activeVal,
      p.email || null,
      p.avatar || null,
      requirePin,
      canViewExpiry,
      p.created_at || now,
      now,
    ]
  );

  try {
    await localDb.users.put({
      id: userId,
      name: p.name || 'Staff Operator',
      username,
      email: p.email || '',
      role: p.role || 'cashier',
      active: Boolean(activeVal),
      avatar: p.avatar,
      canEditPrice: p.permissions?.canEditPrice ?? (p.role === 'admin' || p.role === 'manager'),
      canEditProduct: p.permissions?.canEditProduct ?? (p.role === 'admin' || p.role === 'manager'),
      canGiveDiscount: p.permissions?.canGiveDiscount ?? true,
      canDeleteSale: p.permissions?.canDeleteSale ?? (p.role === 'admin'),
      canViewProfit: p.permissions?.canViewProfit ?? (p.role === 'admin' || p.role === 'manager'),
      canManageStock: p.permissions?.canManageStock ?? (p.role === 'admin' || p.role === 'manager'),
      canManagePO: p.permissions?.canManagePO ?? (p.role === 'admin' || p.role === 'manager'),
      canViewRecords: p.permissions?.canViewRecords ?? true,
      canEditSale: p.permissions?.canEditSale ?? (p.role === 'admin' || p.role === 'manager'),
      canViewExpiry: Boolean(canViewExpiry),
      requirePinOnSale: Boolean(requirePin),
      createdAt: new Date(p.created_at || now),
      updatedAt: new Date(now),
    });
  } catch {}
}

// Explicit registration with event dispatcher for all user mutation variants
export function registerUserEventHandlers(): void {
  const events = [
    'USER',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_ROLE_UPDATED',
    'USER_PIN_RESET',
    'USER_STATUS_CHANGED',
    'USER:CREATE',
    'USER:UPDATE',
    'USER:DELETE',
  ];
  for (const e of events) {
    registerEventHandler(e, handleRemoteUserEvent);
  }
}

registerUserEventHandlers();

