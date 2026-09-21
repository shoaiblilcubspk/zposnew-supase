/**
 * Remote Sale Edit Event Handler
 * Replicates P2P SALE_EDITED mutations into local SQLite with deterministic stock & wallet adjustments.
 */

import { safeTs } from '../../../lib/utils/safeTimestamp';
import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { localDb, generateId } from '../../localDb';
import { insertInventoryTransaction } from '../inventory/inventoryLedgerRepository';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { useSalesStore, useProductsStore, useSettingsStore } from '../../../stores';
import { getProductById } from '../catalog/productRepository';
import { getAllPaymentModes } from '../expenses/walletRepository';

export async function handleRemoteSaleEditEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const saleId = p.id || event.entity_id;
  const now = safeTs(p.timestamp, Date.now());

  const oldSale = await tx.queryOne<{
    id: string;
    invoice_number: string;
    payment_method: string;
    total_amount: number;
    notes?: string;
  }>(`SELECT * FROM sales WHERE id = ?;`, [saleId]);

  const oldItems = await tx.query(`SELECT * FROM sale_items WHERE sale_id = ?;`, [saleId]);
  const affectedProductIds = new Set<string>();

  // 1. Reverse Stock for Old Items
  for (const it of oldItems) {
    affectedProductIds.add(it.product_id);
    const qty = Number(it.quantity) || 1;
    const itxRevId = `itx_edit_rev_${saleId}_${it.id}`;

    const curBalRow = await tx.queryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
      [it.product_id]
    );
    const curBal = curBalRow ? Number(curBalRow.bal) : 0;

    await insertInventoryTransaction(
      {
        id: itxRevId,
        productId: it.product_id,
        variantId: it.variant_id,
        type: 'INVENTORY_IN',
        quantity: qty,
        balanceAfter: curBal + qty,
        referenceType: 'SALE',
        referenceId: saleId,
        deviceId: event.device_id,
        userId: event.user_id || 'remote',
        notes: `Remote Sale Edit: Old item reversed (${p.invoiceNumber || saleId})`,
        createdAt: now,
      },
      tx
    );
  }

  // 2. Delete Old Line Items
  await tx.execute(`DELETE FROM sale_items WHERE sale_id = ?;`, [saleId]);

  // 3. Reverse Old Payments from Wallets
  const oldPayments = await tx.query(`SELECT * FROM payments WHERE sale_id = ?;`, [saleId]);
  if (oldPayments.length > 0) {
    for (const op of oldPayments) {
      const amt = Number(op.amount) || 0;
      if (amt > 0 && op.mode_id) {
        await tx.execute(`UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`, [amt, op.mode_id]);
      }
    }
  } else if (oldSale?.payment_method && oldSale.payment_method !== 'credit') {
    const oldTotal = Number(oldSale.total_amount) || 0;
    if (oldTotal > 0) {
      await tx.execute(`UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`, [oldTotal, oldSale.payment_method]);
    }
  }
  await tx.execute(`DELETE FROM payments WHERE sale_id = ?;`, [saleId]);

  // 4. Update Sales Record
  const totalExtra = p.extraCharges ? (typeof p.extraCharges === 'number' ? p.extraCharges : p.extraCharges.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0)) : (Number(p.deliveryFee) || 0);
  await tx.execute(
    `UPDATE sales SET customer_id = ?, customer_name = ?, salesman_id = ?, salesman_name = ?, subtotal = ?, extra_charges = ?, total_amount = ?, payment_method = ?, notes = ?, updated_at = ? WHERE id = ?;`,
    [p.customerId || null, p.customerName || null, p.salesmanId || null, p.salesmanName || null, p.subtotal || 0, totalExtra, p.totalAmount || 0, p.paymentMethod || 'cash', p.notes || null, now, saleId]
  );

  // 5. Apply New Payments
  if (p.paymentMethod === 'split' && p.splitPayments && p.splitPayments.length > 0) {
    for (const sp of p.splitPayments) {
      const spAmt = Number(sp.amount) || 0;
      await tx.execute(
        `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
        [generateId(), saleId, sp.method, spAmt, sp.reference || null, now]
      );
      await tx.execute(`UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`, [spAmt, sp.method]);
    }
  } else if (p.paymentMethod !== 'credit') {
    const newAmt = Number(p.totalAmount) || 0;
    const pm = p.paymentMethod === 'split' ? 'cash' : (p.paymentMethod || 'cash');
    await tx.execute(
      `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
      [generateId(), saleId, pm, newAmt, null, now]
    );
    await tx.execute(`UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`, [newAmt, pm]);
  }

  // 6. Insert New Line Items & Deduct Stock
  for (const rawItem of p.items || []) {
    const item = rawItem as any;
    const prodId = item.product?.id || item.productId || item.id;
    const prodName = item.product?.name || item.name || 'Item';
    const prodPrice = Number(item.product?.price ?? item.unitPrice ?? item.price ?? 0);
    const prodCost = Number(item.product?.cost ?? item.unitCost ?? item.cost ?? 0);
    const qty = Number(item.quantity) || 1;
    const discount = Number(item.discount) || 0;
    const subtotal = Number(item.subtotal ?? (prodPrice * qty));
    const variantId = item.selectedVariantId || item.variantId || null;
    const newItemId = item.id || generateId();
    affectedProductIds.add(prodId);

    await tx.execute(
      `INSERT INTO sale_items (id, sale_id, product_id, variant_id, name, quantity, unit_price, unit_cost, discount, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [newItemId, saleId, prodId, variantId, prodName, qty, prodPrice, prodCost, discount, subtotal, null]
    );

    const itxOutId = `itx_edit_out_${saleId}_${newItemId}`;
    const curBalRow = await tx.queryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
      [prodId]
    );
    const curBal = curBalRow ? Number(curBalRow.bal) : 0;

    await insertInventoryTransaction(
      {
        id: itxOutId,
        productId: prodId,
        variantId,
        type: 'INVENTORY_OUT',
        quantity: -qty,
        balanceAfter: curBal - qty,
        referenceType: 'SALE',
        referenceId: saleId,
        deviceId: event.device_id,
        userId: event.user_id || 'remote',
        notes: `Remote Sale Edit: New item applied (${p.invoiceNumber || saleId})`,
        createdAt: now,
      },
      tx
    );
  }

  // 7. Authoritatively recompute stock for affected products
  for (const pid of affectedProductIds) {
    await tx.execute(
      `UPDATE products SET stock = (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE product_id = ?), updated_at = ? WHERE id = ?;`,
      [pid, now, pid]
    );
  }

  // 8. Reactive 0ms Store Reflection
  try {
    const extraVal = p.extraCharges ? (typeof p.extraCharges === 'number' ? p.extraCharges : p.extraCharges.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0)) : (Number(p.deliveryFee) || 0);
    const extraList = extraVal > 0 ? (Array.isArray(p.extraCharges) && p.extraCharges.length > 0 ? p.extraCharges : [{ name: 'Delivery Charges (DC)', amount: extraVal }]) : undefined;

    const updatedSaleRecord: any = {
      id: saleId,
      invoiceNumber: p.invoiceNumber,
      total: Number(p.totalAmount) || 0,
      subtotal: Number(p.subtotal) || 0,
      paymentMethod: p.paymentMethod,
      splitPayments: p.splitPayments,
      extraCharges: extraList,
      deliveryFee: extraVal > 0 ? extraVal : undefined,
      notes: p.notes,
      timestamp: new Date(now),
      receiptNumber: p.invoiceNumber,
      items: p.items || [],
    };
    await localDb.sales.put(updatedSaleRecord);
    useSalesStore.getState().updateSale(updatedSaleRecord);

    const freshModes = await getAllPaymentModes();
    if (freshModes?.length) useSettingsStore.getState().setPaymentModes(freshModes);

    for (const pid of affectedProductIds) {
      const fresh = await getProductById(pid);
      if (fresh) {
        useProductsStore.getState().updateProduct(fresh);
        await localDb.products.put(fresh as any).catch(() => {});
      }
    }
  } catch {}
}

registerSaleEditEventHandlers();

export function registerSaleEditEventHandlers(): void {
  registerEventHandler('SALE_EDITED', handleRemoteSaleEditEvent);
  registerEventHandler('SALE:UPDATE', handleRemoteSaleEditEvent);
}
