import { localQuery, atomicWrite, newOperationId, type AtomicOp } from '../../data';
import { safeRandomUUID } from '../crypto/uuid';

/** Update a bundle (optionally replacing all items) as ONE atomic bundle (§1.5). */
export async function updateBundle(bundleId: string, data: {
  name?: string;
  description?: string;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed';
  hideItemPrices?: boolean;
  active?: boolean;
  items?: { productId: string; quantity: number }[];
  overridePrice?: number;
  image?: string;
}): Promise<void> {
  const ops: AtomicOp[] = [];

  const patch: Record<string, any> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.description !== undefined) patch.description = data.description;
  if (data.discountValue !== undefined) patch.discount_value = data.discountValue;
  if (data.discountType !== undefined) patch.discount_type = data.discountType;
  if (data.hideItemPrices !== undefined) patch.hide_item_prices = data.hideItemPrices ? 1 : 0;
  if (data.active !== undefined) patch.active = data.active ? 1 : 0;
  if (data.image !== undefined) patch.image = data.image || null;
  if (data.overridePrice !== undefined) patch.override_price = data.overridePrice || null;
  if (Object.keys(patch).length > 0) ops.push({ table: 'bundles', op: 'update', id: bundleId, patch });

  if (data.items !== undefined) {
    // Replace the item set: soft-delete (tombstone) old rows + insert new ones, all inside the
    // SAME bundle. Soft-delete (not hard delete) so the removal propagates to every device via
    // pull. Bundle reads hide rows with deleted_at.
    const existing = await localQuery<{ id: string }>(`SELECT id FROM bundle_items WHERE bundle_id = ? AND deleted_at IS NULL;`, [bundleId]);
    const stamp = new Date().toISOString();
    for (const row of existing) {
      ops.push({ table: 'bundle_items', op: 'update', id: row.id, patch: { deleted_at: stamp } });
    }
    for (const item of data.items) {
      ops.push({
        table: 'bundle_items', op: 'insert',
        row: { id: safeRandomUUID(), bundle_id: bundleId, product_id: item.productId, quantity: item.quantity },
      });
    }
  }

  if (ops.length > 0) {
    await atomicWrite(ops, { operation_id: newOperationId(), action: 'update_bundle_deal' });
  }
}
