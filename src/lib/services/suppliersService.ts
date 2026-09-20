/**
 * Suppliers Service
 * Local-First supplier directory and accounts payable ledger.
 */

import { Supplier, SupplierTransaction } from '../../types';
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from './suppliers/supplierRepository';
import {
  recordSupplierBill,
  recordSupplierPayment,
  getSupplierBalance,
  getSupplierTransactions,
} from './suppliers/supplierLedgerCoordinator';

export const suppliersService = {
  async getAll(): Promise<Supplier[]> {
    return getAllSuppliers();
  },

  async getById(id: string): Promise<Supplier | null> {
    return getSupplierById(id);
  },

  async fetchRemote(_lastSyncTime?: Date): Promise<Supplier[]> {
    return getAllSuppliers();
  },

  async create(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    return createSupplier(data);
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    return updateSupplier(id, updates);
  },

  async delete(id: string): Promise<void> {
    await deleteSupplier(id);
  },

  async getBalance(supplierId: string): Promise<number> {
    return getSupplierBalance(supplierId);
  },

  async recordBill(params: any): Promise<string> {
    const supplierId = params.supplierId || params.supplier_id || '';
    const amount = Number(params.amount) || 0;
    const note = params.note || params.notes || '';
    const referenceId = params.referenceId || params.billId || params.id;
    const date = params.date;
    const userId = params.userId || params.overrideBy || 'system';
    return recordSupplierBill({ supplierId, amount, note, referenceId, date, userId });
  },

  async recordPayment(params: any): Promise<string> {
    const supplierId = params.supplierId || params.supplier_id || '';
    const amount = Number(params.amount) || 0;
    const paymentMode = params.paymentMode || params.payment_type || params.paymentMethod || 'cash';
    const note = params.note || params.notes || '';
    const referenceId = params.referenceId || params.expenseId || params.id;
    const userId = params.userId || params.overrideBy || 'system';
    return recordSupplierPayment({ supplierId, amount, paymentMode, note, referenceId, userId });
  },

  async getTransactions(supplierId: string): Promise<SupplierTransaction[]> {
    return getSupplierTransactions(supplierId);
  },

  async getLedger(supplierId: string, _limit?: number, _offset?: number, _includeBills?: boolean): Promise<any[]> {
    return getSupplierTransactions(supplierId);
  },
};
