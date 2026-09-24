/**
 * Customer Directory Service
 * Customer management driven by local SQLite repository and Supabase cloud sync.
 */

import { Customer } from '../../types';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customers/customerRepository';
import { localQuery } from '../../data';

export const customersService = {
  async getAll(): Promise<Customer[]> {
    return getAllCustomers();
  },

  async getById(id: string): Promise<Customer | null> {
    return getCustomerById(id);
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<Customer[]> {
    return getAllCustomers();
  },

  async create(customer: Omit<Customer, 'id'>, userId?: string): Promise<Customer> {
    return createCustomer(customer, userId);
  },

  async update(id: string, updates: Partial<Customer>, userId?: string): Promise<Customer> {
    return updateCustomer(id, updates, userId);
  },

  async delete(id: string, userId?: string): Promise<void> {
    await deleteCustomer(id, userId);
  },

  async getCustomerPayments(customerId: string): Promise<any[]> {
    // Customer payments/repayments live in the append-only customer_ledger.
    const rows = await localQuery<any>(
      `SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC;`,
      [customerId]
    ).catch(() => [] as any[]);
    return rows.map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      amount: Number(r.amount) || 0,
      type: r.type,
      method: r.payment_mode || 'cash',
      note: r.notes || undefined,
      saleId: r.sale_id || undefined,
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    }));
  },
};
