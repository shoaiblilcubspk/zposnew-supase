/**
 * Local SQLite Wallet & Payment Modes Repository
 * Authoritative running balances per payment method with outbox replication.
 */

import { getDatabase } from '../../db';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';
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

export async function seedPaymentModes(): Promise<void> {
  const db = await getDatabase();
  for (const m of DEFAULT_PAYMENT_MODES) {
    const existing = await db.queryOne(`SELECT id FROM payment_modes WHERE id = ?;`, [m.id]);
    if (!existing) {
      await db.execute(
        `INSERT INTO payment_modes (id, name, is_active, balance) VALUES (?, ?, 1, 0);`,
        [m.id, m.name]
      );
    }
    try {
      const dexieMode = await localDb.paymentModes.get(m.id);
      if (!dexieMode) {
        await localDb.paymentModes.put({ ...m, updatedAt: new Date() });
      }
    } catch {}
  }
}

export async function getAllPaymentModes(): Promise<PaymentModeRecord[]> {
  const db = await getDatabase();
  await seedPaymentModes();
  const rows = await db.query<any>(`SELECT * FROM payment_modes WHERE is_active = 1;`);

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    isActive: Boolean(r.is_active),
    balance: Number(r.balance) || 0,
    icon: r.id === 'cash' ? 'cash' : (r.id === 'card' ? 'credit-card' : 'globe'),
    color: r.id === 'cash' ? '#22c55e' : (r.id === 'card' ? '#3b82f6' : '#a855f7'),
    isDefault: ['cash', 'card', 'online'].includes(r.id),
    sortOrder: r.id === 'cash' ? 1 : (r.id === 'card' ? 2 : 3),
  }));
}

export async function getPaymentModeById(id: string): Promise<PaymentModeRecord | null> {
  const db = await getDatabase();
  const normalizedId = normalizePaymentMethod(id);
  const row = await db.queryOne<any>(`SELECT * FROM payment_modes WHERE id = ?;`, [normalizedId]);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    isActive: Boolean(row.is_active),
    balance: Number(row.balance) || 0,
  };
}

export async function createPaymentMode(data: { name: string; icon?: string; color?: string }): Promise<PaymentModeRecord> {
  const id = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!id) throw new Error('Invalid wallet name');

  const deviceId = await getDeviceId();
  const now = Date.now();

  const record: PaymentModeRecord = {
    id,
    name: data.name,
    isActive: true,
    balance: 0,
    icon: data.icon || 'wallet',
    color: data.color || '#6366f1',
    isDefault: false,
    sortOrder: 99,
  };

  await commitLocalTransaction({
    entityType: 'WALLET',
    entityId: id,
    operation: 'CREATE',
    eventType: 'PAYMENT_MODE_CREATED',
    deviceId,
    userId: 'system',
    payload: { id, name: data.name, icon: data.icon, color: data.color, balance: 0 },
    execute: async (tx) => {
      await tx.execute(
        `INSERT INTO payment_modes (id, name, is_active, balance) VALUES (?, ?, 1, 0);`,
        [id, data.name]
      );
    },
  });

  try {
    await localDb.paymentModes.put({ ...record, updatedAt: new Date(now) });
  } catch {}

  return record;
}

export async function deletePaymentMode(id: string): Promise<void> {
  const mode = await getPaymentModeById(id);
  if (!mode) return;
  if (['cash', 'card', 'online'].includes(id)) {
    throw new Error('Cannot delete default wallet');
  }
  if (Math.abs(mode.balance) > 0.01) {
    throw new Error('Balance must be 0 before deletion');
  }

  const deviceId = await getDeviceId();
  await commitLocalTransaction({
    entityType: 'WALLET',
    entityId: id,
    operation: 'DELETE',
    eventType: 'PAYMENT_MODE_DELETED',
    deviceId,
    userId: 'system',
    payload: { id },
    execute: async (tx) => {
      await tx.execute(`UPDATE payment_modes SET is_active = 0 WHERE id = ?;`, [id]);
    },
  });

  try {
    await localDb.paymentModes.delete(id);
  } catch {}
}

export interface WalletMove {
  id?: string;
  modeId: string;
  delta: number;
  referenceId?: string;
  referenceType?: string;
  note?: string;
}

export async function adjustPaymentBalances(moves: WalletMove[], opts?: { batchId?: string }): Promise<void> {
  if (!moves || moves.length === 0) return;
  const deviceId = await getDeviceId();
  const batchId = opts?.batchId || generateId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'WALLET',
    entityId: batchId,
    operation: 'UPDATE',
    eventType: 'WALLET_DELTA',
    deviceId,
    userId: 'system',
    payload: { batchId, moves },
    execute: async (tx) => {
      for (const mv of moves) {
        const modeId = normalizePaymentMethod(mv.modeId);
        const delta = Number(mv.delta) || 0;
        const moveId = mv.id || generateId();

        await tx.execute(
          `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
          [delta, modeId]
        );

        await tx.execute(
          `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [moveId, null, modeId, delta, mv.note || `Wallet move ${mv.referenceId || ''}`, now]
        );
      }
    },
  });

  // Dexie mirror
  for (const mv of moves) {
    const modeId = normalizePaymentMethod(mv.modeId);
    try {
      const m = await localDb.paymentModes.get(modeId);
      if (m) {
        await localDb.paymentModes.update(modeId, {
          balance: Number(m.balance || 0) + Number(mv.delta),
          updatedAt: new Date(now),
        });
      }
      await localDb.payment_movements.add({
        id: mv.id || generateId(),
        modeId,
        delta: Number(mv.delta),
        referenceId: mv.referenceId || null,
        referenceType: mv.referenceType || null,
        note: mv.note || null,
        createdAt: new Date(now),
      }).catch(() => {});
    } catch {}
  }
}

export async function transferWalletBalance(fromId: string, toId: string, amount: number, note?: string): Promise<void> {
  if (amount <= 0) throw new Error('Amount must be positive');
  const from = await getPaymentModeById(fromId);
  if (!from || from.balance < amount) throw new Error('Insufficient balance');

  const transferId = generateId();
  await adjustPaymentBalances([
    { id: generateId(), modeId: fromId, delta: -amount, referenceId: transferId, referenceType: 'transfer', note: note || 'Transfer to wallet' },
    { id: generateId(), modeId: toId, delta: +amount, referenceId: transferId, referenceType: 'transfer', note: note || 'Transfer from wallet' },
  ], { batchId: transferId });
}
