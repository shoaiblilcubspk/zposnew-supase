/**
 * Stock History Service — Supabase-only cloud-direct (Phase 10m).
 * Append-only product stock movement log in the mirror `stock_history`. No Dexie.
 */

import { StockHistory } from '../../types';
import { localQuery, insertRow } from '../../data';

function mapRow(r: any): StockHistory {
  return {
    id: r.id,
    productId: r.product_id,
    changeQty: Number(r.change_qty) || 0,
    type: r.type,
    referenceId: r.reference_id || undefined,
    note: r.note || undefined,
    balanceAfter: r.balance_after != null ? Number(r.balance_after) : undefined,
    cashierId: r.cashier_id || undefined,
    cashierName: r.cashier_name || undefined,
    wasOversold: r.was_oversold ? true : undefined,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  };
}

export const stockHistoryService = {
  async getAll(): Promise<StockHistory[]> {
    const rows = await localQuery<any>(`SELECT * FROM stock_history ORDER BY created_at DESC;`);
    return rows.map(mapRow);
  },
  async fetchRemote(_lastSyncTime?: Date): Promise<StockHistory[]> {
    return this.getAll();
  },
  async create(entry: Omit<StockHistory, 'id' | 'createdAt'>): Promise<void> {
    await insertRow('stock_history', {
      product_id: entry.productId,
      change_qty: Number(entry.changeQty) || 0,
      type: entry.type,
      reference_id: entry.referenceId || null,
      note: entry.note || null,
      balance_after: entry.balanceAfter ?? null,
      cashier_id: entry.cashierId || null,
      cashier_name: entry.cashierName || null,
      was_oversold: entry.wasOversold ? 1 : 0,
    });
  },
};
