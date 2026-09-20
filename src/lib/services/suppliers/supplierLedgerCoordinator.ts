/**
 * Supplier Ledger Coordinator
 * Authoritative ledger for supplier bills, payments, and accounts payable balances.
 */

import { getDatabase } from '../../db';
import { SupplierTransaction } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';
import { useInventoryStore } from '../../../stores/inventoryStore';

export interface RecordBillParams {
  supplierId: string;
  amount: number;
  note?: string;
  referenceId?: string;
  date?: Date;
  userId?: string;
}

export interface RecordPaymentParams {
  supplierId: string;
  amount: number;
  paymentMode?: string;
  note?: string;
  referenceId?: string;
  userId?: string;
}

export async function recordSupplierBill(params: RecordBillParams): Promise<string> {
  const deviceId = await getDeviceId();
  const now = Date.now();
  const billId = params.referenceId || generateId();
  const amount = Number(params.amount) || 0;
  const supplierId = params.supplierId || (params as any).supplier_id;
  if (!supplierId) {
    throw new Error('Supplier ID is required to record bill');
  }

  await commitLocalTransaction({
    entityType: 'PURCHASE_RECORD',
    entityId: billId,
    operation: 'CREATE',
    eventType: 'PURCHASE_CREATED',
    deviceId,
    userId: params.userId || 'system',
    payload: {
      id: billId,
      supplierId,
      amount,
      note: params.note || null,
      timestamp: now,
    },
    execute: async (tx) => {
      // 1. Increment supplier balance
      await tx.execute(
        `UPDATE suppliers SET balance = balance + ?, updated_at = ? WHERE id = ?;`,
        [amount, now, supplierId]
      );

      // 2. Insert into purchase_records
      await tx.execute(
        `INSERT INTO purchase_records (
          id, supplier_id, invoice_number, total_amount, paid_amount, status, created_at
        ) VALUES (?, ?, ?, ?, 0, 'received', ?);`,
        [billId, supplierId, billId, amount, now]
      );
    },
  });

  try {
    const s = await localDb.suppliers.get(supplierId);
    if (s) {
      const updated = {
        ...s,
        openingBalance: (s.openingBalance || 0) + amount,
      };
      await localDb.suppliers.update(supplierId, updated);
      useInventoryStore.getState().updateSupplier(updated);
    }
    await localDb.supplierTransactions.add({
      id: billId,
      supplierId,
      type: 'purchase',
      sourceType: 'manual_bill',
      amount,
      note: params.note,
      createdAt: params.date || new Date(now),
    });
  } catch {}

  return billId;
}

export async function recordSupplierPayment(params: RecordPaymentParams): Promise<string> {
  const deviceId = await getDeviceId();
  const now = Date.now();
  const paymentId = params.referenceId || generateId();
  const amount = Number(params.amount) || 0;
  const supplierId = params.supplierId || (params as any).supplier_id;
  if (!supplierId) {
    throw new Error('Supplier ID is required to record payment');
  }
  const paymentMode = params.paymentMode || (params as any).payment_type || (params as any).paymentMethod || 'cash';

  await commitLocalTransaction({
    entityType: 'PAYMENT_MODE',
    entityId: paymentId,
    operation: 'CREATE',
    eventType: 'SUPPLIER_PAYMENT_CREATED',
    deviceId,
    userId: params.userId || 'system',
    payload: {
      id: paymentId,
      supplierId,
      amount,
      paymentMode,
      note: params.note || null,
      timestamp: now,
    },
    execute: async (tx) => {
      // 1. Decrement supplier balance (payable decreases)
      await tx.execute(
        `UPDATE suppliers SET balance = balance - ?, updated_at = ? WHERE id = ?;`,
        [amount, now, supplierId]
      );

      // 2. Record cash outflow in payments
      await tx.execute(
        `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
         VALUES (?, NULL, ?, ?, ?, ?);`,
        [paymentId, paymentMode, -amount, `Supplier Payment: ${supplierId}`, now]
      );
    },
  });

  try {
    const s = await localDb.suppliers.get(supplierId);
    if (s) {
      const updated = {
        ...s,
        openingBalance: (s.openingBalance || 0) - amount,
      };
      await localDb.suppliers.update(supplierId, updated);
      useInventoryStore.getState().updateSupplier(updated);
    }
    await localDb.supplierTransactions.add({
      id: paymentId,
      supplierId,
      type: 'payment',
      sourceType: 'payment',
      amount,
      note: params.note,
      createdAt: new Date(now),
    });
  } catch {}

  return paymentId;
}

export async function getSupplierBalance(supplierId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.queryOne<{ balance: number }>(
    `SELECT balance FROM suppliers WHERE id = ?;`,
    [supplierId]
  );
  return row ? Number(row.balance) : 0;
}

export async function getSupplierTransactions(supplierId: string): Promise<SupplierTransaction[]> {
  const txs = await localDb.supplierTransactions.where('supplierId').equals(supplierId).toArray();
  return txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
