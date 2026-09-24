/**
 * Customer Ledger Repository — Supabase-only cloud-direct (Phase 3: Atomic Action Bundle).
 * A customer payment/refund is ONE atomic bundle (AGENTS.md §1.5): customers.current_balance
 * (non-additive) + append-only customer_ledger entry + append-only payments row. A failure
 * saves nothing — the balance can never drift from the ledger. No P2P, no Dexie.
 */

import { localQuery, localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import { CustomerLedger } from '../../../types';

export interface CustomerPaymentInput {
  customerId: string;
  amount: number;
  paymentMode?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
  operationId?: string;
}

async function getCustomerBalance(customerId: string): Promise<number> {
  const row = await localQueryOne<{ current_balance: number }>(
    `SELECT current_balance FROM customers WHERE id = ?;`,
    [customerId]
  );
  return row ? Number(row.current_balance) || 0 : 0;
}

export async function receiveCustomerPayment(
  params: CustomerPaymentInput
): Promise<{ balanceBefore: number; balanceAfter: number; ledgerId: string }> {
  const paymentAmount = Number(params.amount) || 0;
  const paymentMode = params.paymentMode || 'cash';

  const balanceBefore = await getCustomerBalance(params.customerId);
  const balanceAfter = balanceBefore - paymentAmount;

  const ops: AtomicOp[] = [
    // 1. Update the customer's running balance (non-additive field).
    { table: 'customers', op: 'update', id: params.customerId, patch: { current_balance: balanceAfter } },
    // 2. Append the credit entry to the immutable ledger.
    {
      table: 'customer_ledger', op: 'insert',
      row: {
        customer_id: params.customerId,
        type: 'payment',
        amount: paymentAmount,
        sale_id: null,
        payment_mode: paymentMode,
        notes: params.note || params.reference || 'Payment Received',
        user_id: params.createdBy || 'cashier',
      },
    },
    // 3. Record the cash inflow in the payments ledger (append-only).
    {
      table: 'payments', op: 'insert',
      row: {
        sale_id: null,
        mode_code: paymentMode,
        amount: paymentAmount,
        reference: `Customer Payment: ${params.customerId}`,
        user_id: params.createdBy || 'cashier',
      },
    },
  ];

  const result = await atomicWrite(ops, {
    operation_id: params.operationId ?? newOperationId(),
    action: 'add_payment',
  });
  const ledgerId = String(result.rows[1].payload.id);

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
  operationId?: string;
}): Promise<{ balanceBefore: number; balanceAfter: number; ledgerId: string }> {
  const refundAmount = Number(params.amount) || 0;
  const paymentMode = params.paymentMode || 'cash';

  const balanceBefore = await getCustomerBalance(params.customerId);
  const balanceAfter = balanceBefore + refundAmount;

  const ops: AtomicOp[] = [
    // 1. Update the customer's running balance (non-additive field).
    { table: 'customers', op: 'update', id: params.customerId, patch: { current_balance: balanceAfter } },
    // 2. Append the refund entry to the immutable ledger.
    {
      table: 'customer_ledger', op: 'insert',
      row: {
        customer_id: params.customerId,
        type: 'refund',
        amount: refundAmount,
        sale_id: null,
        payment_mode: paymentMode,
        notes: params.note || params.reference || 'Customer Refund',
        user_id: params.createdBy || 'cashier',
      },
    },
    // 3. Record the cash outflow in the payments ledger (append-only).
    {
      table: 'payments', op: 'insert',
      row: {
        sale_id: null,
        mode_code: paymentMode,
        amount: -refundAmount,
        reference: `Customer Refund: ${params.customerId}`,
        user_id: params.createdBy || 'cashier',
      },
    },
  ];

  const result = await atomicWrite(ops, {
    operation_id: params.operationId ?? newOperationId(),
    action: 'customer_refund',
  });
  const ledgerId = String(result.rows[1].payload.id);

  return { balanceBefore, balanceAfter, ledgerId };
}

export async function getCustomerLedgerHistory(customerId: string): Promise<CustomerLedger[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at ASC;`,
    [customerId]
  );

  // balance_after is not stored on the immutable ledger; compute the running balance.
  let running = 0;
  return rows.map((r: any) => {
    const amount = Number(r.amount) || 0;
    const debit = r.type === 'sale' ? amount : 0;
    const credit = r.type === 'payment' || r.type === 'refund' ? amount : 0;
    running += debit - credit;
    return {
      id: r.id,
      customerId: r.customer_id,
      saleId: r.sale_id || undefined,
      type: r.type,
      debit,
      credit,
      balanceAfter: running,
      reference: r.payment_mode || undefined,
      note: r.notes || undefined,
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    };
  });
}
