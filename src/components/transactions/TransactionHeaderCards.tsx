import React from 'react';
import { formatCurrency } from '../../lib/currencies';
import { RealIcon } from '../../shared/ui';
import { TrendingUp, Store, Package, Wallet } from 'lucide-react';

interface Props {
  totalRevenue: number;
  retailSalesTotal: number;
  wholesaleSalesTotal: number;
  totalItemsSold: number;
  walletTotals: { cash: number; card: number; online: number; creditReceived?: number; creditGiven?: number; creditRecovered?: number };
  appSettings: any;
  showRetail: boolean;
  showWholesale: boolean;
  activeCardsCount: number;
}

export function TransactionHeaderCards({
  totalRevenue, retailSalesTotal, wholesaleSalesTotal, totalItemsSold,
  walletTotals, appSettings, showRetail, showWholesale, activeCardsCount
}: Props) {
  return (
    <div className="space-y-3">
      {/* Top Metric Strip */}
      <div className={`grid grid-cols-2 gap-3 ${activeCardsCount === 5
        ? "sm:grid-cols-3 lg:grid-cols-5"
        : activeCardsCount === 4
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : "sm:grid-cols-3"
        }`}>
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-tight text-neutral-700 dark:text-neutral-300">
              Total Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(totalRevenue, appSettings.currency)}
          </div>
        </div>

        {showRetail && (
          <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-tight text-neutral-700 dark:text-neutral-300">
                Retail Sales
              </span>
              <Store className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(retailSalesTotal, appSettings.currency)}
            </div>
          </div>
        )}

        {showWholesale && (
          <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-tight text-neutral-700 dark:text-neutral-300">
                Wholesale Sales
              </span>
              <Package className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(wholesaleSalesTotal, appSettings.currency)}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-tight text-neutral-700 dark:text-neutral-300">
              Items Sold
            </span>
            <Package className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
            {totalItemsSold}
          </div>
        </div>
      </div>

      {/* Wallets & Cash Flow Breakdown */}
      <div className="bg-white dark:bg-surface p-3.5 sm:p-4 rounded-xl border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-3 overflow-visible">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold tracking-tight text-neutral-700 dark:text-neutral-300">
          <Wallet className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          <span>Wallet Balances</span>
        </div>

        <div className={`grid grid-cols-3 ${(appSettings.enableCreditSales || appSettings.enable_credit_sales) ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2 sm:gap-4 pt-4 sm:pt-8 overflow-visible`}>
          <div className="group relative bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-2xl pt-4 pb-2 sm:pt-7 sm:pb-3.5 px-2 sm:px-3 flex flex-col items-center justify-center text-center shadow-none hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-md transition-all overflow-visible">
            <div className="-mt-7 sm:-mt-12 mb-1 sm:mb-2 shrink-0 flex items-center justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-115 group-hover:-translate-y-1.5">
              <RealIcon name="cashWallet" size="lg" className="sm:hidden" />
              <RealIcon name="cashWallet" size={70} className="hidden sm:inline-block" />
            </div>
            <span className="text-[12.5px] sm:text-[15px] font-mono font-bold tabular-nums text-neutral-900 dark:text-white leading-tight">
              {formatCurrency(walletTotals.cash, appSettings.currency)}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-tight mt-0.5 sm:mt-1 leading-tight truncate max-w-full">
              Cash Wallet
            </span>
          </div>

          <div className="group relative bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-2xl pt-4 pb-2 sm:pt-7 sm:pb-3.5 px-2 sm:px-3 flex flex-col items-center justify-center text-center shadow-none hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-md transition-all overflow-visible">
            <div className="-mt-7 sm:-mt-12 mb-1 sm:mb-2 shrink-0 flex items-center justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-115 group-hover:-translate-y-1.5">
              <RealIcon name="cardWallet" size="lg" className="sm:hidden" />
              <RealIcon name="cardWallet" size={70} className="hidden sm:inline-block" />
            </div>
            <span className="text-[12.5px] sm:text-[15px] font-mono font-bold tabular-nums text-neutral-900 dark:text-white leading-tight">
              {formatCurrency(walletTotals.card, appSettings.currency)}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-tight mt-0.5 sm:mt-1 leading-tight truncate max-w-full">
              Card Wallet
            </span>
          </div>

          <div className="group relative bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-2xl pt-4 pb-2 sm:pt-7 sm:pb-3.5 px-2 sm:px-3 flex flex-col items-center justify-center text-center shadow-none hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-md transition-all overflow-visible">
            <div className="-mt-7 sm:-mt-12 mb-1 sm:mb-2 shrink-0 flex items-center justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-115 group-hover:-translate-y-1.5">
              <RealIcon name="bankWallet" size="lg" className="sm:hidden" />
              <RealIcon name="bankWallet" size={70} className="hidden sm:inline-block" />
            </div>
            <span className="text-[12.5px] sm:text-[15px] font-mono font-bold tabular-nums text-neutral-900 dark:text-white leading-tight">
              {formatCurrency(walletTotals.online, appSettings.currency)}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-tight mt-0.5 sm:mt-1 leading-tight truncate max-w-full">
              Online
            </span>
          </div>

          {(appSettings.enableCreditSales || appSettings.enable_credit_sales) && (
            <div className="group relative bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-2xl pt-4 pb-2 sm:pt-7 sm:pb-3.5 px-2 sm:px-3 flex flex-col items-center justify-center text-center shadow-none hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-md transition-all overflow-visible">
              <div className="-mt-7 sm:-mt-12 mb-1 sm:mb-2 shrink-0 flex items-center justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-115 group-hover:-translate-y-1.5">
                <RealIcon name="expenses" size="lg" className="sm:hidden" />
                <RealIcon name="expenses" size={70} className="hidden sm:inline-block" />
              </div>
              <span className="text-[12.5px] sm:text-[15px] font-mono font-bold tabular-nums text-neutral-900 dark:text-white leading-tight">
                {formatCurrency((walletTotals.creditGiven || 0) - (walletTotals.creditRecovered || 0), appSettings.currency)}
              </span>
              <span className="text-[9px] sm:text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-tight mt-0.5 sm:mt-1 leading-tight truncate max-w-full">
                Credit Wallet
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
