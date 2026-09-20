/**
 * Payments & Payment Modes (Wallets) Service
 * Clean facade delegating to authoritative SQLite wallet repository.
 */

import { generateId } from '../localDb';
import { normalizePaymentMethod } from './utils';
import { saleTxnType, walletDelta, resolveReversal } from './ledgerResolver';
import {
  DEFAULT_PAYMENT_MODES,
  seedPaymentModes as seedPaymentModesRepo,
  getAllPaymentModes,
  createPaymentMode,
  deletePaymentMode,
  adjustPaymentBalances as adjustPaymentBalancesRepo,
  transferWalletBalance,
  WalletMove,
} from './expenses/walletRepository';

export { DEFAULT_PAYMENT_MODES };

export const toRemotePayment = (p: any) => {
  const remote: any = {};
  if ('id' in p) remote.id = p.id;
  if ('customerId' in p) remote.customer_id = p.customerId;
  if ('customer_id' in p) remote.customer_id = p.customer_id;
  if ('supplierId' in p) remote.supplier_id = p.supplierId;
  if ('supplier_id' in p) remote.supplier_id = p.supplier_id;
  if ('amount' in p) remote.amount = Number(p.amount);
  if ('method' in p) remote.payment_type = p.method;
  if ('paymentType' in p) remote.payment_type = p.paymentType;
  if ('payment_type' in p) remote.payment_type = p.payment_type;
  if ('notes' in p) remote.note = p.notes;
  if ('note' in p) remote.note = p.note;

  if ('direction' in p) {
    remote.direction = p.direction;
  } else if (p.customerId || p.customer_id) {
    remote.direction = 'in';
  } else if (p.supplierId || p.supplier_id) {
    remote.direction = 'out';
  }

  if ('createdAt' in p) {
    remote.created_at = p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt;
  } else if ('created_at' in p) {
    remote.created_at = p.created_at instanceof Date ? p.created_at.toISOString() : p.created_at;
  }
  return remote;
};

export const mapPayment = (item: any): any => ({
  id: item.id,
  customerId: item.customer_id ?? item.customerId,
  supplierId: item.supplier_id ?? item.supplierId,
  amount: Number(item.amount),
  method: item.payment_type ?? item.method ?? item.paymentType,
  paymentType: item.payment_type ?? item.paymentType ?? item.method,
  direction: item.direction,
  notes: item.note ?? item.notes,
  note: item.note ?? item.notes,
  createdAt: item.created_at ? new Date(item.created_at) : (item.createdAt ? new Date(item.createdAt) : new Date())
});

export const mapPaymentMode = (item: any) => ({
  id: item.id,
  name: item.name,
  icon: item.icon,
  balance: Number(item.balance || 0),
  isActive: item.is_active ?? item.isActive ?? true,
  isDefault: item.is_default ?? item.isDefault ?? false,
  sortOrder: item.sort_order ?? item.sortOrder ?? 99,
  color: item.color ?? item.color ?? '#6366f1',
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
});

export const toRemotePaymentMode = (m: any) => ({
  id: m.id,
  name: m.name,
  icon: m.icon,
  balance: m.balance,
  is_active: m.isActive ?? true,
  sort_order: m.sortOrder ?? 99,
  color: m.color ?? '#6366f1',
  is_default: m.isDefault ?? false,
  updated_at: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
});

export const seedPaymentModes = async () => {
  return seedPaymentModesRepo();
};

export const getPaymentModes = async () => {
  return getAllPaymentModes();
};

export const adjustPaymentBalances = async (moves: WalletMove[], opts?: any) => {
  return adjustPaymentBalancesRepo(moves, opts);
};

export const isCreditSale = (sale: any): boolean =>
  sale?.paymentMethod === 'credit';

export const buildSalePaymentMoves = (sale: any): any[] => {
  const ref = sale.id;
  if (isCreditSale(sale)) return [];
  const direction = resolveReversal(saleTxnType(sale)).wallet;
  if (sale.paymentMethod === 'split' && sale.splitPayments?.length) {
    return sale.splitPayments.map((p: any) => ({
      id: generateId(),
      modeId: normalizePaymentMethod(p.method),
      delta: walletDelta(p.amount, direction),
      referenceId: ref,
      note: `Sale ${sale.invoiceNumber || ref}`,
    }));
  }
  return [{
    id: generateId(),
    modeId: normalizePaymentMethod(sale.paymentMethod),
    delta: walletDelta(sale.total, direction),
    referenceId: ref,
    note: `Sale ${sale.invoiceNumber || ref}`,
  }];
};

