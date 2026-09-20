/**
 * P2P Store Snapshot Bootstrap Engine
 * Generates and applies comprehensive store snapshots across mesh terminals.
 */

import { getDatabase, TABLES, flushDb } from '../db';
import { localDb } from '../localDb';
import { mapSqliteProduct } from '../services/catalog/productRepository';
import { safeTs } from '../utils/safeTimestamp';
import { mapSqliteCategory } from '../services/catalog/categoryRepository';
import { refreshAllStoresFromLocalDb } from './storeSync';
import { applySalesAndFinancialEntities, ExtendedSnapshotEntities } from './snapshotApplier';

export interface MeshStoreSnapshot extends ExtendedSnapshotEntities {
  shop?: any;
  categories: any[];
  products: any[];
  inventoryTransactions: any[];
  sales: any[];
  saleItems: any[];
  payments: any[];
  expenses: any[];
  customerLedger: any[];
  purchaseRecords: any[];
  users: any[];
  settings: any[];
  discounts: any[];
  bundles: any[];
  bundleItems: any[];
  customers: any[];
  suppliers: any[];
  paymentModes: any[];
  devices: any[];
  timestamp: number;
}

/**
 * Extract a complete consistent snapshot from local SQLite.
 */
export async function generateSnapshot(): Promise<MeshStoreSnapshot> {
  const db = await getDatabase();

  const [
    shop,
    categories,
    products,
    inventoryTransactions,
    sales,
    saleItems,
    payments,
    expenses,
    customerLedger,
    purchaseRecords,
    users,
    settings,
    discounts,
    bundles,
    bundleItems,
    customers,
    suppliers,
    paymentModes,
    devices,
  ] = await Promise.all([
    db.queryOne(`SELECT * FROM ${TABLES.SHOP} LIMIT 1;`).catch(() => null),
    db.query(`SELECT * FROM ${TABLES.CATEGORIES};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PRODUCTS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.INVENTORY_TRANSACTIONS} ORDER BY created_at ASC;`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.SALES} ORDER BY timestamp ASC;`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.SALE_ITEMS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PAYMENTS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.EXPENSES};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.CUSTOMER_LEDGER};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PURCHASE_RECORDS};`).catch(() => []),
    db.query(`SELECT id, name, username, pin_hash, role, email, avatar, active, created_at, updated_at FROM ${TABLES.USERS};`).catch(() => []),
    db.query(`SELECT key, value, updated_at FROM ${TABLES.SETTINGS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.DISCOUNTS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.BUNDLES};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.BUNDLE_ITEMS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.CUSTOMERS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.SUPPLIERS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PAYMENT_MODES};`).catch(() => []),
    db.query(`SELECT device_id, name, role, public_key, is_revoked, paired_at FROM ${TABLES.DEVICES};`).catch(() => []),
  ]);

  return {
    shop,
    categories,
    products,
    inventoryTransactions,
    sales,
    saleItems,
    payments,
    expenses,
    customerLedger,
    purchaseRecords,
    users,
    settings,
    discounts,
    bundles,
    bundleItems,
    customers,
    suppliers,
    paymentModes,
    devices,
    timestamp: Date.now(),
  };
}

/**
 * Apply a remote store snapshot into local SQLite inside an atomic transaction.
 */
