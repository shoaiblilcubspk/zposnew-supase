/**
 * Apply Variant Stock Movement — Supabase-only cloud-direct (Phase 10m).
 * Updates the variant's cached stock inside products.variant_data_json and appends a
 * variant_stock_history row. No Dexie. Reads/writes go through the local mirror.
 */

import { Product } from '../../types';
import { localQueryOne, updateRow } from '../../data';
import { variantStockHistoryService } from './variantStockHistoryService';

export async function applyVariantStockMovement(params: {
  product: Product;
  variantId: string;
  variantLabel?: string;
  changeQty: number;
  type: 'sale' | 'return' | 'adjustment' | 'initial' | 'purchase';
  referenceId?: string;
  note?: string;
  cashierName?: string;
  createdAt?: Date;
}): Promise<void> {
  const { product, variantId, changeQty } = params;

  const variant = (product.variantData || []).find((v) => v.id === variantId);
  if (!variant) return;

  const newVariantStock = (variant.stock || 0) + changeQty;

  // Read the fresh row so we never clobber concurrent field edits.
  const row = await localQueryOne<any>(`SELECT variant_data_json FROM products WHERE id = ?;`, [product.id]);
  let variantData: any[] = product.variantData || [];
  try {
    if (row?.variant_data_json) variantData = JSON.parse(row.variant_data_json);
  } catch {}
  const updatedVariantData = variantData.map((v) =>
    v.id === variantId ? { ...v, stock: newVariantStock } : v
  );

  await updateRow('products', product.id, {
    variant_data_json: updatedVariantData.length > 0 ? JSON.stringify(updatedVariantData) : null,
  });

  await variantStockHistoryService.create({
    productId: product.id,
    variantId,
    variantLabel: params.variantLabel || variant.cardTitle || variant.option1,
    changeQty,
    type: params.type,
    referenceId: params.referenceId,
    note: params.note,
    balanceAfter: newVariantStock,
    cashierName: params.cashierName || 'System',
  } as any);
}
