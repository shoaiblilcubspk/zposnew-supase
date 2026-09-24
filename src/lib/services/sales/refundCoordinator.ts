/**
 * Refund & Return Coordinator — Supabase-only cloud-direct (Phase 3: Atomic Action Bundle).
 * A return/refund is ONE atomic bundle (AGENTS.md §1.5): refund audit row + sale header
 * update + append-only stock RETURN ledger + products.stock cache + negative payment row +
 * customer credit reversal. A failure saves nothing (§1.5.6). Append-only ledgers
 * (inventory_ledger, payments, customer_ledger, sale_refunds); the sale header is a normal
 * UPDATE inside the same bundle. No P2P, no Dexie. Stock = ledger sum (Rule 7).
 */

import { RefundRequest } from '../../../types';
import { localQuery, localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import {
  buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord,
} from '../inventory/inventoryLedgerRepository';
import { buildSaleAuditLogOp } from '../auditLogService';

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
  cashierName = 'cashier',
  operationId?: string
): Promise<boolean> {
  const now = Date.now();
  const operation_id = operationId ?? newOperationId();

  const saleRow = await localQueryOne<any>(`SELECT * FROM sales WHERE id = ?;`, [saleId]);
  if (!saleRow) throw new Error(`Sale ${saleId} not found.`);
  if (saleRow.status === 'refunded') {
    console.warn(`[processSaleRefund] Sale ${saleId} is already fully refunded.`);
    return true;
  }

  const saleItems = await localQuery<any>(`SELECT * FROM sale_items WHERE sale_id = ?;`, [saleId]);
  const isFullRefund = !request || request.type === 'full';

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

  const ops: AtomicOp[] = [];
  const ledgerRecords: InventoryTxRecord[] = [];

  // 0. Refund audit row (append-only).
  ops.push({
    table: 'sale_refunds',
    op: 'insert',
    row: {
      sale_id: saleId,
      amount: refundToApply,
      reason: request?.reason || null,
      refunded_by: null,
      device_id: saleRow.device_id || null,
      items_json: JSON.stringify(returnList),
    },
  });

  // 1. Sale header update.
  ops.push({ table: 'sales', op: 'update', id: saleId, patch: { refunded_amount: newRefundedTotal, status: newStatus } });

  // 2. Restore inventory (append RETURN rows) + recompute stock cache from ledger sum + deltas.
  const stockDelta = new Map<string, number>();
  for (const ret of returnList) {
    if (!ret.productId) continue;
    const rec: InventoryTxRecord = {
      id: `itx_refund_${saleId}_${ret.productId}_${now}`,
      productId: ret.productId,
      variantId: ret.variantId,
      type: 'RETURN',
      quantity: ret.qty,
      referenceType: 'RETURN',
      referenceId: saleId,
      deviceId: saleRow.device_id || '',
      userId: cashierName,
      notes: `Return: ${saleRow.invoice_number}`,
      createdAt: now,
    };
    ops.push(buildInventoryLedgerOp(rec));
    ledgerRecords.push(rec);
    stockDelta.set(ret.productId, (stockDelta.get(ret.productId) ?? 0) + ret.qty);
  }
  for (const [prodId, delta] of stockDelta) {
    const balRow = await localQueryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_ledger WHERE product_id = ?;`,
      [prodId]
    );
    const existingSum = balRow ? Number(balRow.bal) : 0;
    ops.push({ table: 'products', op: 'update', id: prodId, patch: { stock: existingSum + delta } });
  }

  // 3. Negative outflow payment row (append-only).
  ops.push({
    table: 'payments',
    op: 'insert',
    row: {
      sale_id: saleId,
      mode_code: saleRow.payment_method,
      amount: -refundToApply,
      reference: 'Refund payout',
      device_id: saleRow.device_id || null,
      user_id: cashierName,
    },
  });

  // 4. Customer credit ledger reversal.
  if (saleRow.customer_id && saleRow.payment_method === 'credit') {
    const cust = await localQueryOne<{ current_balance: number }>(
      `SELECT current_balance FROM customers WHERE id = ?;`,
      [saleRow.customer_id]
    );
    const curBal = cust ? Number(cust.current_balance) : 0;
    ops.push({ table: 'customers', op: 'update', id: saleRow.customer_id, patch: { current_balance: curBal - refundToApply } });
    ops.push({
      table: 'customer_ledger',
      op: 'insert',
      row: {
        customer_id: saleRow.customer_id,
        type: 'refund',
        amount: -refundToApply,
        sale_id: saleId,
        payment_mode: 'credit',
        notes: `Refund: ${saleRow.invoice_number}`,
        device_id: saleRow.device_id || null,
        user_id: cashierName,
      },
    });
  }

  // ── ONE atomic bundle ─────────────────────────────────────────────────────────
  ops.push(buildSaleAuditLogOp({
    saleId,
    invoiceNumber: saleRow.invoice_number,
    action: newStatus === 'refunded' ? 'refunded' : 'partially_refunded',
    performedByName: cashierName,
    note: `Refund ${refundToApply}${request?.reason ? ' — ' + request.reason : ''}`,
  }));
  await atomicWrite(ops, { operation_id, action: 'refund_sale' });
  for (const rec of ledgerRecords) dispatchInventoryTxEvent(rec);

  // Reactive store refresh.
  try {
    const { useProductsStore } = await import('../../../stores');
    const { getProductById } = await import('../catalog/productRepository');
    for (const ret of returnList) {
      if (!ret.productId) continue;
      const fresh = await getProductById(ret.productId);
      if (fresh) useProductsStore.getState().updateProduct(fresh);
    }
  } catch {}

  return true;
}
