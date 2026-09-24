/**
 * Product Repository — Supabase-only cloud-direct (Phase 4: Atomic Action Bundle).
 * Reads from the local mirror; every product create/update is ONE atomic bundle (§1.5):
 * resolve-or-create category/supplier + product row + INITIAL/adjustment inventory_ledger +
 * price_history — all commit together or not at all. Image is uploaded FIRST and linked inside
 * the bundle; on failure the orphaned blob is deleted (§1.5.5). Rows are snake_case (Rule 3),
 * mapped to the camelCase `Product` type at this boundary. No P2P, no Dexie.
 */

import { localQuery, localQueryOne, softDeleteRow, atomicWrite, newOperationId, type AtomicOp } from '../../../data';
import { Product } from '../../../types';
import { safeRandomUUID } from '../../crypto/uuid';
import { resolveCategoryId, resolveSupplierId, resolveCategoryOp, resolveSupplierOp } from './catalogResolvers';
import { mapSqliteProduct, serializeProductColumns } from './productMapper';
import { resolveImageToHash, deleteOrphanImage } from '../../media/localImageStore';
import { buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord } from '../inventory/inventoryLedgerRepository';
import { buildPriceHistoryOp } from '../priceHistoryService';

export { mapSqliteProduct };

const PRODUCT_SELECT = `
  SELECT p.*,
         c.name AS category_name,
         s.name AS supplier_name
  FROM products p
  LEFT JOIN categories c ON (p.category_id = c.id OR p.category_id = c.name)
  LEFT JOIN suppliers s ON (p.supplier_id = s.id OR p.supplier_id = s.name)`;

