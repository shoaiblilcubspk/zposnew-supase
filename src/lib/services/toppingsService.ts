/**
 * Toppings Service — Supabase-only cloud-direct (Phase 10m).
 * Config table `toppings` via the write-through queue. No Dexie.
 */

import { localQuery, localQueryOne, insertRow, updateRow, softDeleteRow } from '../../data';
import { Topping } from '../../types';

export const mapTopping = (row: any): Topping => ({
  id: row.id,
  name: row.name,
  priceSmall: Number(row.price_small ?? row.priceSmall) || 0,
  priceMedium: Number(row.price_medium ?? row.priceMedium) || 0,
  priceLarge: Number(row.price_large ?? row.priceLarge) || 0,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
});

export const toppingsService = {
  async fetchAll(): Promise<Topping[]> {
    const rows = await localQuery<any>(`SELECT * FROM toppings WHERE active = 1 ORDER BY name ASC;`);
    return rows.map(mapTopping);
  },

  async create(topping: Partial<Topping>): Promise<Topping> {
    const row = await insertRow('toppings', {
      ...(topping.id ? { id: topping.id } : {}),
      name: topping.name || '',
      price_small: topping.priceSmall || 0,
      price_medium: topping.priceMedium || 0,
      price_large: topping.priceLarge || 0,
      active: 1,
    });
    return mapTopping(row);
  },

  async update(id: string, topping: Partial<Topping>): Promise<Topping> {
    const patch: Record<string, any> = {};
    if (topping.name !== undefined) patch.name = topping.name;
    if (topping.priceSmall !== undefined) patch.price_small = topping.priceSmall;
    if (topping.priceMedium !== undefined) patch.price_medium = topping.priceMedium;
    if (topping.priceLarge !== undefined) patch.price_large = topping.priceLarge;
    if (Object.keys(patch).length > 0) await updateRow('toppings', id, patch);
    const updated = await localQueryOne<any>(`SELECT * FROM toppings WHERE id = ?;`, [id]);
    return mapTopping(updated || { ...topping, id });
  },

  async remove(id: string): Promise<void> {
    await softDeleteRow('toppings', id, 'active');
  },
};
