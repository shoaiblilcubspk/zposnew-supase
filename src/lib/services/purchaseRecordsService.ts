/**
 * Purchase Records & Restock Service — Supabase-only cloud-direct (Phase 10g).
 * Reads the purchase-history log from the local mirror; creates rows via commitStockMovement
 * (which also posts the inventory ledger + stock cache). No Dexie.
 */

import { PurchaseRecord } from '../../types';
import { localQuery, localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../data';
import { commitStockMovement } from './inventory/stockMovementCommit';
import {
  buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord,
} from './inventory/inventoryLedgerRepository';

function mapRow(r: any): PurchaseRecord {
  return {
    id: r.id,
    type: r.type || 'Stock IN',
    productId: r.product_id || undefined,
    productName: r.product_name || 'Product',
    sku: r.sku || undefined,
    variantId: r.variant_id || undefined,
    variantLabel: r.variant_label || undefined,
    quantity: Number(r.quantity) || 0,
    costPrice: Number(r.cost_price) || 0,
    retailPrice: r.retail_price != null ? Number(r.retail_price) : undefined,
    totalAmount: Number(r.total_amount) || 0,
    supplier: r.supplier || 'Direct',
    date: r.purchased_at ? new Date(r.purchased_at) : new Date(),
    addedBy: r.added_by || 'system',
    notes: r.notes || '',
    createdAt: r.created_at ? new Date(r.created_at) : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
  };
}

export const purchaseRecordsService = {
  async getAll(): Promise<PurchaseRecord[]> {
    const rows = await localQuery<any>(`SELECT * FROM purchase_records WHERE deleted_at IS NULL ORDER BY purchased_at DESC;`);
    return rows.map(mapRow);
  },

  async create(record: Omit<PurchaseRecord, 'id'>, supplierBillData?: any): Promise<PurchaseRecord> {
    return commitStockMovement({
      productId: record.productId || '',
      productName: record.productName,
      sku: record.sku,
      variantId: record.variantId,
      variantLabel: record.variantLabel,
      quantity: record.quantity,
      costPrice: record.costPrice,
      type: record.type as any,
      supplier: record.supplier,
      supplierId: supplierBillData?.supplierId,
      notes: record.notes,
      userId: record.addedBy,
      date: record.date,
      recordAsSupplierBill: Boolean(supplierBillData),
    });
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<PurchaseRecord[]> {
    return this.getAll();
  },

  async delete(id: string): Promise<void> {
    const record = await localQueryOne<any>(`SELECT * FROM purchase_records WHERE id = ? AND deleted_at IS NULL;`, [id]);

    // ONE atomic bundle: append the stock reversal (Rule 7) + recompute stock cache +
    // remove the purchase log row. Either all of it lands or none of it (no half-delete).
    const ops: AtomicOp[] = [];
    let ledgerRec: InventoryTxRecord | null = null;
    const now = Date.now();

    if (record && record.product_id) {
      const qty = Number(record.quantity) || 0;
      const balRow = await localQueryOne<{ bal: number }>(
        `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_ledger WHERE product_id = ?;`,
        [record.product_id]
      );
      const existingSum = balRow ? Number(balRow.bal) : 0;
      ledgerRec = {
        id: `itx_purge_${id}`,
        productId: record.product_id,
        variantId: record.variant_id || undefined,
        type: 'ADJUSTMENT',
        quantity: -qty,
        referenceType: 'ADJUSTMENT',
        referenceId: id,
        deviceId: '',
        userId: 'system',
        notes: `Reversal of purchase ${id}`,
        createdAt: now,
      };
      ops.push(buildInventoryLedgerOp(ledgerRec));
      ops.push({ table: 'products', op: 'update', id: record.product_id, patch: { stock: existingSum - qty } });
    }
    // Soft-delete (tombstone) the purchase row so the deletion propagates to all devices via
    // pull; a hard DELETE would never reach other devices' local mirrors.
    ops.push({ table: 'purchase_records', op: 'update', id, patch: { deleted_at: now ? new Date(now).toISOString() : new Date().toISOString() } });

    await atomicWrite(ops, { operation_id: newOperationId(), action: 'delete_purchase_record' });
    if (ledgerRec) dispatchInventoryTxEvent(ledgerRec);
  },
};
