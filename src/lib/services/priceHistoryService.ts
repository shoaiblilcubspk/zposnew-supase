import { localDb, generateId } from '../localDb';
import { getActor } from '../actionToken';

export interface PriceChangeInput {
  productId: string;
  oldPrice?: number | null;
  newPrice?: number | null;
  oldCost?: number | null;
  newCost?: number | null;
  note?: string;
}

/** PHASE 11/12: record an attributable price/cost change. Always kept locally;
 *  flushed to the cloud price_history table when online (audit log, non-financial,
 *  so a direct insert is safe and offline-first enough). */
export async function logPriceChange(input: PriceChangeInput): Promise<void> {
  const actor = getActor();
  const now = new Date();
  const id = generateId();
  const row = {
    id,
    productId: input.productId,
    oldPrice: input.oldPrice ?? null,
    newPrice: input.newPrice ?? null,
    oldCost: input.oldCost ?? null,
    newCost: input.newCost ?? null,
    changedBy: actor?.id ?? null,
    note: input.note ?? null,
    createdAt: now,
  };
  await localDb.priceHistory.add(row as any).catch(() => {});
}

export async function getPriceHistory(productId: string): Promise<any[]> {
  return await localDb.priceHistory.where('productId').equals(productId).reverse().sortBy('createdAt').catch(() => []);
}
