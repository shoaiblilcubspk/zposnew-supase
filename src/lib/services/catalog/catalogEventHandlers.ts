/**
 * Catalog P2P Replication Event Handlers
 * Receives remote product & category mutations from peer terminals and commits them transactionally.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { localDb } from '../../localDb';
import { mapSqliteProduct } from './productRepository';
import { mapSqliteCategory } from './categoryRepository';

export async function handleRemoteProductEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();

  if (event.operation === 'DELETE') {
    await tx.execute(`UPDATE products SET active = 0, updated_at = ? WHERE id = ?;`, [now, event.entity_id]);
    await tx.execute(
      `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('PRODUCT', ?, ?, ?);`,
      [event.entity_id, now, event.device_id]
    );
    try { await localDb.products.delete(event.entity_id); } catch {}
    return;
  }

  // LWW Conflict Resolution for metadata
  const existing = await tx.queryOne<{ version: number; updated_at: number; stock: number }>(
    `SELECT version, updated_at, stock FROM products WHERE id = ?;`,
    [event.entity_id]
  );

  const remoteVersion = p.version || 1;
  const remoteUpdatedAt = p.updatedAt || p.createdAt || now;
  const remoteTs = new Date(remoteUpdatedAt).getTime();
  const localTs = existing ? new Date(existing.updated_at).getTime() : 0;

  if (existing && localTs > remoteTs) {
    return;
  }

  // Authoritative stock determination: Never overwrite stock with scalar numbers
  let currentStock = existing
    ? Number(existing.stock ?? 0)
    : Number(p.initialStock !== undefined ? p.initialStock : (p.stock || 0));

  const safeCatId = (p.categoryId && typeof p.categoryId === 'string' && p.categoryId.trim().length > 0)
    ? p.categoryId.trim()
    : null;

  if (safeCatId) {
    await tx.execute(
      `INSERT OR IGNORE INTO categories (id, name, active, updated_at) VALUES (?, 'General', 1, ?);`,
      [safeCatId, now]
    );
  }

  // 1. Insert/Update product metadata first so foreign key constraints are satisfied
  await tx.execute(
    `INSERT INTO products (
      id, name, barcode, sku, category_id, supplier_id,
      cost_price, retail_price, stock, min_stock_alert,
      track_inventory, image_hash, active, version,
      is_service, require_serial, product_type,
      variants_json, variant_data_json, product_addons_json,
      expiry_date, expiry_alert_days,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      barcode = excluded.barcode,
      sku = excluded.sku,
      category_id = excluded.category_id,
      supplier_id = excluded.supplier_id,
      cost_price = excluded.cost_price,
      retail_price = excluded.retail_price,
      stock = excluded.stock,
      min_stock_alert = excluded.min_stock_alert,
      track_inventory = excluded.track_inventory,
      image_hash = COALESCE(excluded.image_hash, products.image_hash),
      active = excluded.active,
      version = excluded.version,
      is_service = excluded.is_service,
      require_serial = excluded.require_serial,
      product_type = excluded.product_type,
      variants_json = excluded.variants_json,
      variant_data_json = excluded.variant_data_json,
      product_addons_json = excluded.product_addons_json,
      expiry_date = excluded.expiry_date,
      expiry_alert_days = excluded.expiry_alert_days,
      updated_at = excluded.updated_at;`,
    [
      event.entity_id,
      p.name || 'Unnamed',
      p.barcode || null,
      p.sku || null,
      safeCatId,
      p.supplierId || null,
      p.costPrice || 0,
      p.retailPrice || 0,
      currentStock,
      p.minStockAlert || 5,
      p.trackInventory ? 1 : 0,
      p.imageHash || null,
      p.active !== undefined ? (p.active ? 1 : 0) : 1,
      remoteVersion,
      p.isService ? 1 : 0,
      p.requireSerial ? 1 : 0,
      p.productType || 'simple',
      p.variantsJson || (p.variants ? JSON.stringify(p.variants) : null),
      p.variantDataJson || (p.variantData ? JSON.stringify(p.variantData) : null),
      p.productAddonsJson || (p.productAddons ? JSON.stringify(p.productAddons) : null),
      p.expiryDate || null,
      p.expiryAlertDays !== undefined ? Number(p.expiryAlertDays) : 90,
      p.createdAt || now,
      remoteUpdatedAt,
    ]
  );

  // 2. Ensure INITIAL opening stock transaction exists in append-only ledger
  const existingTx = await tx.queryOne(
    `SELECT 1 FROM inventory_transactions WHERE product_id = ? AND (type = 'INITIAL' OR id LIKE 'itx_init_%') LIMIT 1;`,
    [event.entity_id]
  );
  if (!existingTx && currentStock > 0) {
    const initQty = Number(p.initialStock !== undefined ? p.initialStock : currentStock);
    await tx.execute(
      `INSERT OR IGNORE INTO inventory_transactions (
        id, product_id, variant_id, type, quantity, balance_after,
        reference_type, reference_id, device_id, user_id, notes, created_at
      ) VALUES (?, ?, NULL, 'INITIAL', ?, ?, 'AUDIT', ?, ?, 'system', 'Initial Stock on Sync', ?);`,
      [
        `itx_init_${event.entity_id}`,
        event.entity_id,
        initQty,
        initQty,
        event.entity_id,
        event.device_id,
        p.createdAt || now,
      ]
    );
  }

  // 3. Always derive authoritative stock from immutable ledger
  const ledgerRow = await tx.queryOne<{ total_qty: number | null }>(
    `SELECT SUM(quantity) as total_qty FROM inventory_transactions WHERE product_id = ?;`,
    [event.entity_id]
  );
  if (ledgerRow && ledgerRow.total_qty !== null) {
    currentStock = Number(ledgerRow.total_qty);
    await tx.execute(
      `UPDATE products SET stock = ?, updated_at = ? WHERE id = ?;`,
      [currentStock, now, event.entity_id]
    );
  }

  try {
    const updatedRow = await tx.queryOne(`SELECT * FROM products WHERE id = ?;`, [event.entity_id]);
    if (updatedRow) {
      await localDb.products.put(mapSqliteProduct(updatedRow));
    }
  } catch {}
}

export async function handleRemoteCategoryEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();

  if (event.operation === 'DELETE') {
    await tx.execute(`UPDATE categories SET active = 0, updated_at = ? WHERE id = ?;`, [now, event.entity_id]);
    await tx.execute(
      `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('CATEGORY', ?, ?, ?);`,
      [event.entity_id, now, event.device_id]
    );
    try { await localDb.categories.delete(event.entity_id); } catch {}
    return;
  }

  // ─── Name-based dedup: same name different ID ────────────────────────────────
  let effectiveCatId = event.entity_id;
  if (p.name) {
    const byName = await tx.queryOne<{ id: string }>(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND active = 1 LIMIT 1;`, [p.name]
    );
    if (byName && byName.id !== event.entity_id) effectiveCatId = byName.id;
  }

  await tx.execute(
    `INSERT INTO categories (id, name, active, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       active = excluded.active,
       updated_at = excluded.updated_at;`,
    [
      effectiveCatId,
      p.name || 'Unnamed',
      p.active !== undefined ? (p.active ? 1 : 0) : 1,
      p.updatedAt || now,
    ]
  );

  try {
    const updatedRow = await tx.queryOne(`SELECT * FROM categories WHERE id = ?;`, [effectiveCatId]);
    if (updatedRow) {
      await localDb.categories.put(mapSqliteCategory(updatedRow));
    }
  } catch {}
}

registerCatalogEventHandlers();

export function registerCatalogEventHandlers(): void {
  registerEventHandler('PRODUCT', handleRemoteProductEvent);
  registerEventHandler('PRODUCT_CREATED', handleRemoteProductEvent);
  registerEventHandler('PRODUCT_UPDATED', handleRemoteProductEvent);
  registerEventHandler('PRODUCT_DELETED', handleRemoteProductEvent);
  registerEventHandler('CATEGORY', handleRemoteCategoryEvent);
  registerEventHandler('CATEGORY_CREATED', handleRemoteCategoryEvent);
  registerEventHandler('CATEGORY_UPDATED', handleRemoteCategoryEvent);
  registerEventHandler('CATEGORY_DELETED', handleRemoteCategoryEvent);
}
