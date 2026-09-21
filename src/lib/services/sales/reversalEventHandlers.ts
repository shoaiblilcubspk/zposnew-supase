/**
 * Sale Reversal & Refund P2P Event Handlers
 * Receives remote refund and void events from peer terminals and updates local ledger state.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { localDb } from '../../localDb';
import { insertInventoryTransaction } from '../inventory/inventoryLedgerRepository';
import { useSalesStore, useProductsStore, useCustomersStore } from '../../../stores';
import { getProductById } from '../catalog/productRepository';

export async function handleRemoteSaleRefundEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const saleId = event.entity_id || p.saleId;
  const refundTs = p.timestamp || now;

  // 1. Update Sale Header
  await tx.execute(
    `UPDATE sales SET refunded_amount = ?, status = ?, updated_at = ? WHERE id = ?;`,
    [p.newRefundedTotal, p.newStatus, now, saleId]
  );

  // 2. Increment Stock for Returned Items with deterministic transaction IDs
  const affectedProductIds = new Set<string>();
  for (const ret of p.returnItems || []) {
    const qty = Number(ret.qty) || 1;
    const prodId = ret.productId;
    if (!prodId) continue;
    affectedProductIds.add(prodId);

    const itxRefundId = `itx_refund_${saleId}_${prodId}_${refundTs}`;

    const curBalRow = await tx.queryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
      [prodId]
    );
    const curBal = curBalRow ? Number(curBalRow.bal) : 0;
    const balanceAfter = curBal + qty;

    await insertInventoryTransaction(
      {
        id: itxRefundId,
        productId: prodId,
        variantId: ret.variantId || null,
        type: 'RETURN',
        quantity: qty,
        balanceAfter,
        referenceType: 'SALE',
        referenceId: saleId,
        deviceId: event.device_id,
        userId: p.userId || 'remote',
        notes: `Remote Refund: ${ret.reason || 'Customer Refund'}`,
        createdAt: now,
      },
      tx
    );

    await tx.execute(
      `UPDATE products
       SET stock = (
         SELECT COALESCE(SUM(quantity), 0)
         FROM inventory_transactions
         WHERE product_id = ?
       ),
       updated_at = ?
       WHERE id = ?;`,
      [prodId, now, prodId]
    );
  }

  // Update Dexie & Zustand
  try {
    await localDb.sales.update(saleId, {
      refundedAmount: p.newRefundedTotal,
      status: p.newStatus,
    });
    for (const pid of affectedProductIds) {
      const fresh = await getProductById(pid);
      if (fresh) useProductsStore.getState().updateProduct(fresh);
    }
  } catch {}
}

export async function handleRemoteSaleVoidEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const saleId = event.entity_id || p.saleId;

  const saleRow = await tx.queryOne<{
    id: string;
    invoice_number: string;
    customer_id: string | null;
    payment_method: string;
    total_amount: number;
    status: string;
    notes?: string;
  }>(`SELECT id, invoice_number, customer_id, payment_method, total_amount, status, notes FROM sales WHERE id = ?;`, [saleId]);

  // RBAC Rule 59: Double reversal rejection
  if (saleRow && saleRow.status === 'void') return;

  const isDraft = saleRow ? (saleRow.status === 'pending' || Boolean(saleRow.notes?.includes('DRAFT_SALE'))) : false;

  if (!saleRow) {
    await tx.execute(
      `INSERT OR IGNORE INTO sales (id, invoice_number, device_id, total_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, 'void', ?, ?);`,
      [saleId, p.invoiceNumber || `VOID-${saleId.slice(0, 6)}`, event.device_id, now, now]
    );
  } else {
    await tx.execute(
      `UPDATE sales SET status = 'void', notes = COALESCE(notes || ' | ', '') || ?, updated_at = ? WHERE id = ?;`,
      [`VOID: ${p.reason || 'Remote void'}`, now, saleId]
    );

    if (!isDraft && saleRow.customer_id && saleRow.payment_method === 'credit') {
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
        [`clex_void_${saleId}`, saleRow.customer_id, -Number(saleRow.total_amount), newBal, saleId, `Remote Void: ${saleRow.invoice_number}`, now]
      );
      try {
        useCustomersStore.getState().adjustBalance(saleRow.customer_id, -Number(saleRow.total_amount));
      } catch {}
    }
  }

  if (isDraft) {
    try {
      await localDb.sales.delete(saleId);
      useSalesStore.getState().deleteSale(saleId);
    } catch {}
    return;
  }

  // 3. Restore Stock with deterministic IDs & ledger calculation
  const items = await tx.query(`SELECT * FROM sale_items WHERE sale_id = ?;`, [saleId]);
  const affectedProductIds = new Set<string>();

  for (const it of items) {
    const qty = Number(it.quantity) || 1;
    const prodId = it.product_id;
    if (!prodId) continue;
    affectedProductIds.add(prodId);

    const voidTxId = `itx_void_${saleId}_${it.id}`;

    const curBalRow = await tx.queryOne<{ bal: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
      [prodId]
    );
    const curBal = curBalRow ? Number(curBalRow.bal) : 0;
    const balanceAfter = curBal + qty;

    await insertInventoryTransaction(
      {
        id: voidTxId,
        productId: prodId,
        variantId: it.variant_id || null,
        type: 'RETURN',
        quantity: qty,
        balanceAfter,
        referenceType: 'SALE',
        referenceId: saleId,
        deviceId: event.device_id,
        userId: p.userId || 'remote',
        notes: `Remote Void: ${saleRow?.invoice_number || saleId} (${p.reason || 'Cancelled'})`,
        createdAt: now,
      },
      tx
    );

    await tx.execute(
      `UPDATE products
       SET stock = (
         SELECT COALESCE(SUM(quantity), 0)
         FROM inventory_transactions
         WHERE product_id = ?
       ),
       updated_at = ?
       WHERE id = ?;`,
      [prodId, now, prodId]
    );
  }

  // 4. Instant 0ms Store & Dexie cleanup
  try {
    await localDb.sales.delete(saleId);
    useSalesStore.getState().deleteSale(saleId);

    for (const pid of affectedProductIds) {
      const fresh = await getProductById(pid);
      if (fresh) {
        useProductsStore.getState().updateProduct(fresh);
        await localDb.products.put(fresh as any).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[handleRemoteSaleVoidEvent] Store sync warning:', err);
  }
}

registerReversalEventHandlers();

export function registerReversalEventHandlers(): void {
  registerEventHandler('SALE_REFUNDED', handleRemoteSaleRefundEvent);
  registerEventHandler('SALE_VOIDED', handleRemoteSaleVoidEvent);
  registerEventHandler('SALE:DELETE', handleRemoteSaleVoidEvent);
}
