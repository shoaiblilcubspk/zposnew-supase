/**
 * Product Addons Service — Supabase-only cloud-direct (Phase 10m).
 * Config table `product_addons` via the write-through queue. No Dexie.
 */

import { localQuery, insertRow, updateRow, softDeleteRow } from '../../data';
import { ProductAddon } from '../../types';

function mapRow(r: any): ProductAddon {
  return {
    id: r.id,
    productId: r.product_id,
    addonProductId: r.addon_product_id || '',
    name: r.name || '',
    price: Number(r.price) || 0,
    maxQty: Number(r.max_qty) || 1,
    active: Boolean(r.active),
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  };
}

export const productAddonsService = {
  async getByProduct(productId: string): Promise<ProductAddon[]> {
    const rows = await localQuery<any>(
      `SELECT * FROM product_addons WHERE product_id = ? AND active = 1;`, [productId]
    );
    return rows.map(mapRow);
  },

  async create(addon: Omit<ProductAddon, 'id' | 'createdAt'>): Promise<ProductAddon> {
    const row = await insertRow('product_addons', {
      product_id: addon.productId,
      addon_product_id: addon.addonProductId || null,
      name: addon.name || '',
      price: Number(addon.price) || 0,
      max_qty: Number(addon.maxQty) || 1,
      active: addon.active === false ? 0 : 1,
    });
    return mapRow(row);
  },

  async update(id: string, updates: Partial<ProductAddon>): Promise<void> {
    const patch: Record<string, any> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.price !== undefined) patch.price = Number(updates.price) || 0;
    if (updates.maxQty !== undefined) patch.max_qty = Number(updates.maxQty) || 1;
    if (updates.addonProductId !== undefined) patch.addon_product_id = updates.addonProductId || null;
    if (updates.active !== undefined) patch.active = updates.active ? 1 : 0;
    if (Object.keys(patch).length > 0) await updateRow('product_addons', id, patch);
  },

  async delete(id: string): Promise<void> {
    await softDeleteRow('product_addons', id, 'active');
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<ProductAddon[]> {
    const rows = await localQuery<any>(`SELECT * FROM product_addons;`);
    return rows.map(mapRow);
  },
};
