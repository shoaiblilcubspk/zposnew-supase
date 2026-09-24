/**
 * Product Mapping & Serialization Helpers
 * Bridges SQLite database columns, cloud sync payloads, and in-memory Product domain models.
 */

import { Product } from '../../../types';

export function parseJsonSafe<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function mapSqliteProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode || undefined,
    barcodeValue: row.barcode || undefined,
    sku: row.sku || undefined,
    category: row.category_name || row.category_id || '',
    supplier: row.supplier_name || row.supplier_id || undefined,
    cost: Number(row.cost_price) || 0,
    price: Number(row.retail_price) || 0,
    stock: Number(row.stock) || 0,
    minStock: Number(row.min_stock_alert) || 5,
    description: row.description || '',
    image: row.image_hash || undefined,
    taxable: true,
    active: Boolean(row.active),
    trackInventory: Boolean(row.track_inventory),
    isService: Boolean(row.is_service),
    requireSerial: Boolean(row.require_serial),
    productType: (row.product_type as any) || 'simple',
    variants: parseJsonSafe(row.variants_json, undefined),
    variantData: parseJsonSafe(row.variant_data_json, undefined),
    productAddons: parseJsonSafe(row.product_addons_json, undefined),
    expiryDate: row.expiry_date || undefined,
    expiryAlertDays: row.expiry_alert_days !== undefined && row.expiry_alert_days !== null
      ? Number(row.expiry_alert_days)
      : 90,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function serializeProductColumns(p: Partial<Product>) {
  return {
    isService: p.isService ? 1 : 0,
    requireSerial: p.requireSerial ? 1 : 0,
    productType: p.productType || 'simple',
    variantsJson: p.variants && p.variants.length > 0 ? JSON.stringify(p.variants) : null,
    variantDataJson: p.variantData && p.variantData.length > 0 ? JSON.stringify(p.variantData) : null,
    productAddonsJson: p.productAddons && p.productAddons.length > 0 ? JSON.stringify(p.productAddons) : null,
    expiryDate: p.expiryDate || null,
    expiryAlertDays: p.expiryAlertDays !== undefined ? Number(p.expiryAlertDays) : 90,
  };
}
