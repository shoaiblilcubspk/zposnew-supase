/**
 * Reconcile Payload Applier
 * Transactionally commits batch payloads from remote peers during P2P reconciliation.
 */

import { ISqliteTransaction } from '../db/types';
import { TABLES } from '../db';
import { safeTs } from '../utils/safeTimestamp';
import { localDb } from '../localDb';
import { insertReconciledSale, executeReconciledSaleVoid } from './reconcilerOps';

export async function insertReconciledUser(u: any, tx: ISqliteTransaction, now: number): Promise<void> {
  if (!u?.id) return;
  const pinHash = u.pin_hash || u.pinHash || 'DEFAULT_LOCKED_PIN_HASH';
  const username = (u.username || u.name || '').toLowerCase();
  const activeVal = u.active !== undefined ? (u.active ? 1 : 0) : 1;
  await tx.execute(
    `INSERT INTO ${TABLES.USERS} (
      id, name, username, pin_hash, role, active, email, avatar, require_pin_on_sale, can_view_expiry, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, username = excluded.username,
      pin_hash = CASE WHEN excluded.pin_hash != 'DEFAULT_LOCKED_PIN_HASH' THEN excluded.pin_hash ELSE ${TABLES.USERS}.pin_hash END,
      role = excluded.role, active = excluded.active, email = excluded.email, avatar = excluded.avatar,
      updated_at = excluded.updated_at;`,
    [
      u.id, u.name || 'Staff Operator', username, pinHash, u.role || 'cashier',
      activeVal, u.email || null, u.avatar || null, u.require_pin_on_sale ? 1 : 0,
      u.can_view_expiry !== undefined ? (u.can_view_expiry ? 1 : 0) : 1,
      u.created_at || now, now
    ]
  );
  try {
    await localDb.users.put({
      id: u.id, name: u.name || 'Staff Operator', username, email: u.email || '',
      role: u.role || 'cashier', active: Boolean(activeVal), avatar: u.avatar,
      createdAt: new Date(u.created_at || now), updatedAt: new Date(now),
    });
  } catch {}
}

