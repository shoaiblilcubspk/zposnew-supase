/**
 * Sale Void Coordinator — Supabase-only cloud-direct (Phase 3: Atomic Action Bundle).
 * Cancels a bill as ONE atomic bundle (AGENTS.md §1.5): void audit row + sale status +
 * append-only stock RETURN ledger + products.stock cache + append-only payment reversals +
 * customer credit reversal. A failure saves nothing (§1.5.6). Stock/balances are never edited
 * in place — only new ledger rows are appended (Rule 7). No P2P, no Dexie.
 */

import { Product } from '../../../types';
import { localQuery, localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import {
  buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord,
} from '../inventory/inventoryLedgerRepository';
import { buildSaleAuditLogOp } from '../auditLogService';
import { productsService } from '../productsService';
import { customersService } from '../customersService';
import { useProductsStore, useCustomersStore, useSalesStore } from '../../../stores';

export async function voidSale(
  saleId: string,
  reason = 'Cancelled by cashier',
  cashierName = 'cashier',
  operationId?: string
): Promise<Product[]> {
  const now = Date.now();
  const operation_id = operationId ?? newOperationId();

  const saleRow = await localQueryOne<any>(`SELECT * FROM sales WHERE id = ?;`, [saleId]);
  if (!saleRow) throw new Error(`Sale ${saleId} not found.`);
  if (saleRow.status === 'void') return []; // double-reversal guard

  const isDraft = saleRow.status === 'pending' || Boolean(saleRow.notes?.includes('DRAFT_SALE'));
  const voidNotes = `${saleRow.notes ? saleRow.notes + ' | ' : ''}VOID: ${reason}`;

  const ops: AtomicOp[] = [];
  const ledgerRecords: InventoryTxRecord[] = [];

  // Audit trail (append-only) + sale status.
  ops.push({
    table: 'sale_voids',
    op: 'insert',
    row: { sale_id: saleId, reason, voided_by: null, device_id: saleRow.device_id || null },
  });
  ops.push({ table: 'sales', op: 'update', id: saleId, patch: { status: 'void', notes: voidNotes } });
  ops.push(buildSaleAuditLogOp({
    saleId,
    invoiceNumber: saleRow.invoice_number,
    action: 'deleted',
    performedByName: cashierName,
    note: `Void: ${reason}`,
  }));

  if (isDraft) {
    // Drafts never touched inventory / balances — just the two rows above.
    await atomicWrite(ops, { operation_id, action: 'void_sale' });
    useSalesStore.getState().deleteSale(saleId);
    return [];
  }

  const saleItems = await localQuery<any>(`SELECT * FROM sale_items WHERE sale_id = ?;`, [saleId]);

  // 1. Stock reversal — append RETURN rows; recompute the cache from ledger sum + deltas.
  const stockDelta = new Map<string, number>();
  for (const it of saleItems) {
    if (!it.product_id) continue;
    const qty = Number(it.quantity) || 1;
    const rec: InventoryTxRecord = {
      id: `itx_void_${saleId}_${it.id}`,
      productId: it.product_id,
      variantId: it.variant_id || undefined,
      type: 'RETURN',
      quantity: qty, // positive = back into stock
      referenceType: 'SALE',
      referenceId: saleId,
      deviceId: saleRow.device_id || '',
      userId: cashierName,
      notes: `Void: ${saleRow.invoice_number} (${reason})`,
      createdAt: now,
    };
    ops.push(buildInventoryLedgerOp(rec));
    ledgerRecords.push(rec);
    stockDelta.set(it.product_id, (stockDelta.get(it.product_id) ?? 0) + qty);
  }
  for (const [prodId, delta] of stockDelta) {
    const balRow = await localQueryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_ledger WHERE product_id = ?;`,
      [prodId]
    );
    const existingSum = balRow ? Number(balRow.bal) : 0;
    ops.push({ table: 'products', op: 'update', id: prodId, patch: { stock: existingSum + delta } });
  }

  // 2. Payment reversal — append negative payment rows (append-only; never delete).
  const payments = await localQuery<any>(`SELECT * FROM payments WHERE sale_id = ?;`, [saleId]);
  for (const vp of payments) {
    const amt = Number(vp.amount) || 0;
    if (amt !== 0) {
      ops.push({
        table: 'payments',
        op: 'insert',
        row: {
          sale_id: saleId,
          mode_code: vp.mode_code,
          amount: -amt,
          reference: `void ${saleRow.invoice_number}`,
          device_id: saleRow.device_id || null,
          user_id: cashierName,
        },
      });
    }
  }

  // 3. Customer credit reversal.
  if (saleRow.customer_id && saleRow.payment_method === 'credit') {
    const cust = await localQueryOne<{ current_balance: number }>(
      `SELECT current_balance FROM customers WHERE id = ?;`,
      [saleRow.customer_id]
    );
    const curBal = cust ? Number(cust.current_balance) : 0;
    const total = Number(saleRow.total_amount) || 0;
    ops.push({ table: 'customers', op: 'update', id: saleRow.customer_id, patch: { current_balance: curBal - total } });
    ops.push({
      table: 'customer_ledger',
      op: 'insert',
      row: {
        customer_id: saleRow.customer_id,
        type: 'reversal',
        amount: -total,
        sale_id: saleId,
        payment_mode: 'credit',
        notes: `Void: ${saleRow.invoice_number}`,
        device_id: saleRow.device_id || null,
        user_id: cashierName,
      },
    });
  }

  // ── ONE atomic bundle ─────────────────────────────────────────────────────────
  await atomicWrite(ops, { operation_id, action: 'void_sale' });
  for (const rec of ledgerRecords) dispatchInventoryTxEvent(rec);

  // Reactive store refresh (0ms UI — Rule 2.10).
  const restoredProducts: Product[] = [];
  try {
    for (const it of saleItems) {
      if (!it.product_id) continue;
      const freshProd = await productsService.getById(it.product_id);
      if (freshProd) {
        restoredProducts.push(freshProd);
        useProductsStore.getState().updateProduct(freshProd);
      }
    }
    if (saleRow.customer_id && saleRow.payment_method === 'credit') {
      const freshCust = await customersService.getById(saleRow.customer_id);
      if (freshCust) useCustomersStore.getState().updateCustomer(freshCust);
    }
    useSalesStore.getState().deleteSale(saleId);
  } catch (syncErr) {
    console.warn('[voidSale] store sync warning:', syncErr);
  }

  return restoredProducts;
}
