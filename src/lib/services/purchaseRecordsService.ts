/**
 * Purchase Records & Restock Service
 * Driven by local SQLite append-only inventory ledger and outbox events.
 */

import { PurchaseRecord } from '../../types';
import { localDb } from '../localDb';
import { commitStockMovement } from './inventory/stockMovementCommit';

export const purchaseRecordsService = {
  async getAll(): Promise<PurchaseRecord[]> {
    return await localDb.purchaseRecords.toArray();
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
    return await localDb.purchaseRecords.toArray();
  },

  async delete(id: string): Promise<void> {
    const record = await localDb.purchaseRecords.get(id);
    if (record && record.productId) {
      // Reversal movement in local SQLite ledger
      await commitStockMovement({
        productId: record.productId,
        quantity: -record.quantity,
        notes: `Reversal of purchase ${id}`,
        type: 'Adjustment',
      });
    }
    await localDb.purchaseRecords.delete(id);
  },
};
