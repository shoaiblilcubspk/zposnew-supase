/**
 * Local Sale Commit Engine
 * Atomic SQLite transaction committing sale header, line items, payments, and stock movements (<10ms).
 */

import { Sale } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';
import { insertInventoryTransaction } from '../inventory/inventoryLedgerRepository';

export async function commitLocalSale(saleInput: Omit<Sale, 'id'>): Promise<Sale> {
  const deviceId = await getDeviceId();
  const id = generateId();
  const now = Date.now();
  const isDraft = saleInput.status === 'pending' || Boolean(saleInput.notes?.includes('DRAFT_SALE'));

  const sale: Sale = {
    ...saleInput,
    id,
    deviceId,
    timestamp: new Date(now),
    receiptNumber: saleInput.invoiceNumber,
  };

  const saleItems = (sale.items || []).map((rawItem) => {
    const item = rawItem as any;
    const itemId = generateId();
    const prodId = item.product?.id || item.productId || item.id;
    const prodName = item.product?.name || item.name || item.productName || 'Item';
    const prodPrice = Number(item.product?.price ?? item.unitPrice ?? item.price ?? 0);
    const prodCost = Number(item.product?.cost ?? item.unitCost ?? item.cost ?? 0);
    const qty = Number(item.quantity) || 1;
    const discount = Number(item.discount) || 0;
    const subtotal = Number(item.subtotal ?? (prodPrice * qty));
    const variantId = item.selectedVariantId || item.variantId || null;

    return {
      id: itemId,
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

  await commitLocalTransaction({
    entityType: 'SALE',
    entityId: id,
    operation: 'CREATE',
    eventType: 'SALE_CREATED',
    deviceId,
    userId: sale.cashier || 'cashier',
    payload: {
      id,
      invoiceNumber: sale.invoiceNumber,
      deviceId,
      customerId: sale.customerId || null,
      customerName: sale.customerName || null,
      userId: sale.cashier || 'cashier',
      salesmanId: sale.salesmanId || null,
      salesmanName: sale.salesmanName || null,
      subtotal: sale.subtotal || 0,
      discountAmount: sale.discountAmount || 0,
      taxAmount: sale.taxAmount || 0,
      extraCharges: sale.extraCharges || null,
      deliveryFee: totalExtra,
      totalAmount: sale.total || 0,
      tenderedAmount: sale.receivedAmount ?? sale.total,
      changeAmount: sale.changeAmount ?? 0,
      paymentMethod: sale.paymentMethod || 'cash',
      splitPayments: sale.splitPayments || null,
      status: sale.status || 'completed',
      refundedAmount: 0,
      notes: sale.notes || null,
      timestamp: now,
      items: saleItems,
    },
    execute: async (tx) => {
      // 1. Insert Sales Header
      await tx.execute(
        `INSERT INTO sales (
          id, invoice_number, device_id, customer_id, customer_name, user_id, salesman_id, salesman_name,
          subtotal, discount_amount, tax_amount, extra_charges, total_amount,
          tendered_amount, change_amount, payment_method, status, refunded_amount,
          notes, timestamp, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          sale.invoiceNumber,
          deviceId,
          sale.customerId || null,
          sale.customerName || null,
          sale.cashier || 'cashier',
          sale.salesmanId || null,
          sale.salesmanName || null,
          sale.subtotal || 0,
          sale.discountAmount || 0,
          sale.taxAmount || 0,
          totalExtra,
          sale.total || 0,
          sale.receivedAmount ?? sale.total,
          sale.changeAmount ?? 0,
          sale.paymentMethod || 'cash',
          sale.status || 'completed',
          0,
          sale.notes || null,
          now,
          now,
          now,
        ]
      );

      // 2. Insert Sale Items & Deduct Stock via Immutable Ledger
      const affectedProductIds = new Set<string>();
      for (const item of saleItems) {
        if (item.productId) affectedProductIds.add(item.productId);

        await tx.execute(
          `INSERT INTO sale_items (
            id, sale_id, product_id, variant_id, name,
            quantity, unit_price, unit_cost, discount, total_price, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            item.id,
            id,
            item.productId,
            item.variantId,
            item.name,
            item.quantity,
            item.unitPrice,
            item.unitCost,
            item.discount,
            item.totalPrice,
            null,
          ]
        );

        if (!isDraft && item.productId) {
          // Check if product has any prior inventory ledger history
          const cntRow = await tx.queryOne<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM inventory_transactions WHERE product_id = ?;`,
            [item.productId]
          );
          if (!cntRow || Number(cntRow.cnt) === 0) {
            const prodRow = await tx.queryOne<{ stock: number }>(
              `SELECT stock FROM products WHERE id = ?;`,
              [item.productId]
            );
            const baseline = prodRow ? Number(prodRow.stock) : 0;
            if (baseline > 0) {
              await tx.execute(
                `INSERT OR IGNORE INTO inventory_transactions (
                  id, product_id, variant_id, type, quantity, balance_after,
                  reference_type, reference_id, device_id, user_id, notes, created_at
                ) VALUES (?, ?, ?, 'INITIAL', ?, ?, 'AUDIT', ?, ?, ?, 'Initial inventory baseline', ?);`,
                [
                  `itx_init_${item.productId}`,
                  item.productId,
                  item.variantId || null,
                  baseline,
                  baseline,
                  item.productId,
                  deviceId,
                  sale.cashier || 'cashier',
                  now - 1000,
                ]
              );
            }
          }

          const curBalRow = await tx.queryOne<{ bal: number }>(
            `SELECT COALESCE(SUM(quantity), 0) as bal FROM inventory_transactions WHERE product_id = ?;`,
            [item.productId]
          );
          const curBal = curBalRow ? Number(curBalRow.bal) : 0;
          const balanceAfter = curBal - Math.abs(item.quantity);

          // Append to immutable inventory ledger with idempotent event ID
          const itxId = `itx_sale_${item.id}`;
          await tx.execute(
            `INSERT OR IGNORE INTO inventory_transactions (
              id, product_id, variant_id, type, quantity, balance_after,
              reference_type, reference_id, device_id, user_id, notes, created_at
            ) VALUES (?, ?, ?, 'INVENTORY_OUT', ?, ?, 'SALE', ?, ?, ?, ?, ?);`,
            [
              itxId,
              item.productId,
              item.variantId || null,
              -Math.abs(item.quantity),
              balanceAfter,
              id,
              deviceId,
              sale.cashier || 'cashier',
              `Sale: ${sale.invoiceNumber}`,
              now,
            ]
          );
        }
      }

      // Recompute authoritative stock from ledger for all affected products
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

      // 3. Insert Payment Record(s) & Update Wallets
      if (sale.splitPayments && sale.splitPayments.length > 0) {
        for (const sp of sale.splitPayments) {
          await tx.execute(
            `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
             VALUES (?, ?, ?, ?, ?, ?);`,
            [generateId(), id, sp.method, sp.amount, sp.reference || null, now]
          );
          await tx.execute(
            `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
            [sp.amount, sp.method]
          );
        }
      } else {
        const pm = sale.paymentMethod === 'split' ? 'cash' : (sale.paymentMethod || 'cash');
        await tx.execute(
          `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [generateId(), id, pm, sale.total || 0, null, now]
        );
        // Credit is a receivable (ledger entry), not physical cash — don't inflate wallet balance
        if (pm !== 'credit') {
          await tx.execute(
            `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
            [sale.total || 0, pm]
          );
        }
      }

      // 4. Update Customer Balance if credit sale
      if (sale.customerId && !isDraft && sale.paymentMethod === 'credit') {
        const custRow = await tx.queryOne<{ current_balance: number }>(
          `SELECT current_balance FROM customers WHERE id = ?;`,
          [sale.customerId]
        );
        const currentBal = custRow ? Number(custRow.current_balance) : 0;
        const newBal = currentBal + sale.total;

        await tx.execute(
          `UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?;`,
          [newBal, now, sale.customerId]
        );

        await tx.execute(
          `INSERT INTO customer_ledger (
            id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
          ) VALUES (?, ?, 'sale', ?, ?, ?, 'credit', ?, ?);`,
          [generateId(), sale.customerId, sale.total, newBal, id, `Sale: ${sale.invoiceNumber}`, now]
        );
      }
    },
  });

  // Sync Dexie localDb for backward compatibility
  try {
    await localDb.sales.put(sale);
    if (!isDraft) {
      for (const item of sale.items || []) {
        const pid = (item as any).product?.id || (item as any).productId || (item as any).id;
        if (pid) {
          const p = await localDb.products.get(pid);
          if (p) await localDb.products.update(p.id, { stock: (p.stock || 0) - (Number(item.quantity) || 1), updatedAt: new Date(now) });
        }
      }
    }
    localStorage.setItem('pos_last_sale_event', String(now));
  } catch {}

  return sale;
}
