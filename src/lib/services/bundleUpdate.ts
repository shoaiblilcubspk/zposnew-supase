import { getDatabase, TABLES } from '../db';
import { commitLocalTransaction } from '../events';
import { generateId } from '../localDb';

/** Update bundle (replaces all items) in SQLite + P2P outbox */
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
  const now = Date.now();
  const db = await getDatabase();

  // Build update SET clause dynamically
  const setClauses: string[] = ['updated_at = ?'];
  const setValues: any[] = [now];

  if (data.name !== undefined) { setClauses.push('name = ?'); setValues.push(data.name.trim()); }
  if (data.description !== undefined) { setClauses.push('description = ?'); setValues.push(data.description); }
  if (data.discountValue !== undefined) { setClauses.push('discount_value = ?'); setValues.push(data.discountValue); }
  if (data.discountType !== undefined) { setClauses.push('discount_type = ?'); setValues.push(data.discountType); }
  if (data.hideItemPrices !== undefined) { setClauses.push('hide_item_prices = ?'); setValues.push(data.hideItemPrices ? 1 : 0); }
  if (data.active !== undefined) { setClauses.push('active = ?'); setValues.push(data.active ? 1 : 0); }
  if (data.image !== undefined) { setClauses.push('image = ?'); setValues.push(data.image || null); }
  if (data.overridePrice !== undefined) { setClauses.push('override_price = ?'); setValues.push(data.overridePrice || null); }

  const itemRows = data.items ? data.items.map(item => ({
    id: generateId(),
    bundleId: bundleId,
    productId: item.productId,
    quantity: item.quantity,
  })) : undefined;

  await db.transaction(async tx => {
    await tx.execute(
      `UPDATE ${TABLES.BUNDLES} SET ${setClauses.join(', ')} WHERE id = ?;`,
      [...setValues, bundleId]
    );

    if (itemRows !== undefined) {
      await tx.execute(`DELETE FROM ${TABLES.BUNDLE_ITEMS} WHERE bundle_id = ?;`, [bundleId]);
      for (const item of itemRows) {
        await tx.execute(
          `INSERT INTO ${TABLES.BUNDLE_ITEMS} (id, bundle_id, product_id, quantity) VALUES (?, ?, ?, ?);`,
          [item.id, bundleId, item.productId, item.quantity]
        );
      }
    }
  });

  // Read current state for outbox payload
  const row = await db.queryOne<any>(
    `SELECT * FROM ${TABLES.BUNDLES} WHERE id = ?;`, [bundleId]
  );
  const currentItems = await db.query<any>(
    `SELECT * FROM ${TABLES.BUNDLE_ITEMS} WHERE bundle_id = ?;`, [bundleId]
  );

  await commitLocalTransaction({
    entityType: 'BUNDLE',
    entityId: bundleId,
    eventType: 'BUNDLE_UPDATED',
    payload: {
      id: bundleId,
      name: row?.name,
      description: row?.description,
      discountValue: row?.discount_value,
      discountType: row?.discount_type,
      overridePrice: row?.override_price ?? null,
      hideItemPrices: Boolean(row?.hide_item_prices),
      active: Boolean(row?.active),
      image: row?.image ?? null,
      items: currentItems,
      updatedAt: now,
    },
  });
}
