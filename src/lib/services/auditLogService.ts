/**
 * Sale Audit Log Service — Supabase-only cloud-direct.
 * Append-only tamper-evident sale-action log in the mirror `sale_audit_log`. No Dexie.
 * `buildSaleAuditLogOp` returns an atomicWrite op so the audit row lives INSIDE the sale's
 * bundle (§1.5.6) — the audit entry saves atomically with the sale, or not at all.
 */

import { insertRow, type AtomicInsert } from '../../data';
import { getDeviceId } from '../deviceId';

export type SaleAuditAction =
  | 'created' | 'edited' | 'deleted' | 'refunded' | 'partially_refunded'
  | 'discount_changed' | 'payment_changed' | 'item_added' | 'item_removed'
  | 'price_changed' | 'status_changed';

export interface SaleAuditEntry {
  saleId?: string;
  invoiceNumber?: string;
  action: SaleAuditAction;
  performedByName?: string;
  performedByRole?: string;
  note?: string;
  meta?: any;
}

/** Build the append-only sale_audit_log row for a sale action (no write). */
function buildSaleAuditRow(entry: SaleAuditEntry): Record<string, any> {
  return {
    sale_id: entry.saleId || null,
    invoice_number: entry.invoiceNumber || null,
    action: entry.action,
    performed_by_name: entry.performedByName || null,
    performed_by_role: entry.performedByRole || null,
    device_id: getDeviceId(),
    note: entry.note || null,
    meta: entry.meta ? JSON.stringify(entry.meta) : null,
  };
}

/** Build an atomicWrite insert op for a sale_audit_log row (for use inside a bundle). */
export function buildSaleAuditLogOp(entry: SaleAuditEntry): AtomicInsert {
  return { table: 'sale_audit_log', op: 'insert', row: buildSaleAuditRow(entry) };
}

export async function logAuditEvent(entry: SaleAuditEntry): Promise<void> {
  try {
    await insertRow('sale_audit_log', buildSaleAuditRow(entry));
  } catch {
    /* non-fatal */
  }
}
