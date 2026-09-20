/**
 * Expense & Wallet Remote P2P Event Handlers
 * Replicates operating expense entries and wallet adjustments across terminals.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { localDb } from '../../localDb';
import { normalizePaymentMethod } from '../utils';

export async function handleRemoteExpenseEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const expenseId = event.entity_id || p.id;
  const modeId = normalizePaymentMethod(p.payment_mode_id || p.paymentMethod || 'cash');
  const amount = Number(p.amount) || 0;

  if (event.operation === 'DELETE') {
    const existing = await tx.queryOne<any>(`SELECT * FROM expenses WHERE id = ?;`, [expenseId]);
    if (existing) {
      await tx.execute(`DELETE FROM expenses WHERE id = ?;`, [expenseId]);
      const restoreAmount = Number(existing.amount) || amount;
      const restoreMode = normalizePaymentMethod(existing.payment_mode_id || modeId);
      await tx.execute(
        `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
        [restoreAmount, restoreMode]
      );
    }
    await tx.execute(
      `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('EXPENSE', ?, ?, ?);`,
      [expenseId, now, event.device_id]
    );
    try { await localDb.expenses.delete(expenseId); } catch {}
    return;
  }

  const existing = await tx.queryOne<any>(`SELECT * FROM expenses WHERE id = ?;`, [expenseId]);
  if (existing) {
    // Expense already present (idempotent ignore)
    return;
  }

  // 1. Insert into expenses
  await tx.execute(
    `INSERT OR REPLACE INTO expenses (
      id, title, category, amount, payment_mode_id, notes, user_id, date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      expenseId,
      p.title || p.description || 'Expense',
      p.category || 'Other',
      amount,
      modeId,
      p.notes || null,
      p.user_id || event.device_id,
      p.date ? Number(p.date) : now,
      p.created_at ? Number(p.created_at) : now,
    ]
  );

  // 2. Additive wallet balance deduction
  await tx.execute(
    `UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`,
    [amount, modeId]
  );

  // Dexie mirror
  try {
    await localDb.expenses.put({
      id: expenseId,
      description: p.title || p.description || 'Expense',
      category: p.category || 'Other',
      amount,
      paymentMethod: modeId as any,
      notes: p.notes || '',
      date: new Date(p.date ? Number(p.date) : now),
      createdAt: new Date(p.created_at ? Number(p.created_at) : now),
    });
    const mode = await localDb.paymentModes.get(modeId);
    if (mode) {
      await localDb.paymentModes.update(modeId, {
        balance: Number(mode.balance || 0) - amount,
        updatedAt: new Date(now),
      });
    }
  } catch {}
}

export async function handleRemoteWalletEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();

  if (event.operation === 'CREATE' && p.id && p.name) {
    await tx.execute(
      `INSERT OR IGNORE INTO payment_modes (id, name, is_active, balance) VALUES (?, ?, 1, ?);`,
      [p.id, p.name, Number(p.balance) || 0]
    );
    try {
      await localDb.paymentModes.put({
        id: p.id,
        name: p.name,
        isActive: true,
        balance: Number(p.balance) || 0,
        icon: p.icon || 'wallet',
        color: p.color || '#6366f1',
        updatedAt: new Date(now),
      });
    } catch {}
    return;
  }

  if (event.operation === 'DELETE' && p.id) {
    await tx.execute(`UPDATE payment_modes SET is_active = 0 WHERE id = ?;`, [p.id]);
    try { await localDb.paymentModes.delete(p.id); } catch {}
    return;
  }

  // Handle WALLET_DELTA / batch moves
  if (p.moves && Array.isArray(p.moves)) {
    for (const mv of p.moves) {
      const modeId = normalizePaymentMethod(mv.modeId);
      const delta = Number(mv.delta) || 0;
      await tx.execute(
        `UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`,
        [delta, modeId]
      );
      try {
        const mode = await localDb.paymentModes.get(modeId);
        if (mode) {
          await localDb.paymentModes.update(modeId, {
            balance: Number(mode.balance || 0) + delta,
            updatedAt: new Date(now),
          });
        }
      } catch {}
    }
  }
}

export function registerExpenseEventHandlers(): void {
  registerEventHandler('EXPENSE', handleRemoteExpenseEvent);
  registerEventHandler('EXPENSE_CREATED', handleRemoteExpenseEvent);
  registerEventHandler('EXPENSE_DELETED', handleRemoteExpenseEvent);
  registerEventHandler('WALLET', handleRemoteWalletEvent);
}
