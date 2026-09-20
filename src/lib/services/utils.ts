import {
  AppSettings,
} from '../../types';

export async function fetchAllPages(queryFn: () => any, limit = 1000): Promise<any[]> {
  // SAFEGUARD: Supabase PostgREST default max_rows is 1000.
  // Passing a limit > 1000 will cause premature termination because data.length (1000) will be < limit,
  // making the loop think it has reached the last page.
  const actualLimit = Math.min(limit, 1000);

  let allData: any[] = [];
  let from = 0;
  let to = actualLimit - 1;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryFn().range(from, to);
    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < actualLimit) {
        hasMore = false;
      } else {
        from += actualLimit;
        to += actualLimit;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
}

/**
 * DEVICE IDENTIFICATION (Unique per browser/terminal)
 * Prevents invoice number collisions between multiple offline devices.
 */
export const getDeviceId = (): string => {
  if (typeof localStorage !== 'undefined') {
    const existing = localStorage.getItem('deviceId');
    if (existing) return existing;

    const newId = Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('deviceId', newId);
    return newId;
  }
  return 'DEV1';
};

// Generate invoice number utility with device disambiguation
export function getNextInvoiceNumber(settings: AppSettings): string {
  const nextCounter = settings.invoiceCounter + 1;
  const deviceCode = getDeviceId();
  return `${settings.invoicePrefix || 'INV'}-${deviceCode}-${nextCounter.toString().padStart(6, '0')}`;
}

// Generate next invoice number and return data for updating settings
export function generateNextInvoiceNumber(settings: AppSettings): { invoiceNumber: string; newCounter: number } {
  const newCounter = settings.invoiceCounter + 1;
  const deviceCode = getDeviceId();
  const invoiceNumber = `${settings.invoicePrefix || 'INV'}-${deviceCode}-${newCounter.toString().padStart(6, '0')}`;
  return { invoiceNumber, newCounter };
}

/**
 * MAPPERS: Transitioning from snake_case (DB) to CamelCase (Frontend)
 * and ensuring Date objects are consistent.
 */

export function getAmountByMethod(sale: any, method: string): number {
  const want = normalizePaymentMethod(method);
  const matches = (m: string) => {
    const nm = normalizePaymentMethod(m);
    if (want === 'online') return nm === 'online' || nm === 'digital';
    return nm === want;
  };
  if (sale.splitPayments && sale.splitPayments.length > 0) {
    return (sale.splitPayments || [])
      .filter((sp: any) => matches(sp.method))
      .reduce((sum: number, sp: any) => sum + (Number(sp.amount) || 0), 0);
  }

  return matches(sale.paymentMethod) ? (Number(sale.total) || 0) : 0;
}

export function derivePaymentStatus(sale: any): string {
  const st = sale?.status;
  if (st === 'refunded') return 'refunded';
  if (st === 'partially_refunded') return 'partially_refunded';
  if (st === 'draft') return 'unpaid';
  const total = Number(sale?.total) || 0;
  const received = Number(sale?.receivedAmount) || 0;
  const due = total - received;
  if (due > 0.01) return received > 0 ? 'partially_paid' : 'unpaid';
  return 'paid';
}

// P6/P24: append an immutable customer_ledger entry (cloud-direct).
// Returns the new running balance_after.
export const normalizePaymentMethod = (method: string): string => {
  if (!method) return 'cash';
  const m = method.toLowerCase().trim();
  if (m === 'digital' || m === 'wallet') return 'online';
  return m; // custom modes pass through as-is
};


export { generateId } from '../localDb';
export { generateBarcodeValue } from '../../utils/barcode';
