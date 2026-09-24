/**
 * Products Service
 * Authoritative Product Catalog Service driven by local SQLite repository and Supabase cloud sync.
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

  async create(product: Omit<Product, 'id'>, userId?: string, operationId?: string): Promise<Product> {
    return createProduct(product, userId, operationId);
  },

  async update(id: string, updates: Partial<Product>, userId?: string, operationId?: string): Promise<Product> {
    // price_history is written INSIDE the updateProduct bundle (atomic with the product row),
    // so there is no separate half-savable price-log write here anymore.
    return updateProduct(id, updates, userId, operationId);
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
    // Record stock history in the mirror (synced) for history views.
    try {
      const { stockHistoryService } = await import('./stockHistoryService');
      await stockHistoryService.create({
        productId: id,
        changeQty: delta,
        type: 'adjustment',
        note,
        balanceAfter: newStock,
      } as any);
    } catch {}
  },
};
