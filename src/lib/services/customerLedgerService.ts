/**
 * Customer Ledger Service
 * Local-First ledger queries and payment receipts.
 */

import { CustomerLedger } from '../../types';
import {
  receiveCustomerPayment as repoReceiveCustomerPayment,
  refundCustomerPayment as repoRefundCustomerPayment,
  getCustomerLedgerHistory,
  CustomerPaymentInput,
} from './customers/customerLedgerRepository';

export const mapCustomerLedger = (row: any): CustomerLedger => ({
  id: row.id,
  customerId: row.customer_id ?? row.customerId,
  saleId: row.sale_id ?? row.saleId,
  type: row.type,
  debit: parseFloat(row.debit) || 0,
  credit: parseFloat(row.credit) || 0,
  balanceAfter: parseFloat(row.balance_after ?? row.balanceAfter) || 0,
  reference: row.reference,
  note: row.note,
  createdBy: row.created_by ?? row.createdBy,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(row.createdAt),
});

export async function fetchCustomerLedger(customerId: string): Promise<CustomerLedger[]> {
  return getCustomerLedgerHistory(customerId);
}

export async function receiveCustomerPayment(
  params: CustomerPaymentInput & { idempotencyKey?: string }
): Promise<{ balanceBefore: number; balanceAfter: number; ledgerId: string }> {
  return repoReceiveCustomerPayment(params);
}

export async function refundCustomerPayment(
  params: any
): Promise<{ balanceBefore: number; balanceAfter: number; ledgerId: string }> {
  return repoRefundCustomerPayment(params);
}
