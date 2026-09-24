/**
 * Variant Stock History Service — Supabase-only cloud-direct (Phase 10m).
 * Append-only per-variant stock movement log in the mirror `variant_stock_history`. No Dexie.
 */

import { VariantStockHistory } from '../../types';
import { localQuery, insertRow } from '../../data';
import { safeRandomUUID } from '../crypto/uuid';

function mapRow(r: any): VariantStockHistory {
  return {
    id: r.id,
    productId: r.product_id,
    variantId: r.variant_id,
    variantLabel: r.variant_label || undefined,
    changeQty: Number(r.change_qty) || 0,
    type: r.type,
    referenceId: r.reference_id || undefined,
    note: r.note || undefined,
    balanceAfter: r.balance_after != null ? Number(r.balance_after) : undefined,
    cashierName: r.cashier_name || undefined,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  };
}

export const variantStockHistoryService = {
  async getByProduct(productId: string): Promise<VariantStockHistory[]> {
    const rows = await localQuery<any>(
      `SELECT * FROM variant_stock_history WHERE product_id = ? ORDER BY created_at DESC;`, [productId]
    );
    return rows.map(mapRow);
  },

  async getByVariant(productId: string, variantId: string): Promise<VariantStockHistory[]> {
    const rows = await localQuery<any>(
      `SELECT * FROM variant_stock_history WHERE product_id = ? AND variant_id = ? ORDER BY created_at DESC;`,
      [productId, variantId]
    );
    return rows.map(mapRow);
  },

  async create(entry: Omit<VariantStockHistory, 'id' | 'createdAt'>): Promise<VariantStockHistory> {
    const id = safeRandomUUID();
    await insertRow('variant_stock_history', {
      id,
      product_id: entry.productId,
      variant_id: entry.variantId,
      variant_label: entry.variantLabel || null,
      change_qty: Number(entry.changeQty) || 0,
      type: entry.type,
      reference_id: entry.referenceId || null,
      note: entry.note || null,
      balance_after: entry.balanceAfter ?? null,
      cashier_name: entry.cashierName || null,
    });
    return { ...entry, id, createdAt: new Date() } as VariantStockHistory;
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<VariantStockHistory[]> {
    const rows = await localQuery<any>(`SELECT * FROM variant_stock_history;`);
    return rows.map(mapRow);
  },
};
