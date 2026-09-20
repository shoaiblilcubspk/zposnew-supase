import { getDatabase, TABLES } from '../db';
import { commitLocalTransaction } from '../events';
import { generateId } from '../localDb';
import { Bundle } from '../../types';

/** Create a new bundle with its items in SQLite + P2P outbox */
export async function createBundle(data: {
  name: string;
  description?: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  items?: { productId: string; quantity: number }[];
  hideItemPrices?: boolean;
  overridePrice?: number;
  image?: string | null;
}): Promise<Bundle> {
  const id = generateId();
  const now = Date.now();

  const itemRows = (data.items || []).map(item => ({
    id: generateId(),
    bundleId: id,
    productId: item.productId,
    quantity: item.quantity,
  }));

  const db = await getDatabase();

  await db.transaction(async tx => {
    await tx.execute(
      `INSERT INTO ${TABLES.BUNDLES} (
        id, name, description, discount_value, discount_type,
        override_price, hide_item_prices, active, image, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
      [
        id,
        data.name.trim(),
        data.description || '',
        data.discountValue,
        data.discountType,
        data.overridePrice ?? null,
        data.hideItemPrices ? 1 : 0,
        data.image || null,
        now,
        now,
      ]
    );

    for (const item of itemRows) {
      await tx.execute(
        `INSERT INTO ${TABLES.BUNDLE_ITEMS} (id, bundle_id, product_id, quantity) VALUES (?, ?, ?, ?);`,
        [item.id, id, item.productId, item.quantity]
      );
    }
  });

  await commitLocalTransaction({
    entityType: 'BUNDLE',
    entityId: id,
    eventType: 'BUNDLE_CREATED',
    payload: {
      id,
      name: data.name.trim(),
      description: data.description || '',
      discountValue: data.discountValue,
      discountType: data.discountType,
      overridePrice: data.overridePrice ?? null,
      hideItemPrices: data.hideItemPrices || false,
      active: true,
      image: data.image || null,
      items: itemRows,
      createdAt: now,
      updatedAt: now,
    },
  });

  return {
    id,
    name: data.name.trim(),
    description: data.description || '',
    discountValue: data.discountValue,
    discountType: data.discountType,
    overridePrice: data.overridePrice ?? undefined,
    hideItemPrices: data.hideItemPrices || false,
    active: true,
    image: data.image || undefined,
    items: itemRows.map(r => ({ id: r.id, bundleId: id, productId: r.productId, quantity: r.quantity })),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}
