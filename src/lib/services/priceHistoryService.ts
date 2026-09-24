/**
 * Price History Service — Supabase-only cloud-direct (Phase 10m).
 * Append-only price/cost change audit in the mirror `price_history`. No Dexie.
 */

import { localQuery, insertRow, type AtomicInsert } from '../../data';
import { getActor } from '../actionToken';

export interface PriceChangeInput {
  productId: string;
  oldPrice?: number | null;
  newPrice?: number | null;
  oldCost?: number | null;
  newCost?: number | null;
  note?: string;
}

/** Build the append-only price_history row (no write). */
function buildPriceHistoryRow(input: PriceChangeInput): Record<string, any> {
  const actor = getActor();
  return {
    product_id: input.productId,
    old_price: input.oldPrice ?? null,
    new_price: input.newPrice ?? null,
    old_cost: input.oldCost ?? null,
    new_cost: input.newCost ?? null,
    changed_by: actor?.id ?? null,
    note: input.note ?? null,
  };
}

/** Build an atomicWrite insert op for a price_history row (for use inside a bundle). */
export function buildPriceHistoryOp(input: PriceChangeInput): AtomicInsert {
  return { table: 'price_history', op: 'insert', row: buildPriceHistoryRow(input) };
}

export async function logPriceChange(input: PriceChangeInput): Promise<void> {
  await insertRow('price_history', buildPriceHistoryRow(input)).catch(() => {});
}

export async function getPriceHistory(productId: string): Promise<any[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM price_history WHERE product_id = ? ORDER BY created_at DESC;`, [productId]
  ).catch(() => [] as any[]);
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    oldPrice: r.old_price,
    newPrice: r.new_price,
    oldCost: r.old_cost,
    newCost: r.new_cost,
    changedBy: r.changed_by,
    note: r.note,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  }));
}
