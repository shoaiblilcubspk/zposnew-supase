import React from 'react';
import { TrendingUp, ShoppingCart, DollarSign, BarChart3, Wallet, PieChart, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../../../lib/currencies';

interface Props {
  totalRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
  totalCostOfGoods: number;
  grossProfit: number;
  totalExpenseAmount: number;
  netProfit: number;
  currency: string;
}

export function SalesSummaryStats({
  totalRevenue, totalTransactions, averageTransaction, totalCostOfGoods,
  grossProfit, totalExpenseAmount, netProfit, currency
}: Props) {
  const isNetPositive = netProfit >= 0;

  return (
    <div className="space-y-3">
      {/* Asymmetric Hierarchy: 2 Primary Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Primary Hero 1: Total Revenue */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(totalRevenue, currency)}
            </span>
            <span className="text-[12px] text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
              {totalTransactions} bills
            </span>
          </div>
        </div>

        {/* Primary Hero 2: Net Profit */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Net Profit (Bottom Line)
            </span>
            <PieChart className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums ${isNetPositive ? 'text-primary' : 'text-rose-500'}`}>
              {formatCurrency(netProfit, currency)}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Gross Profit − Expenses
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: 5 Discrete Flat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Transactions */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Transactions
            </span>
            <ShoppingCart className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-white font-mono tabular-nums">
            {totalTransactions}
          </div>
        </div>

        {/* Avg Ticket */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Avg Ticket
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(averageTransaction, currency)}
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Gross Profit
            </span>
            <BarChart3 className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(grossProfit, currency)}
          </div>
        </div>

        {/* COGS */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              COGS
            </span>
            <DollarSign className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(totalCostOfGoods, currency)}
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Expenses
            </span>
            <Wallet className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(totalExpenseAmount, currency)}
          </div>
        </div>
      </div>
    </div>
  );
}
