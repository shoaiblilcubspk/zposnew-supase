/**
 * Discount Remote P2P Event Handler
 * Receives DISCOUNT_CREATED / DISCOUNT_UPDATED / DISCOUNT_DELETED events
 * from peer devices and commits them atomically to local SQLite.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { TABLES } from '../../db';

async function handleRemoteDiscountEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const discountId = event.entity_id || p.id;

  if (event.operation === 'DELETE' || event.event_type === 'DISCOUNT_DELETED') {
    await tx.execute(`UPDATE ${TABLES.DISCOUNTS} SET active = 0, updated_at = ? WHERE id = ?;`, [now, discountId]);
    await tx.execute(
      `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('DISCOUNT', ?, ?, ?);`,
      [discountId, now, event.device_id]
    );
    return;
  }

  // Idempotency: skip if already have a newer version
  const existing = await tx.queryOne<{ updated_at: number }>(
    `SELECT updated_at FROM ${TABLES.DISCOUNTS} WHERE id = ?;`,
    [discountId]
  );
  const incomingTs = Number(p.updated_at) || now;
  if (existing && Number(existing.updated_at) >= incomingTs) return;

  await tx.execute(
    `INSERT INTO ${TABLES.DISCOUNTS} (
      id, name, description, type, value, conditions,
      min_amount, max_discount, valid_from, valid_to, valid_days,
      active, is_auto_apply, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      type = excluded.type,
      value = excluded.value,
      conditions = excluded.conditions,
      min_amount = excluded.min_amount,
      max_discount = excluded.max_discount,
      valid_from = excluded.valid_from,
      valid_to = excluded.valid_to,
      valid_days = excluded.valid_days,
      active = excluded.active,
      is_auto_apply = excluded.is_auto_apply,
      updated_at = excluded.updated_at
    WHERE excluded.updated_at > ${TABLES.DISCOUNTS}.updated_at;`,
    [
      discountId,
      p.name || 'Discount',
      p.description || '',
      p.type || 'percentage',
      Number(p.value) || 0,
      p.conditions || '[]',
      p.min_amount ?? null,
      p.max_discount ?? null,
      p.valid_from || now,
      p.valid_to || now,
      p.valid_days ?? null,
      p.active !== undefined ? (p.active ? 1 : 0) : 1,
      p.is_auto_apply ? 1 : 0,
      p.created_at || now,
      incomingTs,
    ]
  );
}

export function registerDiscountEventHandlers(): void {
  registerEventHandler('DISCOUNT', handleRemoteDiscountEvent);
  registerEventHandler('DISCOUNT_CREATED', handleRemoteDiscountEvent);
  registerEventHandler('DISCOUNT_UPDATED', handleRemoteDiscountEvent);
  registerEventHandler('DISCOUNT_DELETED', handleRemoteDiscountEvent);
}
