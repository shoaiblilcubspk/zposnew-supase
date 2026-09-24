/**
 * Wallet & Payment Modes Repository — Supabase-only cloud-direct (Phase 10j).
 * Payment modes live in `payment_modes` (code/name/is_active). There is NO stored balance
 * column (Rule 7) — each mode's running balance is COMPUTED as SUM(payments.amount) for that
 * mode_code. "Wallet moves" are just append-only rows in `payments`. No P2P, no Dexie.
 */

import { localQuery, localQueryOne, insertRow, updateRow } from '../../../data';
import { safeRandomUUID } from '../../crypto/uuid';
import { normalizePaymentMethod } from '../utils';

export interface PaymentModeRecord {
  id: string;
  name: string;
  isActive: boolean;
  balance: number;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  sortOrder?: number;
  updatedAt?: Date;
}

export const DEFAULT_PAYMENT_MODES: PaymentModeRecord[] = [
  { id: 'cash', name: 'Cash', isActive: true, balance: 0, icon: 'cash', color: '#22c55e', isDefault: true, sortOrder: 1 },
  { id: 'card', name: 'Card', isActive: true, balance: 0, icon: 'credit-card', color: '#3b82f6', isDefault: true, sortOrder: 2 },
  { id: 'online', name: 'Online Wallet', isActive: true, balance: 0, icon: 'globe', color: '#a855f7', isDefault: true, sortOrder: 3 },
];

const DECOR: Record<string, { icon: string; color: string; sort: number }> = {
  cash: { icon: 'cash', color: '#22c55e', sort: 1 },
  card: { icon: 'credit-card', color: '#3b82f6', sort: 2 },
  online: { icon: 'globe', color: '#a855f7', sort: 3 },
  bank: { icon: 'globe', color: '#a855f7', sort: 3 },
  udhar: { icon: 'wallet', color: '#f59e0b', sort: 4 },
};

/** Seeded by migration 0005 / localSchema — nothing to do at runtime. */
export async function seedPaymentModes(): Promise<void> {}

async function balanceFor(code: string): Promise<number> {
  const row = await localQueryOne<{ bal: number }>(
    `SELECT COALESCE(SUM(amount), 0) as bal FROM payments WHERE mode_code = ?;`, [code]
  );
  return row ? Number(row.bal) : 0;
}

export async function getAllPaymentModes(): Promise<PaymentModeRecord[]> {
  const rows = await localQuery<any>(`SELECT * FROM payment_modes WHERE is_active = 1;`);
  const out: PaymentModeRecord[] = [];
  for (const r of rows) {
    const d = DECOR[r.code] || { icon: 'wallet', color: '#6366f1', sort: 99 };
    out.push({
      id: r.code,
      name: r.name,
      isActive: Boolean(r.is_active),
      balance: await balanceFor(r.code),
      icon: d.icon,
      color: d.color,
      isDefault: ['cash', 'card', 'online', 'bank', 'udhar'].includes(r.code),
      sortOrder: d.sort,
    });
  }
  return out;
}

export async function getPaymentModeById(id: string): Promise<PaymentModeRecord | null> {
  const code = normalizePaymentMethod(id);
  const row = await localQueryOne<any>(`SELECT * FROM payment_modes WHERE code = ?;`, [code]);
  if (!row) return null;
  return {
    id: row.code,
    name: row.name,
    isActive: Boolean(row.is_active),
    balance: await balanceFor(row.code),
  };
}

export async function createPaymentMode(data: { name: string; icon?: string; color?: string }): Promise<PaymentModeRecord> {
  const code = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!code) throw new Error('Invalid wallet name');
  await insertRow('payment_modes', { code, name: data.name, is_active: 1 });
  return {
    id: code, name: data.name, isActive: true, balance: 0,
    icon: data.icon || 'wallet', color: data.color || '#6366f1', isDefault: false, sortOrder: 99,
  };
}

export async function deletePaymentMode(id: string): Promise<void> {
  const code = normalizePaymentMethod(id);
  if (['cash', 'card', 'online', 'bank', 'udhar'].includes(code)) {
    throw new Error('Cannot delete default wallet');
  }
  const mode = await getPaymentModeById(code);
  if (!mode) return;
  if (Math.abs(mode.balance) > 0.01) throw new Error('Balance must be 0 before deletion');
  const row = await localQueryOne<{ id: string }>(`SELECT id FROM payment_modes WHERE code = ?;`, [code]);
  if (row) await updateRow('payment_modes', row.id, { is_active: 0 });
}

export interface WalletMove {
  id?: string;
  modeId: string;
  delta: number;
  referenceId?: string;
  referenceType?: string;
  note?: string;
}

/** A "wallet move" is just an append-only payments row (balance = SUM(amount)). */
export async function adjustPaymentBalances(moves: WalletMove[], _opts?: { batchId?: string }): Promise<void> {
  if (!moves || moves.length === 0) return;
  for (const mv of moves) {
    const code = normalizePaymentMethod(mv.modeId);
    await insertRow('payments', {
      sale_id: null,
      mode_code: code,
      amount: Number(mv.delta) || 0,
      reference: mv.note || `Wallet move ${mv.referenceId || ''}`,
    });
  }
}

export async function transferWalletBalance(fromId: string, toId: string, amount: number, note?: string): Promise<void> {
  if (amount <= 0) throw new Error('Amount must be positive');
  const from = await getPaymentModeById(fromId);
  if (!from || from.balance < amount) throw new Error('Insufficient balance');
  const transferId = safeRandomUUID();
  await adjustPaymentBalances([
    { modeId: fromId, delta: -amount, referenceId: transferId, referenceType: 'transfer', note: note || 'Transfer to wallet' },
    { modeId: toId, delta: +amount, referenceId: transferId, referenceType: 'transfer', note: note || 'Transfer from wallet' },
  ], { batchId: transferId });
}
