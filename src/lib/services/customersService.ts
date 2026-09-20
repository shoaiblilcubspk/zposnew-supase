/**
 * Customer Directory Service
 * Local-First customer management driven by local SQLite and P2P outbox events.
 */

import { Customer } from '../../types';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customers/customerRepository';
import { localDb } from '../localDb';
import { mapPayment } from './paymentsService';

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
    const all = await localDb.payments.toArray();
    return all
      .map(mapPayment)
      .filter((p: any) => p.customerId === customerId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};
