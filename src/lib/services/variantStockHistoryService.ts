import {
  VariantStockHistory,
} from '../../types';
import { localDb, generateId } from '../localDb';

export const variantStockHistoryService = {
  async getByProduct(productId: string): Promise<VariantStockHistory[]> {
    const items = await localDb.variantStockHistory
      .where('productId').equals(productId)
      .toArray();
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getByVariant(productId: string, variantId: string): Promise<VariantStockHistory[]> {
    const items = await localDb.variantStockHistory
      .where('productId').equals(productId)
      .toArray();
    return items
      .filter(h => h.variantId === variantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(entry: Omit<VariantStockHistory, 'id' | 'createdAt'>): Promise<VariantStockHistory> {
    const id = generateId();
    const now = new Date();
    const newEntry = { ...entry, id, createdAt: now } as VariantStockHistory;
    await localDb.variantStockHistory.add(newEntry);
    return newEntry;
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<VariantStockHistory[]> {
    return localDb.variantStockHistory.toArray();
  }
};


