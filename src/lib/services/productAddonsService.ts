import {
  localDb,
  generateId,
} from '../localDb';
import {
  ProductAddon,
} from '../../types';

export const productAddonsService = {
  async getByProduct(productId: string): Promise<ProductAddon[]> {
    const items = await localDb.productAddons
      .where('productId').equals(productId)
      .toArray();
    return items.filter(a => a.active);
  },

  async create(addon: Omit<ProductAddon, 'id' | 'createdAt'>): Promise<ProductAddon> {
    const id = generateId();
    const now = new Date();
    const newAddon = { ...addon, id, createdAt: now } as ProductAddon;
    await localDb.productAddons.add(newAddon);
    return newAddon;
  },

  async update(id: string, updates: Partial<ProductAddon>): Promise<void> {
    await localDb.productAddons.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    await localDb.productAddons.delete(id);
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<ProductAddon[]> {
    return localDb.productAddons.toArray();
  }
};

