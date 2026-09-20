import { getDatabase, TABLES } from '../db';
import { localDb } from '../localDb';
import { Bundle, BundleItem } from '../../types';

function mapBundleRow(row: any, items: any[]): Bundle {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    discountValue: Number(row.discount_value) || 0,
    discountType: (row.discount_type as 'percentage' | 'fixed') || 'percentage',
    active: Boolean(row.active),
    hideItemPrices: Boolean(row.hide_item_prices),
    overridePrice: row.override_price != null ? Number(row.override_price) : undefined,
    image: row.image ?? undefined,
    items: items
      .filter(bi => bi.bundle_id === row.id)
      .map((bi: any): BundleItem => ({
        id: bi.id,
        bundleId: bi.bundle_id,
        productId: bi.product_id,
        quantity: Number(bi.quantity) || 1,
      })),
    createdAt: new Date(Number(row.created_at) || Date.now()),
    updatedAt: new Date(Number(row.updated_at) || Date.now()),
  };
}

/** Fetch all active bundles from SQLite. One-time migrates existing Dexie bundles on first call. */
export async function getAllBundles(_forceRemote: boolean = false): Promise<Bundle[]> {
  try {
    const db = await getDatabase();

    // One-time migration: if SQLite has 0 bundles but Dexie has some, migrate them
    const countRow = await db.queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${TABLES.BUNDLES};`);
    if (!countRow || Number(countRow.cnt) === 0) {
      try {
        const dexieBundles = await localDb.bundles.toArray();
        const dexieItems = await localDb.bundleItems.toArray();
        if (dexieBundles.length > 0) {
          for (const b of dexieBundles) {
            const now = Date.now();
            await db.execute(
              `INSERT OR IGNORE INTO ${TABLES.BUNDLES}
                (id, name, description, discount_value, discount_type, override_price, hide_item_prices, active, image, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                b.id, b.name || '', b.description || '',
                Number(b.discountValue) || 0, b.discountType || 'percentage',
                b.overridePrice ?? null, b.hideItemPrices ? 1 : 0,
                b.active !== false ? 1 : 0, b.image || null,
                b.createdAt ? new Date(b.createdAt).getTime() : now,
                b.updatedAt ? new Date(b.updatedAt).getTime() : now,
              ]
            );
          }
          for (const bi of dexieItems) {
            await db.execute(
              `INSERT OR IGNORE INTO ${TABLES.BUNDLE_ITEMS} (id, bundle_id, product_id, quantity) VALUES (?, ?, ?, ?);`,
              [bi.id, bi.bundleId, bi.productId, Number(bi.quantity) || 1]
            );
          }
        }
      } catch {
        // Dexie migration is best-effort; don't crash if Dexie tables don't exist
      }
    }

    const rows = await db.query<any>(`SELECT * FROM ${TABLES.BUNDLES} WHERE active = 1 ORDER BY created_at ASC;`);
    const itemRows = await db.query<any>(`SELECT * FROM ${TABLES.BUNDLE_ITEMS};`);

    return rows.map(row => mapBundleRow(row, itemRows));
  } catch (e) {
    console.error('[bundlesService.getAll] SQLite fetch error:', e);
    return [];
  }
}
