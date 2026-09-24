/**
 * Supplier Ledger Coordinator — Supabase-only cloud-direct (Phase 10m).
 * Supplier bills increase accounts-payable (suppliers.balance) + log a purchase_records row;
 * payments decrease it + append a negative payments row. Transaction history is derived from
 * purchase_records (bills) + supplier payment rows. No P2P, no Dexie.
 */

import { SupplierTransaction } from '../../../types';
import { localQuery, localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import { safeRandomUUID } from '../../crypto/uuid';
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

async function nextSupplierBalance(supplierId: string, delta: number): Promise<number> {
  const row = await localQueryOne<{ balance: number }>(`SELECT balance FROM suppliers WHERE id = ?;`, [supplierId]);
  return (row ? Number(row.balance) : 0) + delta;
}

function syncSupplierStore(supplierId: string, newBal: number): void {
  try {
    const s = useInventoryStore.getState().suppliers.find((x) => x.id === supplierId);
    if (s) useInventoryStore.getState().updateSupplier({ ...s, openingBalance: newBal });
  } catch {}
}

export async function recordSupplierBill(params: RecordBillParams): Promise<string> {
  const supplierId = params.supplierId || (params as any).supplier_id;
  if (!supplierId) throw new Error('Supplier ID is required to record bill');
  const billId = params.referenceId || safeRandomUUID();
  const amount = Number(params.amount) || 0;
  const newBal = await nextSupplierBalance(supplierId, amount); // payable increases

  // ONE bundle: supplier balance (non-additive) + purchase_records log row.
  const ops: AtomicOp[] = [
    { table: 'suppliers', op: 'update', id: supplierId, patch: { balance: newBal } },
    {
      table: 'purchase_records', op: 'insert',
      row: {
        id: billId,
        type: 'Bill',
        supplier_id: supplierId,
        product_name: params.note || 'Supplier Bill',
        quantity: 0,
        cost_price: 0,
        total_amount: amount,
        added_by: params.userId || 'system',
        notes: params.note || null,
        purchased_at: (params.date || new Date()).toISOString(),
      },
    },
  ];
  await atomicWrite(ops, { operation_id: newOperationId(), action: 'supplier_bill' });
  syncSupplierStore(supplierId, newBal);

  return billId;
}

export async function recordSupplierPayment(params: RecordPaymentParams): Promise<string> {
  const supplierId = params.supplierId || (params as any).supplier_id;
  if (!supplierId) throw new Error('Supplier ID is required to record payment');
  const paymentId = params.referenceId || safeRandomUUID();
  const amount = Number(params.amount) || 0;
  const paymentMode = params.paymentMode || (params as any).payment_type || (params as any).paymentMethod || 'cash';
  const newBal = await nextSupplierBalance(supplierId, -amount); // payable decreases

  // ONE bundle: supplier balance (non-additive) + append-only payments row (cash outflow).
  const ops: AtomicOp[] = [
    { table: 'suppliers', op: 'update', id: supplierId, patch: { balance: newBal } },
    {
      table: 'payments', op: 'insert',
      row: {
        id: paymentId,
        sale_id: null,
        mode_code: paymentMode,
        amount: -amount,
        reference: `Supplier Payment: ${supplierId}`,
      },
    },
  ];
  await atomicWrite(ops, { operation_id: newOperationId(), action: 'supplier_payment' });
  syncSupplierStore(supplierId, newBal);

  return paymentId;
}

export async function getSupplierBalance(supplierId: string): Promise<number> {
  const row = await localQueryOne<{ balance: number }>(`SELECT balance FROM suppliers WHERE id = ?;`, [supplierId]);
  return row ? Number(row.balance) : 0;
}

export async function getSupplierTransactions(supplierId: string): Promise<SupplierTransaction[]> {
  const bills = await localQuery<any>(
    `SELECT * FROM purchase_records WHERE supplier_id = ? ORDER BY purchased_at DESC;`, [supplierId]
  );
  const payments = await localQuery<any>(
    `SELECT * FROM payments WHERE reference = ? ORDER BY created_at DESC;`, [`Supplier Payment: ${supplierId}`]
  );

  const txs: SupplierTransaction[] = [
    ...bills.map((b: any): SupplierTransaction => ({
      id: b.id,
      supplierId,
      type: 'purchase',
      sourceType: 'manual_bill',
      amount: Number(b.total_amount) || 0,
      note: b.notes || undefined,
      createdAt: b.purchased_at ? new Date(b.purchased_at) : new Date(),
    } as SupplierTransaction)),
    ...payments.map((p: any): SupplierTransaction => ({
      id: p.id,
      supplierId,
      type: 'payment',
      sourceType: 'payment',
      amount: Math.abs(Number(p.amount) || 0),
      note: p.reference || undefined,
      createdAt: p.created_at ? new Date(p.created_at) : new Date(),
    } as SupplierTransaction)),
  ];

  return txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
