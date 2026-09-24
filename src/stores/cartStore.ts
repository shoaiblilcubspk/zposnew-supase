import { create } from 'zustand';
import { CartItem, Customer, SalesTab } from '../types';

interface CartState {
  salesTabs: SalesTab[];
  activeSalesTab: string;
  cart: CartItem[];
  selectedCustomer: Customer | null;
  billDiscountValue: number;
  billDiscountType: 'percentage' | 'fixed';
  notes: string;
  editingSaleId: string | null;
  salesmanId: string | null;
  setCart: (items: CartItem[]) => void;
  addToCart: (item: CartItem) => void;
  mergeBundleCartItems: (items: CartItem[]) => void;
  updateCartItem: (payload: { index: number; item: CartItem }) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  setSelectedCustomer: (c: Customer | null) => void;
  setBillDiscount: (p: { value: number; type: 'percentage' | 'fixed' }) => void;
  setNotes: (s: string) => void;
  setEditingSaleId: (id: string | null) => void;
  setSalesmanId: (id: string | null) => void;
  addSalesTab: (tab: SalesTab) => void;
  updateSalesTab: (p: { id: string; updates: Partial<SalesTab> }) => void;
  removeSalesTab: (payload: string | { id: string; nextTabId?: string | null }) => void;
  setActiveSalesTab: (id: string) => void;
  setSalesTabs: (tabs: SalesTab[]) => void;
}

const defaultInitialTab: SalesTab = {
  id: 'tab_default_1',
  name: 'Sale 1',
  cart: [],
  selectedCustomer: null,
  createdAt: new Date(),
};

function getInitialSalesTabs(): SalesTab[] {
  if (typeof localStorage === 'undefined') return [defaultInitialTab];
  try {
    const saved = localStorage.getItem('pos_sales_tabs');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
    }
  } catch {}
  return [defaultInitialTab];
}

