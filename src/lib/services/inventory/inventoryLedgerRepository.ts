/**
 * Inventory Ledger Repository
 * Authoritative append-only stock movement ledger in local SQLite.
 */

import { getDatabase } from '../../db';
import { ISqliteTransaction } from '../../db/types';

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

export async function insertInventoryTransaction(
  txRecord: InventoryTxRecord,
  sqliteTx?: ISqliteTransaction
): Promise<void> {
  const runner = sqliteTx || (await getDatabase());
  await runner.execute(
    `INSERT OR IGNORE INTO inventory_transactions (
      id, product_id, variant_id, type, quantity, balance_after,
      reference_type, reference_id, device_id, user_id, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      txRecord.id,
      txRecord.productId,
      txRecord.variantId || null,
      txRecord.type,
      txRecord.quantity,
      txRecord.balanceAfter !== undefined ? txRecord.balanceAfter : null,
      txRecord.referenceType,
      txRecord.referenceId,
      txRecord.deviceId,
      txRecord.userId,
      txRecord.notes || null,
      txRecord.createdAt,
    ]
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inventory-tx-created', { detail: txRecord }));
  }
}

export async function getProductStockHistory(productId: string): Promise<InventoryTxRecord[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM inventory_transactions 
     WHERE product_id = ? 
     ORDER BY created_at DESC;`,
    [productId]
  );
  return rows.map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    variantId: r.variant_id || undefined,
    type: r.type,
    quantity: Number(r.quantity),
    balanceAfter: r.balance_after !== null ? Number(r.balance_after) : undefined,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    deviceId: r.device_id,
    userId: r.user_id,
    notes: r.notes || undefined,
    createdAt: Number(r.created_at),
  }));
}

export async function getAllInventoryTransactions(limit = 100): Promise<InventoryTxRecord[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM inventory_transactions 
     ORDER BY created_at DESC 
     LIMIT ?;`,
    [limit]
  );
  return rows.map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    variantId: r.variant_id || undefined,
    type: r.type,
    quantity: Number(r.quantity),
    balanceAfter: r.balance_after !== null ? Number(r.balance_after) : undefined,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    deviceId: r.device_id,
    userId: r.user_id,
    notes: r.notes || undefined,
    createdAt: Number(r.created_at),
  }));
}
