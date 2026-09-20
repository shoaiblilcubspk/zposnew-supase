import { Banknote, CreditCard, Building2, Wallet, TrendingUp, TrendingDown, DollarSign, BarChart2, Receipt, ShoppingCart, Package } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { ExportButton } from '../../../shared/export';
import { useMemo } from 'react';

interface WalletStat {
  method: string;
  sales: number;
  refunds: number;
  expenses: number;
  customerPayments?: number;
  net: number;
}

interface FinancialReportProps {
  totalRevenue: number;
  totalTransactions: number;
  totalCostOfGoods: number;
  grossProfit: number;
  totalExpenseAmount: number;
  filteredExpensesCount: number;
  netProfit: number;
  walletStats: WalletStat[];
  currency: string;
}

export function FinancialReport({
  totalRevenue, totalTransactions, totalCostOfGoods, grossProfit,
  totalExpenseAmount, filteredExpensesCount, netProfit, walletStats, currency
}: FinancialReportProps) {
  const exportColumns = [
    { key: 'metric', label: "Metric" },
    {
      key: 'value',
      label: "Value",
      format: (val: any, row: any) => {
        if (row.metric === "Total Transactions") {
          return Number(val || 0).toLocaleString();
        }
        const n = Number(val || 0);
        const sym = currency ? `${getCurrencySymbol(currency)} ` : '';
        return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    },
  ];

  const exportRows = useMemo(() => {
    const rows = [
      { metric: "Total Revenue", value: totalRevenue },
      { metric: "Total Transactions", value: totalTransactions },
      { metric: "Cost of Goods", value: totalCostOfGoods },
      { metric: "Gross Profit", value: grossProfit },
      { metric: "Total Expenses", value: totalExpenseAmount },
      { metric: "Net Profit", value: netProfit },
    ];
    walletStats.forEach(w => {
      rows.push({ metric: `${"Wallet Net"} (${w.method})`, value: w.net });
    });
    return rows;
  }, [totalRevenue, totalTransactions, totalCostOfGoods, grossProfit, totalExpenseAmount, netProfit, walletStats]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ExportButton
          data={exportRows}
          columns={exportColumns}
          title={"Financial Report"}
          filtersSummary={`${currency} • Revenue: ${formatCurrency(totalRevenue, currency)} • Net Profit: ${formatCurrency(netProfit, currency)}`}
          currencySymbol={getCurrencySymbol(currency)}
          className="!min-h-0 !h-8 !px-3 !rounded !text-[12px] !bg-white dark:!bg-surface !text-neutral-800 dark:!text-neutral-200 !border-neutral-200 dark:border-white/[0.08] hover:!bg-neutral-50 dark:hover:!bg-surface-hover shadow-none"
        />
      </div>

      {/* Main Profit Cards - Asymmetric Hierarchy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Hero 1: Revenue */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalRevenue, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono tabular-nums">
            {totalTransactions} Transactions
          </p>
        </div>

        {/* Hero 2: Net Profit */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Net Profit
            </span>
            <DollarSign className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className={`mt-2 text-xl font-bold font-mono tabular-nums ${netProfit >= 0 ? 'text-primary' : 'text-rose-500'}`}>
            {formatCurrency(netProfit, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            GP − Expenses
          </p>
        </div>

        {/* Secondary: Cost of Goods */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Cost of Goods (COGS)
            </span>
            <TrendingDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalCostOfGoods, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            Est. Inventory Cost
          </p>
        </div>

        {/* Secondary: Expenses */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Expenses
            </span>
            <Wallet className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalExpenseAmount, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono tabular-nums">
            {filteredExpensesCount} Records
          </p>
        </div>
      </div>

      {/* Wallet-wise Financial Breakdown */}
      <div className="space-y-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Wallet-wise Summary (Net Cash Movement)
        </h3>
        <div className={`grid grid-cols-1 md:grid-cols-3 ${walletStats.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-3`}>
          {[
            { method: 'cash', label: "Cash", icon: <Banknote className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />, stats: walletStats.find(w => w.method === 'cash') },
            { method: 'card', label: "Card", icon: <CreditCard className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />, stats: walletStats.find(w => w.method === 'card') },
            { method: 'online', label: "Online", icon: <Building2 className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />, stats: walletStats.find(w => w.method === 'online') },
            ...(walletStats.some(w => w.method === 'credit') ? [{ method: 'credit', label: "Credit", icon: <Wallet className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />, stats: walletStats.find(w => w.method === 'credit') }] : [])
          ].map((w, i) => (
            <div key={i} className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  {w.icon}
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-900 dark:text-white">
                    {w.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.06]">
                  Wallet
                </span>
              </div>

              <div className="space-y-1.5 pt-2.5">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-neutral-500 dark:text-neutral-400">{w.method === 'credit' ? "Credit Given" : "Total Sales"}</span>
                  <span className="font-mono tabular-nums font-medium text-neutral-900 dark:text-white">+{formatCurrency(w.stats?.sales || 0, currency)}</span>
                </div>
                {w.method !== 'credit' && (
                  <>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-neutral-500 dark:text-neutral-400">Total Refunds</span>
                      <span className="font-mono tabular-nums font-medium text-rose-500">-{formatCurrency(w.stats?.refunds || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-neutral-500 dark:text-neutral-400">Total Expenses</span>
                      <span className="font-mono tabular-nums font-medium text-rose-500">-{formatCurrency(w.stats?.expenses || 0, currency)}</span>
                    </div>
                  </>
                )}
                {(w.stats?.customerPayments || 0) > 0 && (
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-neutral-500 dark:text-neutral-400">{w.method === 'credit' ? "Credit Recovered" : "Credit Received"}</span>
                    <span className={`font-mono tabular-nums font-medium ${w.method === 'credit' ? 'text-primary' : 'text-primary'}`}>{w.method === 'credit' ? '-' : '+'}{formatCurrency(w.stats?.customerPayments || 0, currency)}</span>
                  </div>
                )}
                <div className="pt-2.5 mt-2.5 border-t border-neutral-200 dark:border-white/[0.06] flex justify-between items-baseline">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Wallet Net</span>
                  <span className="text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-white">{formatCurrency(w.stats?.net || 0, currency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Grand Total Summary Card */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 mt-3 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Net Profit Summary
              </p>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-400">
                Total Revenue remaining after deducting all business expenses for this period.
              </p>
            </div>
          </div>
          <div className="text-right sm:text-right w-full sm:w-auto">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Net Profit (Final)
            </span>
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-primary tracking-tight">
              {formatCurrency(netProfit, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
