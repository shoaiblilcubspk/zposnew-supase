/**
 * Sale Void Coordinator
 * Atomic SQLite transaction managing bill cancellations and append-only stock reversals.
 */

import { Product } from '../../../types';
import { getDatabase } from '../../db';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb } from '../../localDb';
import { insertInventoryTransaction } from '../inventory/inventoryLedgerRepository';
import { productsService } from '../productsService';
import { customersService } from '../customersService';
import { useProductsStore, useCustomersStore, useSalesStore, useSettingsStore } from '../../../stores';

export async function voidSale(
  saleId: string,
  reason = 'Cancelled by cashier',
  cashierName = 'cashier'
): Promise<Product[]> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const now = Date.now();

  const saleRow = await db.queryOne<{
    id: string;
    invoice_number: string;
    customer_id: string | null;
    status: string;
    total_amount: number;
    payment_method: string;
    notes?: string;
  }>(`SELECT * FROM sales WHERE id = ?;`, [saleId]);

  if (!saleRow) throw new Error(`Sale ${saleId} not found.`);
  // RBAC Rule 59: Double reversal prevention
  if (saleRow.status === 'void') return [];

  const isDraft = saleRow.status === 'pending' || Boolean(saleRow.notes?.includes('DRAFT_SALE'));

  if (isDraft) {
    // Drafts never touched inventory or customer balance
    await commitLocalTransaction({
      entityType: 'SALE',
      entityId: saleId,
      operation: 'UPDATE',
      eventType: 'SALE_VOIDED',
      deviceId,
      userId: cashierName,
      payload: { saleId, invoiceNumber: saleRow.invoice_number, reason, timestamp: now },
      execute: async (tx) => {
        await tx.execute(
          `UPDATE sales SET status = 'void', notes = COALESCE(notes || ' | ', '') || ?, updated_at = ? WHERE id = ?;`,
          [`VOID: ${reason}`, now, saleId]
        );
      },
    });
    useSalesStore.getState().deleteSale(saleId);
    await localDb.sales.delete(saleId).catch(() => {});
    return [];
  }

  const saleItems = await db.query(`SELECT * FROM sale_items WHERE sale_id = ?;`, [saleId]);

  await commitLocalTransaction({
    entityType: 'SALE',
    entityId: saleId,
    operation: 'UPDATE',
    eventType: 'SALE_VOIDED',
    deviceId,
    userId: cashierName,
    payload: { saleId, invoiceNumber: saleRow.invoice_number, reason, timestamp: now },
    execute: async (tx) => {
      // 1. Mark Sale as Void
      await tx.execute(
        `UPDATE sales SET status = 'void', notes = COALESCE(notes || ' | ', '') || ?, updated_at = ? WHERE id = ?;`,
        [`VOID: ${reason}`, now, saleId]
      );

      // 2. Deterministic Reversal in Append-Only Ledger (Rule 58)
      for (const it of saleItems) {
        const qty = Number(it.quantity) || 1;
        const voidTxId = `itx_void_${saleId}_${it.id}`;

        const curBalRow = await tx.queryOne<{ bal: number }>(
          `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
          [it.product_id]
        );
        const curBal = curBalRow ? Number(curBalRow.bal) : 0;
        const balanceAfter = curBal + qty;

        await insertInventoryTransaction(
          {
            id: voidTxId,
            productId: it.product_id,
            variantId: it.variant_id || null,
            type: 'RETURN',
            quantity: qty,
            balanceAfter,
            referenceType: 'SALE',
            referenceId: saleId,
            deviceId,
            userId: cashierName,
            notes: `Void: ${saleRow.invoice_number} (${reason})`,
            createdAt: now,
          },
          tx
        );

        // Authoritative stock recomputation strictly from append-only ledger sum
        await tx.execute(
          `UPDATE products
           SET stock = (
             SELECT COALESCE(SUM(quantity), 0)
             FROM inventory_transactions
             WHERE product_id = ?
           ),
           updated_at = ?
           WHERE id = ?;`,
          [it.product_id, now, it.product_id]
        );
      }

      // 3. Reverse Payments from Wallets (payment_modes)
      const voidPayments = await tx.query(`SELECT * FROM payments WHERE sale_id = ?;`, [saleId]);
      if (voidPayments.length > 0) {
        for (const vp of voidPayments) {
          const amt = Number(vp.amount) || 0;
          if (amt > 0 && vp.mode_id) {
            await tx.execute(
              `UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`,
              [amt, vp.mode_id]
            );
          }
        }
      } else if (saleRow.payment_method && saleRow.payment_method !== 'credit') {
        const oldTotal = Number(saleRow.total_amount) || 0;
        if (oldTotal > 0) {
          await tx.execute(
            `UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`,
            [oldTotal, saleRow.payment_method]
          );
        }
      }
      await tx.execute(`DELETE FROM payments WHERE sale_id = ?;`, [saleId]);

      // 4. Reverse Customer Balance if Credit Sale
      if (saleRow.customer_id && saleRow.payment_method === 'credit') {
        const cust = await tx.queryOne<{ current_balance: number }>(
          `SELECT current_balance FROM customers WHERE id = ?;`,
          [saleRow.customer_id]
        );
        const curBal = cust ? Number(cust.current_balance) : 0;
        const newBal = curBal - Number(saleRow.total_amount);

        await tx.execute(
          `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
          [newBal, now, saleRow.customer_id]
        );

        await tx.execute(
          `INSERT OR IGNORE INTO customer_ledger (
            id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
          ) VALUES (?, ?, 'reversal', ?, ?, ?, 'credit', ?, ?);`,
          [`clex_void_${saleId}`, saleRow.customer_id, -Number(saleRow.total_amount), newBal, saleId, `Void: ${saleRow.invoice_number}`, now]
        );
      }
    },
  });

  const restoredProducts: Product[] = [];
  try {
    const { getAllPaymentModes } = await import('../expenses/walletRepository');
    const freshModes = await getAllPaymentModes();
    if (freshModes && freshModes.length > 0) {
      useSettingsStore.getState().setPaymentModes(freshModes);
    }

    for (const it of saleItems) {
      const freshProd = await productsService.getById(it.product_id);
      if (freshProd) {
        restoredProducts.push(freshProd);
        useProductsStore.getState().updateProduct(freshProd);
        try { await localDb.products.put(freshProd); } catch {}
      }
    }

    if (saleRow.customer_id && saleRow.payment_method === 'credit') {
      const freshCust = await customersService.getById(saleRow.customer_id);
      if (freshCust) {
        useCustomersStore.getState().updateCustomer(freshCust);
        try { await localDb.customers.put(freshCust); } catch {}
      }
    }

    useSalesStore.getState().deleteSale(saleId);
    await localDb.sales.delete(saleId);
  } catch (syncErr) {
    console.warn('[voidSale] Reactive store sync warning:', syncErr);
  }

  return restoredProducts;
}