export async function applyReconciledEntities(
  payload: any,
  tx: ISqliteTransaction,
  now: number
): Promise<void> {
  for (const sid of payload.voidSaleIds || []) {
    await executeReconciledSaleVoid(sid, tx, now);
  }
  for (const u of payload.newUsers || []) {
    await insertReconciledUser(u, tx, now);
  }
  for (const c of payload.newCategories || []) {
    await tx.execute(
      `INSERT INTO ${TABLES.CATEGORIES} (id, name, color, icon, active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, color = excluded.color, icon = excluded.icon,
         active = excluded.active, updated_at = excluded.updated_at;`,
      [c.id, c.name, c.color || null, c.icon || null, c.active !== undefined ? (c.active ? 1 : 0) : 1, c.updated_at || now]
    );
  }
  for (const s of payload.newSuppliers || []) {
    await tx.execute(
      `INSERT INTO ${TABLES.SUPPLIERS} (id, name, phone, email, address, balance, active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, phone = excluded.phone, email = excluded.email,
         address = excluded.address, balance = excluded.balance,
         active = excluded.active, updated_at = excluded.updated_at;`,
      [s.id, s.name, s.phone || null, s.email || null, s.address || null, s.balance || 0, s.active !== undefined ? (s.active ? 1 : 0) : 1, s.updated_at || now]
    );
  }
  for (const p of payload.newProducts || []) {
    const tomb = await tx.queryOne(`SELECT 1 FROM tombstones WHERE entity_id = ?;`, [p.id]);
    if (tomb) continue;
    await tx.execute(
      `INSERT INTO ${TABLES.PRODUCTS} (
        id, name, barcode, sku, category_id, supplier_id,
        cost_price, retail_price, stock, min_stock_alert,
        track_inventory, image_hash, active, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, barcode = excluded.barcode, sku = excluded.sku,
        category_id = excluded.category_id, supplier_id = excluded.supplier_id,
        cost_price = excluded.cost_price, retail_price = excluded.retail_price,
        stock = excluded.stock, min_stock_alert = excluded.min_stock_alert,
        track_inventory = excluded.track_inventory,
        image_hash = COALESCE(excluded.image_hash, ${TABLES.PRODUCTS}.image_hash),
        active = excluded.active, version = excluded.version, updated_at = excluded.updated_at;`,
      [
        p.id, p.name, p.barcode || null, p.sku || null, p.category_id || null,
        p.supplier_id || null, p.cost_price || 0, p.retail_price || 0,
        p.stock || 0, p.min_stock_alert || 5, p.track_inventory ? 1 : 0,
        p.image_hash || null, p.active !== undefined ? (p.active ? 1 : 0) : 1,
        p.version || 1, p.created_at || now, p.updated_at || now,
      ]
    );
    const existingTx = await tx.queryOne(`SELECT 1 FROM ${TABLES.INVENTORY_TRANSACTIONS} WHERE product_id = ? LIMIT 1;`, [p.id]);
    if (!existingTx) {
      const initQty = Number(p.initialStock !== undefined ? p.initialStock : p.stock);
      await tx.execute(
        `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
          id, product_id, variant_id, type, quantity, balance_after,
          reference_type, reference_id, device_id, user_id, notes, created_at
        ) VALUES (?, ?, NULL, 'INITIAL', ?, ?, 'AUDIT', ?, 'remote', 'system', 'Initial Stock', ?);`,
        [`itx_init_${p.id}`, p.id, initQty, initQty, p.id, p.created_at || now]
      );
    }
  }
  for (const cust of payload.newCustomers || []) {
    if (!cust?.id) continue;
    await tx.execute(
      `INSERT INTO ${TABLES.CUSTOMERS} (
        id, name, phone, email, address, credit_limit, current_balance, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, phone = excluded.phone, email = excluded.email,
        address = excluded.address, credit_limit = excluded.credit_limit,
        current_balance = excluded.current_balance, active = excluded.active, updated_at = excluded.updated_at;`,
      [
        cust.id, cust.name, cust.phone || null, cust.email || null, cust.address || null,
        cust.credit_limit || 0, cust.current_balance !== undefined ? cust.current_balance : (cust.balance || 0),
        cust.active !== undefined ? (cust.active ? 1 : 0) : 1, cust.updated_at || now
      ]
    );
  }
  for (const sale of payload.newSales || []) {
    await insertReconciledSale(sale, tx, now);
  }
  for (const it of payload.newInvTxs || []) {
    if (!it.product_id) continue;
    // Skip sale deductions: they are managed authoritatively by insertReconciledSale to prevent duplicate deductions
    if (it.reference_type === 'SALE') continue;
    await tx.execute(
      `INSERT OR IGNORE INTO ${TABLES.PRODUCTS} (id, name, retail_price, created_at, updated_at) VALUES (?, 'Synced Product', 0, ?, ?);`,
      [it.product_id, now, now]
    );
    await tx.execute(
      `INSERT OR IGNORE INTO ${TABLES.INVENTORY_TRANSACTIONS} (
        id, product_id, variant_id, type, quantity, balance_after,
        reference_type, reference_id, device_id, user_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        it.id, it.product_id, it.variant_id || null, it.type,
        it.quantity, it.balance_after || 0, it.reference_type || 'SYSTEM',
        it.reference_id || it.id, it.device_id || 'remote',
        it.user_id || 'system', it.notes || null, it.created_at || now
      ]
    );
  }
  for (const exp of payload.newExpenses || []) {
    if (!exp?.id) continue;
    await tx.execute(
      `INSERT INTO ${TABLES.EXPENSES} (
        id, title, category, amount, payment_mode_id, notes, user_id, date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, category = excluded.category, amount = excluded.amount,
        payment_mode_id = excluded.payment_mode_id, notes = excluded.notes,
        user_id = excluded.user_id, date = excluded.date, updated_at = excluded.updated_at;`,
      [
        exp.id, exp.title || 'Expense', exp.category || 'General',
        exp.amount || 0, exp.payment_mode_id || null, exp.notes || null,
        exp.user_id || 'system', exp.date || now, now
      ]
    );
    // Update payment mode balance
    if (exp.payment_mode_id) {
      await tx.execute(
        `UPDATE ${TABLES.PAYMENT_MODES} SET balance = balance - ?, updated_at = ? WHERE id = ?;`,
        [exp.amount || 0, now, exp.payment_mode_id]
      );
    }
  }
  for (const pm of payload.newPaymentModes || []) {
    if (!pm?.id) continue;
    await tx.execute(
      `INSERT INTO ${TABLES.PAYMENT_MODES} (id, name, is_active, is_custom, balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, is_active = excluded.is_active, is_custom = excluded.is_custom,
         balance = excluded.balance, updated_at = excluded.updated_at;`,
      [
        pm.id, pm.name, pm.is_active ? 1 : 0, pm.is_custom ? 1 : 0,
        pm.balance || 0, pm.created_at || now
      ]
    );
  }
  for (const d of payload.newDiscounts || []) {
    if (!d?.id) continue;
    await tx.execute(
      `INSERT INTO ${TABLES.DISCOUNTS} (
        id, name, description, type, value, conditions,
        min_amount, max_discount, valid_from, valid_to, valid_days,
        active, is_auto_apply, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description,
        type = excluded.type, value = excluded.value, conditions = excluded.conditions,
        min_amount = excluded.min_amount, max_discount = excluded.max_discount,
        valid_from = excluded.valid_from, valid_to = excluded.valid_to,
        valid_days = excluded.valid_days, active = excluded.active,
        is_auto_apply = excluded.is_auto_apply, updated_at = excluded.updated_at
      WHERE excluded.updated_at >= ${TABLES.DISCOUNTS}.updated_at;`,
      [
        d.id, d.name || 'Discount', d.description || '', d.type || 'percentage',
        Number(d.value) || 0, d.conditions || '[]',
        d.min_amount ?? null, d.max_discount ?? null,
        d.valid_from || now, d.valid_to || now, d.valid_days ?? null,
        d.active !== undefined ? (d.active ? 1 : 0) : 1,
        d.is_auto_apply ? 1 : 0, d.created_at || now, d.updated_at || now,
      ]
    );
  }
  if (payload.newSettings) {
    const { mergeRemoteSettingsIntoLocal } = await import('../services/settings/settingsHelper');
    const { SETTINGS_ID } = await import('../localDb');
    const currentLocal = await localDb.appSettings.get(SETTINGS_ID);
    const merged = mergeRemoteSettingsIntoLocal(currentLocal, payload.newSettings);
    const nsTime = safeTs(merged.updatedAt, now);
    await tx.execute(
      `INSERT INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      ['app_settings', JSON.stringify(merged), nsTime]
    );
    await tx.execute(
      `UPDATE shop SET
        name = COALESCE(?, name),
        currency = COALESCE(?, currency),
        tax_rate = COALESCE(?, tax_rate),
        logo_url = CASE WHEN ? IS NOT NULL THEN ? ELSE logo_url END,
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        updated_at = ?;`,
      [
        merged.storeName || null,
        merged.currency || null,
        merged.taxRate !== undefined ? Number(merged.taxRate) : null,
        merged.storeLogo !== undefined ? (merged.storeLogo || '') : null,
        merged.storeLogo !== undefined ? (merged.storeLogo || '') : null,
        merged.storeAddress || null,
        merged.storePhone || null,
        nsTime,
      ]
    );
  }
}

