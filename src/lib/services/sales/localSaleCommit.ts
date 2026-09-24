/**
 * Local Sale Commit — Supabase-only cloud-direct (Phase 3: Atomic Action Bundle).
 *
 * The ENTIRE sale is ONE atomic bundle (AGENTS.md §1.5): sale header + line items +
 * inventory OUT ledger + INITIAL baseline + products.stock cache + payments + (credit)
 * customer balance & ledger — all commit in a single local SQLite transaction and push to
 * the cloud as ONE idempotent `apply_bundle` RPC. A failure at any step saves NOTHING, so
 * stock can never be out of sync with the sale (§1.5.6).
 *
 * Stock truth = SUM(inventory_ledger) (Rule 7); products.stock is a fast cache recomputed
 * in-memory from the ledger deltas this sale adds. Append-only: sale_items, payments,
 * inventory_ledger, customer_ledger. No P2P, no Dexie.
 */

import { Sale } from '../../../types';
import { safeRandomUUID } from '../../crypto/uuid';
import { localQueryOne, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import {
  buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord,
} from '../inventory/inventoryLedgerRepository';
import { buildSaleAuditLogOp } from '../auditLogService';

export async function commitLocalSale(
  saleInput: Omit<Sale, 'id'>,
  operationId?: string
): Promise<Sale> {
  const id = safeRandomUUID();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const operation_id = operationId ?? newOperationId();
  const isDraft = saleInput.status === 'pending' || Boolean(saleInput.notes?.includes('DRAFT_SALE'));

  const sale: Sale = {
    ...saleInput,
    id,
    timestamp: new Date(now),
    receiptNumber: saleInput.invoiceNumber,
  };

  const saleItems = (sale.items || []).map((rawItem) => {
    const item = rawItem as any;
    const prodId = item.product?.id || item.productId || item.id;
    const prodName = item.product?.name || item.name || item.productName || 'Item';
    const prodPrice = Number(item.product?.price ?? item.unitPrice ?? item.price ?? 0);
    const prodCost = Number(item.product?.cost ?? item.unitCost ?? item.cost ?? 0);
    const qty = Number(item.quantity) || 1;
    const discount = Number(item.discount) || 0;
    const subtotal = Number(item.subtotal ?? (prodPrice * qty));
    const variantId = item.selectedVariantId || item.variantId || null;
    return {
      id: safeRandomUUID(),
      productId: prodId,
      variantId,
      name: prodName,
      quantity: qty,
      unitPrice: prodPrice,
      unitCost: prodCost,
      discount,
      totalPrice: subtotal,
    };
  });

  const totalExtra = (sale.extraCharges && sale.extraCharges.length > 0)
    ? sale.extraCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
    : (Number(sale.deliveryFee) || 0);

  const ops: AtomicOp[] = [];
  const ledgerRecords: InventoryTxRecord[] = []; // for post-commit reactive events

  // 1. Sale header.
  ops.push({
    table: 'sales',
    op: 'insert',
    row: {
      id,
      invoice_number: sale.invoiceNumber,
      device_id: sale.deviceId || null,
      customer_id: sale.customerId || null,
      customer_name: sale.customerName || null,
      user_id: sale.cashier || 'cashier',
      salesman_id: sale.salesmanId || null,
      salesman_name: sale.salesmanName || null,
      subtotal: sale.subtotal || 0,
      discount_amount: sale.discountAmount || 0,
      tax_amount: sale.taxAmount || 0,
      extra_charges: totalExtra,
      total_amount: sale.total || 0,
      tendered_amount: sale.receivedAmount ?? sale.total ?? 0,
      change_amount: sale.changeAmount ?? 0,
      payment_method: sale.paymentMethod || 'cash',
      status: sale.status || 'completed',
      refunded_amount: 0,
      sale_type: sale.saleType || 'retail',
      notes: sale.notes || null,
      sold_at: nowIso,
    },
  });

  // 2. Line items + inventory OUT ledger (append-only). Read current ledger state UP FRONT
  //    (before any write) and compute the new stock cache in-memory from the deltas.
  const stockDelta = new Map<string, number>();     // productId -> net qty change this sale
  const baselineByProduct = new Map<string, number>();

  for (const item of saleItems) {
    ops.push({
      table: 'sale_items',
      op: 'insert',
      row: {
        id: item.id,
        sale_id: id,
        product_id: item.productId || null,
        variant_id: item.variantId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        discount: item.discount,
        total_price: item.totalPrice,
      },
    });

    if (!isDraft && item.productId) {
      // Seed an INITIAL baseline the first time a product is touched by the ledger so the
      // computed stock stays correct for products whose stock was set directly (e.g. import).
      if (!baselineByProduct.has(item.productId)) {
        const cntRow = await localQueryOne<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM inventory_ledger WHERE product_id = ?;`,
          [item.productId]
        );
        if (!cntRow || Number(cntRow.cnt) === 0) {
          const prodRow = await localQueryOne<{ stock: number }>(
            `SELECT stock FROM products WHERE id = ?;`,
            [item.productId]
          );
          const baseline = prodRow ? Number(prodRow.stock) : 0;
          baselineByProduct.set(item.productId, baseline);
          if (baseline > 0) {
            const initRec: InventoryTxRecord = {
              id: `itx_init_${item.productId}`,
              productId: item.productId,
              variantId: item.variantId || undefined,
              type: 'INITIAL',
              quantity: baseline,
              referenceType: 'AUDIT',
              referenceId: item.productId,
              deviceId: sale.deviceId || '',
              userId: sale.cashier || 'cashier',
              notes: 'Initial inventory baseline',
              createdAt: now - 1000,
            };
            ops.push(buildInventoryLedgerOp(initRec));
            ledgerRecords.push(initRec);
            stockDelta.set(item.productId, (stockDelta.get(item.productId) ?? 0) + baseline);
          }
        } else {
          baselineByProduct.set(item.productId, 0);
        }
      }

      const outRec: InventoryTxRecord = {
        id: `itx_sale_${item.id}`,
        productId: item.productId,
        variantId: item.variantId || undefined,
        type: 'INVENTORY_OUT',
        quantity: -Math.abs(item.quantity),
        referenceType: 'SALE',
        referenceId: id,
        deviceId: sale.deviceId || '',
        userId: sale.cashier || 'cashier',
        notes: `Sale: ${sale.invoiceNumber}`,
        createdAt: now,
      };
      ops.push(buildInventoryLedgerOp(outRec));
      ledgerRecords.push(outRec);
      stockDelta.set(item.productId, (stockDelta.get(item.productId) ?? 0) - Math.abs(item.quantity));
    }
  }

  // Recompute authoritative stock cache from ledger truth (existing sum + this sale's deltas).
  for (const [prodId, delta] of stockDelta) {
    const balRow = await localQueryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_ledger WHERE product_id = ?;`,
      [prodId]
    );
    const existingSum = balRow ? Number(balRow.bal) : 0;
    ops.push({ table: 'products', op: 'update', id: prodId, patch: { stock: existingSum + delta } });
  }

  // 3. Payment record(s) (append-only). Per-mode totals derive from SUM(payments.amount).
  if (sale.splitPayments && sale.splitPayments.length > 0) {
    for (const sp of sale.splitPayments) {
      ops.push({
        table: 'payments',
        op: 'insert',
        row: {
          sale_id: id,
          mode_code: sp.method,
          amount: sp.amount,
          reference: sp.reference || null,
          device_id: sale.deviceId || null,
          user_id: sale.cashier || null,
        },
      });
    }
  } else {
    const pm = sale.paymentMethod === 'split' ? 'cash' : (sale.paymentMethod || 'cash');
    ops.push({
      table: 'payments',
      op: 'insert',
      row: {
        sale_id: id,
        mode_code: pm,
        amount: sale.total || 0,
        reference: null,
        device_id: sale.deviceId || null,
        user_id: sale.cashier || null,
      },
    });
  }

  // 4. Credit sale -> customer balance (non-additive) + append-only ledger entry.
  if (sale.customerId && !isDraft && sale.paymentMethod === 'credit') {
    const custRow = await localQueryOne<{ current_balance: number }>(
      `SELECT current_balance FROM customers WHERE id = ?;`,
      [sale.customerId]
    );
    const currentBal = custRow ? Number(custRow.current_balance) : 0;
    const newBal = currentBal + (sale.total || 0);

    ops.push({ table: 'customers', op: 'update', id: sale.customerId, patch: { current_balance: newBal } });
    ops.push({
      table: 'customer_ledger',
      op: 'insert',
      row: {
        customer_id: sale.customerId,
        type: 'sale',
        amount: sale.total || 0,
        sale_id: id,
        payment_mode: 'credit',
        notes: `Sale: ${sale.invoiceNumber}`,
        device_id: sale.deviceId || null,
        user_id: sale.cashier || null,
      },
    });
  }

  // ── ONE atomic bundle: all-or-nothing (§1.5.3) ────────────────────────────────
  // 5. Tamper-evident sale audit row (append-only, inside the same bundle — §1.5.6).
  if (!isDraft) {
    ops.push(buildSaleAuditLogOp({
      saleId: id,
      invoiceNumber: sale.invoiceNumber,
      action: 'created',
      performedByName: sale.cashier || 'cashier',
      note: `Sale ${sale.invoiceNumber} — total ${sale.total ?? 0}`,
    }));
  }

  await atomicWrite(ops, { operation_id, action: 'create_sale' });

  // Post-commit reactive events (0ms UI — Rule 2.10). Safe: the bundle already committed.
  for (const rec of ledgerRecords) dispatchInventoryTxEvent(rec);
  try { localStorage.setItem('pos_last_sale_event', String(now)); } catch {}

  return sale;
}