function getInitialActiveSalesTab(tabs: SalesTab[]): string {
  if (typeof localStorage === 'undefined') return tabs[0]?.id || 'tab_default_1';
  try {
    const saved = localStorage.getItem('pos_active_sales_tab');
    if (saved && tabs.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {}
  return tabs[0]?.id || 'tab_default_1';
}

function persistTabs(tabs: SalesTab[], activeId?: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('pos_sales_tabs', JSON.stringify(tabs));
    if (activeId) {
      localStorage.setItem('pos_active_sales_tab', activeId);
    }
  } catch {}
}

const updateActiveTab = (st: CartState, updater: (tab: SalesTab) => SalesTab) => {
  const nextTabs = st.salesTabs.map((t) => (t.id === st.activeSalesTab ? updater(t) : t));
  persistTabs(nextTabs, st.activeSalesTab);
  return nextTabs;
};

const initialTabs = getInitialSalesTabs();
const initialActiveTabId = getInitialActiveSalesTab(initialTabs);
const initialActiveTab = initialTabs.find((t) => t.id === initialActiveTabId) || initialTabs[0];

export const useCartStore = create<CartState>((set) => ({
  salesTabs: initialTabs,
  activeSalesTab: initialActiveTabId,
  cart: initialActiveTab?.cart || [],
  selectedCustomer: initialActiveTab?.selectedCustomer || null,
  billDiscountValue: initialActiveTab?.billDiscountValue || 0,
  billDiscountType: initialActiveTab?.billDiscountType || 'percentage',
  notes: initialActiveTab?.notes || '',
  editingSaleId: initialActiveTab?.editingSaleId || null,
  salesmanId: initialActiveTab?.salesmanId || null,

  setCart: (items) => set((st) => ({ cart: items, salesTabs: updateActiveTab(st, (t) => ({ ...t, cart: items })) })),

  addToCart: (item) => set((st) => {
    const newCart = [...st.cart, item];
    return { cart: newCart, salesTabs: updateActiveTab(st, (t) => ({ ...t, cart: newCart })) };
  }),

  mergeBundleCartItems: (items) => set((st) => {
    const updatedCart = [...st.cart];
    for (const item of items) {
      const existingIndex = updatedCart.findIndex(
        (x) => (x.bundleId === item.bundleId || x.bundle_id === item.bundleId) && x.product.id === item.product.id
      );
      if (existingIndex >= 0) {
        const existing = updatedCart[existingIndex];
        updatedCart[existingIndex] = {
          ...existing,
          quantity: existing.quantity + item.quantity,
          discount: (existing.discount || 0) + (item.discount || 0),
          subtotal: (existing.subtotal || 0) + (item.subtotal || 0),
        };
      } else {
        updatedCart.push(item);
      }
    }
    return { cart: updatedCart, salesTabs: updateActiveTab(st, (t) => ({ ...t, cart: updatedCart })) };
  }),

  updateCartItem: ({ index, item }) => set((st) => {
    const newCart = st.cart.map((it, i) => (i === index ? item : it));
    return { cart: newCart, salesTabs: updateActiveTab(st, (t) => ({ ...t, cart: newCart })) };
  }),

  removeFromCart: (index) => set((st) => {
    const newCart = st.cart.filter((_, i) => i !== index);
    return { cart: newCart, salesTabs: updateActiveTab(st, (t) => ({ ...t, cart: newCart })) };
  }),

  clearCart: () => set((st) => ({
    cart: [],
    selectedCustomer: null,
    billDiscountValue: 0,
    billDiscountType: 'percentage',
    notes: '',
    editingSaleId: null,
    salesmanId: null,
    salesTabs: updateActiveTab(st, (t) => ({ ...t, cart: [], selectedCustomer: null, billDiscountValue: 0, billDiscountType: 'percentage', notes: '', editingSaleId: null, salesmanId: null })),
  })),

  setSelectedCustomer: (c) => set((st) => ({
    selectedCustomer: c,
    salesTabs: updateActiveTab(st, (t) => ({ ...t, selectedCustomer: c })),
  })),

  setBillDiscount: ({ value, type }) => set((st) => ({
    billDiscountValue: value,
    billDiscountType: type,
    salesTabs: updateActiveTab(st, (t) => ({ ...t, billDiscountValue: value, billDiscountType: type })),
  })),

  setNotes: (s) => set((st) => ({
    notes: s,
    salesTabs: updateActiveTab(st, (t) => ({ ...t, notes: s })),
  })),

  setEditingSaleId: (id) => set((st) => ({
    editingSaleId: id,
    salesTabs: updateActiveTab(st, (t) => ({ ...t, editingSaleId: id })),
  })),

  setSalesmanId: (id) => set((st) => ({
    salesmanId: id,
    salesTabs: updateActiveTab(st, (t) => ({ ...t, salesmanId: id })),
  })),

  addSalesTab: (tab) => set((st) => {
    if (st.salesTabs.length >= 3) return st;
    const nextTabs = [...st.salesTabs, tab];
    persistTabs(nextTabs, tab.id);
    return {
      salesTabs: nextTabs,
      activeSalesTab: tab.id,
      cart: tab.cart || [],
      selectedCustomer: tab.selectedCustomer || null,
      billDiscountValue: tab.billDiscountValue || 0,
      billDiscountType: tab.billDiscountType || 'percentage',
      notes: tab.notes || '',
      editingSaleId: tab.editingSaleId || null,
      salesmanId: tab.salesmanId || null,
    };
  }),

  updateSalesTab: ({ id, updates }) => set((st) => {
    const updatedTabs = updatedTabsFn(st.salesTabs, id, updates);
    persistTabs(updatedTabs, st.activeSalesTab);
    if (id === st.activeSalesTab) {
      return {
        salesTabs: updatedTabs,
        cart: updates.cart !== undefined ? updates.cart : st.cart,
        selectedCustomer: updates.selectedCustomer !== undefined ? updates.selectedCustomer : st.selectedCustomer,
        billDiscountValue: updates.billDiscountValue !== undefined ? updates.billDiscountValue : st.billDiscountValue,
        billDiscountType: updates.billDiscountType !== undefined ? updates.billDiscountType : st.billDiscountType,
        notes: updates.notes !== undefined ? updates.notes : st.notes,
        editingSaleId: updates.editingSaleId !== undefined ? updates.editingSaleId : st.editingSaleId,
        salesmanId: updates.salesmanId !== undefined ? updates.salesmanId : st.salesmanId,
      };
    }
    return { salesTabs: updatedTabs };
  }),

  removeSalesTab: (payload) => set((st) => {
    const { id, nextTabId } = typeof payload === 'string' ? { id: payload, nextTabId: null as string | null } : payload;
    const remainingTabs = st.salesTabs.filter((t) => t.id !== id);
    const isCurrentActiveRemoved = st.activeSalesTab === id;
    const targetTabId = nextTabId || (remainingTabs.length > 0 ? remainingTabs[0].id : '');
    persistTabs(remainingTabs, isCurrentActiveRemoved ? targetTabId : st.activeSalesTab);
    if (isCurrentActiveRemoved && targetTabId) {
      const nextTab = remainingTabs.find((t) => t.id === targetTabId);
      return {
        salesTabs: remainingTabs,
        activeSalesTab: targetTabId,
        cart: nextTab?.cart || [],
        selectedCustomer: nextTab?.selectedCustomer || null,
        billDiscountValue: nextTab?.billDiscountValue || 0,
        billDiscountType: nextTab?.billDiscountType || 'percentage',
        notes: nextTab?.notes || '',
        editingSaleId: nextTab?.editingSaleId || null,
        salesmanId: nextTab?.salesmanId || null,
      };
    }
    return { salesTabs: remainingTabs, activeSalesTab: isCurrentActiveRemoved ? targetTabId : st.activeSalesTab };
  }),

  setActiveSalesTab: (id) => set((st) => {
    const activeTab = st.salesTabs.find((t) => t.id === id);
    persistTabs(st.salesTabs, id);
    return {
      activeSalesTab: id,
      cart: activeTab?.cart || [],
      selectedCustomer: activeTab?.selectedCustomer || null,
      billDiscountValue: activeTab?.billDiscountValue || 0,
      billDiscountType: activeTab?.billDiscountType || 'percentage',
      notes: activeTab?.notes || '',
      editingSaleId: activeTab?.editingSaleId || null,
      salesmanId: activeTab?.salesmanId || null,
    };
  }),

  setSalesTabs: (tabs) => {
    const sliced = tabs.slice(0, 3);
    persistTabs(sliced);
    set({ salesTabs: sliced });
  },
}));

function updatedTabsFn(tabs: SalesTab[], id: string, updates: Partial<SalesTab>) {
  return tabs.map((t) => (t.id === id ? { ...t, ...updates } : t));
}
