import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingDown, BarChart3, Banknote, CreditCard, Package, Building2 } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { formatAppDate } from '../../../lib/dateUtils';
import { Expense } from '../../../types';
import { normalizePaymentMethod } from '../../../lib/services';
import { Pagination, usePagination } from '../../../shared/ui';
import { ExportButton } from '../../../shared/export';
import { useMemo } from 'react';

const CATEGORY_ICONS: Record<string, any> = {
  'Utilities': Banknote, 'Food': Package, 'Fuel': Package, 'Rent': Package,
  'Salaries': Package, 'Supplies': Package, 'Marketing': Package,
  'Maintenance': Package, 'Insurance': Package, 'Taxes': Package, 'Other': Package
};

interface ExpensesReportProps {
  filteredExpenses: Expense[];
  expensesTrendData: { date: string; amount: number; count: number }[];
  expenseCategoryData: { name: string; value: number }[];
  totalExpenseAmount: number;
}

export function ExpensesReport({
  filteredExpenses, expensesTrendData, expenseCategoryData,
  totalExpenseAmount, currency, theme, country
}: ExpensesReportProps) {
  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredExpenses, 25);
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#171717' : 'white',
    border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e7eb',
    borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    color: theme === 'dark' ? '#fff' : '#000'
  };
  const itemStyle = { color: theme === 'dark' ? '#e5e7eb' : '#374151' };

  const exportColumns = [
    { key: 'date', label: "Date" },
    { key: 'description', label: "Description" },
    { key: 'notes', label: "Notes" },
    { key: 'category', label: "Category" },
    { key: 'paymentMethod', label: "Wallet" },
    { key: 'amount', label: "Amount", format: 'currency' as const },
  ];

  const exportRows = useMemo(() => [...filteredExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(e => ({
      date: formatAppDate(e.date, country),
      description: e.description,
      notes: e.notes || '',
      category: e.category,
      paymentMethod: e.paymentMethod,
      amount: Number(e.amount) || 0,
    })), [filteredExpenses, country]);

  return (
    <>
      {/* Wallet Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {['cash', 'card', 'online'].map(method => {
          const walletExpenses = filteredExpenses.filter(e => normalizePaymentMethod(e.paymentMethod) === method).reduce((s, e) => s + Number(e.amount), 0);
          const walletCount = filteredExpenses.filter(e => normalizePaymentMethod(e.paymentMethod) === method).length;
          const config: Record<string, { label: string; icon: any }> = {
            cash: { label: 'Cash Expenses', icon: Banknote },
            card: { label: 'Card Expenses', icon: CreditCard },
            online: { label: 'Online Expenses', icon: Building2 },
          };
          const item = config[method];
          const Icon = item.icon;
          return (
            <div key={method} className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {item.label}
                </span>
                <Icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono tabular-nums text-rose-500">
                {formatCurrency(walletExpenses, currency)}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono tabular-nums mt-1">
                {walletCount} entries
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
            <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              Expense Trend
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">Expenditure</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={expensesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} />
              <XAxis dataKey="date" stroke={theme === 'dark' ? '#737373' : '#a3a3a3'} fontSize={11} tickLine={false} />
              <YAxis stroke={theme === 'dark' ? '#737373' : '#a3a3a3'} fontSize={11} tickLine={false} />
              <Tooltip formatter={(value: any, name: string) => [name === 'amount' ? formatCurrency(Number(value), currency) : value, name === 'amount' ? "Amount" : "Entries"]} contentStyle={tooltipStyle} itemStyle={itemStyle} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} name={"Amount"} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="count" stroke={theme === 'dark' ? '#a3a3a3' : '#525252'} strokeWidth={1.5} name={"Entries"} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
            <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              Expenses by Category
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">Categories</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={expenseCategoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {expenseCategoryData.map((_, index) => (<Cell key={`cell-${index}`} fill={['#f43f5e', '#f97316', '#eab308', '#10b981', '#3b82f6', '#8b5cf6'][index % 6]} />))}
              </Pie>
              <Tooltip formatter={(value: any) => [formatCurrency(Number(value), currency), "Amount"]} contentStyle={tooltipStyle} itemStyle={itemStyle} />
              <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Ledger */}
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md overflow-hidden shadow-none mt-3 min-h-[calc(100vh-380px)] flex flex-col justify-between">
        <div className="px-3.5 py-2.5 border-b border-neutral-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              All Expenses ({filteredExpenses.length})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-mono tabular-nums font-bold text-rose-500">-{formatCurrency(totalExpenseAmount, currency)}</span>
            <ExportButton
              data={exportRows}
              columns={exportColumns}
              title={"Expenses Report"}
              currencySymbol={getCurrencySymbol(currency)}
              className="!min-h-0 !h-7 !px-2.5 !rounded !text-[11px] !bg-neutral-100 dark:!bg-white/[0.06] !text-neutral-700 dark:!text-neutral-300 !border-neutral-200 dark:!border-white/[0.08] hover:!bg-neutral-200 dark:hover:!bg-white/[0.1] shadow-none"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.06] h-8">
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Date</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Description</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Category</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Wallet</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-neutral-500 text-[12px]">No expenses in this period</td></tr>
              ) : pageItems.map((expense, idx) => (
                <tr key={idx} className="h-9 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 text-[12px] text-neutral-600 dark:text-neutral-400 font-mono">{formatAppDate(expense.date, country)}</td>
                  <td className="px-3">
                    <p className="font-medium text-neutral-900 dark:text-white text-[13px]">{expense.description}</p>
                    {expense.notes && <p className="text-[11px] text-neutral-500">{expense.notes}</p>}
                  </td>
                  <td className="px-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.06] text-[11px] font-mono">
                      {(() => { const Icon = CATEGORY_ICONS[expense.category] || Package; return <Icon className="w-3 h-3" />; })()}
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.06] text-[11px] font-mono uppercase">
                      {expense.paymentMethod}
                    </span>
                  </td>
                  <td className="px-3 text-right font-mono tabular-nums font-semibold text-rose-500 text-[13px]">-{formatCurrency(Number(expense.amount), currency)}</td>
                </tr>
              ))}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] h-9">
                  <td colSpan={4} className="px-3 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">TOTAL ({filteredExpenses.length} entries)</td>
                  <td className="px-3 text-right font-mono tabular-nums font-bold text-rose-500 text-[13px]">-{formatCurrency(totalExpenseAmount, currency)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-neutral-100 dark:divide-white/[0.04] flex-1">
          {filteredExpenses.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-500 text-[12px]">No expenses found</div>
          ) : pageItems.map((expense, idx) => (
            <div key={idx} className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[13px] font-medium text-neutral-900 dark:text-white leading-tight">{expense.description}</p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{formatAppDate(expense.date, country)}</p>
                </div>
                <p className="text-[13px] font-mono tabular-nums font-bold text-rose-500">-{formatCurrency(Number(expense.amount), currency)}</p>
              </div>
              <div className="flex justify-between items-center mt-2 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.06] font-mono">{expense.category}</span>
                <span className="font-mono text-neutral-500 uppercase">{expense.paymentMethod}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-neutral-50/50 dark:bg-white/[0.01] border-t border-neutral-200 dark:border-white/[0.06] px-4 py-2 flex items-center justify-between mt-auto">
          <span className="hidden sm:inline text-[11px] text-neutral-500 font-mono">
            Showing {filteredExpenses.length > 0 ? ((page - 1) * pageSize) + 1 : 0}–{Math.min(page * pageSize, filteredExpenses.length)} of {filteredExpenses.length}
          </span>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={filteredExpenses.length}
              mode="numbered"
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      </div>
    </>
  );
}
