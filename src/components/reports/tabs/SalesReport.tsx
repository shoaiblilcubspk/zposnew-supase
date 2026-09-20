import React, { useMemo } from 'react';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../../lib/currencies';
import { Sale } from '../../../types';

import { SalesHistoryTable } from './sales/SalesHistoryTable';
import { SalesSummaryStats } from './sales/SalesSummaryStats';
import { SalesCharts } from './sales/SalesCharts';

interface SalesReportProps {
  filteredSales: Sale[];
  salesData: { date: string; sales: number; transactions: number }[];
  categoryData: { name: string; value: number }[];
  saleTypeData: { name: string; value: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  featureAnalytics: {
    serviceRevenue: number;
    productRevenue: number;
    modifiersRevenue: number;
    topVariants: { name: string; quantity: number; revenue: number }[];
  };
  totalRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
  totalCostOfGoods: number;
  grossProfit: number;
  totalExpenseAmount: number;
  netProfit: number;
  walletStats: {
    method: string;
    sales: number;
    expenses: number;
    net: number;
    retailSales: number;
    wholesaleSales: number;
  }[];
  currency: string;
  theme: string;
  country: string;
  users: any[];
  retailEnabled?: boolean;
  wholesaleEnabled: boolean;
}

export function SalesReport({
  filteredSales, salesData, categoryData, saleTypeData, topProducts, featureAnalytics, totalRevenue, totalTransactions, averageTransaction, totalCostOfGoods, grossProfit, totalExpenseAmount, netProfit, walletStats, currency, theme, country, users, retailEnabled = true, wholesaleEnabled
}: SalesReportProps) {
  const netTotal = (s: any) =>
    s.status === 'refunded' || s.status === 'deleted' ? 0 :
    s.status === 'partially_refunded' ? (Number(s.total) || 0) - (Number(s.refundedAmount) || 0) :
    (Number(s.total) || 0);

  const { retailVol, retailCount, wholesaleVol, wholesaleCount } = useMemo(() => {
    let rVol = 0, rCount = 0;
    let wVol = 0, wCount = 0;

    filteredSales.forEach(s => {
      if (s.status === 'refunded' || s.status === 'deleted') return;
      const net = netTotal(s);
      const type = s.saleType || 'retail';
      if (type === 'retail') {
        rVol += net;
        rCount++;
      } else if (type === 'wholesale') {
        wVol += net;
        wCount++;
      }
    });

    return {
      retailVol: rVol,
      retailCount: rCount,
      wholesaleVol: wVol,
      wholesaleCount: wCount
    };
  }, [filteredSales]);

  return (
    <>
      <SalesSummaryStats
        totalRevenue={totalRevenue}
        totalTransactions={totalTransactions}
        averageTransaction={averageTransaction}
        totalCostOfGoods={totalCostOfGoods}
        grossProfit={grossProfit}
        totalExpenseAmount={totalExpenseAmount}
        netProfit={netProfit}
        currency={currency}
      />

      {wholesaleEnabled && (
        <div className="mt-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2.5">
            Sale Mode Performance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              (retailEnabled ?? true) && { label: `Retail Sales (${retailCount})`, val: retailVol, desc: "Direct sales to walk-in or retail customers" },
              wholesaleEnabled && { label: `Wholesale Sales (${wholesaleCount})`, val: wholesaleVol, desc: "Bulk orders to businesses and vendors" }
            ].filter(Boolean).map((card: any, idx) => (
              <div key={idx} className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {card.label}
                  </span>
                </div>
                <div className="mt-2 text-xl font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(card.val, currency)}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2.5">
          Expected Wallet Balances (Sales − Expenses)
        </h3>
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${walletStats.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
          {walletStats.map(wallet => (
            <div
              key={wallet.method}
              className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/[0.06]">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-900 dark:text-white">
                  {wallet.method.replace('_', ' ')}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.06]">
                  Wallet
                </span>
              </div>

              <div className="space-y-1.5 pt-2.5">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-neutral-500 dark:text-neutral-400">Sales</span>
                  <span className="font-mono tabular-nums font-medium text-neutral-900 dark:text-white">
                    +{formatCurrency(wallet.sales, currency)}
                  </span>
                </div>

                <div className="pl-2 border-l border-neutral-200 dark:border-white/[0.08] space-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {(retailEnabled ?? true) && (wallet.retailSales > 0 || (wallet.retailSales === 0 && wallet.wholesaleSales === 0)) && (
                    <div className="flex justify-between items-center">
                      <span>Retail</span>
                      <span className="font-mono tabular-nums">{formatCurrency(wallet.retailSales, currency)}</span>
                    </div>
                  )}
                  {wholesaleEnabled && wallet.wholesaleSales > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Wholesale</span>
                      <span className="font-mono tabular-nums">{formatCurrency(wallet.wholesaleSales, currency)}</span>
                    </div>
                  )}
                </div>

                {wallet.method !== 'credit' && (
                  <div className="flex justify-between items-center text-[12px] pt-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Expenses</span>
                    <span className="font-mono tabular-nums font-medium text-rose-500">
                      -{formatCurrency(wallet.expenses + wallet.refunds, currency)}
                    </span>
                  </div>
                )}
                {wallet.method === 'credit' && (
                  <div className="flex justify-between items-center text-[12px] pt-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Recovered</span>
                    <span className="font-mono tabular-nums font-medium text-primary">
                      -{formatCurrency(wallet.customerPayments || 0, currency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-neutral-200 dark:border-white/[0.06] flex justify-between items-baseline">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {wallet.method === 'credit' ? 'Pending Debt' : 'Expected'}
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
                  {formatCurrency(wallet.net, currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SalesCharts
        salesData={salesData}
        featureAnalytics={featureAnalytics}
        categoryData={categoryData}
        currency={currency}
        theme={theme}
      />

      {(wholesaleEnabled) && saleTypeData.length > 0 && (
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
            <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              Sale Type Breakdown
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">Retail vs Wholesale</span>
          </div>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={saleTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                    {saleTypeData.map((_, index) => (<Cell key={`cell-${index}`} fill={['#10b981', '#6b7280', '#3b82f6'][index % 3]} />))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val, currency)} contentStyle={{ borderRadius: '6px', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb', boxShadow: 'none', backgroundColor: theme === 'dark' ? '#141414' : 'white', color: theme === 'dark' ? '#fff' : '#000', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-2">
              {saleTypeData.map((type, index) => (
                <div key={type.name} className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] rounded border border-neutral-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#10b981', '#6b7280', '#3b82f6'][index % 3] }} />
                    <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200 capitalize">{type.name}</span>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white text-[13px]">{formatCurrency(type.value, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SalesHistoryTable
        filteredSales={filteredSales}
        currency={currency}
        country={country}
        users={users}
      />

      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md overflow-hidden shadow-none">
        <div className="px-3.5 py-2.5 border-b border-neutral-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              Top Selling Products
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">By volume & revenue</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.06] h-8">
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 w-12 hidden sm:table-cell">#</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Product</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-center">Qty Sold</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-right">Revenue</th>
                <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-right hidden sm:table-cell">Avg. Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {topProducts.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-neutral-500 text-[12px]">No product sales recorded in this period.</td></tr>
              ) : topProducts.map((product, index) => (
                <tr key={index} className="h-9 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 hidden sm:table-cell">
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-mono text-neutral-500 bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.06]">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 font-medium text-neutral-900 dark:text-white">{product.name}</td>
                  <td className="px-3 text-center">
                    <span className="font-mono tabular-nums text-[12px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.06]">
                      {product.quantity}
                    </span>
                  </td>
                  <td className="px-3 font-mono tabular-nums font-semibold text-neutral-900 dark:text-white text-right">
                    {formatCurrency(product.revenue, currency)}
                  </td>
                  <td className="px-3 font-mono tabular-nums text-neutral-600 dark:text-neutral-400 text-right hidden sm:table-cell">
                    {formatCurrency(product.quantity > 0 ? product.revenue / product.quantity : 0, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
