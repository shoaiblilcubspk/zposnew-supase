import { create } from 'zustand';
import { Product } from '../types';
import { productsService } from '../lib/services/productsService';
import { useInventoryStore } from './inventoryStore';

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  setProducts: (p: Product[]) => void;
  loadProductsFromDb: () => Promise<void>;
  addProductsBulk: (p: Product[]) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  bulkDelete: (ids: string[]) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  isLoading: false,

  setProducts: (products) => set({ products }),

  loadProductsFromDb: async () => {
    set({ isLoading: true });
    try {
      const items = await productsService.getAll();
      set({ products: items, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addProductsBulk: (items) => set((st) => ({ products: [...st.products, ...items] })),

  addProduct: (product) => set((st) =>
    st.products.some((p) => p.id === product.id) ? st : { products: [...st.products, product] }
  ),

  updateProduct: (product) => set((st) =>
    !product?.id ? st : { products: (st.products || []).map((p) => (p && p.id === product.id) ? product : p) }
  ),

  deleteProduct: (id) => {
    const inv = useInventoryStore.getState();
    const remaining = inv.purchaseRecords.filter((r) => r.productId !== id);
    useInventoryStore.setState({ purchaseRecords: remaining });
    set((st) => ({ products: st.products.filter((p) => p.id !== id) }));
  },

  bulkDelete: (ids) => {
    const idSet = new Set(ids);
    const inv = useInventoryStore.getState();
    const remaining = inv.purchaseRecords.filter((r) => !idSet.has(r.productId));
    useInventoryStore.setState({ purchaseRecords: remaining });
    set((st) => ({ products: st.products.filter((p) => !idSet.has(p.id)) }));
  },
}));
