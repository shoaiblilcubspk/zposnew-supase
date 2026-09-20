/**
 * Sales P2P Replication Event Handlers
 * Receives remote sales from peer terminals and applies transaction & stock deductions atomically.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { insertInventoryTransaction } from '../inventory/inventoryLedgerRepository';
import { localDb, generateId } from '../../localDb';
import { handleRemoteSaleVoidEvent, handleRemoteSaleRefundEvent } from './reversalEventHandlers';
import { useSalesStore, useProductsStore } from '../../../stores';
import { getProductById } from '../catalog/productRepository';

export async function handleRemoteSaleEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const eventType = (p?._meta?.eventType || p?.eventType || '').toUpperCase();

  // 1. Delegate Void / Deletion Events
  if (
    event.operation === 'DELETE' ||
    eventType === 'SALE_VOIDED' ||
    p.status === 'void' ||
    Boolean(p.isDeleted)
  ) {
    await handleRemoteSaleVoidEvent(event, tx);
    return;
  }

  // 2. Delegate Refund Events
  if (eventType === 'SALE_REFUNDED') {
    await handleRemoteSaleRefundEvent(event, tx);
    return;
  }

  // 3. Idempotency Check for Sale Creation
  const existingSale = await tx.queryOne(
    `SELECT 1 FROM sales WHERE id = ?;`,
    [event.entity_id]
  );
  if (existingSale) return;

  const isDraft = p.status === 'pending' || Boolean(p.notes?.includes('DRAFT_SALE'));

  // 4. Insert Sales Record
  await tx.execute(
    `INSERT OR REPLACE INTO sales (
      id, invoice_number, device_id, customer_id, customer_name, user_id, salesman_id, salesman_name,
      subtotal, discount_amount, tax_amount, extra_charges, total_amount,
      tendered_amount, change_amount, payment_method, status, refunded_amount,
      notes, timestamp, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      event.entity_id,
      p.invoiceNumber,
      event.device_id,
      p.customerId || null,
      p.customerName || null,
      p.userId || 'cashier',
      p.salesmanId || null,
      p.salesmanName || null,
      p.subtotal || 0,
      p.discountAmount || 0,
      p.taxAmount || 0,
      0,
      p.totalAmount || 0,
      p.tenderedAmount ?? p.totalAmount ?? 0,
      p.changeAmount ?? 0,
      p.paymentMethod || 'cash',
      p.status || 'completed',
      p.refundedAmount || 0,
      p.notes || null,
      p.timestamp || now,
      event.created_at || now,
      now,
    ]
  );

  // 5. Insert Line Items & Append to Immutable Ledger
  const affectedProductIds = new Set<string>();
  for (const item of p.items || []) {
    const prodId = item.productId;
    const itemId = item.id || generateId();
    if (prodId) affectedProductIds.add(prodId);

    await tx.execute(
      `INSERT OR REPLACE INTO sale_items (
        id, sale_id, product_id, variant_id, name,
        quantity, unit_price, unit_cost, discount, total_price, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        itemId,
        event.entity_id,
        prodId,
        item.variantId || null,
        item.name || 'Item',
        item.quantity,
        item.unitPrice || 0,
        item.unitCost || 0,
        item.discount || 0,
        item.totalPrice || 0,
        null,
      ]
    );

    if (!isDraft && prodId) {
      // Check if product has any prior inventory ledger history
      const cntRow = await tx.queryOne<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM inventory_transactions WHERE product_id = ?;`,
        [prodId]
      );
      if (!cntRow || Number(cntRow.cnt) === 0) {
        const prodRow = await tx.queryOne<{ stock: number }>(
          `SELECT stock FROM products WHERE id = ?;`,
          [prodId]
        );
        const baseline = prodRow ? Number(prodRow.stock) : 0;
        if (baseline > 0) {
          await tx.execute(
            `INSERT OR IGNORE INTO inventory_transactions (
              id, product_id, variant_id, type, quantity, balance_after,
              reference_type, reference_id, device_id, user_id, notes, created_at
            ) VALUES (?, ?, ?, 'INITIAL', ?, ?, 'AUDIT', ?, ?, ?, 'Initial inventory baseline', ?);`,
            [
              `itx_init_${prodId}`,
              prodId,
              item.variantId || null,
              baseline,
              baseline,
              prodId,
              event.device_id,
              p.userId || 'cashier',
              now - 1000,
            ]
          );
        }
      }

      // Append to immutable inventory ledger with idempotent event ID
      const itxId = `itx_sale_${itemId}`;
      await tx.execute(
        `INSERT OR IGNORE INTO inventory_transactions (
          id, product_id, variant_id, type, quantity, balance_after,
          reference_type, reference_id, device_id, user_id, notes, created_at
        ) VALUES (?, ?, ?, 'INVENTORY_OUT', ?, 0, 'SALE', ?, ?, ?, ?, ?);`,
        [
          itxId,
          prodId,
          item.variantId || null,
          -Math.abs(item.quantity),
          event.entity_id,
          event.device_id,
          p.userId || 'cashier',
          `Remote Sale: ${p.invoiceNumber}`,
          now,
        ]
      );
    }
  }

  // 6. Mathematically recompute product stock from authoritative ledger
  for (const prodId of affectedProductIds) {
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

  // 7. Record Payment & Update Wallet
  if (p.paymentMethod === 'split' && p.splitPayments && p.splitPayments.length > 0) {
    for (const sp of p.splitPayments) {
      const spAmt = Number(sp.amount) || 0;
      await tx.execute(
        `INSERT OR REPLACE INTO payments (id, sale_id, mode_id, amount, reference, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [generateId(), event.entity_id, sp.method || 'cash', spAmt, sp.reference || null, now]
      );
      await tx.execute(
        `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
        [spAmt, sp.method || 'cash']
      );
    }
  } else {
    const pm = p.paymentMethod === 'split' ? 'cash' : (p.paymentMethod || 'cash');
    await tx.execute(
      `INSERT OR REPLACE INTO payments (id, sale_id, mode_id, amount, reference, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [generateId(), event.entity_id, pm, p.totalAmount || 0, null, now]
    );
    // Credit is not physical cash — don't inflate wallet balance
    if (pm !== 'credit') {
      await tx.execute(
        `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
        [p.totalAmount || 0, pm]
      );
    }
  }

  // 8. Credit Sale: Update Customer Ledger & Balance on Remote Peer
  // localSaleCommit.ts does this locally; remote handler must mirror it exactly.
  if (!isDraft && p.paymentMethod === 'credit' && p.customerId) {
    const custRow = await tx.queryOne<{ current_balance: number }>(
      `SELECT current_balance FROM customers WHERE id = ?;`,
      [p.customerId]
    );
    const currentBal = custRow ? Number(custRow.current_balance) : 0;
    const creditAmount = Number(p.totalAmount) || 0;
    const newBal = currentBal + creditAmount;

    await tx.execute(
      `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
      [newBal, now, p.customerId]
    );

    const ledgerId = `cl_sale_${event.entity_id}`;
    const ledgerExists = await tx.queryOne(
      `SELECT 1 FROM customer_ledger WHERE id = ?;`,
      [ledgerId]
    );
    if (!ledgerExists) {
      await tx.execute(
        `INSERT INTO customer_ledger (
          id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
        ) VALUES (?, ?, 'sale', ?, ?, ?, 'credit', ?, ?);`,
        [
          ledgerId,
          p.customerId,
          creditAmount,
          newBal,
          event.entity_id,
          `Credit Sale: ${p.invoiceNumber || event.entity_id}`,
          p.timestamp || now,
        ]
      );
    }
  }

  // 8. Instant 0ms Store & Dexie reflection
  const newSaleRecord: any = {
    id: event.entity_id,
    invoiceNumber: p.invoiceNumber,
    total: p.totalAmount,
    subtotal: p.subtotal,
    discountAmount: p.discountAmount,
    taxAmount: p.taxAmount,
    extraCharges: p.extraCharges ? (Array.isArray(p.extraCharges) ? p.extraCharges : [{ name: 'Delivery Charges (DC)', amount: p.extraCharges }]) : undefined,
    deliveryFee: p.deliveryFee || undefined,
    paymentMethod: p.paymentMethod,
    splitPayments: p.splitPayments,
    status: p.status || 'completed',
    cashier: p.userId,
    timestamp: new Date(p.timestamp || now),
    receiptNumber: p.invoiceNumber,
    items: (p.items || []).map((it: any) => ({
      product: { id: it.productId, name: it.name, price: it.unitPrice, cost: it.unitCost, stock: 0, minStock: 0, category: '', description: '', taxable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      quantity: it.quantity,
      discount: it.discount,
      discountType: 'fixed',
      subtotal: it.totalPrice,
    })),
  };

  try {
    await localDb.sales.put(newSaleRecord);
    useSalesStore.getState().addSale(newSaleRecord);

    for (const pid of affectedProductIds) {
      const fresh = await getProductById(pid);
      if (fresh) {
        useProductsStore.getState().updateProduct(fresh);
        await localDb.products.put(fresh as any).catch(() => {});
      }
    }
  } catch {}
}

export function registerSalesEventHandlers(): void {
  registerEventHandler('SALE', handleRemoteSaleEvent);
  registerEventHandler('SALE:CREATE', handleRemoteSaleEvent);
}