export async function applySnapshot(snapshot: MeshStoreSnapshot): Promise<void> {
  if (!snapshot) return;
  const db = await getDatabase();
  const now = Date.now();

  await db.transaction(async (tx) => {
    // 1. Shop profile
    if (snapshot.shop && snapshot.shop.id) {
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.SHOP} (
          id, name, currency, master_recovery_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          snapshot.shop.id,
          snapshot.shop.name || 'Zaynahs POS',
          snapshot.shop.currency || 'PKR',
          snapshot.shop.master_recovery_hash || 'SECONDARY_RECOVERY_LOCKED',
          snapshot.shop.created_at || now,
          now,
        ]
      );
    }

    // 2. Categories
    for (const c of snapshot.categories || []) {
      await tx.execute(
        `INSERT INTO ${TABLES.CATEGORIES} (id, name, active, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, active = excluded.active, updated_at = excluded.updated_at;`,
        [c.id, c.name, c.active !== undefined ? (c.active ? 1 : 0) : 1, c.updated_at || now]
      );
      try {
        await localDb.categories.put(mapSqliteCategory(c));
      } catch {}
    }

    // 3. Products
    for (const p of snapshot.products || []) {
      const catId = (typeof p.category_id === 'string' && p.category_id.trim().length > 0) ? p.category_id.trim() : null;
      if (catId) {
        await tx.execute(
          `INSERT OR IGNORE INTO ${TABLES.CATEGORIES} (id, name, active, updated_at) VALUES (?, 'General', 1, ?);`,
          [catId, now]
        );
      }
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
          p.id,
          p.name,
          p.barcode || null,
          p.sku || null,
          catId,
          p.supplier_id || null,
          p.cost_price || 0,
          p.retail_price || 0,
          p.stock || 0,
          p.min_stock_alert || 5,
          p.track_inventory ? 1 : 0,
          p.image_hash || null,
          p.active !== undefined ? (p.active ? 1 : 0) : 1,
          p.version || 1,
          p.created_at || now,
          p.updated_at || now,
        ]
      );
      try {
        await localDb.products.put(mapSqliteProduct(p));
      } catch {}
    }

    // 4. Users
    for (const u of snapshot.users || []) {
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.USERS} (
          id, name, username, pin_hash, role, email, avatar, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          u.id,
          u.name,
          u.username,
          u.pin_hash,
          u.role,
          u.email || '',
          u.avatar || '',
          u.active !== undefined ? (u.active ? 1 : 0) : 1,
          u.created_at || now,
          now,
        ]
      );
    }

    // 5. Settings — protect local real store identity from placeholder overwrite
    for (const s of snapshot.settings || []) {
      if (s.key === 'device_id') continue; // Never overwrite local terminal device ID
      if (s.key === 'app_settings') {
        try {
          const { mergeRemoteSettingsIntoLocal } = await import('../services/settings/settingsHelper');
          const { localDb: ldb, SETTINGS_ID: SID } = await import('../localDb');
          let remoteSettings: any = null;
          try { remoteSettings = typeof s.value === 'string' ? JSON.parse(s.value) : s.value; } catch {}
          if (!remoteSettings) continue;
          const currentLocal = await ldb.appSettings.get(SID).catch(() => null);
          const merged = mergeRemoteSettingsIntoLocal(currentLocal, remoteSettings);
          merged.id = SID;
          merged.updatedAt = new Date(now);
          const mergedTime = safeTs(merged.updatedAt, now);
          await tx.execute(
            `INSERT INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
            ['app_settings', JSON.stringify(merged), mergedTime]
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
              mergedTime,
            ]
          );
          // Persist merged into Dexie & fire 0ms Zustand update
          ldb.appSettings.put(merged).catch(() => {});
        } catch (settingsErr) {
          console.warn('[SnapshotEngine] Settings merge error:', settingsErr);
        }
        continue;
      }
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.SETTINGS} (key, value, updated_at)
         VALUES (?, ?, ?);`,
        [s.key, s.value, s.updated_at || now]
      );
    }

    // 7. Customers & Suppliers
    for (const cust of snapshot.customers || []) {
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.CUSTOMERS} (
          id, name, phone, email, address, credit_limit, current_balance, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          cust.id,
          cust.name,
          cust.phone || null,
          cust.email || null,
          cust.address || null,
          cust.credit_limit || 0,
          cust.current_balance !== undefined ? cust.current_balance : (cust.balance || 0),
          cust.active !== undefined ? (cust.active ? 1 : 0) : 1,
          cust.updated_at || now,
        ]
      );
    }
    for (const sup of snapshot.suppliers || []) {
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.SUPPLIERS} (
          id, name, phone, email, address, balance, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          sup.id,
          sup.name,
          sup.phone || null,
          sup.email || null,
          sup.address || null,
          sup.balance || 0,
          sup.active !== undefined ? (sup.active ? 1 : 0) : 1,
          sup.updated_at || now,
        ]
      );
    }

    // 7b. Discounts
    for (const d of snapshot.discounts || []) {
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

    // 7c. Bundles & Bundle Items
    for (const b of snapshot.bundles || []) {
      if (!b?.id) continue;
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.BUNDLES} (
          id, name, description, discount_value, discount_type,
          override_price, hide_item_prices, active, image, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          b.id, b.name || '', b.description || '',
          Number(b.discount_value) || 0, b.discount_type || 'percentage',
          b.override_price ?? null, b.hide_item_prices ? 1 : 0,
          b.active !== undefined ? (b.active ? 1 : 0) : 1,
          b.image || null, b.created_at || now, b.updated_at || now,
        ]
      );
    }
    for (const bi of snapshot.bundleItems || []) {
      if (!bi?.id) continue;
      await tx.execute(
        `INSERT OR IGNORE INTO ${TABLES.BUNDLE_ITEMS} (id, bundle_id, product_id, quantity) VALUES (?, ?, ?, ?);`,
        [bi.id, bi.bundle_id, bi.product_id, Number(bi.quantity) || 1]
      );
    }

    // 8. Payment Modes & Devices
    for (const pm of snapshot.paymentModes || []) {
      await tx.execute(
        `INSERT OR REPLACE INTO ${TABLES.PAYMENT_MODES} (id, name, is_active, is_custom, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [pm.id, pm.name, pm.is_active ? 1 : 0, pm.is_custom ? 1 : 0, pm.created_at || now]
      );
    }
    for (const dev of snapshot.devices || []) {
      await tx.execute(
        `INSERT OR IGNORE INTO ${TABLES.DEVICES} (
          device_id, name, role, public_key, is_revoked, paired_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [dev.device_id, dev.name, dev.role || 'terminal', dev.public_key || '', dev.is_revoked ? 1 : 0, dev.paired_at || now]
      );
    }

    // 9. Sales, Line Items, Payments, Expenses, Customer Ledger, Inventory & Stock
    await applySalesAndFinancialEntities(snapshot, tx, now);
  });

  await flushDb();

  await refreshAllStoresFromLocalDb();
}
