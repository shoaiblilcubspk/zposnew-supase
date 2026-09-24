/**
 * Inventory Ledger Repository — Supabase-only cloud-direct (Phase 10g).
 * Append-only stock movements in the local mirror `inventory_ledger`, pushed via the sync
 * queue. No P2P, no old `inventory_transactions` table. Current stock = SUM(quantity).
 *
 * Notes:
 *  - `quantity` is SIGNED (+ in / restock / initial / return, - out / damage). The
 *    `current_stock` VIEW and all balances derive from the signed sum (Rule 7).
 *  - The schema `type`/`reference_type` columns are free text, so we keep the caller's
 *    granular type verbatim (INITIAL/RESTOCK/ADJUSTMENT/…) for faithful stock-history display.
 *  - `balance_after` no longer stored (Rule 7 — never a directly-edited field); it is computed
 *    on read as a running sum.
 *  - Legacy callers may pass a SQLite transaction handle; it is ignored (writes now go through
 *    the queue). Kept in the signature for source compatibility.
 */

import { localQuery, insertRow, type AtomicInsert } from '../../../data';
import type { ISqliteTransaction } from '../../db/types';

export interface InventoryTxRecord {
  id: string;
  productId: string;
  variantId?: string;
  type: 'INVENTORY_IN' | 'INVENTORY_OUT' | 'AUDIT' | 'RESTOCK' | 'ADJUSTMENT' | 'INITIAL' | 'RETURN';
  quantity: number;
  balanceAfter?: number;
  referenceType: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'AUDIT' | 'RETURN';
  referenceId: string;
  deviceId: string;
  userId: string;
  notes?: string;
  createdAt: number;
}

/** Build the append-only inventory_ledger row for a tx record (no write). */
export function buildInventoryLedgerRow(txRecord: InventoryTxRecord): Record<string, any> {
  return {
    product_id: txRecord.productId,
    variant_id: txRecord.variantId || null,
    type: txRecord.type,
    quantity: Number(txRecord.quantity) || 0,
    reference_type: txRecord.referenceType,
    reference_id: txRecord.referenceId || null,
    device_id: txRecord.deviceId || null,
    user_id: txRecord.userId || null,
    notes: txRecord.notes || null,
    created_at: txRecord.createdAt ? new Date(txRecord.createdAt).toISOString() : new Date().toISOString(),
  };
}

/** Build an atomicWrite insert op for an inventory_ledger row (for use inside a bundle). */
export function buildInventoryLedgerOp(txRecord: InventoryTxRecord): AtomicInsert {
  return { table: 'inventory_ledger', op: 'insert', row: buildInventoryLedgerRow(txRecord) };
}

/** Fire the reactive UI event for a ledger row (call AFTER the bundle commits). */
export function dispatchInventoryTxEvent(txRecord: InventoryTxRecord): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inventory-tx-created', { detail: txRecord }));
  }
}

export async function insertInventoryTransaction(
  txRecord: InventoryTxRecord,
  _sqliteTx?: ISqliteTransaction
): Promise<void> {
  await insertRow('inventory_ledger', buildInventoryLedgerRow(txRecord));
  dispatchInventoryTxEvent(txRecord);
}

function mapRow(r: any, balanceAfter?: number): InventoryTxRecord {
  return {
    id: r.id,
    productId: r.product_id,
    variantId: r.variant_id || undefined,
    type: r.type,
    quantity: Number(r.quantity),
    balanceAfter,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    deviceId: r.device_id,
    userId: r.user_id,
    notes: r.notes || undefined,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}

export async function getProductStockHistory(productId: string): Promise<InventoryTxRecord[]> {
  // Ascending to compute the running balance, then return newest-first for the UI.
  const rows = await localQuery<any>(
    `SELECT * FROM inventory_ledger WHERE product_id = ? ORDER BY created_at ASC;`,
    [productId]
  );
  let running = 0;
  const asc = rows.map((r) => {
    running += Number(r.quantity) || 0;
    return mapRow(r, running);
  });
  return asc.reverse();
}

export async function getAllInventoryTransactions(limit = 100): Promise<InventoryTxRecord[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM inventory_ledger ORDER BY created_at DESC LIMIT ?;`,
    [limit]
  );
  return rows.map((r) => mapRow(r));
}
