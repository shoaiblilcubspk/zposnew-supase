import React from 'react';
import { ShoppingCart, Truck, User as UserIcon } from 'lucide-react';
import { PurchaseRecord } from '../../types';
import { formatCurrency } from '../../lib/currencies';

interface PurchaseHistorySummaryProps {
  filteredRecords: PurchaseRecord[];
  supplierFilter: string;
  currency: string;
}

export const PurchaseHistorySummary = React.memo(function PurchaseHistorySummary({
  filteredRecords,
  supplierFilter,
  currency,
}: PurchaseHistorySummaryProps) {
  const procurementOnly = filteredRecords.filter(r =>
    r.quantity > 0 &&
    !['Sale', 'Return'].includes(r.type) &&
    !(r.supplier?.toUpperCase() || '').includes('RETURN') &&
    !(r.supplier?.toUpperCase() || '').includes('SALE')
  );

  const totalPurchaseValue = procurementOnly.reduce((sum, r) => sum + ((r.quantity || 0) * (r.costPrice || 0)), 0);
  const totalItemsCount = procurementOnly.reduce((sum, r) => sum + r.quantity, 0);

  const supplierCounts = procurementOnly.reduce((acc: any, r) => {
    if (!r.supplier) return acc;
    acc[r.supplier] = (acc[r.supplier] || 0) + 1;
    return acc;
  }, {});

  const sortedSuppliers = Object.entries(supplierCounts).sort((a: any, b: any) => b[1] - a[1]);
  const mainSupplierName = supplierFilter !== 'All'
    ? supplierFilter
    : (sortedSuppliers[0]?.[0] || 'Direct Entry');

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {"Total Procurement"}
          </span>
          <ShoppingCart className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(totalPurchaseValue, currency)}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            {"Active Period"}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {"Total Stock In"}
          </span>
          <Truck className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
            {totalItemsCount.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            {filteredRecords.length} {"Entries"}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {"Main Supplier"}
          </span>
          <UserIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="text-lg font-semibold text-neutral-900 dark:text-white truncate">
            {mainSupplierName}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            {Object.keys(supplierCounts).length} {"Partners"}
          </span>
        </div>
      </div>
    </div>
  );
});
