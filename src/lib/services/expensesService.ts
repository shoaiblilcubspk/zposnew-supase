/**
 * Expenses Service
 * Facade interfacing with authoritative local SQLite Expense Repository.
 */

import { Expense } from '../../types';
import {
  getAllExpenses,
  getExpenseById,
  getExpensesByDateRange,
  createExpense,
  updateExpense,
  deleteExpense,
} from './expenses/expenseRepository';

export const expensesService = {
  async getAll(): Promise<Expense[]> {
    return getAllExpenses();
  },

  async getById(id: string): Promise<Expense | null> {
    return getExpenseById(id);
  },

  async create(expense: Omit<Expense, 'id'>): Promise<Expense> {
    return createExpense(expense, (expense as any).addedBy || 'system');
  },

  async update(id: string, updates: Partial<Expense>): Promise<Expense> {
    return updateExpense(id, updates, (updates as any).addedBy || 'system');
  },

  async delete(id: string): Promise<void> {
    return deleteExpense(id);
  },

  async fetchRemote(): Promise<Expense[]> {
    return getAllExpenses();
  },

  async getReportExpensesLocal(startDate: Date, endDate: Date): Promise<Expense[]> {
    return getExpensesByDateRange(startDate, endDate);
  },

  async getReportExpenses(startDate: Date, endDate: Date): Promise<Expense[]> {
    return getExpensesByDateRange(startDate, endDate);
  },
};
