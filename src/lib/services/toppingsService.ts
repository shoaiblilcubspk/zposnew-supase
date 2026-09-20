import {
  localDb,
  generateId,
} from '../localDb';
import {
  Topping,
} from '../../types';

export const mapTopping = (row: any): Topping => ({
  id: row.id,
  name: row.name,
  priceSmall: parseFloat(row.price_small || row.priceSmall) || 0,
  priceMedium: parseFloat(row.price_medium || row.priceMedium) || 0,
  priceLarge: parseFloat(row.price_large || row.priceLarge) || 0,
  createdAt: row.created_at ? new Date(row.created_at) : (row.createdAt ? new Date(row.createdAt) : new Date()),
});

export const toppingsService = {
  async fetchAll(): Promise<Topping[]> {
    const data = await localDb.toppings.toArray();
    return (data || []).map(mapTopping);
  },

  async create(topping: Partial<Topping>): Promise<Topping> {
    const id = (topping as any).id || generateId();
    const item = {
      id,
      name: topping.name || '',
      priceSmall: topping.priceSmall || 0,
      priceMedium: topping.priceMedium || 0,
      priceLarge: topping.priceLarge || 0,
      createdAt: new Date(),
    };
    await localDb.toppings.put(item as any);
    return item;
  },

  async update(id: string, topping: Partial<Topping>): Promise<Topping> {
    await localDb.toppings.update(id, topping as any);
    const updated = await localDb.toppings.get(id);
    return mapTopping(updated || { ...topping, id });
  },

  async remove(id: string): Promise<void> {
    await localDb.toppings.delete(id);
  },
};

