/**
 * Local SQLite Expense Repository
 * Authoritative expense directory with atomic wallet balance updates and outbox replication.
 */

import { getDatabase } from '../../db';
import { Expense } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';
import { normalizePaymentMethod } from '../utils';

export function mapSqliteExpense(row: any): Expense {
  return {
    id: row.id,
    description: row.title || row.description || '',
    category: row.category || 'Other',
    amount: Number(row.amount) || 0,
    date: new Date(Number(row.date) || Number(row.created_at) || Date.now()),
    paymentMethod: (row.payment_mode_id || row.paymentMethod || 'cash') as any,
    notes: row.notes || '',
    storeType: row.store_type || undefined,
    addedBy: row.user_id || row.addedBy || 'Operator',
    createdAt: new Date(Number(row.created_at) || Date.now()),
  };
}

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDatabase();
  const rows = await db.query(`SELECT * FROM expenses ORDER BY date DESC;`);
  return rows.map(mapSqliteExpense);
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const db = await getDatabase();
  const row = await db.queryOne(`SELECT * FROM expenses WHERE id = ?;`, [id]);
  return row ? mapSqliteExpense(row) : null;
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
  const db = await getDatabase();
  const start = startDate.getTime();
  const end = endDate.getTime();
  const rows = await db.query(
    `SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC;`,
    [start, end]
  );
  return rows.map(mapSqliteExpense);
}

export async function createExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>,
  userId = 'system'
): Promise<Expense> {
  const deviceId = await getDeviceId();
  const id = generateId();
  const moveId = generateId();
  const now = Date.now();
  const expenseDate = expense.date ? new Date(expense.date).getTime() : now;
  const amount = Number(expense.amount) || 0;
  const modeId = normalizePaymentMethod(expense.paymentMethod || 'cash');

  const newExpense: Expense = {
    ...expense,
    id,
    createdAt: new Date(now),
    date: new Date(expenseDate),
  };

  await commitLocalTransaction({
    entityType: 'EXPENSE',
    entityId: id,
    operation: 'CREATE',
    eventType: 'EXPENSE_CREATED',
    deviceId,
    userId,
    payload: {
      id,
      title: expense.description || 'Expense',
      category: expense.category || 'Other',
      amount,
      payment_mode_id: modeId,
      notes: expense.notes || null,
      user_id: userId,
      date: expenseDate,
      created_at: now,
    },
    execute: async (tx) => {
      // 1. Insert expense row
      await tx.execute(
        `INSERT INTO expenses (id, title, category, amount, payment_mode_id, notes, user_id, date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          expense.description || 'Expense',
          expense.category || 'Other',
          amount,
          modeId,
          expense.notes || null,
          userId,
          expenseDate,
          now,
        ]
      );

      // 2. Atomically deduct wallet balance
      await tx.execute(
        `UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`,
        [amount, modeId]
      );

      // 3. Record cash outflow voucher in payments
      await tx.execute(
        `INSERT INTO payments (id, sale_id, mode_id, amount, reference, created_at)
         VALUES (?, NULL, ?, ?, ?, ?);`,
        [moveId, modeId, -amount, `Expense: ${expense.description || 'Expense'}`, now]
      );
    },
  });

  // Dexie cache synchronization
  try {
    await localDb.expenses.add(newExpense);
    const mode = await localDb.paymentModes.get(modeId);
    if (mode) {
      await localDb.paymentModes.update(modeId, {
        balance: Number(mode.balance || 0) - amount,
        updatedAt: new Date(now),
      });
    }
    await localDb.payment_movements.add({
      id: moveId,
      modeId,
      delta: -amount,
      referenceId: id,
      note: `Expense ${expense.description || ''}`,
      createdAt: new Date(now),
    }).catch(() => {});
  } catch {}

  return newExpense;
}

export async function updateExpense(
  id: string,
  updates: Partial<Expense>,
  userId = 'system'
): Promise<Expense> {
  const existing = await getExpenseById(id);
  if (!existing) throw new Error('Expense not found');

  const deviceId = await getDeviceId();
  const now = Date.now();
  const oldAmount = Number(existing.amount) || 0;
  const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
  const oldMode = normalizePaymentMethod(existing.paymentMethod || 'cash');
  const newMode = normalizePaymentMethod(updates.paymentMethod || existing.paymentMethod || 'cash');
  const updatedExpense: Expense = {
    ...existing,
    ...updates,
    updatedAt: new Date(now),
  };

  await commitLocalTransaction({
    entityType: 'EXPENSE',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'EXPENSE_UPDATED',
    deviceId,
    userId,
    payload: {
      id,
      title: updatedExpense.description,
      category: updatedExpense.category,
      amount: newAmount,
      payment_mode_id: newMode,
      notes: updatedExpense.notes || null,
      user_id: userId,
      date: new Date(updatedExpense.date).getTime(),
    },
    execute: async (tx) => {
      // 1. Update expense row
      await tx.execute(
        `UPDATE expenses SET title = ?, category = ?, amount = ?, payment_mode_id = ?, notes = ?, date = ?
         WHERE id = ?;`,
        [
          updatedExpense.description,
          updatedExpense.category,
          newAmount,
          newMode,
          updatedExpense.notes || null,
          new Date(updatedExpense.date).getTime(),
          id,
        ]
      );

      // 2. Adjust wallet balances (re-credit old, deduct new)
      if (oldMode === newMode) {
        const diff = newAmount - oldAmount;
        if (diff !== 0) {
          await tx.execute(`UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`, [diff, oldMode]);
        }
      } else {
        await tx.execute(`UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`, [oldAmount, oldMode]);
        await tx.execute(`UPDATE payment_modes SET balance = balance - ? WHERE id = ?;`, [newAmount, newMode]);
      }
    },
  });

  try {
    await localDb.expenses.put(updatedExpense);
  } catch {}

  return updatedExpense;
}

export async function deleteExpense(id: string, userId = 'system'): Promise<void> {
  const existing = await getExpenseById(id);
  if (!existing) return;

  const deviceId = await getDeviceId();
  const now = Date.now();
  const amount = Number(existing.amount) || 0;
  const modeId = normalizePaymentMethod(existing.paymentMethod || 'cash');

  await commitLocalTransaction({
    entityType: 'EXPENSE',
    entityId: id,
    operation: 'DELETE',
    eventType: 'EXPENSE_DELETED',
    deviceId,
    userId,
    payload: { id, amount, payment_mode_id: modeId },
    execute: async (tx) => {
      // 1. Delete expense row
      await tx.execute(`DELETE FROM expenses WHERE id = ?;`, [id]);

      // 2. Re-credit wallet balance
      await tx.execute(`UPDATE payment_modes SET balance = balance + ? WHERE id = ?;`, [amount, modeId]);

      // 3. Tombstone record
      await tx.execute(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
         VALUES ('EXPENSE', ?, ?, ?);`,
        [id, now, deviceId]
      );
    },
  });

  try {
    await localDb.expenses.delete(id);
    const mode = await localDb.paymentModes.get(modeId);
    if (mode) {
      await localDb.paymentModes.update(modeId, {
        balance: Number(mode.balance || 0) + amount,
        updatedAt: new Date(now),
      });
    }
  } catch {}
}