export async function getAllProducts(): Promise<Product[]> {
  const rows = await localQuery<any>(`${PRODUCT_SELECT} WHERE p.active = 1 ORDER BY p.name ASC;`);
  return rows.map(mapSqliteProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const row = await localQueryOne<any>(`${PRODUCT_SELECT} WHERE p.id = ?;`, [id]);
  return row ? mapSqliteProduct(row) : null;
}

export async function createProduct(
  product: Omit<Product, 'id'>,
  userId: string = 'system',
  operationId?: string
): Promise<Product> {
  // Friendly duplicate guards run BEFORE any write (§1.5 — clear error, zero partial state).
  const existing = await localQueryOne<{ id: string; name: string; sku: string | null; stock: number }>(
    `SELECT id, name, sku, stock FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND active = 1;`,
    [product.name]
  );
  if (existing) {
    const identifier = existing.sku ? `SKU: ${existing.sku}, ` : '';
    throw new Error(
      `Product "${product.name}" already exists (${identifier}Stock: ${existing.stock}). Update its stock instead of creating a duplicate.`
    );
  }
  if (product.barcode && product.barcode.trim()) {
    const dupBarcode = await localQueryOne<{ id: string; name: string }>(
      `SELECT id, name FROM products WHERE LOWER(TRIM(barcode)) = LOWER(TRIM(?)) AND active = 1;`,
      [product.barcode.trim()]
    );
    if (dupBarcode) {
      throw new Error(`Barcode "${product.barcode}" is already assigned to product "${dupBarcode.name}".`);
    }
  }

  const id = safeRandomUUID();
  const now = Date.now();
  const operation_id = operationId ?? newOperationId();
  const barcode = (product.barcode || product.barcodeValue || id).trim();
  const cat = await resolveCategoryOp(product.category);
  const sup = await resolveSupplierOp(product.supplier);
  const initialStock = product.stock !== undefined ? Number(product.stock) : (product.trackInventory ? 0 : 999999);

  // Image FIRST (upload + content-address). Track whether THIS call created a new blob so a
  // failed bundle can delete the orphan (§1.5.5).
  const wasDataUri = typeof product.image === 'string' && product.image.trim().startsWith('data:');
  const imageHash = await resolveImageToHash(product.image, undefined);
  const cols = serializeProductColumns({ ...product, image: imageHash });

  const ops: AtomicOp[] = [];
  if (cat.op) ops.push(cat.op);
  if (sup.op) ops.push(sup.op);

  const productRow = {
    id,
    name: product.name,
    barcode: barcode || null,
    sku: product.sku || null,
    category_id: cat.id || null,
    supplier_id: sup.id || null,
    cost_price: product.cost || 0,
    retail_price: product.price || 0,
    stock: initialStock,
    min_stock_alert: product.minStock || 5,
    track_inventory: product.trackInventory ? 1 : 0,
    image_hash: imageHash || null,
    active: 1,
    version: 1,
    is_service: cols.isService,
    require_serial: cols.requireSerial,
    product_type: cols.productType,
    variants_json: cols.variantsJson,
    variant_data_json: cols.variantDataJson,
    product_addons_json: cols.productAddonsJson,
    expiry_date: cols.expiryDate,
    expiry_alert_days: cols.expiryAlertDays,
  };
  ops.push({ table: 'products', op: 'insert', row: productRow });

  // Append-only INITIAL stock ledger row (Rule 7), inside the same bundle (§1.5.6).
  let ledgerRec: InventoryTxRecord | null = null;
  if (product.trackInventory && initialStock > 0) {
    ledgerRec = {
      id: `itx_init_${id}`,
      productId: id,
      type: 'INITIAL',
      quantity: initialStock,
      balanceAfter: initialStock,
      referenceType: 'AUDIT',
      referenceId: id,
      deviceId: '',
      userId,
      notes: 'Initial Stock on Create',
      createdAt: now,
    };
    ops.push(buildInventoryLedgerOp(ledgerRec));
  }

  try {
    await atomicWrite(ops, { operation_id, action: 'create_product' });
  } catch (err) {
    if (wasDataUri && imageHash) { try { await deleteOrphanImage(imageHash); } catch {} }
    throw err;
  }

  // Post-commit reactive side effects (bundle already durable).
  if (ledgerRec) dispatchInventoryTxEvent(ledgerRec);
  try {
    const { useInventoryStore } = await import('../../../stores');
    if (cat.created) useInventoryStore.getState().addCategory({ id: cat.created.id, name: cat.created.name, active: true, createdAt: new Date(now) });
    if (sup.created) useInventoryStore.getState().addSupplier({
      id: sup.created.id, name: sup.created.name, email: '', phone: '', address: '', openingBalance: 0,
      createdAt: new Date(now), updatedAt: new Date(now),
    });
  } catch {}

  return mapSqliteProduct({ ...productRow, category_name: product.category, supplier_name: product.supplier });
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>,
  userId: string = 'system',
  operationId?: string
): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) throw new Error(`Product ${id} not found.`);

  const now = Date.now();
  const operation_id = operationId ?? newOperationId();
  const cat = updates.category !== undefined
    ? await resolveCategoryOp(updates.category)
    : (existing.category ? await resolveCategoryOp(existing.category) : { id: null } as const);
  const sup = updates.supplier !== undefined
    ? await resolveSupplierOp(updates.supplier)
    : (existing.supplier ? await resolveSupplierOp(existing.supplier) : { id: null } as const);
  const newStock = updates.stock !== undefined ? Number(updates.stock) : existing.stock;

  const wasDataUri = updates.image !== undefined && typeof updates.image === 'string' && updates.image.trim().startsWith('data:');
  const imageHash = updates.image !== undefined
    ? await resolveImageToHash(updates.image, id)
    : existing.image;

  const merged: Product = { ...existing, ...updates, image: imageHash };
  const cols = serializeProductColumns(merged);

  const ops: AtomicOp[] = [];
  if (cat.op) ops.push(cat.op);
  if (sup.op) ops.push(sup.op);
  ops.push({
    table: 'products', op: 'update', id,
    patch: {
      name: merged.name,
      barcode: merged.barcode || null,
      sku: merged.sku || null,
      category_id: cat.id || null,
      supplier_id: sup.id || null,
      cost_price: merged.cost || 0,
      retail_price: merged.price || 0,
      stock: newStock,
      min_stock_alert: merged.minStock || 5,
      track_inventory: merged.trackInventory ? 1 : 0,
      image_hash: imageHash || null,
      active: merged.active ? 1 : 0,
      is_service: cols.isService,
      require_serial: cols.requireSerial,
      product_type: cols.productType,
      variants_json: cols.variantsJson,
      variant_data_json: cols.variantDataJson,
      product_addons_json: cols.productAddonsJson,
      expiry_date: cols.expiryDate,
      expiry_alert_days: cols.expiryAlertDays,
    },
  });

  // Append-only stock adjustment (Rule 7), inside the bundle (§1.5.6).
  let ledgerRec: InventoryTxRecord | null = null;
  if (merged.trackInventory && existing.stock !== newStock) {
    const diff = newStock - existing.stock;
    ledgerRec = {
      id: `itx_adj_${id}_${now}`,
      productId: id,
      type: diff > 0 ? 'RESTOCK' : 'ADJUSTMENT',
      quantity: diff,
      balanceAfter: newStock,
      referenceType: 'ADJUSTMENT',
      referenceId: id,
      deviceId: '',
      userId,
      notes: `Stock adjustment (${existing.stock} -> ${newStock})`,
      createdAt: now,
    };
    ops.push(buildInventoryLedgerOp(ledgerRec));
  }

  // Price/cost change audit (append-only), inside the SAME bundle so it can never half-save.
  const priceChanged = updates.price !== undefined && Number(existing.price || 0) !== Number(merged.price || 0);
  const costChanged = updates.cost !== undefined && Number(existing.cost || 0) !== Number(merged.cost || 0);
  if (priceChanged || costChanged) {
    ops.push(buildPriceHistoryOp({
      productId: id,
      oldPrice: priceChanged ? Number(existing.price || 0) : null,
      newPrice: priceChanged ? Number(merged.price || 0) : null,
      oldCost: costChanged ? Number(existing.cost || 0) : null,
      newCost: costChanged ? Number(merged.cost || 0) : null,
      note: priceChanged && costChanged ? 'Price & cost updated' : (priceChanged ? 'Product price updated' : 'Product cost updated'),
    }));
  }

  try {
    await atomicWrite(ops, { operation_id, action: 'update_product' });
  } catch (err) {
    if (wasDataUri && imageHash && imageHash !== existing.image) { try { await deleteOrphanImage(imageHash); } catch {} }
    throw err;
  }

  if (ledgerRec) dispatchInventoryTxEvent(ledgerRec);
  try {
    const { useInventoryStore } = await import('../../../stores');
    if (cat.created) useInventoryStore.getState().addCategory({ id: cat.created.id, name: cat.created.name, active: true, createdAt: new Date(now) });
    if (sup.created) useInventoryStore.getState().addSupplier({
      id: sup.created.id, name: sup.created.name, email: '', phone: '', address: '', openingBalance: 0,
      createdAt: new Date(now), updatedAt: new Date(now),
    });
  } catch {}

  return { ...merged, id, stock: newStock, updatedAt: new Date(now) };
}

export async function deleteProduct(id: string, _userId: string = 'system'): Promise<void> {
  await softDeleteRow('products', id, 'active');
}

export { bulkDeleteProducts, bulkUpdateProducts } from './productBulkOps';
