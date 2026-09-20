/**
 * Products Service
 * Authoritative Local-First Product Catalog Service driven by local SQLite repository and P2P outbox.
 */

import { Product } from '../../types';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkUpdateProducts,
} from './catalog/productRepository';
import { localDb } from '../localDb';
import { logPriceChange } from './priceHistoryService';

export const productsService = {
  async getAll(): Promise<Product[]> {
    return getAllProducts();
  },

  async getById(id: string): Promise<Product | null> {
    return getProductById(id);
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<Product[]> {
    // Local-first: Local SQLite is the single source of truth.
    return getAllProducts();
  },

  async create(product: Omit<Product, 'id'>, userId?: string): Promise<Product> {
    return createProduct(product, userId);
  },

  async update(id: string, updates: Partial<Product>, userId?: string): Promise<Product> {
    const existing = await getProductById(id);
    if (existing) {
      if (updates.price !== undefined && Number(existing.price || 0) !== Number(updates.price || 0)) {
        await logPriceChange({
          productId: id,
          oldPrice: Number(existing.price || 0),
          newPrice: Number(updates.price || 0),
          note: 'Product price updated',
        });
      }
      if (updates.cost !== undefined && Number(existing.cost || 0) !== Number(updates.cost || 0)) {
        await logPriceChange({
          productId: id,
          oldCost: Number(existing.cost || 0),
          newCost: Number(updates.cost || 0),
          note: 'Product cost updated',
        });
      }
    }
    return updateProduct(id, updates, userId);
  },

  async delete(id: string, userId?: string): Promise<void> {
    await deleteProduct(id, userId);
  },

  async bulkDelete(ids: string[], userId?: string): Promise<void> {
    await bulkDeleteProducts(ids, userId);
  },

  async bulkUpdate(ids: string[], updates: Partial<Product>, userId?: string): Promise<void> {
    await bulkUpdateProducts(ids, updates, userId);
  },

  async adjustStock(id: string, delta: number, note: string = 'Adjustment'): Promise<void> {
    const product = await getProductById(id);
    if (!product) return;
    const newStock = (product.stock || 0) + delta;
    await updateProduct(id, { stock: newStock });
    // Also record stock history in localDb for legacy views
    try {
      await localDb.stockHistory.add({
        id: `adj_${Date.now()}`,
        productId: id,
        changeQty: delta,
        type: 'adjustment',
        note,
        balanceAfter: newStock,
        createdAt: new Date(),
      } as any);
    } catch {}
  },
};
