/**
 * Sale Edit Coordinator — Supabase-only cloud-direct (Phase 3: Atomic Action Bundle).
 *
 * Rule-7-safe bill edit = **void the old sale + create a fresh corrected sale**, all in ONE
 * atomic bundle (AGENTS.md §1.5). NOTHING is hard-deleted: the old line items / payments stay
 * as immutable history, and their effect is cancelled with append-only REVERSAL rows
 * (inventory IN, negative payments, credit reversal). The corrected bill is a brand-new sale
 * row (new id) that inherits the original customer-facing invoice number, while the voided old
 * row is renamed to free that number. A failure at any step saves nothing. No P2P, no Dexie.
 */

import { Sale } from '../../../types';
import { localQuery, localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import { safeRandomUUID } from '../../crypto/uuid';
import {
  buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord,
} from '../inventory/inventoryLedgerRepository';
import { buildSaleAuditLogOp } from '../auditLogService';

export { voidSale } from './saleVoidCoordinator';

export async function editSale(
  oldSaleId: string,
  updatedSale: Omit<Sale, 'id'>,
  cashierName = 'cashier',
  operationId?: string
): Promise<Sale> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const operation_id = operationId ?? newOperationId();

  const oldSale = await localQueryOne<any>(`SELECT * FROM sales WHERE id = ?;`, [oldSaleId]);
  if (!oldSale) throw new Error(`Sale ${oldSaleId} not found.`);
  const oldItems = await localQuery<any>(`SELECT * FROM sale_items WHERE sale_id = ?;`, [oldSaleId]);
  const oldPayments = await localQuery<any>(`SELECT * FROM payments WHERE sale_id = ?;`, [oldSaleId]);

  const upd = updatedSale as any;
  const newSaleId: string = upd.id && upd.id !== oldSaleId ? upd.id : safeRandomUUID();
  const keepInvoice: string = oldSale.invoice_number;
  const editWatermark = `*** EDITED FROM INV #${oldSale.invoice_number} ***`;
  let finalNotes = (updatedSale.notes || '').trim();
  if (!finalNotes.includes('EDITED FROM INV #')) {
    finalNotes = finalNotes ? `${finalNotes} | ${editWatermark}` : editWatermark;
  }

  const newSale: Sale = {
    ...updatedSale,
    id: newSaleId,
    invoiceNumber: keepInvoice,
    notes: finalNotes,
    deviceId: oldSale.device_id || undefined,
    timestamp: new Date(now),
    receiptNumber: keepInvoice,
  };

  const ops: AtomicOp[] = [];
  const ledgerRecords: InventoryTxRecord[] = [];
  const stockDelta = new Map<string, number>();

  // ── Reverse the OLD sale (append-only; the old row becomes void history) ────────
  // 1. Void audit row + free the original invoice number by renaming the old sale.
  ops.push({
    table: 'sale_voids', op: 'insert',
    row: { sale_id: oldSaleId, reason: 'Superseded by edit', voided_by: null, device_id: oldSale.device_id || null },
  });
  ops.push({
    table: 'sales', op: 'update', id: oldSaleId,
    patch: {
      status: 'void',
      invoice_number: `${oldSale.invoice_number}~E${now}`,
      notes: `${oldSale.notes ? oldSale.notes + ' | ' : ''}EDITED → new bill ${keepInvoice}`,
    },
  });
  ops.push(buildSaleAuditLogOp({
    saleId: newSaleId, invoiceNumber: keepInvoice, action: 'edited',
    performedByName: cashierName, note: `Edited from ${oldSale.invoice_number}`,
  }));

  // 2. Reverse old items -> append IN ledger rows (never delete the immutable items).
  for (const it of oldItems) {
    if (!it.product_id) continue;
    const qty = Number(it.quantity) || 1;
    const rec: InventoryTxRecord = {
      id: `itx_edit_rev_${oldSaleId}_${it.id}`,
      productId: it.product_id,
      variantId: it.variant_id || undefined,
      type: 'INVENTORY_IN',
      quantity: qty,
      referenceType: 'SALE',
      referenceId: oldSaleId,
      deviceId: oldSale.device_id || '',
      userId: cashierName,
      notes: `Sale Edit: old item reversed (${oldSale.invoice_number})`,
      createdAt: now,
    };
    ops.push(buildInventoryLedgerOp(rec));
    ledgerRecords.push(rec);
    stockDelta.set(it.product_id, (stockDelta.get(it.product_id) ?? 0) + qty);
  }

  // 3. Reverse old payments -> append negative payment rows (never delete).
  for (const op of oldPayments) {
    const amt = Number(op.amount) || 0;
    if (amt !== 0) {
      ops.push({
        table: 'payments', op: 'insert',
        row: {
          sale_id: oldSaleId, mode_code: op.mode_code, amount: -amt,
          reference: `edit-reversal ${oldSale.invoice_number}`, device_id: oldSale.device_id || null, user_id: cashierName,
        },
      });
    }
  }

  // ── Customer credit: net the balance change per customer in ONE update each ─────
  const balByCustomer = new Map<string, number>();
  const readBal = async (cid: string): Promise<number> => {
    if (balByCustomer.has(cid)) return balByCustomer.get(cid)!;
    const cust = await localQueryOne<{ current_balance: number }>(
      `SELECT current_balance FROM customers WHERE id = ?;`, [cid]
    );
    const bal = cust ? Number(cust.current_balance) : 0;
    balByCustomer.set(cid, bal);
    return bal;
  };

  if (oldSale.customer_id && oldSale.payment_method === 'credit') {
    const oldTotal = Number(oldSale.total_amount) || 0;
    const bal = await readBal(oldSale.customer_id);
    balByCustomer.set(oldSale.customer_id, bal - oldTotal);
    ops.push({
      table: 'customer_ledger', op: 'insert',
      row: {
        customer_id: oldSale.customer_id, type: 'reversal', amount: -oldTotal, sale_id: oldSaleId,
        payment_mode: 'credit', notes: `Sale Edit reversal: ${oldSale.invoice_number}`, user_id: cashierName,
      },
    });
  }

  // ── Create the NEW corrected sale (inherits the original invoice number) ────────
  const totalExtra = (newSale.extraCharges && newSale.extraCharges.length > 0)
    ? newSale.extraCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
    : (Number(newSale.deliveryFee) || 0);

  ops.push({
    table: 'sales', op: 'insert',
    row: {
      id: newSaleId,
      invoice_number: keepInvoice,
      device_id: oldSale.device_id || null,
      customer_id: newSale.customerId || null,
      customer_name: newSale.customerName || null,
      user_id: cashierName,
      salesman_id: newSale.salesmanId || null,
      salesman_name: newSale.salesmanName || null,
      subtotal: newSale.subtotal || 0,
      discount_amount: newSale.discountAmount || 0,
      tax_amount: newSale.taxAmount || 0,
      extra_charges: totalExtra,
      total_amount: newSale.total || 0,
      tendered_amount: newSale.receivedAmount ?? newSale.total ?? 0,
      change_amount: newSale.changeAmount ?? 0,
      payment_method: newSale.paymentMethod || 'cash',
      status: 'completed',
      refunded_amount: 0,
      sale_type: newSale.saleType || oldSale.sale_type || 'retail',
      notes: finalNotes,
      sold_at: nowIso,
    },
  });

  // New line items + OUT ledger.
  for (const rawItem of newSale.items || []) {
    const item = rawItem as any;
    const prodId = item.product?.id || item.productId || item.id;
    const prodName = item.product?.name || item.name || item.productName || 'Item';
    const prodPrice = Number(item.product?.price ?? item.unitPrice ?? item.price ?? 0);
    const prodCost = Number(item.product?.cost ?? item.unitCost ?? item.cost ?? 0);
    const qty = Number(item.quantity) || 1;
    const discount = Number(item.discount) || 0;
    const subtotal = Number(item.subtotal ?? (prodPrice * qty));
    const variantId = item.selectedVariantId || item.variantId || null;
    const newItemId = safeRandomUUID();

    ops.push({
      table: 'sale_items', op: 'insert',
      row: {
        id: newItemId, sale_id: newSaleId, product_id: prodId || null, variant_id: variantId,
        name: prodName, quantity: qty, unit_price: prodPrice, unit_cost: prodCost, discount, total_price: subtotal,
      },
    });

    if (prodId) {
      const rec: InventoryTxRecord = {
        id: `itx_edit_out_${newSaleId}_${newItemId}`,
        productId: prodId,
        variantId: variantId || undefined,
        type: 'INVENTORY_OUT',
        quantity: -Math.abs(qty),
        referenceType: 'SALE',
        referenceId: newSaleId,
        deviceId: oldSale.device_id || '',
        userId: cashierName,
        notes: `Sale Edit: new item applied (${keepInvoice})`,
        createdAt: now,
      };
      ops.push(buildInventoryLedgerOp(rec));
      ledgerRecords.push(rec);
      stockDelta.set(prodId, (stockDelta.get(prodId) ?? 0) - Math.abs(qty));
    }
  }

  // New payments / credit.
  if (newSale.paymentMethod === 'split' && newSale.splitPayments && newSale.splitPayments.length > 0) {
    for (const sp of newSale.splitPayments) {
      ops.push({
        table: 'payments', op: 'insert',
        row: { sale_id: newSaleId, mode_code: sp.method, amount: Number(sp.amount) || 0, reference: sp.reference || null, user_id: cashierName },
      });
    }
  } else if (newSale.paymentMethod !== 'credit') {
    const pm = newSale.paymentMethod === 'split' ? 'cash' : (newSale.paymentMethod || 'cash');
    ops.push({
      table: 'payments', op: 'insert',
      row: { sale_id: newSaleId, mode_code: pm, amount: Number(newSale.total) || 0, reference: null, user_id: cashierName },
    });
  } else if (newSale.customerId && newSale.paymentMethod === 'credit') {
    const newTotal = Number(newSale.total) || 0;
    const bal = await readBal(newSale.customerId);
    balByCustomer.set(newSale.customerId, bal + newTotal);
    ops.push({
      table: 'customer_ledger', op: 'insert',
      row: {
        customer_id: newSale.customerId, type: 'sale', amount: newTotal, sale_id: newSaleId,
        payment_mode: 'credit', notes: `Sale Edit: ${keepInvoice}`, user_id: cashierName,
      },
    });
  }

  // ONE update per affected customer with the final netted balance.
  for (const [cid, bal] of balByCustomer) {
    ops.push({ table: 'customers', op: 'update', id: cid, patch: { current_balance: bal } });
  }

  // Recompute authoritative stock cache from ledger sum + this edit's net deltas.
  for (const [prodId, delta] of stockDelta) {
    const balRow = await localQueryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_ledger WHERE product_id = ?;`, [prodId]
    );
    const existingSum = balRow ? Number(balRow.bal) : 0;
    ops.push({ table: 'products', op: 'update', id: prodId, patch: { stock: existingSum + delta } });
  }

  // ── ONE atomic bundle ─────────────────────────────────────────────────────────
  await atomicWrite(ops, { operation_id, action: 'edit_sale' });
  for (const rec of ledgerRecords) dispatchInventoryTxEvent(rec);
  try { localStorage.setItem('pos_last_sale_event', String(now)); } catch {}

  // Reactive store refresh.
  try {
    const { useProductsStore, useCustomersStore } = await import('../../../stores');
    const { getProductById } = await import('../catalog/productRepository');
    for (const cid of balByCustomer.keys()) {
      const { customersService } = await import('../customersService');
      const freshCust = await customersService.getById(cid);
      if (freshCust) useCustomersStore.getState().updateCustomer(freshCust);
    }
    for (const prodId of stockDelta.keys()) {
      const fresh = await getProductById(prodId);
      if (fresh) useProductsStore.getState().updateProduct(fresh);
    }
  } catch {}

  return newSale;
}
