/**
 * Reconciler Database Operations
 * Low-level transactional helpers for sales insertion, voiding, and ledger stock recomputation.
 */

import { getDatabase, TABLES } from '../db';
import { localDb, generateId } from '../localDb';
import { getAllProducts } from '../services/catalog/productRepository';
import { useSalesStore, useProductsStore } from '../../stores';

export async function insertReconciledSale(bundle: any, tx: any, now: number): Promise<void> {
  const { sale, items, payments } = bundle;
  if (!sale?.id) return;

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
      sale.id, sale.invoice_number, sale.device_id || 'remote', sale.customer_id,
      sale.user_id || 'cashier', sale.salesman_id, sale.subtotal || 0,
      sale.discount_amount || 0, sale.tax_amount || 0, sale.extra_charges || 0,
      sale.total_amount || 0, sale.tendered_amount || sale.total_amount || 0,
      sale.change_amount || 0, sale.payment_method || 'cash', sale.status || 'completed',
      sale.refunded_amount || 0, sale.notes, sale.timestamp || now, sale.created_at || now, now,
    ]
  );

  // Clean old items, payments & txs for this sale so amendments cleanly overwrite
  await tx.execute(`DELETE FROM ${TABLES.SALE_ITEMS} WHERE sale_id = ?;`, [sale.id]);
  await tx.execute(`DELETE FROM ${TABLES.PAYMENTS} WHERE sale_id = ?;`, [sale.id]);
  await tx.execute(`DELETE FROM ${TABLES.INVENTORY_TRANSACTIONS} WHERE reference_type = 'SALE' AND reference_id = ?;`, [sale.id]);

  let idx = 0;
  const isDraft = sale.status === 'pending' || Boolean(sale.notes?.includes('DRAFT_SALE'));
  const isVoid = sale.status === 'void';

  for (const it of items || []) {
    idx++;
    const itemId = it.id || `${sale.id}_item_${idx}`;
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [itemId, sale.id, it.product_id, it.variant_id, it.name, it.quantity, it.unit_price, it.unit_cost, it.discount, it.total_price, it.notes]
    );

    if (!isDraft && !isVoid && it.product_id) {
      const qty = Number(it.quantity) || 1;
      await tx.execute(
        `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
          id, product_id, variant_id, type, quantity, balance_after,
          reference_type, reference_id, device_id, user_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [`itx_sale_${itemId}`, it.product_id, it.variant_id || null, 'INVENTORY_OUT', -qty, 0, 'SALE', sale.id, sale.device_id || 'remote', sale.user_id || 'cashier', `Sale: ${sale.invoice_number}`, now]
      );
    }
  }

  for (const pm of payments || []) {
    await tx.execute(
      `INSERT INTO ${TABLES.PAYMENTS} (
        id, sale_id, mode_id, amount, reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      [pm.id || generateId(), sale.id, pm.mode_id || 'cash', pm.amount || sale.total_amount, pm.reference, pm.created_at || now]
    );
  }

  try {
    const { mapSqliteSale } = await import('../services/sales/salesRepository');
    const mapped = mapSqliteSale(sale, items, payments);
    await localDb.sales.put(mapped);
    useSalesStore.getState().updateSale(mapped);
  } catch {}
}

export async function executeReconciledSaleVoid(saleId: string, tx: any, now: number): Promise<void> {
  const saleRow = await tx.queryOne(`SELECT * FROM ${TABLES.SALES} WHERE id = ?;`, [saleId]);
  if (!saleRow || saleRow.status === 'void') return;

  const isDraft = saleRow.status === 'pending' || Boolean(saleRow.notes?.includes('DRAFT_SALE'));

  await tx.execute(`UPDATE ${TABLES.SALES} SET status = 'void', updated_at = ? WHERE id = ?;`, [now, saleId]);

  if (!isDraft) {
    const saleItems = await tx.query(`SELECT * FROM ${TABLES.SALE_ITEMS} WHERE sale_id = ?;`, [saleId]);
    for (const it of saleItems) {
      const qty = Number(it.quantity) || 1;
      const itxVoidId = `itx_void_${saleId}_${it.id}`;
      await tx.execute(
        `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
          id, product_id, variant_id, type, quantity, balance_after,
          reference_type, reference_id, device_id, user_id, notes, created_at
        ) VALUES (?, ?, ?, 'RETURN', ?, 0, 'SALE', ?, ?, ?, ?, ?);`,
        [
          itxVoidId,
          it.product_id,
          it.variant_id || null,
          qty,
          saleId,
          saleRow.device_id || 'remote',
          saleRow.user_id || 'cashier',
          `Reconciled Void: ${saleRow.invoice_number}`,
          now,
        ]
      );
    }
  }

  try {
    await localDb.sales.delete(saleId);
    useSalesStore.getState().deleteSale(saleId);
  } catch {}
}

