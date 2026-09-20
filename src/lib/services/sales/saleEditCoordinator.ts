/**
 * Sale Edit Coordinator
 * Atomic SQLite transaction managing bill amendments with deterministic stock adjustments.
 */

import { Sale } from '../../../types';
import { getDatabase } from '../../db';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';
import { insertInventoryTransaction } from '../inventory/inventoryLedgerRepository';

export { voidSale } from './saleVoidCoordinator';

export async function editSale(
  oldSaleId: string,
  updatedSale: Omit<Sale, 'id'>,
  cashierName = 'cashier'
): Promise<Sale> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const now = Date.now();

  const oldSale = await db.queryOne<{
    id: string;
    invoice_number: string;
    customer_id: string | null;
    payment_method: string;
    total_amount: number;
    notes?: string;
  }>(`SELECT * FROM sales WHERE id = ?;`, [oldSaleId]);
  if (!oldSale) throw new Error(`Sale ${oldSaleId} not found.`);
  const oldItems = await db.query(`SELECT * FROM sale_items WHERE sale_id = ?;`, [oldSaleId]);

  const editWatermark = `*** EDITED FROM INV #${oldSale.invoice_number} ***`;
  let finalNotes = updatedSale.notes?.trim() || '';
  if (!finalNotes.includes('EDITED FROM INV #')) {
    finalNotes = finalNotes ? `${finalNotes} | ${editWatermark}` : editWatermark;
  }

  const newSale: Sale = {
    ...updatedSale,
    id: oldSaleId,
    notes: finalNotes,
    deviceId,
    timestamp: new Date(now),
    receiptNumber: oldSale.invoice_number,
  };

  await commitLocalTransaction({
    entityType: 'SALE',
    entityId: oldSaleId,
    operation: 'UPDATE',
    eventType: 'SALE_EDITED',
    deviceId,
    userId: cashierName,
    payload: {
      id: oldSaleId,
      invoiceNumber: oldSale.invoice_number,
      customerId: newSale.customerId || null,
      customerName: newSale.customerName || null,
      salesmanId: newSale.salesmanId || null,
      salesmanName: newSale.salesmanName || null,
      totalAmount: newSale.total,
      subtotal: newSale.subtotal,
      paymentMethod: newSale.paymentMethod,
      splitPayments: newSale.splitPayments,
      extraCharges: newSale.extraCharges || null,
      deliveryFee: (newSale.extraCharges && newSale.extraCharges.length > 0)
        ? newSale.extraCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
        : (Number(newSale.deliveryFee) || 0),
      notes: finalNotes,
      items: newSale.items,
      timestamp: now,
    },
    execute: async (tx) => {
      // 1. Reverse Stock for Old Items with deterministic IDs
      const affectedProductIds = new Set<string>();
      for (const it of oldItems) {
        affectedProductIds.add(it.product_id);
        const qty = Number(it.quantity) || 1;
        const itxRevId = `itx_edit_rev_${oldSaleId}_${it.id}`;

        const curBalRow = await tx.queryOne<{ bal: number }>(
          `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
          [it.product_id]
        );
        const curBal = curBalRow ? Number(curBalRow.bal) : 0;

        await insertInventoryTransaction({
          id: itxRevId, productId: it.product_id, variantId: it.variant_id, type: 'INVENTORY_IN',
          quantity: qty, balanceAfter: curBal + qty, referenceType: 'SALE', referenceId: oldSaleId,
          deviceId, userId: cashierName, notes: `Sale Edit: Old item reversed (${oldSale.invoice_number})`, createdAt: now,
        }, tx);
      }

      // 2. Delete Old Line Items
      await tx.execute(`DELETE FROM sale_items WHERE sale_id = ?;`, [oldSaleId]);

      // 3. Reverse Old Payments from Wallets (payment_modes)
      const oldPayments = await tx.query(`SELECT * FROM payments WHERE sale_id = ?;`, [oldSaleId]);
      if (oldPayments.length > 0) {
        for (const op of oldPayments) {
          const amt = Number(op.amount) || 0;
          if (amt > 0 && op.mode_id) {
            await tx.execute(
              `UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`,
              [amt, op.mode_id]
            );
          }
        }
      } else if (oldSale.payment_method && oldSale.payment_method !== 'credit') {
        const oldTotal = Number(oldSale.total_amount) || 0;
        if (oldTotal > 0) {
          await tx.execute(
            `UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`,
            [oldTotal, oldSale.payment_method]
          );
        }
      }

      // Reverse old customer credit balance if previous sale was credit
      if (oldSale.customer_id && oldSale.payment_method === 'credit') {
        const cust = await tx.queryOne<{ current_balance: number }>(
          `SELECT current_balance FROM customers WHERE id = ?;`,
          [oldSale.customer_id]
        );
        const curBal = cust ? Number(cust.current_balance) : 0;
        const newBal = curBal - Number(oldSale.total_amount);
        await tx.execute(
          `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
          [newBal, now, oldSale.customer_id]
        );
        await tx.execute(
          `INSERT OR IGNORE INTO customer_ledger (
            id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
          ) VALUES (?, ?, 'reversal', ?, ?, ?, 'credit', ?, ?);`,
          [`clex_edit_rev_${oldSaleId}`, oldSale.customer_id, -Number(oldSale.total_amount), newBal, oldSaleId, `Sale Edit Reversal: ${oldSale.invoice_number}`, now]
        );
      }

      await tx.execute(`DELETE FROM payments WHERE sale_id = ?;`, [oldSaleId]);

      const totalExtra = (newSale.extraCharges && newSale.extraCharges.length > 0)
        ? newSale.extraCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
        : (Number(newSale.deliveryFee) || 0);

      // 4. Update Sale Header
      await tx.execute(
        `UPDATE sales SET customer_id = ?, customer_name = ?, salesman_id = ?, salesman_name = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, extra_charges = ?, total_amount = ?, tendered_amount = ?, change_amount = ?, payment_method = ?, notes = ?, updated_at = ? WHERE id = ?;`,
        [newSale.customerId || null, newSale.customerName || null, newSale.salesmanId || null, newSale.salesmanName || null, newSale.subtotal, newSale.discountAmount || 0, newSale.taxAmount || 0, totalExtra, newSale.total, newSale.receivedAmount ?? newSale.total, newSale.changeAmount ?? 0, newSale.paymentMethod || 'cash', finalNotes, now, oldSaleId]
      );

      // 5. Apply New Payments to Wallets (payment_modes) & payments table
      if (newSale.paymentMethod === 'split' && newSale.splitPayments && newSale.splitPayments.length > 0) {
        for (const sp of newSale.splitPayments) {
          const spAmt = Number(sp.amount) || 0;
          await tx.execute(
            `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
             VALUES (?, ?, ?, ?, ?, ?);`,
            [generateId(), oldSaleId, sp.method, spAmt, sp.reference || null, now]
          );
          await tx.execute(
            `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
            [spAmt, sp.method]
          );
        }
      } else if (newSale.paymentMethod !== 'credit') {
        const newAmt = Number(newSale.total) || 0;
        const pm = newSale.paymentMethod === 'split' ? 'cash' : (newSale.paymentMethod || 'cash');
        await tx.execute(
          `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [generateId(), oldSaleId, pm, newAmt, null, now]
        );
        await tx.execute(
          `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
          [newAmt, pm]
        );
      } else if (newSale.customerId && newSale.paymentMethod === 'credit') {
        const cust = await tx.queryOne<{ current_balance: number }>(
          `SELECT current_balance FROM customers WHERE id = ?;`,
          [newSale.customerId]
        );
        const curBal = cust ? Number(cust.current_balance) : 0;
        const newBal = curBal + Number(newSale.total);
        await tx.execute(
          `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
          [newBal, now, newSale.customerId]
        );
        await tx.execute(
          `INSERT INTO customer_ledger (
            id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
          ) VALUES (?, ?, 'sale', ?, ?, ?, 'credit', ?, ?);`,
          [generateId(), newSale.customerId, Number(newSale.total), newBal, oldSaleId, `Sale Edit: ${oldSale.invoice_number}`, now]
        );
      }

      // 6. Insert New Line Items & Deduct Stock with deterministic IDs
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
        const newItemId = item.id || generateId();
        affectedProductIds.add(prodId);

        await tx.execute(
          `INSERT INTO sale_items (id, sale_id, product_id, variant_id, name, quantity, unit_price, unit_cost, discount, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [newItemId, oldSaleId, prodId, variantId, prodName, qty, prodPrice, prodCost, discount, subtotal, null]
        );

        const itxOutId = `itx_edit_out_${oldSaleId}_${newItemId}`;

        const curBalRow = await tx.queryOne<{ bal: number }>(
          `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
          [prodId]
        );
        const curBal = curBalRow ? Number(curBalRow.bal) : 0;

        await insertInventoryTransaction({
          id: itxOutId, productId: prodId, variantId, type: 'INVENTORY_OUT', quantity: -qty,
          balanceAfter: curBal - qty, referenceType: 'SALE', referenceId: oldSaleId,
          deviceId, userId: cashierName, notes: `Sale Edit: New item applied (${oldSale.invoice_number})`, createdAt: now,
        }, tx);
      }

      // 7. Authoritatively recompute stock from ledger for all affected products
      for (const pid of affectedProductIds) {
        await tx.execute(
          `UPDATE products SET stock = (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE product_id = ?), updated_at = ? WHERE id = ?;`,
          [pid, now, pid]
        );
      }
    },
  });

  try {
    await localDb.sales.put(newSale);
    const { useProductsStore, useSettingsStore, useCustomersStore } = await import('../../../stores');
    const { getProductById } = await import('../catalog/productRepository');
    const { getAllPaymentModes } = await import('../expenses/walletRepository');

    const freshModes = await getAllPaymentModes();
    if (freshModes && freshModes.length > 0) {
      useSettingsStore.getState().setPaymentModes(freshModes);
    }

    if (newSale.customerId) {
      const { customersService } = await import('../customersService');
      const freshCust = await customersService.getById(newSale.customerId);
      if (freshCust) {
        useCustomersStore.getState().updateCustomer(freshCust);
        try { await localDb.customers.put(freshCust); } catch {}
      }
    }

    const affectedIds = new Set<string>();
    for (const it of [...oldItems, ...(newSale.items || [])]) {
      const pid = (it as any).product_id || (it as any).product?.id || (it as any).productId;
      if (pid) affectedIds.add(pid);
    }
    for (const pid of affectedIds) {
      const fresh = await getProductById(pid);
      if (fresh) {
        useProductsStore.getState().updateProduct(fresh);
        await localDb.products.put(fresh as any).catch(() => {});
      }
    }
  } catch {}

  return newSale;
}
