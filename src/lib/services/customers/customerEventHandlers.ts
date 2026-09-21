/**
 * Customer & Ledger Remote P2P Event Handlers
 * Receives remote customer creations, profile updates, and repayments across terminals.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { localDb } from '../../localDb';

export async function handleRemoteCustomerEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const customerId = event.entity_id || p.id;

  if (event.operation === 'DELETE') {
    await tx.execute(`UPDATE customers SET active = 0, updated_at = ? WHERE id = ?;`, [now, customerId]);
    await tx.execute(
      `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('CUSTOMER', ?, ?, ?);`,
      [customerId, now, event.device_id]
    );
    try { await localDb.customers.delete(customerId); } catch {}
    return;
  }

  // ─── Phone-based dedup: check if same phone exists with a DIFFERENT id ─────
  // Scenario: Device A creates customer with id=AAA, Device B creates same person with id=BBB.
  // When B's event arrives at A, we must NOT create a second row. Instead, use the existing local id.
  let effectiveId = customerId;
  if (p.phone) {
    const existingByPhone = await tx.queryOne<{ id: string }>(
      `SELECT id FROM customers WHERE phone = ? AND active = 1 LIMIT 1;`,
      [p.phone]
    );
    if (existingByPhone && existingByPhone.id !== customerId) {
      // Same phone found with different ID — update the existing record, skip creating duplicate
      effectiveId = existingByPhone.id;
    }
  }

  await tx.execute(
    `INSERT INTO customers (
      id, name, phone, email, address, credit_limit, current_balance, active, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      phone = COALESCE(excluded.phone, customers.phone),
      email = COALESCE(excluded.email, customers.email),
      address = COALESCE(excluded.address, customers.address),
      credit_limit = excluded.credit_limit,
      current_balance = excluded.current_balance,
      active = excluded.active,
      updated_at = excluded.updated_at;`,
    [
      effectiveId,
      p.name || 'Unnamed',
      p.phone || null,
      p.email || null,
      p.address || null,
      p.creditLimit || 0,
      p.currentBalance || 0,
      p.active !== undefined ? (p.active ? 1 : 0) : 1,
      now,
    ]
  );

  try {
    await localDb.customers.put({
      id: effectiveId,
      name: p.name || 'Unnamed',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      priceTier: 'retail',
      totalPurchases: 0,
      balance: p.currentBalance || 0,
      creditLimit: p.creditLimit || 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
  } catch {}
}

export async function handleRemoteCustomerLedgerEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const ledgerId = event.entity_id || p.id;

  // 1. Idempotency Check
  const existing = await tx.queryOne(
    `SELECT 1 FROM customer_ledger WHERE id = ?;`,
    [ledgerId]
  );
  if (existing) return;

  const paymentAmount = Number(p.amount) || 0;

  // 2. Adjust customer balance additively
  const custRow = await tx.queryOne<{ current_balance: number }>(
    `SELECT current_balance FROM customers WHERE id = ?;`,
    [p.customerId]
  );
  const currentBal = custRow ? Number(custRow.current_balance) : 0;
  const newBal = currentBal - paymentAmount;

  await tx.execute(
    `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
    [newBal, now, p.customerId]
  );

  // 3. Insert into customer_ledger
  await tx.execute(
    `INSERT INTO customer_ledger (
      id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?);`,
    [
      ledgerId,
      p.customerId,
      p.type || 'payment',
      paymentAmount,
      newBal,
      p.paymentMode || 'cash',
      p.note || 'Remote Payment',
      p.timestamp || now,
    ]
  );

  // 4. Insert into payments table (sale_id IS NULL = standalone customer payment)
  // This ensures getAllStandalonePayments() picks it up for Financial report wallet stats
  if (p.type === 'payment' || !p.type) {
    const { generateId } = await import('../../localDb');
    await tx.execute(
      `INSERT OR IGNORE INTO payments (id, sale_id, mode_id, amount, reference, created_at)
       VALUES (?, NULL, ?, ?, ?, ?);`,
      [
        generateId(),
        p.paymentMode || 'cash',
        paymentAmount,
        p.note || `Customer Payment: ${p.customerId}`,
        p.timestamp || now,
      ]
    );
  }

  try {
    await localDb.customers.update(p.customerId, { balance: newBal });
  } catch {}
}

export function registerCustomerEventHandlers(): void {
  registerEventHandler('CUSTOMER', handleRemoteCustomerEvent);
  registerEventHandler('CUSTOMER_LEDGER', handleRemoteCustomerLedgerEvent);
}
