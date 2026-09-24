import { localQuery } from '../../data';
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
      .filter((bi) => bi.bundle_id === row.id)
      .map((bi: any): BundleItem => ({
        id: bi.id,
        bundleId: bi.bundle_id,
        productId: bi.product_id,
        quantity: Number(bi.quantity) || 1,
      })),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

/** Fetch all active bundles from the local mirror. */
export async function getAllBundles(_forceRemote: boolean = false): Promise<Bundle[]> {
  try {
    const rows = await localQuery<any>(`SELECT * FROM bundles WHERE active = 1 ORDER BY created_at ASC;`);
    const itemRows = await localQuery<any>(`SELECT * FROM bundle_items WHERE deleted_at IS NULL;`);
    return rows.map((row) => mapBundleRow(row, itemRows));
  } catch (e) {
    console.error('[bundlesService.getAll] fetch error:', e);
    return [];
  }
}
