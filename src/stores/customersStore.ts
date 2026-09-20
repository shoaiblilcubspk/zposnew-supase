import { create } from 'zustand';
import { Customer } from '../types';

interface CustomersState {
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  adjustBalance: (id: string, delta: number) => void;
}

export const useCustomersStore = create<CustomersState>((set) => ({
  customers: [],

  setCustomers: (customers) => set({ customers }),

  addCustomer: (customer) => set((st) =>
    st.customers.some((c) => c.id === customer.id) ? st : { customers: [...st.customers, customer] }
  ),

  updateCustomer: (customer) => set((st) =>
    !customer?.id ? st : { customers: (st.customers || []).map((c) => (c && c.id === customer.id) ? customer : c) }
  ),

  deleteCustomer: (id) => set((st) => ({ customers: st.customers.filter((c) => c.id !== id) })),

  adjustBalance: (id: string, delta: number) => set((st) => ({
    customers: (st.customers || []).map((c) =>
      c.id === id ? { ...c, balance: (c.balance || 0) + delta, currentBalance: (c.currentBalance || 0) + delta } : c
    )
  })),
}));
