/**
 * Reference repositories — the TEMPLATE every feature repository follows in Phase 11.
 *
 * Rules demonstrated:
 *   - snake_case rows end-to-end (Rule 3), no camelCase mapping.
 *   - reads come from the LOCAL mirror (instant, offline-safe).
 *   - writes go through write-through helpers (local write + queue in one tx).
 *   - append-only ledgers use insertRow only; balances/stock come from computed reads.
 *
 * These two (products = non-additive, sales = atomic RPC) cover both write shapes.
 */

import { localQuery, localQueryOne } from './localDb';
import { insertRow, updateRow, softDeleteRow, enqueueRpc } from './writeThrough';
import { safeRandomUUID } from '../lib/crypto/uuid';

// ---- Products (non-additive: normal INSERT/UPDATE + soft delete) ----

export interface ProductRow {
  id: string;
  operation_id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  category_id: string | null;
  supplier_id: string | null;
  cost_price: number;
  retail_price: number;
  stock: number;
  track_inventory: number;
  active: number;
  created_at: string;
  updated_at: string;
  [k: string]: any;
}

export async function listProducts(): Promise<ProductRow[]> {
  return localQuery<ProductRow>(`SELECT * FROM products WHERE active = 1 ORDER BY name ASC`);
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  return localQueryOne<ProductRow>(`SELECT * FROM products WHERE id = ?`, [id]);
}

/** Authoritative stock from the inventory_ledger (Rule 7), not the cache column. */
export async function getProductStock(productId: string): Promise<number> {
  const row = await localQueryOne<{ qty: number }>(
    `SELECT COALESCE(SUM(quantity), 0) AS qty FROM inventory_ledger WHERE product_id = ?`, [productId]
  );
  return row?.qty ?? 0;
}

export async function createProduct(data: Partial<ProductRow>): Promise<ProductRow> {
  return insertRow('products', {
    name: '', cost_price: 0, retail_price: 0, stock: 0, track_inventory: 1, active: 1,
    ...data,
  }) as Promise<ProductRow>;
}

export async function updateProduct(id: string, patch: Partial<ProductRow>): Promise<void> {
  await updateRow('products', id, patch as any);
}

export async function deactivateProduct(id: string): Promise<void> {
  await softDeleteRow('products', id, 'active');
}

// ---- Sales (atomic RPC: create_sale_atomic runs sale + items + inventory OUT in one tx) ----

export interface SaleDraft {
  device_id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  user_id?: string | null;
  salesman_id?: string | null;
  salesman_name?: string | null;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  extra_charges?: number;
  total_amount: number;
  tendered_amount?: number;
  change_amount?: number;
  payment_method?: string;
  sale_type?: string;
  notes?: string | null;
  invoice_prefix?: string;
  invoice_pad_digits?: number;
}

export interface SaleItemDraft {
  product_id: string | null;
  variant_id?: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  discount?: number;
  total_price: number;
  track_inventory?: boolean;
  notes?: string | null;
}

/**
 * Queue an atomic sale. The server RPC assigns the invoice number, writes items, and posts
 * inventory OUT ledger rows — all idempotent on operation_id. Returns the operation_id so the
 * caller can correlate. NOTE: local optimistic write of the sale row/items should be added by
 * the caller for instant UI (Rule 2.15); this helper handles the durable cloud push.
 */
export async function queueSale(sale: SaleDraft, items: SaleItemDraft[]): Promise<string> {
  const operation_id = safeRandomUUID();
  const itemsWithOps = items.map((it) => ({ ...it, operation_id: safeRandomUUID() }));
  return enqueueRpc('create_sale_atomic', {
    p_operation_id: operation_id,
    p_sale: sale,
    p_items: itemsWithOps,
  }, operation_id);
}
