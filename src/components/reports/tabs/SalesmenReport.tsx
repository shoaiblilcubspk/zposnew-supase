import { TrendingUp, Users, DollarSign, ShoppingBag, Star } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { EmptyState, Avatar, Pagination, usePagination } from '../../../shared/ui';
import { ExportButton } from '../../../shared/export';
import { useMemo } from 'react';

export interface SalesmanData {
  id: string;
  name: string;
  totalSales: number;
  totalTransactions: number;
  totalItems: number;
  avgTransactionValue: number;
}

interface SalesmenReportProps {
  salesmanData: SalesmanData[];
  currency: string;
  theme: string;
}

export function SalesmenReport({ salesmanData, currency, theme }: SalesmenReportProps) {
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#171717' : 'white',
    border: theme === 'dark' ? '1px solid #444' : '1px solid #e5e7eb',
    borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    color: theme === 'dark' ? '#fff' : '#000'
  };

  const totalSalesmen = salesmanData.length;
  const totalSales = salesmanData.reduce((sum, s) => sum + s.totalSales, 0);
  const totalOrders = salesmanData.reduce((sum, s) => sum + s.totalTransactions, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const exportColumns = [
    { key: 'name', label: "Salesman" },
    { key: 'totalSales', label: "Total Sales", format: 'currency' as const },
    { key: 'totalTransactions', label: "Transactions", format: 'number' as const },
    { key: 'totalItems', label: "Items Sold", format: 'number' as const },
    { key: 'avgTransactionValue', label: "Avg. Transaction", format: 'currency' as const },
  ];

  const exportRows = useMemo(() => salesmanData.map(s => ({
    name: s.name,
    totalSales: s.totalSales,
    totalTransactions: s.totalTransactions,
    totalItems: s.totalItems,
    avgTransactionValue: s.avgTransactionValue,
  })), [salesmanData]);

  const sortedData = useMemo(() => {
    return [...salesmanData].sort((a, b) => b.totalSales - a.totalSales);
  }, [salesmanData]);

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(sortedData, 20);

  if (!salesmanData || salesmanData.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 text-neutral-400" />}
        title="No Insights Found"
        subtext="We couldn't find any salesman records for the selected period."
        className="min-h-[300px] bg-white dark:bg-surface rounded-md border border-dashed border-neutral-200 dark:border-white/[0.08] p-8 shadow-none"
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Salesmen */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Active Salesmen</span>
            <Users className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {totalSalesmen}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">Assigned staff</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Salesmen Revenue</span>
            <DollarSign className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalSales, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">Current range</p>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total Invoices</span>
            <ShoppingBag className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {totalOrders}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">Transactions</p>
        </div>

        {/* Avg Value */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Avg. Ticket</span>
            <Star className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(avgOrderValue, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">Per transaction</p>
        </div>
      </div>

      {/* Salesman Chart */}
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] p-4 shadow-none">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
          <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            Top Salesmen Revenue
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Attribution</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={sortedData.slice(0, 10).map(s => {
            const safeName = s.name || 'Unknown';
            return { 
              name: safeName.length > 15 ? safeName.substring(0, 15) + '...' : safeName, 
              revenue: s.totalSales, 
              transactions: s.totalTransactions 
            };
          })}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} />
            <XAxis dataKey="name" stroke={theme === 'dark' ? '#737373' : '#a3a3a3'} fontSize={11} tickLine={false} />
            <YAxis stroke={theme === 'dark' ? '#737373' : '#a3a3a3'} fontSize={11} tickLine={false} />
            <Tooltip formatter={(value: any, name: string) => [name === 'revenue' ? formatCurrency(Number(value), currency) : value, name === 'revenue' ? "Revenue" : "Transactions"]} contentStyle={tooltipStyle} itemStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#4b5563' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name={"Revenue"} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Salesman Analytics Table */}
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-360px)] flex flex-col justify-between">
        <div className="px-3.5 py-2.5 border-b border-neutral-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              Salesman Analytics ({sortedData.length})
            </h3>
          </div>
          <ExportButton
            data={exportRows}
            columns={exportColumns}
            title={"Salesmen Report"}
            currencySymbol={getCurrencySymbol(currency)}
            className="!min-h-0 !h-7 !px-2.5 !rounded !text-[11px] !bg-neutral-100 dark:!bg-white/[0.06] !text-neutral-700 dark:!text-neutral-300 !border-neutral-200 dark:!border-white/[0.08] hover:!bg-neutral-200 dark:hover:!bg-white/[0.1] shadow-none"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.06] h-8">
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Salesman</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-right">Total Sales</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-center hidden sm:table-cell">Invoices</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-center hidden md:table-cell">Items Sold</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-right hidden md:table-cell">Avg. Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {pageItems.map(salesman => (
                <tr key={salesman.id} className="h-9 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar name={salesman.name} size="sm" shape="square" className="rounded" />
                      <span className="font-medium text-neutral-900 dark:text-white text-[13px]">{salesman.name}</span>
                    </div>
                  </td>
                  <td className="px-3 whitespace-nowrap text-right font-mono tabular-nums font-semibold text-neutral-900 dark:text-white text-[13px]">
                    {formatCurrency(salesman.totalSales, currency)}
                  </td>
                  <td className="px-3 whitespace-nowrap text-center hidden sm:table-cell">
                    <span className="font-mono tabular-nums text-[12px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.06]">
                      {salesman.totalTransactions}
                    </span>
                  </td>
                  <td className="px-3 whitespace-nowrap text-center hidden md:table-cell font-mono tabular-nums text-[12px] text-neutral-600 dark:text-neutral-400">
                    {salesman.totalItems}
                  </td>
                  <td className="px-3 whitespace-nowrap text-right text-neutral-600 dark:text-neutral-400 hidden md:table-cell font-mono tabular-nums">
                    {formatCurrency(salesman.avgTransactionValue, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-neutral-100 dark:divide-white/[0.04] flex-1">
          {pageItems.map(salesman => (
            <div key={salesman.id} className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Avatar name={salesman.name} size="sm" shape="square" className="rounded" />
                  <p className="text-[13px] font-medium text-neutral-900 dark:text-white leading-tight">{salesman.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-mono tabular-nums font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(salesman.totalSales, currency)}
                  </p>
                  <p className="text-[10px] font-mono text-neutral-500">{salesman.totalTransactions} bills</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pinned Pagination Footer */}
        <div className="px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-4 mt-auto">
          <p className="hidden sm:block text-[11px] text-neutral-500 font-mono">
            Showing {sortedData.length > 0 ? ((page - 1) * pageSize) + 1 : 0}–{Math.min(page * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={sortedData.length}
              mode="numbered"
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
