import React from 'react';
import {
  TrendingUp, TrendingDown,
  ArrowUpDown, ChevronRight, ChevronDown, Database
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { formatAppDate } from '../../lib/dateUtils';
import { useSettingsStore } from '../../stores';
import { Badge, Pagination } from '../../shared/ui';
import { StatusBadge } from './inventoryReportTable.statusBadge';
import type { InventoryReportTableProps } from './inventoryReportTable.types';

export function InventoryReportDesktopTable({
  data,
  allData,
  sortField,
  _sortDir,
  onToggleSort,
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
  const totalActualRevenue = allData.reduce((s, p) => s + p.revenue, 0);
  const totalCOGS = allData.reduce((s, p) => s + p.cogs, 0);
  const totalGrossProfit = allData.reduce((s, p) => s + p.grossProfit, 0);

  const SortTh = ({ field, label }: { field: any; label: string }) => (
    <th onClick={() => onToggleSort(field)} className="px-3 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors">
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && <ArrowUpDown className="w-3 h-3 text-primary" />}
      </div>
    </th>
  );

  return (
    <>
      <div className="hidden lg:flex flex-col justify-between bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-340px)]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="h-8 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
                <SortTh field="name" label={"Product Details"} />
                <SortTh field="stock" label={"Stock"} />
                <SortTh field="status" label={"Status"} />
                <th className="px-3 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Stock Value"}</th>
                <SortTh field="soldQty" label={"Sold Qty"} />
                <SortTh field="revenue" label={"Revenue"} />
                <SortTh field="cogs" label={"COGS"} />
                <SortTh field="grossProfit" label={"Profit"} />
                <SortTh field="profitMargin" label={"Margin"} />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {data.map(item => (
                <React.Fragment key={item.id}>
                  <tr onClick={() => onToggleRow(item.id)} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-lg transition-all ${expandedRows.has(item.id) ? 'bg-primary text-white' : 'text-gray-600 group-hover:text-primary'}`}>
                          {item.recentSales && item.recentSales.length > 0 ? (expandedRows.has(item.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <Database className="w-3.5 h-3.5 opacity-20" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">{item.name}</p>
                          <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mt-1 uppercase tracking-tight">{item.sku} • {item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">{item.isInfinite ? '∞' : item.stock}</p>
                      <p className="text-[11px] font-medium text-neutral-500 uppercase">{item.isInfinite ? "Non-Tracked" : `${"min"}: ${item.minStock}`}</p>
                    </td>
                    <td className="px-3 py-4 text-center"><StatusBadge status={item.stockStatus} /></td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col">
                        <p className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                          <span className="text-neutral-500 mr-1 text-[11px] font-sans">C:</span>
                          {formatCurrency(item.stockValue, appSettings.currency)}
                        </p>
                        <p className="text-[11.5px] font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          <span className="text-neutral-500 mr-1 text-[11px] font-sans">S:</span>
                          {formatCurrency(item.potentialRevenue, appSettings.currency)}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center"><p className="text-xs font-bold font-mono text-neutral-900 dark:text-white">{item.soldQty > 0 ? item.soldQty.toFixed(1) : '—'}</p></td>
                    <td className="px-3 py-4"><p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{item.revenue > 0 ? formatCurrency(item.revenue, appSettings.currency) : '—'}</p></td>
                    <td className="px-3 py-4"><p className="text-xs font-bold font-mono text-rose-500">{item.cogs > 0 ? formatCurrency(item.cogs, appSettings.currency) : '—'}</p></td>
                    <td className="px-3 py-4"><p className={`text-xs font-bold font-mono ${item.grossProfit > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'}`}>{item.grossProfit !== 0 ? formatCurrency(item.grossProfit, appSettings.currency) : '—'}</p></td>
                    <td className="px-3 py-4">
                      <span className={`text-[11px] font-bold font-mono flex items-center gap-1 ${item.profitMargin > 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
                        {item.profitMargin > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && item.recentSales && item.recentSales.length > 0 && (
                    <tr className="bg-gray-50/50 dark:bg-white/[0.01]">
                      <td colSpan={9} className="px-12 py-4 space-y-6">
                        {item.recentSales && item.recentSales.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                              <h4 className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">{"Sales History (Selected Period)"}</h4>
                            </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                                {item.recentSales.map((sale: any, sIdx: number) => (
                                  <div key={sIdx} className="p-2.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
                                    <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-[11px] font-mono font-medium text-primary">INV #{sale.invoiceNumber || '—'}</span>
                                      <Badge size="sm" tone="info" className="!text-[10px] !font-mono !px-1.5 !py-0.2 !rounded">{formatAppDate(new Date(sale.timestamp))}</Badge>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[11px]"><span className="text-neutral-500">{"Customer"}</span><span className="text-neutral-900 dark:text-white font-medium truncate max-w-[100px] text-right">{sale.customerName || "Walk-in"}</span></div>
                                      <div className="flex justify-between text-[11px]"><span className="text-neutral-500">{"Quantity"}</span><span className="text-neutral-900 dark:text-white font-mono">{sale.quantity}</span></div>
                                      <div className="flex justify-between text-[11px] pt-1 border-t border-neutral-200 dark:border-white/[0.08]"><span className="text-neutral-500">{"Revenue"}</span><span className="text-primary font-mono font-medium">{formatCurrency(sale.revenue, appSettings.currency)}</span></div>
                                      {(sale.selectedVariant || sale.serialNumber || (sale.selectedModifiers && sale.selectedModifiers.length > 0) || (sale.addonItems && sale.addonItems.length > 0) || (sale.toppings && sale.toppings.length > 0)) && (
                                        <div className="pt-1 border-t border-neutral-200 dark:border-white/[0.08] text-[10px] text-neutral-500 text-right flex flex-col gap-0.5 mt-0.5 normal-case tracking-normal">
                                          {sale.selectedVariant && <span>{sale.selectedVariant}</span>}
                                          {sale.serialNumber && <span className="text-amber-500 font-mono">SN: {sale.serialNumber}</span>}
                                          {sale.selectedModifiers?.length > 0 && <span className="text-primary">+ {sale.selectedModifiers.map((m: any) => `${m.name} (${formatCurrency(m.price, appSettings.currency)})`).join(', ')}</span>}
                                          {sale.addonItems?.length > 0 && <span className="text-neutral-400">+ Add-ons: {sale.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity}x (${formatCurrency(a.subtotal, appSettings.currency)})`).join(', ')}</span>}
                                          {sale.toppings?.length > 0 && <span className="text-neutral-400">+ {sale.toppings.map((t: any) => `${t.name} (${formatCurrency(t.price, appSettings.currency)})`).join(', ')}</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            {allData.length > 0 && (
              <tfoot>
                <tr className="h-9 bg-neutral-100 dark:bg-black/50 text-neutral-900 dark:text-white font-semibold border-t border-neutral-200 dark:border-white/[0.08] text-[12px] font-mono">
                  <td className="px-3 uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{"Grand Totals"}</td>
                  <td className="px-3">{allData.reduce((s, p) => s + (p.isInfinite ? 0 : p.stock), 0)}</td>
                  <td className="px-3"></td>
                  <td className="px-3">{formatCurrency(totalStockValue, appSettings.currency)}</td>
                  <td className="px-3 text-center">{allData.reduce((s, p) => s + p.soldQty, 0).toFixed(1)}</td>
                  <td className="px-3">{formatCurrency(totalActualRevenue, appSettings.currency)}</td>
                  <td className="px-3 text-rose-600 dark:text-rose-400">{formatCurrency(totalCOGS, appSettings.currency)}</td>
                  <td className="px-3 text-emerald-600 dark:text-emerald-400">{formatCurrency(totalGrossProfit, appSettings.currency)}</td>
                  <td className="px-3">{(totalActualRevenue > 0 ? totalGrossProfit / totalActualRevenue * 100 : 0).toFixed(1)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pinned Pagination Footer */}
        <div className="px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-4 mt-auto">
          <p className="hidden sm:block text-[11px] text-neutral-500 font-mono">
            Showing {allData.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, allData.length)} of ${allData.length}`}
          </p>
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
    </>
  );
}
