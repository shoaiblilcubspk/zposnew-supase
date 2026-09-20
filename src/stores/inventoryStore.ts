import { create } from 'zustand';
import {
  PurchaseRecord, Category, Supplier, PurchaseOrder, SupplierTransaction, StockHistory, VariantStockHistory
} from '../types';

interface InventoryState {
  purchaseRecords: PurchaseRecord[];
  categories: Category[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  supplierTransactions: SupplierTransaction[];
  stockHistory: StockHistory[];
  variantStockHistory: VariantStockHistory[];
  setPurchaseRecords: (r: PurchaseRecord[]) => void;
  addPurchaseRecord: (r: PurchaseRecord) => void;
  updatePurchaseRecord: (r: PurchaseRecord) => void;
  deletePurchaseRecord: (id: string) => void;
  setCategories: (c: Category[]) => void;
  addCategory: (c: Category) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  setSuppliers: (s: Supplier[]) => void;
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;
  setPurchaseOrders: (p: PurchaseOrder[]) => void;
  setSupplierTransactions: (s: SupplierTransaction[]) => void;
  setStockHistory: (s: StockHistory[]) => void;
  setVariantStockHistory: (s: VariantStockHistory[]) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  purchaseRecords: [],
  categories: [],
  suppliers: [],
  purchaseOrders: [],
  supplierTransactions: [],
  stockHistory: [],
  variantStockHistory: [],

  setPurchaseRecords: (purchaseRecords) => set({ purchaseRecords }),

  addPurchaseRecord: (record) => set((st) => {
    if (st.purchaseRecords.some((r) => r.id === record.id)) return st;
    const products = useProductsStore.getState().products;
    const idx = products.findIndex((p: any) => p.id === record.productId);
    let updatedProducts = products;
    if (idx >= 0 && products[idx].trackInventory !== false) {
      const np = { ...products[idx] };
      np.stock = (np.stock || 0) + (record.quantity || 0);
      updatedProducts = products.map((p: any, i: number) => (i === idx ? np : p));
      useProductsStore.setState({ products: updatedProducts });
    }
    return { purchaseRecords: [record, ...st.purchaseRecords] };
  }),

  updatePurchaseRecord: (record) => set((st) =>
    !record?.id ? st : { purchaseRecords: (st.purchaseRecords || []).map((r) => (r && r.id === record.id) ? record : r) }
  ),

  deletePurchaseRecord: (id) => set((st) => ({ purchaseRecords: st.purchaseRecords.filter((r) => r.id !== id) })),

  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((st) => {
    if (st.categories.some((c) => c.id === category.id || c.name.toLowerCase() === category.name.toLowerCase())) {
      return st;
    }
    return { categories: [...st.categories, category] };
  }),
  updateCategory: (category) => set((st) =>
    ({ categories: st.categories.map((c) => (c.id === category.id ? category : c)) })
  ),
  deleteCategory: (id) => set((st) => ({ categories: st.categories.filter((c) => c.id !== id) })),

  setSuppliers: (suppliers) => set({ suppliers }),
  addSupplier: (supplier) => set((st) => {
    if (st.suppliers.some((s) => s.id === supplier.id || s.name.toLowerCase() === supplier.name.toLowerCase())) {
      return st;
    }
    return { suppliers: [...st.suppliers, supplier] };
  }),
  updateSupplier: (supplier) => set((st) =>
    ({ suppliers: st.suppliers.map((s) => (s.id === supplier.id ? supplier : s)) })
  ),
  deleteSupplier: (id) => set((st) => ({ suppliers: st.suppliers.filter((s) => s.id !== id) })),

  setPurchaseOrders: (purchaseOrders) => set({ purchaseOrders }),
  setSupplierTransactions: (supplierTransactions) => set({ supplierTransactions }),
  setStockHistory: (stockHistory) => set({ stockHistory }),
  setVariantStockHistory: (variantStockHistory) => set({ variantStockHistory }),
}));

import { useProductsStore } from './productsStore';
