/**
 * Atomic Ops Compatibility Facade
 * Kept for legacy error classes and compatibility helpers.
 * Authoritative transactions are executed locally via SQLite and synchronized with Supabase cloud.
 */

export const activeReturns = new Set<string>();

export class ApprovalRequiredError extends Error {}

export async function commitSaleAuthoritative(
  _remoteSale: any,
  _movements: any[],
  _paymentMoves: any[] = [],
  _customerLedger: any = null,
  _maxTries = 2
): Promise<any> {
  return null;
}

export async function revertLocalSaleStock(_saleId: string, _movements: any[]) {
  // No-op in local-first architecture (SQLite transactions roll back atomically)
}

export async function applyStockMovementsRemote(_movements: any[]): Promise<boolean> {
  return true;
}

export async function deleteSaleAtomic(
  _saleId: string,
  _movements: any[],
  _paymentMoves: any[] = [],
  _customerLedger: any = null,
  _overrideToken?: any
): Promise<boolean> {
  return true;
}

export async function refundSaleAtomic(
  _saleId: string,
  _movements: any[],
  _status: string,
  _refundedAmount: number,
  _paymentMoves: any[] = [],
  _customerLedger: any = null,
  _overrideToken?: any
): Promise<boolean> {
  return true;
}
