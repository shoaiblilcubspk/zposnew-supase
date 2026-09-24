/**
 * Stock Movement Commit — Supabase-only cloud-direct (Phase 3: Atomic Action Bundle).
 * A stock movement is ONE atomic bundle (AGENTS.md §1.5): products.stock cache (+cost) +
 * append-only inventory_ledger row + purchase_records log + optional supplier balance. A
 * failure saves nothing — stock, purchase history, and supplier balance stay consistent.
 * Stock truth = SUM(inventory_ledger.quantity) (Rule 7); products.stock is a fast cache.
 */

import { localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import { safeRandomUUID } from '../../crypto/uuid';
import { buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord } from './inventoryLedgerRepository';
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
  operationId?: string;
}

export async function commitStockMovement(input: StockMovementInput): Promise<PurchaseRecord> {
  const userId = input.userId || 'system';
  const now = Date.now();
  const id = safeRandomUUID();
  const delta = Number(input.quantity) || 0;
  const cost = Number(input.costPrice) || 0;
  const movementType = delta >= 0 ? 'INVENTORY_IN' : 'INVENTORY_OUT';

  // 1. Current cached stock -> new balance.
  const prodRow = await localQueryOne<{ stock: number }>(
    `SELECT stock FROM products WHERE id = ?;`,
    [input.productId]
  );
  const currentStock = prodRow ? Number(prodRow.stock) : 0;
  const resultingBalance = currentStock + delta;

  const ops: AtomicOp[] = [];

  // 2. Update product stock cache (+ cost price when supplied).
  if (input.productId) {
    ops.push({
      table: 'products', op: 'update', id: input.productId,
      patch: cost > 0 ? { stock: resultingBalance, cost_price: cost } : { stock: resultingBalance },
    });
  }

  // 3. Append-only ledger row (Rule 7).
  const refType = input.type === 'Adjustment' || input.type === 'Damage'
    ? 'ADJUSTMENT'
    : (input.type === 'AUDIT' ? 'AUDIT' : 'PURCHASE');
  const ledgerRec: InventoryTxRecord = {
    id: `itx_stock_${id}`,
    productId: input.productId,
    variantId: input.variantId,
    type: movementType,
    quantity: delta,
    balanceAfter: resultingBalance,
    referenceType: refType,
    referenceId: id,
    deviceId: '',
    userId,
    notes: input.notes,
    createdAt: now,
  };
  ops.push(buildInventoryLedgerOp(ledgerRec));

  // 4. Purchase-history log row.
  ops.push({
    table: 'purchase_records', op: 'insert',
    row: {
      id,
      type: input.type || 'Stock IN',
      product_id: input.productId || null,
      product_name: input.productName || 'Product',
      sku: input.sku || null,
      variant_id: input.variantId || null,
      variant_label: input.variantLabel || null,
      quantity: delta,
      cost_price: cost,
      total_amount: delta * cost,
      supplier: input.supplier || 'Direct',
      supplier_id: input.supplierId || null,
      added_by: userId,
      notes: input.notes || null,
      purchased_at: (input.date || new Date(now)).toISOString(),
    },
  });

  // 5. Supplier balance when recorded as a bill.
  if (input.recordAsSupplierBill && input.supplierId) {
    const sup = await localQueryOne<{ balance: number }>(
      `SELECT balance FROM suppliers WHERE id = ?;`,
      [input.supplierId]
    );
    const newBalance = (sup ? Number(sup.balance) : 0) + delta * cost;
    ops.push({ table: 'suppliers', op: 'update', id: input.supplierId, patch: { balance: newBalance } });
  }

  // ── ONE atomic bundle ─────────────────────────────────────────────────────────
  await atomicWrite(ops, { operation_id: input.operationId ?? newOperationId(), action: 'stock_adjust' });
  dispatchInventoryTxEvent(ledgerRec);

  return {
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
}