export async function recomputeStockFromLedger(): Promise<void> {
  try {
    const db = await getDatabase();

    // 1. Purge duplicate / phantom SALE deductions that do not match valid sale items
    await db.execute(
      `DELETE FROM ${TABLES.INVENTORY_TRANSACTIONS}
       WHERE reference_type = 'SALE'
         AND type = 'INVENTORY_OUT'
         AND id NOT IN (
           SELECT 'itx_sale_' || si.id
           FROM ${TABLES.SALE_ITEMS} si
           JOIN ${TABLES.SALES} s ON si.sale_id = s.id
           WHERE s.status != 'pending' AND (s.notes IS NULL OR s.notes NOT LIKE '%DRAFT_SALE%')
         );`
    );

    // 2. Purge duplicate / legacy non-deterministic return transactions for sales
    await db.execute(
      `DELETE FROM ${TABLES.INVENTORY_TRANSACTIONS}
       WHERE reference_type = 'SALE'
         AND type = 'RETURN'
         AND id NOT IN (
           SELECT 'itx_void_' || s.id || '_' || si.id
           FROM ${TABLES.SALE_ITEMS} si
           JOIN ${TABLES.SALES} s ON si.sale_id = s.id
           WHERE s.status = 'void' AND (s.notes IS NULL OR s.notes NOT LIKE '%DRAFT_SALE%')
         )
         AND id NOT LIKE 'itx_refund_%'
         AND id NOT LIKE 'itx_edit_rev_%';`
    );

    // 3. Ensure all non-draft sales have their immutable deduction
    await db.execute(
      `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
         id, product_id, variant_id, type, quantity, balance_after,
         reference_type, reference_id, device_id, user_id, notes, created_at
       )
       SELECT
         'itx_sale_' || si.id,
         si.product_id,
         si.variant_id,
         'INVENTORY_OUT',
         -si.quantity,
         0,
         'SALE',
         s.id,
         s.device_id,
         s.user_id,
         'Sale: ' || s.invoice_number,
         s.timestamp
       FROM ${TABLES.SALE_ITEMS} si
       JOIN ${TABLES.SALES} s ON si.sale_id = s.id
       WHERE s.status != 'pending' AND (s.notes IS NULL OR s.notes NOT LIKE '%DRAFT_SALE%');`
    );

    // 3. Ensure all void non-draft sales have their immutable reversal
    await db.execute(
      `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
         id, product_id, variant_id, type, quantity, balance_after,
         reference_type, reference_id, device_id, user_id, notes, created_at
       )
       SELECT
         'itx_void_' || s.id || '_' || si.id,
         si.product_id,
         si.variant_id,
         'RETURN',
         si.quantity,
         0,
         'SALE',
         s.id,
         s.device_id,
         s.user_id,
         'Void: ' || s.invoice_number,
         COALESCE(s.updated_at, s.timestamp)
       FROM ${TABLES.SALE_ITEMS} si
       JOIN ${TABLES.SALES} s ON si.sale_id = s.id
       WHERE s.status = 'void' AND (s.notes IS NULL OR s.notes NOT LIKE '%DRAFT_SALE%');`
    );

    // 3.5 INITIAL opening balance — ONLY for products with ZERO transactions at all.
    // CRITICAL: Do NOT use p.stock as the INITIAL qty — p.stock may already include all INVENTORY_IN
    // (restock) amounts. Creating INITIAL(p.stock) + existing INVENTORY_IN rows = DOUBLE COUNTING.
    // Safe rule: If a product has ANY transactions, the ledger is already complete — skip INITIAL creation.
    // Only create INITIAL(0) for truly orphaned products that have no ledger history whatsoever.
    const prodsWithZeroTxs = await db.query<any>(
      `SELECT p.id, p.created_at
       FROM ${TABLES.PRODUCTS} p
       WHERE NOT EXISTS (
         SELECT 1 FROM ${TABLES.INVENTORY_TRANSACTIONS}
         WHERE product_id = p.id
       );`
    );

    for (const p of prodsWithZeroTxs) {
      // Use 0 — not p.stock — to avoid inflating stock for products that have lost their ledger
      // The correct stock will be rebuilt when inventory events arrive via P2P sync
      await db.execute(
        `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
           id, product_id, variant_id, type, quantity, balance_after,
           reference_type, reference_id, device_id, user_id, notes, created_at
         ) VALUES (?, ?, NULL, 'INITIAL', 0, 0, 'AUDIT', ?, 'local', 'system', 'Opening Stock', ?);`,
        [`itx_init_${p.id}`, p.id, p.id, p.created_at || Date.now()]
      );
    }

    // 4. Update products stock strictly as the sum of the ledger
    await db.execute(
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

    const refreshed = await getAllProducts();
    for (const p of refreshed) {
      await localDb.products.put(p).catch(() => {});
    }
    useProductsStore.getState().setProducts(refreshed);
  } catch (err) {
    console.warn('[ReconcilerOps] Ledger stock recompute error:', err);
  }
}
