/**
 * Expense repository — Supabase-only cloud-direct.
 * Reads from the local mirror (`src/data`), writes through the sync queue. No P2P, no Dexie.
 * Rows are snake_case (Rule 3); mapped to the camelCase `Expense` domain type at this boundary.
 *
 * NOTE: the cloud-direct schema has no wallet-balance column on payment_modes, so the old
 * atomic wallet-balance mutation is gone. Expenses are a plain non-additive row here.
 */

import { localQuery, localQueryOne, insertRow, updateRow } from '../../../data';
import { Expense } from '../../../types';

export function mapSqliteExpense(row: any): Expense {
  return {
    id: row.id,
    description: row.title || '',
    category: row.category || 'Other',
    amount: Number(row.amount) || 0,
    date: row.spent_at ? new Date(row.spent_at) : (row.created_at ? new Date(row.created_at) : new Date()),
    paymentMethod: (row.payment_mode || 'cash') as Expense['paymentMethod'],
    notes: row.notes || '',
    storeType: (row.store_type || undefined) as Expense['storeType'],
    addedBy: row.user_id || 'Operator',
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await localQuery<any>(`SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY spent_at DESC;`);
  return rows.map(mapSqliteExpense);
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const row = await localQueryOne<any>(`SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL;`, [id]);
  return row ? mapSqliteExpense(row) : null;
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM expenses WHERE spent_at >= ? AND spent_at <= ? AND deleted_at IS NULL ORDER BY spent_at DESC;`,
    [startDate.toISOString(), endDate.toISOString()]
  );
  return rows.map(mapSqliteExpense);
}

export async function createExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>,
  userId = 'system'
): Promise<Expense> {
  const spentAt = (expense.date ? new Date(expense.date) : new Date()).toISOString();
  const row = await insertRow('expenses', {
    title: expense.description || 'Expense',
    category: expense.category || 'Other',
    amount: Number(expense.amount) || 0,
    payment_mode: expense.paymentMethod || 'cash',
    store_type: expense.storeType ?? 'retail',
    notes: expense.notes || null,
    user_id: userId,
    spent_at: spentAt,
  });
  return mapSqliteExpense(row);
}

export async function updateExpense(
  id: string,
  updates: Partial<Expense>,
  _userId = 'system'
): Promise<Expense> {
  const existing = await getExpenseById(id);
  if (!existing) throw new Error('Expense not found');

  const patch: Record<string, any> = {};
  if (updates.description !== undefined) patch.title = updates.description;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.amount !== undefined) patch.amount = Number(updates.amount) || 0;
  if (updates.paymentMethod !== undefined) patch.payment_mode = updates.paymentMethod || 'cash';
  if (updates.storeType !== undefined) patch.store_type = updates.storeType ?? 'retail';
  if (updates.notes !== undefined) patch.notes = updates.notes || null;
  if (updates.date !== undefined) patch.spent_at = new Date(updates.date).toISOString();
  if (Object.keys(patch).length > 0) await updateRow('expenses', id, patch);

  return { ...existing, ...updates, id, updatedAt: new Date() };
}

export async function deleteExpense(id: string, _userId = 'system'): Promise<void> {
  // Soft-delete (tombstone) so the deletion propagates to every device via pull: setting
  // deleted_at bumps the server updated_at, the pull cursor carries it, and reads hide it.
  // A hard DELETE would vanish locally but other devices could never learn it was removed.
  await updateRow('expenses', id, { deleted_at: new Date().toISOString() });
}
