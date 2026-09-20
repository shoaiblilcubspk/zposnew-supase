/**
 * Refund & Return Coordinator
 * Handles atomic item returns, stock restorations, and payment reversals in local SQLite.
 */

import { RefundRequest } from '../../../types';
import { getDatabase } from '../../db';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';
import { insertInventoryTransaction } from '../inventory/inventoryLedgerRepository';

export function calculateRefundAmount(sale: any, items: Array<{ index: number; qty: number }>): number {
  if (!items?.length) return 0;
  const sub = Number(sale.subtotal || 0);
  const disc = Number(sale.billDiscountAmount || sale.discountAmount || 0);
  const discRate = sub > 0 ? disc / sub : 0;
  let total = 0;
  for (const req of items) {
    const item = sale.items[req.index];
    if (!item) continue;
    const qty = Math.abs(Number(req.qty) || 0);
    if (!qty) continue;
    const itemSub = Number(item.subtotal || 0);
    const itemQty = Math.abs(Number(item.weight || item.quantity) || 1);
    const unitPrice = itemQty > 0 ? itemSub / itemQty : 0;
    total += unitPrice * (1 - discRate) * qty;
  }
  const taxRate = Number(sale.taxAmount || 0) && Number(sale.total || 0)
    ? Number(sale.taxAmount) / (Number(sale.total) - Number(sale.taxAmount)) : 0;
  return Math.round(total * (1 + taxRate) * 100) / 100;
}

export async function processSaleRefund(
  saleId: string,
  request?: RefundRequest,
  cashierName = 'cashier'
): Promise<boolean> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const now = Date.now();

  const saleRow = await db.queryOne<{
    id: string;
    invoice_number: string;
    customer_id: string | null;
    total_amount: number;
    refunded_amount: number;
    status: string;
    payment_method: string;
  }>(`SELECT * FROM sales WHERE id = ?;`, [saleId]);

  if (!saleRow) throw new Error(`Sale ${saleId} not found.`);
  if (saleRow.status === 'refunded') {
    console.warn(`[processSaleRefund] Sale ${saleId} is already fully refunded.`);
    return true;
  }

  const saleItems = await db.query(`SELECT * FROM sale_items WHERE sale_id = ?;`, [saleId]);
  const isFullRefund = !request || request.type === 'full';

  // Determine items to return
  const returnList: Array<{ productId: string; variantId?: string; qty: number; refundPrice: number }> = [];
  let calculatedAmount = 0;

  if (isFullRefund) {
    for (const item of saleItems) {
      const qty = Number(item.quantity) || 1;
      returnList.push({
        productId: item.product_id,
        variantId: item.variant_id || undefined,
        qty,
        refundPrice: Number(item.total_price) || 0,
      });
    }
    calculatedAmount = Number(saleRow.total_amount) - (Number(saleRow.refunded_amount) || 0);
  } else if (request && request.items) {
    for (const req of request.items) {
      const it = saleItems[req.index];
      if (it && req.qty > 0) {
        returnList.push({
          productId: it.product_id,
          variantId: it.variant_id || undefined,
          qty: req.qty,
          refundPrice: req.refundAmount,
        });
        calculatedAmount += req.refundAmount;
      }
    }
  }

  const refundToApply = Math.min(
    calculatedAmount,
    Number(saleRow.total_amount) - (Number(saleRow.refunded_amount) || 0)
  );
  if (refundToApply <= 0) return true;

  const currentRefunded = Number(saleRow.refunded_amount) || 0;
  const newRefundedTotal = currentRefunded + refundToApply;
  const newStatus = newRefundedTotal >= Number(saleRow.total_amount) ? 'refunded' : 'partially_refunded';

  await commitLocalTransaction({
    entityType: 'SALE',
    entityId: saleId,
    operation: 'UPDATE',
    eventType: 'SALE_REFUNDED',
    deviceId,
    userId: cashierName,
    payload: {
      saleId,
      invoiceNumber: saleRow.invoice_number,
      refundAmount: refundToApply,
      newRefundedTotal,
      newStatus,
      returnItems: returnList,
      timestamp: now,
    },
    execute: async (tx) => {
      // 1. Update Sale Header
      await tx.execute(
        `UPDATE sales SET refunded_amount = ?, status = ?, updated_at = ? WHERE id = ?;`,
        [newRefundedTotal, newStatus, now, saleId]
      );

      // 2. Restore Inventory for Returned Items
      for (const ret of returnList) {
        const itxRefundId = `itx_refund_${saleId}_${ret.productId}_${now}`;

        const curBalRow = await tx.queryOne<{ bal: number }>(
          `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
          [ret.productId]
        );
        const curBal = curBalRow ? Number(curBalRow.bal) : 0;
        const balanceAfter = curBal + ret.qty;

        // Append to inventory_transactions ledger with deterministic ID
        await insertInventoryTransaction(
          {
            id: itxRefundId,
            productId: ret.productId,
            variantId: ret.variantId,
            type: 'RETURN',
            quantity: ret.qty,
            balanceAfter,
            referenceType: 'RETURN',
            referenceId: saleId,
            deviceId,
            userId: cashierName,
            notes: `Return: ${saleRow.invoice_number}`,
            createdAt: now,
          },
          tx
        );

        // Authoritative ledger sum stock recomputation
        await tx.execute(
          `UPDATE products
           SET stock = (
             SELECT COALESCE(SUM(quantity), 0)
             FROM inventory_transactions
             WHERE product_id = ?
           ),
           updated_at = ?
           WHERE id = ?;`,
          [ret.productId, now, ret.productId]
        );
      }

      // 3. Record Negative Outflow in Payments
      await tx.execute(
        `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [generateId(), saleId, saleRow.payment_method, -refundToApply, 'Refund payout', now]
      );

      // 4. Update Customer Ledger if Credit Sale
      if (saleRow.customer_id && saleRow.payment_method === 'credit') {
        const cust = await tx.queryOne<{ current_balance: number }>(
          `SELECT current_balance FROM customers WHERE id = ?;`,
          [saleRow.customer_id]
        );
        const curBal = cust ? Number(cust.current_balance) : 0;
        const newBal = curBal - refundToApply;

        await tx.execute(
          `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
          [newBal, now, saleRow.customer_id]
        );

        await tx.execute(
          `INSERT INTO customer_ledger (
            id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
          ) VALUES (?, ?, 'refund', ?, ?, ?, 'credit', ?, ?);`,
          [generateId(), saleRow.customer_id, -refundToApply, newBal, saleId, `Refund: ${saleRow.invoice_number}`, now]
        );
      }
    },
  });

  // Keep localDb and reactive Zustand store updated
  try {
    const sale = await localDb.sales.get(saleId);
    if (sale) {
      await localDb.sales.update(saleId, {
        refundedAmount: newRefundedTotal,
        status: newStatus as any,
      });
      const { useProductsStore } = await import('../../../stores');
      const { getProductById } = await import('../catalog/productRepository');
      for (const ret of returnList) {
        const fresh = await getProductById(ret.productId);
        if (fresh) {
          useProductsStore.getState().updateProduct(fresh);
          await localDb.products.put(fresh as any);
        }
      }
    }
  } catch {}

  return true;
}
