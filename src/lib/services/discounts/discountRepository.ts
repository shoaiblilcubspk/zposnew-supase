/**
 * Discount Repository — SQLite + P2P Outbox
 * All discount mutations write to local SQLite and emit P2P sync events.
 * Replaces previous Dexie-only (browser-memory) storage.
 */

import { getDatabase, TABLES } from '../../db';
import { Discount } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { generateId } from '../../localDb';

// ─── Mapper ─────────────────────────────────────────────────────────────────

export function mapSqliteDiscount(row: any): Discount {
  let conditions: any[] = [];
  try { conditions = JSON.parse(row.conditions || '[]'); } catch {}
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    type: row.type as 'percentage' | 'fixed',
    value: Number(row.value) || 0,
    conditions,
    minAmount: row.min_amount ? Number(row.min_amount) : undefined,
    maxDiscount: row.max_discount ? Number(row.max_discount) : undefined,
    validFrom: new Date(Number(row.valid_from)),
    validTo: new Date(Number(row.valid_to)),
    validDays: row.valid_days ? JSON.parse(row.valid_days) : undefined,
    active: Boolean(row.active),
    isAutoApply: Boolean(row.is_auto_apply),
    createdAt: new Date(Number(row.created_at)),
  };
}

function discountToRow(d: Partial<Discount> & { id: string }, now: number) {
  return {
    id: d.id,
    name: d.name || 'Unnamed Discount',
    description: d.description || '',
    type: d.type || 'percentage',
    value: Number(d.value) || 0,
    conditions: JSON.stringify(d.conditions || []),
    min_amount: d.minAmount ?? null,
    max_discount: d.maxDiscount ?? null,
    valid_from: d.validFrom ? new Date(d.validFrom).getTime() : now,
    valid_to: d.validTo ? new Date(d.validTo).getTime() : now + 30 * 86400_000,
    valid_days: d.validDays ? JSON.stringify(d.validDays) : null,
    active: d.active !== false ? 1 : 0,
    is_auto_apply: d.isAutoApply ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getAllDiscounts(): Promise<Discount[]> {
  const db = await getDatabase();
  const rows = await db.query(`SELECT * FROM ${TABLES.DISCOUNTS} WHERE active = 1 ORDER BY created_at ASC;`);
  return rows.map(mapSqliteDiscount);
}

export async function getDiscountById(id: string): Promise<Discount | null> {
  const db = await getDatabase();
  const row = await db.queryOne(`SELECT * FROM ${TABLES.DISCOUNTS} WHERE id = ?;`, [id]);
  return row ? mapSqliteDiscount(row) : null;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createDiscount(data: Omit<Discount, 'id'>, userId = 'system'): Promise<Discount> {
  const deviceId = await getDeviceId();
  const id = generateId();
  const now = Date.now();
  const row = discountToRow({ ...data, id }, now);

  await commitLocalTransaction({
    entityType: 'DISCOUNT',
    entityId: id,
    operation: 'CREATE',
    eventType: 'DISCOUNT_CREATED',
    deviceId,
    userId,
    payload: row,
    execute: async (tx) => {
      await tx.execute(
        `INSERT INTO ${TABLES.DISCOUNTS} (
          id, name, description, type, value, conditions,
          min_amount, max_discount, valid_from, valid_to, valid_days,
          active, is_auto_apply, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          row.id, row.name, row.description, row.type, row.value, row.conditions,
          row.min_amount, row.max_discount, row.valid_from, row.valid_to, row.valid_days,
          row.active, row.is_auto_apply, row.created_at, row.updated_at,
        ]
      );
    },
  });

  return mapSqliteDiscount(row);
}

export async function updateDiscount(id: string, updates: Partial<Discount>, userId = 'system'): Promise<Discount> {
  const existing = await getDiscountById(id);
  if (!existing) throw new Error(`Discount ${id} not found`);
  const deviceId = await getDeviceId();
  const now = Date.now();
  const merged = { ...existing, ...updates, id };
  const row = discountToRow(merged, now);
  row.created_at = existing.createdAt.getTime();

  await commitLocalTransaction({
    entityType: 'DISCOUNT',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'DISCOUNT_UPDATED',
    deviceId,
    userId,
    payload: row,
    execute: async (tx) => {
      await tx.execute(
        `UPDATE ${TABLES.DISCOUNTS} SET
          name = ?, description = ?, type = ?, value = ?, conditions = ?,
          min_amount = ?, max_discount = ?, valid_from = ?, valid_to = ?, valid_days = ?,
          active = ?, is_auto_apply = ?, updated_at = ?
         WHERE id = ?;`,
        [
          row.name, row.description, row.type, row.value, row.conditions,
          row.min_amount, row.max_discount, row.valid_from, row.valid_to, row.valid_days,
          row.active, row.is_auto_apply, now, id,
        ]
      );
    },
  });

  return mapSqliteDiscount({ ...row, created_at: row.created_at });
}

export async function deleteDiscount(id: string, userId = 'system'): Promise<void> {
  const deviceId = await getDeviceId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'DISCOUNT',
    entityId: id,
    operation: 'DELETE',
    eventType: 'DISCOUNT_DELETED',
    deviceId,
    userId,
    payload: { id, deletedAt: now },
    execute: async (tx) => {
      await tx.execute(`UPDATE ${TABLES.DISCOUNTS} SET active = 0, updated_at = ? WHERE id = ?;`, [now, id]);
      await tx.execute(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
         VALUES ('DISCOUNT', ?, ?, ?);`,
        [id, now, userId]
      );
    },
  });
}
