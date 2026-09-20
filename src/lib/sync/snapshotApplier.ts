/**
 * Mesh Store Snapshot Transactional Applier
 * Applies sales, ledger, expenses, and inventory transactions with exact schema & stock reconciliation.
 */

import { ISqliteTransaction } from '../db/types';
import { TABLES } from '../db';
import { localDb } from '../localDb';
import { mapSqliteProduct } from '../services/catalog/productRepository';

export interface ExtendedSnapshotEntities {
  sales?: any[];
  saleItems?: any[];
  payments?: any[];
  expenses?: any[];
  customerLedger?: any[];
  purchaseRecords?: any[];
  inventoryTransactions?: any[];
}

export async function applySalesAndFinancialEntities(
  snapshot: ExtendedSnapshotEntities,
  tx: ISqliteTransaction,
  now: number
): Promise<void> {
  // 1. Sales Headers
  for (const s of snapshot.sales || []) {
    await tx.execute(
      `INSERT INTO ${TABLES.SALES} (
        id, invoice_number, device_id, customer_id, user_id, salesman_id,
        subtotal, discount_amount, tax_amount, extra_charges, total_amount,
        tendered_amount, change_amount, payment_method, status, refunded_amount,
        notes, timestamp, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        invoice_number = excluded.invoice_number,
        device_id = excluded.device_id,
        customer_id = excluded.customer_id,
        user_id = excluded.user_id,
        salesman_id = excluded.salesman_id,
        subtotal = excluded.subtotal,
        discount_amount = excluded.discount_amount,
        tax_amount = excluded.tax_amount,
        extra_charges = excluded.extra_charges,
        total_amount = excluded.total_amount,
        tendered_amount = excluded.tendered_amount,
        change_amount = excluded.change_amount,
        payment_method = excluded.payment_method,
        status = excluded.status,
        refunded_amount = excluded.refunded_amount,
        notes = excluded.notes,
        timestamp = excluded.timestamp,
        updated_at = excluded.updated_at;`,
      [
        s.id,
        s.invoice_number,
        s.device_id || 'remote',
        s.customer_id || null,
        s.user_id || 'cashier',
        s.salesman_id || null,
        s.subtotal || 0,
        s.discount_amount || 0,
        s.tax_amount || 0,
        s.extra_charges || 0,
        s.total_amount || 0,
        s.tendered_amount ?? s.total_amount ?? 0,
        s.change_amount || 0,
        s.payment_method || 'cash',
        s.status || 'completed',
        s.refunded_amount || 0,
        s.notes || null,
        s.timestamp || now,
        s.created_at || now,
        s.updated_at || now,
      ]
    );

    try {
      await localDb.sales.put({
        id: s.id,
        invoiceNumber: s.invoice_number,
        total: s.total_amount,
        subtotal: s.subtotal,
        discountAmount: s.discount_amount,
        taxAmount: s.tax_amount,
        paymentMethod: s.payment_method,
        status: s.status,
        cashier: s.user_id,
        timestamp: new Date(s.timestamp || now),
        receiptNumber: s.invoice_number,
        items: [],
      } as any);
    } catch {}
  }

  // 2. Sale Items
  for (const it of snapshot.saleItems || []) {
    if (it.product_id) {
      await tx.execute(
        `INSERT OR IGNORE INTO ${TABLES.PRODUCTS} (id, name, retail_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
        [it.product_id, it.name || 'Synced Item', it.unit_price || 0, now, now]
      );
    }
    await tx.execute(
      `INSERT INTO ${TABLES.SALE_ITEMS} (
        id, sale_id, product_id, variant_id, name,
        quantity, unit_price, unit_cost, discount, total_price, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sale_id = excluded.sale_id,
        product_id = excluded.product_id,
        variant_id = excluded.variant_id,
        name = excluded.name,
        quantity = excluded.quantity,
        unit_price = excluded.unit_price,
        unit_cost = excluded.unit_cost,
        discount = excluded.discount,
        total_price = excluded.total_price,
        notes = excluded.notes;`,
      [
        it.id,
        it.sale_id,
        it.product_id,
        it.variant_id || null,
        it.name || 'Item',
        it.quantity || 1,
        it.unit_price || 0,
        it.unit_cost || 0,
        it.discount || 0,
        it.total_price || 0,
        it.notes || null,
      ]
    );
  }

  // 3. Payments
  for (const pm of snapshot.payments || []) {
    await tx.execute(
      `INSERT INTO ${TABLES.PAYMENTS} (
        id, sale_id, mode_id, amount, reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sale_id = excluded.sale_id,
        mode_id = excluded.mode_id,
        amount = excluded.amount,
        reference = excluded.reference;`,
      [
        pm.id,
        pm.sale_id || null,
        pm.mode_id || 'cash',
        pm.amount || 0,
        pm.reference || null,
        pm.created_at || now,
      ]
    );
  }

  // 4. Expenses
  for (const exp of snapshot.expenses || []) {
    await tx.execute(
      `INSERT OR REPLACE INTO ${TABLES.EXPENSES} (
        id, title, category, amount, payment_mode_id, notes, user_id, date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        exp.id,
        exp.title,
        exp.category,
        exp.amount || 0,
        exp.payment_mode_id || null,
        exp.notes || null,
        exp.user_id || 'system',
        exp.date || now,
        exp.created_at || now,
      ]
    );
    try {
      await localDb.expenses.put({
        id: exp.id,
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        notes: exp.notes,
        date: new Date(exp.date || now),
      } as any);
    } catch {}
  }

  // 5. Customer Ledger
  for (const cl of snapshot.customerLedger || []) {
    await tx.execute(
      `INSERT OR REPLACE INTO ${TABLES.CUSTOMER_LEDGER} (
        id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        cl.id,
        cl.customer_id,
        cl.type,
        cl.amount || 0,
        cl.balance_after || 0,
        cl.sale_id || null,
        cl.payment_mode || null,
        cl.notes || null,
        cl.created_at || now,
      ]
    );
  }

  // 6. Purchase Records
  for (const pr of snapshot.purchaseRecords || []) {
    await tx.execute(
      `INSERT OR REPLACE INTO ${TABLES.PURCHASE_RECORDS} (
        id, supplier_id, invoice_number, total_amount, paid_amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        pr.id,
        pr.supplier_id || null,
        pr.invoice_number || null,
        pr.total_amount || 0,
        pr.paid_amount || 0,
        pr.status || 'completed',
        pr.created_at || now,
      ]
    );
  }

  // 7. Inventory Transactions (Authoritative Append-Only Ledger)
  for (const inv of snapshot.inventoryTransactions || []) {
    if (!inv.product_id) continue;
    await tx.execute(
      `INSERT OR IGNORE INTO ${TABLES.PRODUCTS} (id, name, retail_price, created_at, updated_at) VALUES (?, 'Synced Product', 0, ?, ?);`,
      [inv.product_id, now, now]
    );
    const qty = inv.quantity !== undefined ? inv.quantity : (inv.change_qty !== undefined ? inv.change_qty : 0);
    const notes = inv.notes !== undefined ? inv.notes : (inv.note !== undefined ? inv.note : null);

    await tx.execute(
      `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
        id, product_id, variant_id, type, quantity, balance_after,
        reference_type, reference_id, device_id, user_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        inv.id,
        inv.product_id,
        inv.variant_id || null,
        inv.type || 'ADJUSTMENT',
        qty,
        inv.balance_after !== undefined ? inv.balance_after : null,
        inv.reference_type || 'SYSTEM',
        inv.reference_id || inv.id,
        inv.device_id || 'remote',
        inv.user_id || 'system',
        notes,
        inv.created_at || now,
      ]
    );
  }

  // 8. Deterministic Stock Reconciliation from Append-Only Ledger
  try {
    await tx.execute(
      `UPDATE ${TABLES.PRODUCTS}
       SET stock = (
         SELECT COALESCE(SUM(quantity), 0)
         FROM ${TABLES.INVENTORY_TRANSACTIONS}
         WHERE product_id = ${TABLES.PRODUCTS}.id
       )
       WHERE id IN (
         SELECT DISTINCT product_id FROM ${TABLES.INVENTORY_TRANSACTIONS}
       );`
    );

    // Sync updated product stock to Dexie
    const refreshedProds = await tx.query(`SELECT * FROM ${TABLES.PRODUCTS};`);
    for (const p of refreshedProds || []) {
      try {
        await localDb.products.put(mapSqliteProduct(p));
      } catch {}
    }
  } catch (err) {
    console.warn('[SnapshotApplier] Ledger stock recompute warning:', err);
  }
}
