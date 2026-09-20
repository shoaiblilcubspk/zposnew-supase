/**
 * Sale Return & Refund Service
 * Authoritative local-first return execution and stock restoration.
 */

import { RefundRequest } from '../../types';
import { processSaleRefund, calculateRefundAmount } from './sales/refundCoordinator';

export { calculateRefundAmount };

export async function returnSale(
  id: string,
  request?: RefundRequest,
  currentCashierName?: string,
  _overrideToken?: any
): Promise<void> {
  await processSaleRefund(id, request, currentCashierName);
}
