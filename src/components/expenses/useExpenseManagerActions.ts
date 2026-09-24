import { expensesService, suppliersService } from '../../lib/services';
import { Expense } from '../../types';
import { useExpensesStore } from '../../stores';
import { sonner } from '../../lib/sonner';

interface UseExpenseManagerActionsOpts {
  editingExpense: Expense | null;
  setEditingExpense: (e: Expense | null) => void;
  setIsModalOpen: (v: boolean) => void;
  appCurrentUser: any;
}

export function useExpenseManagerActions(opts: UseExpenseManagerActionsOpts) {
  const { editingExpense, setEditingExpense, setIsModalOpen, appCurrentUser } = opts;

  // RBAC matrix: expense edit/delete = admin|manager; cashier = create only
  const isAdmin = appCurrentUser?.role === 'admin' || appCurrentUser?.role === 'manager';

  const handleSave = async (expenseData: Omit<Expense, 'id' | 'createdAt'> & { supplierId?: string }) => {
    if (editingExpense && !isAdmin) {
      sonner.error('Only administrators can edit expenses.');
      return;
    }

    const { supplierId, ...expenseCore } = expenseData;
    const fullExpenseData = {
      ...expenseCore,
      addedBy: appCurrentUser?.name || appCurrentUser?.username || 'Operator',
    };

    try {
      if (editingExpense) {
        const updated = await expensesService.update(editingExpense.id, fullExpenseData);
        useExpensesStore.getState().updateExpense(updated);

        try {
          const { localQueryOne } = await import('../../data');
          const billRow = await localQueryOne<any>(
            `SELECT id, supplier_id FROM purchase_records WHERE id = ? OR notes = ? LIMIT 1;`,
            [editingExpense.id, editingExpense.id]
          );
          const linkedBill = billRow ? { id: billRow.id, supplierId: billRow.supplier_id, note: undefined as any } : null;
          const newAmount = Number(fullExpenseData.amount) || 0;
          if (supplierId && newAmount > 0) {
            if (linkedBill) {
              if (linkedBill.supplierId === supplierId) {
                await suppliersService.updateBill(linkedBill.id, {
                  amount: newAmount,
                  note: fullExpenseData.description || linkedBill.note,
                });
              } else {
                await suppliersService.deleteTransaction(linkedBill.id);
                await suppliersService.recordBill({
                  supplierId,
                  amount: newAmount,
                  note: fullExpenseData.description || 'Supplies expense',
                  referenceId: editingExpense.id,
                  sourceType: 'manual_bill',
                });
              }
            } else {
              await suppliersService.recordBill({
                supplierId,
                amount: newAmount,
                note: fullExpenseData.description || 'Supplies expense',
                referenceId: editingExpense.id,
                sourceType: 'manual_bill',
              });
            }
          } else if (linkedBill) {
            await suppliersService.deleteTransaction(linkedBill.id);
          }
        } catch (billErr) {
          console.warn('[ExpenseManager] Failed to reconcile supplier bill:', billErr);
        }

        sonner.success('Expense updated successfully.');
      } else {
        const created = await expensesService.create(fullExpenseData);
        useExpensesStore.getState().addExpense(created);
        sonner.success('Expense added successfully.');

        if (supplierId) {
          await suppliersService.recordBill({
            supplierId,
            amount: Number(fullExpenseData.amount),
            note: fullExpenseData.description || 'Supplies expense',
            referenceId: created.id,
            sourceType: 'manual_bill',
            isManualOverride: fullExpenseData.isManualOverride,
            overrideBy: fullExpenseData.overrideBy,
          });
        }
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      sonner.error('Failed to save expense.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      sonner.error('Only administrators can delete expenses.');
      return;
    }

    const result = await sonner.deleteConfirm('expense record');
    if (!result.isConfirmed) return;

    try {
      sonner.loading('Deleting expense...');
      await expensesService.delete(id);
      useExpensesStore.getState().deleteExpense(id);
      sonner.success('Expense deleted successfully.');
    } catch (error) {
      console.error('Error deleting expense:', error);
      sonner.error('Failed to delete expense.');
    } finally {
      sonner.close();
    }
  };

  return { handleSave, handleDelete };
}
