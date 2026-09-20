/**
 * Stock Movement Commit Pipeline
 * Executes atomic inventory mutations in local SQLite, updates running balance, and writes outbox events.
 */

import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { insertInventoryTransaction, InventoryTxRecord } from './inventoryLedgerRepository';
import { localDb, generateId } from '../../localDb';
import { PurchaseRecord } from '../../../types';

export interface StockMovementInput {
  productId: string;
  productName?: string;
  sku?: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  costPrice?: number;
  type?: 'Stock IN' | 'Adjustment' | 'Damage' | 'AUDIT' | 'Restock';
  supplier?: string;
  supplierId?: string;
  notes?: string;
  userId?: string;
  date?: Date;
  recordAsSupplierBill?: boolean;
}

export async function commitStockMovement(
  input: StockMovementInput
): Promise<PurchaseRecord> {
  const deviceId = await getDeviceId();
  const userId = input.userId || 'system';
  const now = Date.now();
  const id = generateId();
  const delta = Number(input.quantity) || 0;
  const cost = Number(input.costPrice) || 0;
  const movementType = delta >= 0 ? 'INVENTORY_IN' : 'INVENTORY_OUT';

  let resultingBalance = 0;

  await commitLocalTransaction({
    entityType: 'INVENTORY',
    entityId: input.productId,
    operation: 'UPDATE',
    eventType: movementType,
    deviceId,
    userId,
    payload: {
      id,
      productId: input.productId,
      variantId: input.variantId || null,
      quantity: delta,
      costPrice: cost,
      type: movementType,
      referenceType: 'PURCHASE',
      referenceId: id,
      supplierId: input.supplierId || null,
      notes: input.notes || null,
      createdAt: now,
    },
    execute: async (tx) => {
      // 1. Fetch current stock
      const prodRow = await tx.queryOne<{ stock: number }>(
        `SELECT stock FROM products WHERE id = ?;`,
        [input.productId]
      );
      const currentStock = prodRow ? Number(prodRow.stock) : 0;
      resultingBalance = currentStock + delta;

      // 2. Update product stock and optionally cost price
      if (cost > 0) {
        await tx.execute(
          `UPDATE products SET stock = ?, cost_price = ?, updated_at = ? WHERE id = ?;`,
          [resultingBalance, cost, now, input.productId]
        );
      } else {
        await tx.execute(
          `UPDATE products SET stock = ?, updated_at = ? WHERE id = ?;`,
          [resultingBalance, now, input.productId]
        );
      }

      // 3. Insert append-only ledger row
      const refType = input.type === 'Adjustment' || input.type === 'Damage'
        ? 'ADJUSTMENT'
        : (input.type === 'AUDIT' ? 'AUDIT' : 'PURCHASE');

      const ledgerEntry: InventoryTxRecord = {
        id: `itx_stock_${id}`,
        productId: input.productId,
        variantId: input.variantId,
        type: movementType,
        quantity: delta,
        balanceAfter: resultingBalance,
        referenceType: refType,
        referenceId: id,
        deviceId,
        userId,
        notes: input.notes,
        createdAt: now,
      };
      await insertInventoryTransaction(ledgerEntry, tx);

      // 4. Record purchase_records entry
      await tx.execute(
        `INSERT INTO purchase_records (
          id, supplier_id, invoice_number, total_amount, paid_amount, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          input.supplierId || null,
          input.sku || null,
          delta * cost,
          0,
          'received',
          now,
        ]
      );

      // 5. Update supplier balance if bill is recorded
      if (input.recordAsSupplierBill && input.supplierId) {
        await tx.execute(
          `UPDATE suppliers SET balance = balance + ?, updated_at = ? WHERE id = ?;`,
          [delta * cost, now, input.supplierId]
        );
      }
    },
  });

  // Keep localDb and caches in sync
  const newRecord: PurchaseRecord = {
    id,
    productId: input.productId,
    productName: input.productName || 'Product',
    sku: input.sku || '',
    variantId: input.variantId,
    variantLabel: input.variantLabel,
    quantity: delta,
    costPrice: cost,
    totalAmount: delta * cost,
    type: input.type || 'Stock IN',
    supplier: input.supplier || 'Direct',
    date: input.date || new Date(now),
    addedBy: userId,
    notes: input.notes || '',
    createdAt: new Date(now),
  };

  try {
    await localDb.purchaseRecords.add(newRecord);
    await localDb.products.update(input.productId, {
      stock: resultingBalance,
      ...(cost > 0 ? { cost } : {}),
      updatedAt: new Date(now),
    });
    await localDb.stockHistory.add({
      id: generateId(),
      productId: input.productId,
      changeQty: delta,
      type: delta >= 0 ? 'stock_in' : 'adjustment_out',
      referenceId: id,
      note: input.notes || `${input.type || 'Stock In'}: ${input.supplier || 'Direct'}`,
      balanceAfter: resultingBalance,
      cashierName: userId,
      createdAt: new Date(now),
    } as any);
  } catch {}

  return newRecord;
}