export const buildReversePaymentMoves = (sale: any, ratio = 1): any[] => {
  const ref = sale.id;
  if (isCreditSale(sale)) return [];
  if (sale.paymentMethod === 'split' && sale.splitPayments?.length) {
    return sale.splitPayments.map((p: any) => ({
      id: generateId(),
      modeId: normalizePaymentMethod(p.method),
      delta: -Math.abs(Number(p.amount || 0)) * ratio,
      referenceId: ref,
      note: `Reverse ${sale.invoiceNumber || ref}`,
    }));
  }
  return [{
    id: generateId(),
    modeId: normalizePaymentMethod(sale.paymentMethod),
    delta: -Math.abs(Number(sale.total || 0)) * ratio,
    referenceId: ref,
    note: `Reverse ${sale.invoiceNumber || ref}`,
  }];
};

export const buildRefundPaymentMoves = (sale: any, refundAmount: number, refundWalletId?: string): any[] => {
  const refWallet = refundWalletId ? normalizePaymentMethod(refundWalletId) : null;
  const origWallets = sale.paymentMethod === 'split' && sale.splitPayments?.length
    ? sale.splitPayments.map((p: any) => normalizePaymentMethod(p.method))
    : [normalizePaymentMethod(sale.paymentMethod)];

  const isDiff = refWallet && !origWallets.includes(refWallet);
  if (isCreditSale(sale)) return [];
  if (isDiff) {
    return [{
      id: generateId(), modeId: refWallet!, delta: -Math.abs(refundAmount),
      referenceId: sale.id, referenceType: 'refund',
      note: `Refund ${sale.invoiceNumber || sale.id}`,
    }];
  }
  const ratio = sale.total > 0 ? refundAmount / sale.total : 0;
  if (sale.paymentMethod === 'split' && sale.splitPayments?.length) {
    return sale.splitPayments.map((p: any) => ({
      id: generateId(), modeId: normalizePaymentMethod(p.method),
      delta: -Math.abs(Number(p.amount || 0)) * ratio,
      referenceId: sale.id, referenceType: 'refund', note: `Refund ${sale.invoiceNumber}`,
    }));
  }
  return [{
    id: generateId(), modeId: normalizePaymentMethod(sale.paymentMethod),
    delta: -Math.abs(refundAmount), referenceId: sale.id, referenceType: 'refund',
    note: `Refund ${sale.invoiceNumber}`,
  }];
};

export const paymentModesService = {
  async fetchRemote(): Promise<any[]> {
    return getAllPaymentModes();
  },

  async getAll() {
    return getAllPaymentModes();
  },

  async create(data: { name: string; icon?: string; color?: string }) {
    return createPaymentMode(data);
  },

  async delete(id: string) {
    return deletePaymentMode(id);
  },

  async transfer(fromId: string, toId: string, amount: number, note?: string) {
    return transferWalletBalance(fromId, toId, amount, note);
  },
};

/**
 * Load all standalone (non-sale) payments from SQLite.
 * These are customer credit repayments (sale_id IS NULL, direction = 'in')
 * and supplier payments (direction = 'out').
 * Needed by usePaymentsStore so Reports → Financial shows customer payments received.
 */
export async function getAllStandalonePayments(): Promise<any[]> {
  const { getDatabase } = await import('../db');
  const db = await getDatabase();
  const rows = await db.query<any>(
    `SELECT id, customer_id, supplier_id, mode_id, amount, reference, created_at,
            'in' AS direction, mode_id AS payment_type
     FROM payments
     WHERE sale_id IS NULL
     ORDER BY created_at DESC;`
  ).catch(() => []);
  return rows.map((r: any) => ({
    id: r.id,
    customerId: r.customer_id,
    supplierId: r.supplier_id,
    amount: Number(r.amount) || 0,
    method: r.mode_id || r.payment_type || 'cash',
    paymentType: r.mode_id || r.payment_type || 'cash',
    direction: r.customer_id ? 'in' : 'out',
    note: r.reference,
    createdAt: r.created_at ? new Date(Number(r.created_at)) : new Date(),
  }));
}
