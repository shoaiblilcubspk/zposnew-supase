import {
  Discount,
  Category,
} from '../../types';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './catalog/categoryRepository';
import {
  getAllDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from './discounts/discountRepository';

export const mapCategory = (item: any): Category => ({
  ...item,
  createdAt: item.created_at ? new Date(item.created_at) : (item.createdAt ? new Date(item.createdAt) : undefined)
});

export const categoriesService = {
  async getAll(): Promise<Category[]> {
    return getAllCategories();
  },

  async create(nameOrObj: string | Category): Promise<Category> {
    return createCategory(nameOrObj);
  },

  async update(id: string, updates: Partial<Category>): Promise<void> {
    return updateCategory(id, updates);
  },

  async delete(id: string): Promise<void> {
    return deleteCategory(id);
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<Category[]> {
    return getAllCategories();
  }
};

// discountsService now backed by SQLite + P2P outbox events (no longer Dexie-only)
export const discountsService = {
  async getAll(): Promise<Discount[]> {
    return getAllDiscounts();
  },
  async create(data: Omit<Discount, 'id'>, userId = 'system'): Promise<Discount> {
    return createDiscount(data, userId);
  },
  async fetchRemote(): Promise<Discount[]> {
    return getAllDiscounts();
  },
  async update(id: string, updates: Partial<Discount>, userId = 'system'): Promise<Discount> {
    return updateDiscount(id, updates, userId);
  },
  async delete(id: string, userId = 'system'): Promise<void> {
    return deleteDiscount(id, userId);
  },
};
