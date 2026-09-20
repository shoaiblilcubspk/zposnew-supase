import { localDb, generateId } from '../localDb';
import { getDeviceId } from '../deviceId';

export async function logAuditEvent(entry: {
  saleId?: string; invoiceNumber?: string;
  action: 'created'|'edited'|'deleted'|'refunded'|'partially_refunded'|
    'discount_changed'|'payment_changed'|'item_added'|'item_removed'|'price_changed'|'status_changed';
  performedByName?: string; performedByRole?: string;
  note?: string; meta?: any;
}): Promise<void> {
  const id = generateId();
  const now = new Date();
  const row = {
    id, saleId: entry.saleId || null, invoiceNumber: entry.invoiceNumber || null,
    action: entry.action, performedByName: entry.performedByName || null,
    performedByRole: entry.performedByRole || null, deviceId: getDeviceId(),
    note: entry.note || null, meta: entry.meta || null, createdAt: now,
  };
  try { await localDb.sale_audit_log.add(row); } catch { /* non-fatal */ }
}
