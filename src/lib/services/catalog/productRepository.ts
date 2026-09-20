/**
 * Local SQLite Product Repository
 * Authoritative local persistence and mutation of products with event outbox integration.
 */

import { getDatabase } from '../../db';
import { Product } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';
import { resolveCategoryId, resolveSupplierId } from './catalogResolvers';
import { mapSqliteProduct, serializeProductColumns } from './productMapper';

export { mapSqliteProduct };

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT p.*,
            c.name AS category_name,
            s.name AS supplier_name
     FROM products p
     LEFT JOIN categories c ON (p.category_id = c.id OR p.category_id = c.name)
     LEFT JOIN suppliers s ON (p.supplier_id = s.id OR p.supplier_id = s.name)
     WHERE p.active = 1
     ORDER BY p.name ASC;`
  );
  return rows.map(mapSqliteProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.queryOne(
    `SELECT p.*,
            c.name AS category_name,
            s.name AS supplier_name
     FROM products p
     LEFT JOIN categories c ON (p.category_id = c.id OR p.category_id = c.name)
     LEFT JOIN suppliers s ON (p.supplier_id = s.id OR p.supplier_id = s.name)
     WHERE p.id = ?;`,
    [id]
  );
  return row ? mapSqliteProduct(row) : null;
}

export async function createProduct(
  product: Omit<Product, 'id'>,
  userId: string = 'system'
): Promise<Product> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();

  // 1. Check duplicate name locally in SQLite
  const existing = await db.queryOne<{ id: string; name: string; stock: number }>(
    `SELECT id, name, stock FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND active = 1;`,
    [product.name]
  );
  if (existing) {
    throw new Error(
      `Product "${product.name}" already exists (ID: ${existing.id}, Stock: ${existing.stock}). Update its stock instead of creating a duplicate.`
    );
  }

  // 2. Check duplicate barcode if present
  if (product.barcode && product.barcode.trim()) {
    const dupBarcode = await db.queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM products WHERE LOWER(TRIM(barcode)) = LOWER(TRIM(?)) AND active = 1;`,
      [product.barcode.trim()]
    );
    if (dupBarcode) {
      throw new Error(`Barcode "${product.barcode}" is already assigned to product "${dupBarcode.name}".`);
    }
  }

  const id = generateId();
  const now = Date.now();
  const barcode = (product.barcode || product.barcodeValue || id).trim();
  const categoryId = await resolveCategoryId(product.category, db, now);
  const supplierId = await resolveSupplierId(product.supplier, db, now);
  const initialStock = product.stock !== undefined ? Number(product.stock) : (product.trackInventory ? 0 : 999999);

  const newProduct: Product = {
    ...product,
    id,
    category: product.category || '',
    supplier: product.supplier || undefined,
    stock: initialStock,
    barcode,
    barcodeValue: barcode,
    createdAt: new Date(now),
    updatedAt: new Date(now),
    active: true,
  };

  const cols = serializeProductColumns(newProduct);

  // Commit atomic SQLite mutation + sync_outbox event
  await commitLocalTransaction({
    entityType: 'PRODUCT',
    entityId: id,
    operation: 'CREATE',
    eventType: 'PRODUCT_CREATED',
    deviceId,
    userId,
    payload: {
      id, name: newProduct.name, barcode: newProduct.barcode, sku: newProduct.sku || null,
      categoryId: categoryId || null, supplierId: supplierId || null,
      costPrice: newProduct.cost || 0, retailPrice: newProduct.price || 0,
      stock: initialStock, initialStock, minStockAlert: newProduct.minStock || 5,
      trackInventory: newProduct.trackInventory ? 1 : 0, imageHash: newProduct.image || null,
      isService: cols.isService, requireSerial: cols.requireSerial, productType: cols.productType,
      variantsJson: cols.variantsJson, variantDataJson: cols.variantDataJson, productAddonsJson: cols.productAddonsJson,
      expiryDate: cols.expiryDate, expiryAlertDays: cols.expiryAlertDays,
      active: 1, version: 1, createdAt: now, updatedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `INSERT INTO products (
          id, name, barcode, sku, category_id, supplier_id,
          cost_price, retail_price, stock, min_stock_alert,
          track_inventory, image_hash, active, version,
          is_service, require_serial, product_type,
          variants_json, variant_data_json, product_addons_json,
          expiry_date, expiry_alert_days, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id, newProduct.name, newProduct.barcode || null, newProduct.sku || null,
          categoryId || null, supplierId || null,
          newProduct.cost || 0, newProduct.price || 0, initialStock,
          newProduct.minStock || 5, newProduct.trackInventory ? 1 : 0,
          newProduct.image || null,
          cols.isService, cols.requireSerial, cols.productType,
          cols.variantsJson, cols.variantDataJson, cols.productAddonsJson,
          cols.expiryDate, cols.expiryAlertDays,
          now, now
        ]
      );

      if (newProduct.trackInventory && initialStock > 0) {
        try {
          const { insertInventoryTransaction } = await import('../inventory/inventoryLedgerRepository');
          await insertInventoryTransaction({
            id: `itx_init_${id}`,
            productId: id,
            type: 'INITIAL',
            quantity: initialStock,
            balanceAfter: initialStock,
            referenceType: 'AUDIT',
            referenceId: id,
            deviceId,
            userId,
            notes: 'Initial Stock on Create',
            createdAt: now,
          }, tx);
        } catch {}
      }
    },
  });

  // Keep local cache synced
  try {
    await localDb.products.put(newProduct);
  } catch {}

  return newProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>,
  userId: string = 'system'
): Promise<Product> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const existing = await getProductById(id);
  if (!existing) throw new Error(`Product ${id} not found.`);

  const now = Date.now();
  const categoryId = updates.category !== undefined
    ? await resolveCategoryId(updates.category, db, now)
    : (existing.category ? await resolveCategoryId(existing.category, db, now) : null);
  const supplierId = updates.supplier !== undefined
    ? await resolveSupplierId(updates.supplier, db, now)
    : (existing.supplier ? await resolveSupplierId(existing.supplier, db, now) : null);
  const newStock = updates.stock !== undefined ? Number(updates.stock) : existing.stock;
  const updatedProduct: Product = {
    ...existing,
    ...updates,
    category: updates.category !== undefined ? updates.category : existing.category,
    supplier: updates.supplier !== undefined ? updates.supplier : existing.supplier,
    stock: newStock,
    id,
    updatedAt: new Date(now),
  };

  const cols = serializeProductColumns(updatedProduct);

  await commitLocalTransaction({
    entityType: 'PRODUCT',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'PRODUCT_UPDATED',
    deviceId,
    userId,
    payload: {
      id, name: updatedProduct.name, barcode: updatedProduct.barcode || null,
      sku: updatedProduct.sku || null, categoryId: categoryId || null,
      supplierId: supplierId || null, costPrice: updatedProduct.cost || 0,
      retailPrice: updatedProduct.price || 0, stock: newStock,
      minStockAlert: updatedProduct.minStock || 5, trackInventory: updatedProduct.trackInventory ? 1 : 0,
      imageHash: updatedProduct.image || null,
      isService: cols.isService, requireSerial: cols.requireSerial, productType: cols.productType,
      variantsJson: cols.variantsJson, variantDataJson: cols.variantDataJson, productAddonsJson: cols.productAddonsJson,
      expiryDate: cols.expiryDate, expiryAlertDays: cols.expiryAlertDays,
      active: updatedProduct.active ? 1 : 0, updatedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `UPDATE products SET
          name = ?, barcode = ?, sku = ?, category_id = ?, supplier_id = ?,
          cost_price = ?, retail_price = ?, stock = ?, min_stock_alert = ?,
          track_inventory = ?, image_hash = ?, active = ?,
          is_service = ?, require_serial = ?, product_type = ?,
          variants_json = ?, variant_data_json = ?, product_addons_json = ?,
          expiry_date = ?, expiry_alert_days = ?,
          version = version + 1, updated_at = ?
         WHERE id = ?;`,
        [
          updatedProduct.name, updatedProduct.barcode || null, updatedProduct.sku || null,
          categoryId || null, supplierId || null,
          updatedProduct.cost || 0, updatedProduct.price || 0, newStock,
          updatedProduct.minStock || 5, updatedProduct.trackInventory ? 1 : 0,
          updatedProduct.image || null, updatedProduct.active ? 1 : 0,
          cols.isService, cols.requireSerial, cols.productType,
          cols.variantsJson, cols.variantDataJson, cols.productAddonsJson,
          cols.expiryDate, cols.expiryAlertDays,
          now, id
        ]
      );
      if (updatedProduct.trackInventory && existing.stock !== newStock) {
        try {
          const { insertInventoryTransaction } = await import('../inventory/inventoryLedgerRepository');
          const diff = newStock - existing.stock;
          await insertInventoryTransaction({
            id: `itx_adj_${id}_${now}`,
            productId: id,
            type: diff > 0 ? 'RESTOCK' : 'ADJUSTMENT',
            quantity: diff,
            balanceAfter: newStock,
            referenceType: 'ADJUSTMENT',
            referenceId: id,
            deviceId,
            userId,
            notes: `Stock adjustment (${existing.stock} -> ${newStock})`,
            createdAt: now,
          }, tx);
        } catch {}
      }
    },
  });

  try {
    await localDb.products.put(updatedProduct);
  } catch {}

  return updatedProduct;
}

export async function deleteProduct(id: string, userId: string = 'system'): Promise<void> {
  const deviceId = await getDeviceId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'PRODUCT',
    entityId: id,
    operation: 'DELETE',
    eventType: 'PRODUCT_DELETED',
    deviceId,
    userId,
    payload: { id, deletedAt: now },
    execute: async (tx) => {
      // Soft-delete: active = 0
      await tx.execute(`UPDATE products SET active = 0, updated_at = ? WHERE id = ?;`, [now, id]);
      // Record tombstone
      await tx.execute(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
         VALUES ('PRODUCT', ?, ?, ?);`,
        [id, now, userId]
      );
    },
  });

  try {
    await localDb.products.delete(id);
  } catch {}
}

export { bulkDeleteProducts, bulkUpdateProducts } from './productBulkOps';
