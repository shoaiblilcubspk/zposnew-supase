import { Edit2, Trash2, TrendingDown, ShoppingBag } from 'lucide-react';
import { formatAppDate, formatAppTime } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/currencies';
import { Expense } from '../../types';
import { Badge, Button, EmptyState } from '../../shared/ui';

interface ExpenseTableProps {
  filteredExpenses: Expense[];
  paginatedExpenses: Expense[];
  appSettings: any;
  setEditingExpense: (expense: Expense) => void;
  setIsModalOpen: (open: boolean) => void;
  handleDelete: (id: string) => void;
}

export function ExpenseTable({
  filteredExpenses,
  paginatedExpenses,
  appSettings,
  setEditingExpense,
  setIsModalOpen,
  handleDelete
}: ExpenseTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto scrollbar-hide flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-8 bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">{"Date & Time"}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">{"Description"}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-center">{"Category"}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-center">{"Method"}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">{"Amount"}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">{"Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <EmptyState
                    icon={<ShoppingBag className="h-8 w-8 text-neutral-400" />}
                    title={"No expenses found"}
                    className="!p-0 opacity-60"
                  />
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((expense) => (
                <tr key={expense.id} className="h-11 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3.5">
                    <p className="text-[12px] font-mono text-neutral-900 dark:text-white leading-none">{formatAppDate(expense.date, appSettings.country)}</p>
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{formatAppTime(expense.date, appSettings.country)}</p>
                  </td>
                  <td className="px-3.5">
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-white truncate max-w-[220px]">{expense.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {expense.notes && <span className="text-[11px] text-neutral-400 truncate max-w-[150px]">{expense.notes}</span>}
                      {expense.notes && expense.addedBy && <span className="text-neutral-300 dark:text-white/10 text-[9px]">•</span>}
                      {expense.addedBy && <span className="text-[10px] text-primary font-mono">By {expense.addedBy}</span>}
                    </div>
                  </td>
                  <td className="px-3.5 text-center">
                    <Badge tone="warning" size="sm">
                      {expense.category}
                    </Badge>
                  </td>
                  <td className="px-3.5 text-center">
                    <Badge tone="neutral" size="sm">
                      {expense.paymentMethod}
                    </Badge>
                  </td>
                  <td className="px-3.5 text-right font-mono font-semibold text-rose-500 text-[13px] tabular-nums">
                    -{formatCurrency(expense.amount, appSettings.currency)}
                  </td>
                  <td className="px-3.5 text-right">
                    <div className="flex justify-end items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                        aria-label="Edit expense"
                        className="!p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        aria-label="Delete expense"
                        className="!p-1 text-neutral-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-3 flex-1">
        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8 text-neutral-400 opacity-40" />}
            title={"No expenses recorded"}
            className="!py-10"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {paginatedExpenses.map(expense => (
              <div
                key={expense.id}
                onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                className="flex flex-col p-3 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none cursor-pointer hover:border-neutral-300 dark:hover:border-white/[0.15] transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 bg-rose-500/10 rounded flex items-center justify-center shrink-0">
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    </div>
                    <Badge tone="warning" size="sm">
                      {(expense.category || 'General').substring(0, 10)}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }}
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1 text-neutral-500 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-medium text-neutral-900 dark:text-white text-[13px] truncate mb-0.5">
                  {expense.description}
                </h3>
                <p className="text-[11px] text-neutral-400 font-mono mb-2">
                  {formatAppDate(expense.date, appSettings.country)} {expense.addedBy ? `• By ${expense.addedBy}` : ''}
                </p>

                <div className="mt-auto pt-2 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between text-[12px]">
                  <span className="font-semibold font-mono tabular-nums text-rose-500">
                    -{formatCurrency(expense.amount, appSettings.currency)}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">
                    {expense.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
