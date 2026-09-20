import React from 'react';
import { Package, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { formatAppDate } from '../../lib/dateUtils';
import { useSettingsStore } from '../../stores';
import { Pagination } from '../../shared/ui';
import { StatusBadge } from './inventoryReportTable.statusBadge';
import type { InventoryReportTableProps } from './inventoryReportTable.types';

export function InventoryReportMobileTable({
  data,
  allData,
  expandedRows,
  onToggleRow,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange
}: InventoryReportTableProps) {
  const appSettings = useSettingsStore(s => s.settings);

  const totalStockValue = allData.reduce((s, p) => s + p.stockValue, 0);
  const totalPotentialRevenue = allData.reduce((s, p) => s + p.potentialRevenue, 0);
  const totalGrossProfit = allData.reduce((s, p) => s + p.grossProfit, 0);

  return (
    <div className="lg:hidden min-h-[calc(100vh-340px)] flex flex-col justify-between space-y-3">
      <div className="flex-1 space-y-3">
        {data.map(item => (
        <div key={item.id} onClick={() => onToggleRow(item.id)} className="bg-white dark:bg-surface p-3.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none active:scale-[0.99] transition-all">
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
              <div>
                <h4 className="text-[13px] font-medium text-neutral-900 dark:text-white leading-tight">{item.name}</h4>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{item.sku} • {item.category}</p>
              </div>
            </div>
            <StatusBadge status={item.stockStatus} />
          </div>

          <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-neutral-100 dark:border-white/[0.04]">
            <div>
              <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">{"Stock Position"}</p>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">{item.isInfinite ? '∞' : item.stock}</span>
                {!item.isInfinite && <span className="text-[11px] text-neutral-400">/ min {item.minStock}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1 font-mono">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase mr-1.5">Cost:</span>
                <span className="text-xs font-medium text-neutral-900 dark:text-white tabular-nums">{formatCurrency(item.stockValue, appSettings.currency)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase mr-1.5">Sale:</span>
                <span className="text-xs font-medium text-neutral-900 dark:text-white tabular-nums">{formatCurrency(item.potentialRevenue, appSettings.currency)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2.5 font-mono text-center">
            <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/[0.04] p-2 rounded">
              <p className="text-[10px] text-neutral-500 uppercase mb-0.5">{"Sold"}</p>
              <p className="text-xs font-medium text-neutral-900 dark:text-white">{item.soldQty.toFixed(1)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/[0.04] p-2 rounded">
              <p className="text-[10px] text-neutral-500 uppercase mb-0.5">{"Revenue"}</p>
              <p className="text-xs font-medium text-neutral-900 dark:text-white tabular-nums">{formatCurrency(item.revenue, appSettings.currency)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/[0.04] p-2 rounded">
              <p className="text-[10px] text-neutral-500 uppercase mb-0.5">{"Profit"}</p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(item.grossProfit, appSettings.currency)}</p>
            </div>
          </div>

          {expandedRows.has(item.id) && item.recentSales && item.recentSales.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dashed border-neutral-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-mono">
                <TrendingUp className="w-3 h-3 text-neutral-400" />
                <span>Sales Ledger</span>
              </div>
              {item.recentSales.map((sale: any, sIdx: number) => (
                <div key={sIdx} className="bg-neutral-50 dark:bg-white/[0.02] p-2 rounded text-[11px] font-mono space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{formatAppDate(new Date(sale.timestamp))}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(sale.revenue, appSettings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span>INV #{sale.invoiceNumber}</span>
                    <span>Qty: {sale.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      </div>

      <div className="mt-auto space-y-3">
        <div className="bg-neutral-100 dark:bg-surface text-neutral-900 dark:text-white p-4 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
          <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">{"Inventory Grand Summary"}</p>
          <div className="grid grid-cols-2 gap-3 font-mono text-[12px]">
            <div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block uppercase">Total Stock</span>
              <span className="text-base font-semibold">{allData.reduce((s, p) => s + (p.isInfinite ? 0 : p.stock), 0)}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block uppercase">Stock (Cost)</span>
              <span className="text-base font-semibold tabular-nums">{formatCurrency(totalStockValue, appSettings.currency)}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block uppercase">Stock (Sale)</span>
              <span className="text-base font-semibold tabular-nums">{formatCurrency(totalPotentialRevenue, appSettings.currency)}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block uppercase">Total Profit</span>
              <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(totalGrossProfit, appSettings.currency)}</span>
            </div>
          </div>
        </div>

        <div className="py-2 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <span>{allData.length} total items</span>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalItems={allData.length}
            mode="numbered"
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </div>
    </div>
  );
}
