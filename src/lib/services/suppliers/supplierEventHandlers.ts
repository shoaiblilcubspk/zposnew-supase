/**
 * Supplier & Purchase Ledger Remote P2P Event Handlers
 * Receives remote supplier profile and payable movements across terminals.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { localDb } from '../../localDb';

export async function handleRemoteSupplierEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const supplierId = event.entity_id || p.id;

  if (event.operation === 'DELETE') {
    await tx.execute(`UPDATE suppliers SET active = 0, updated_at = ? WHERE id = ?;`, [now, supplierId]);
    await tx.execute(
      `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('SUPPLIER', ?, ?, ?);`,
      [supplierId, now, event.device_id]
    );
    try { await localDb.suppliers.delete(supplierId); } catch {}
    return;
  }

  // ─── Phone/Name dedup: prevent duplicate on cross-device sync ──────────────
  let effectiveId = supplierId;
  if (p.phone) {
    const byPhone = await tx.queryOne<{ id: string }>(
      `SELECT id FROM suppliers WHERE phone = ? AND active = 1 LIMIT 1;`, [p.phone]
    );
    if (byPhone && byPhone.id !== supplierId) effectiveId = byPhone.id;
  } else if (p.name) {
    const byName = await tx.queryOne<{ id: string }>(
      `SELECT id FROM suppliers WHERE LOWER(name) = LOWER(?) AND active = 1 LIMIT 1;`, [p.name]
    );
    if (byName && byName.id !== supplierId) effectiveId = byName.id;
  }

  await tx.execute(
    `INSERT INTO suppliers (id, name, phone, email, address, balance, active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       phone = COALESCE(excluded.phone, suppliers.phone),
       email = COALESCE(excluded.email, suppliers.email),
       address = COALESCE(excluded.address, suppliers.address),
       balance = excluded.balance,
       active = excluded.active,
       updated_at = excluded.updated_at;`,
    [
      effectiveId,
      p.name || 'Unnamed',
      p.phone || null,
      p.email || null,
      p.address || null,
      p.balance || 0,
      p.active !== undefined ? (p.active ? 1 : 0) : 1,
      now,
    ]
  );

  try {
    await localDb.suppliers.put({
      id: effectiveId,
      name: p.name || 'Unnamed',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      openingBalance: p.balance || 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
  } catch {}
}

export async function handleRemotePurchaseRecordEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const billId = event.entity_id || p.id;

  const existing = await tx.queryOne(`SELECT 1 FROM purchase_records WHERE id = ?;`, [billId]);
  if (existing) return;

  const amount = Number(p.amount) || 0;

  if (p.supplierId) {
    // Increment supplier balance additively
    await tx.execute(
      `UPDATE suppliers SET balance = balance + ?, updated_at = ? WHERE id = ?;`,
      [amount, now, p.supplierId]
    );
  }

  await tx.execute(
    `INSERT INTO purchase_records (
      id, supplier_id, invoice_number, total_amount, paid_amount, status, created_at
    ) VALUES (?, ?, ?, ?, 0, 'received', ?);`,
    [billId, p.supplierId || null, billId, amount, now]
  );
}

export function registerSupplierEventHandlers(): void {
  registerEventHandler('SUPPLIER', handleRemoteSupplierEvent);
  registerEventHandler('PURCHASE_RECORD', handleRemotePurchaseRecordEvent);
}
