/**
 * Customer Ledger Repository
 * Authoritative append-only customer debit & credit ledger in local SQLite.
 */

import { getDatabase } from '../../db';
import { CustomerLedger } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';

export interface CustomerPaymentInput {
  customerId: string;
  amount: number;
  paymentMode?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export async function receiveCustomerPayment(
  params: CustomerPaymentInput
): Promise<{ balanceBefore: number; balanceAfter: number; ledgerId: string }> {
  const deviceId = await getDeviceId();
  const now = Date.now();
  const ledgerId = generateId();
  const paymentAmount = Number(params.amount) || 0;

  let balanceBefore = 0;
  let balanceAfter = 0;

  await commitLocalTransaction({
    entityType: 'CUSTOMER_LEDGER',
    entityId: ledgerId,
    operation: 'CREATE',
    eventType: 'CUSTOMER_PAYMENT',
    deviceId,
    userId: params.createdBy || 'cashier',
    payload: {
      id: ledgerId,
      customerId: params.customerId,
      type: 'payment',
      amount: paymentAmount,
      paymentMode: params.paymentMode || 'cash',
      reference: params.reference || null,
      note: params.note || null,
      timestamp: now,
    },
    execute: async (tx) => {
      // 1. Fetch current customer balance
      const custRow = await tx.queryOne<{ current_balance: number }>(
        `SELECT current_balance FROM customers WHERE id = ?;`,
        [params.customerId]
      );
      balanceBefore = custRow ? Number(custRow.current_balance) : 0;
      balanceAfter = balanceBefore - paymentAmount;

      // 2. Update customer balance in SQLite
      await tx.execute(
        `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
        [balanceAfter, now, params.customerId]
      );

      // 3. Insert customer_ledger credit row
      await tx.execute(
        `INSERT INTO customer_ledger (
          id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
        ) VALUES (?, ?, 'payment', ?, ?, NULL, ?, ?, ?);`,
        [
          ledgerId,
          params.customerId,
          paymentAmount,
          balanceAfter,
          params.paymentMode || 'cash',
          params.note || params.reference || 'Payment Received',
          now,
        ]
      );

      // 4. Insert into payments table (cash inflow to drawer/wallet)
      await tx.execute(
        `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
         VALUES (?, NULL, ?, ?, ?, ?);`,
        [
          generateId(),
          params.paymentMode || 'cash',
          paymentAmount,
          `Customer Payment: ${params.customerId}`,
          now,
        ]
      );
    },
  });

  // Keep localDb in sync
  try {
    await localDb.customers.update(params.customerId, { balance: balanceAfter });
    await localDb.customerLedger.add({
      id: ledgerId,
      customerId: params.customerId,
      type: 'payment_received',
      debit: 0,
      credit: paymentAmount,
      balanceAfter,
      reference: params.reference,
      note: params.note,
      createdBy: params.createdBy,
      createdAt: new Date(now),
    });
  } catch {}

  return { balanceBefore, balanceAfter, ledgerId };
}

export async function refundCustomerPayment(params: {
  customerId: string;
  amount: number;
  paymentMode?: string;
  paymentModeId?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
}): Promise<{ balanceBefore: number; balanceAfter: number; ledgerId: string }> {
  const deviceId = await getDeviceId();
  const now = Date.now();
  const ledgerId = generateId();
  const refundAmount = Number(params.amount) || 0;

  let balanceBefore = 0;
  let balanceAfter = 0;

  await commitLocalTransaction({
    entityType: 'CUSTOMER_LEDGER',
    entityId: ledgerId,
    operation: 'CREATE',
    eventType: 'CUSTOMER_PAYMENT',
    deviceId,
    userId: params.createdBy || 'cashier',
    payload: {
      id: ledgerId,
      customerId: params.customerId,
      type: 'refund',
      amount: refundAmount,
      paymentMode: params.paymentMode || 'cash',
      reference: params.reference || null,
      note: params.note || null,
      timestamp: now,
    },
    execute: async (tx) => {
      const custRow = await tx.queryOne<{ current_balance: number }>(
        `SELECT current_balance FROM customers WHERE id = ?;`,
        [params.customerId]
      );
      balanceBefore = custRow ? Number(custRow.current_balance) : 0;
      balanceAfter = balanceBefore + refundAmount;

      await tx.execute(
        `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
        [balanceAfter, now, params.customerId]
      );

      await tx.execute(
        `INSERT INTO customer_ledger (
          id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
        ) VALUES (?, ?, 'refund', ?, ?, NULL, ?, ?, ?);`,
        [
          ledgerId,
          params.customerId,
          refundAmount,
          balanceAfter,
          params.paymentMode || 'cash',
          params.note || params.reference || 'Customer Refund',
          now,
        ]
      );

      await tx.execute(
        `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
         VALUES (?, NULL, ?, ?, ?, ?);`,
        [
          generateId(),
          params.paymentMode || 'cash',
          -refundAmount,
          `Customer Refund: ${params.customerId}`,
          now,
        ]
      );
    },
  });

  try {
    await localDb.customers.update(params.customerId, { balance: balanceAfter });
    await localDb.customerLedger.add({
      id: ledgerId,
      customerId: params.customerId,
      type: 'refund',
      debit: refundAmount,
      credit: 0,
      balanceAfter,
      reference: params.reference,
      note: params.note,
      createdBy: params.createdBy,
      createdAt: new Date(now),
    });
  } catch {}

  return { balanceBefore, balanceAfter, ledgerId };
}

export async function getCustomerLedgerHistory(customerId: string): Promise<CustomerLedger[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at ASC;`,
    [customerId]
  );
  return rows.map((r: any) => ({
    id: r.id,
    customerId: r.customer_id,
    saleId: r.sale_id || undefined,
    type: r.type,
    debit: r.type === 'sale' ? Number(r.amount) : 0,
    credit: r.type === 'payment' || r.type === 'refund' ? Number(r.amount) : 0,
    balanceAfter: Number(r.balance_after),
    reference: r.payment_mode || undefined,
    note: r.notes || undefined,
    createdAt: new Date(Number(r.created_at)),
  }));
}
