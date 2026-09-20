import { useInventoryStore, useProductsStore, useSalesStore, useSettingsStore } from '../../stores';
import React, { useState } from 'react';
import {
  Package, Tag, DollarSign, BarChart3, TrendingUp, TrendingDown, Calendar
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../lib/currencies';
import { formatAppDate } from '../../lib/dateUtils';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { usePagination } from '../../shared/ui';
import { ExportButton } from '../../shared/export';
import InventoryReportTable from './InventoryReportTable';
import { useInventoryReportData } from './useInventoryReportData';
import type { InventoryReportManagerProps, SortField, SortDir } from './inventoryReportManager.types';

export default function InventoryReportManager({
  startDate,
  endDate,
  globalSupplier = 'All',
  globalCategory = 'All',
  globalStore = 'All',
  sales
}: InventoryReportManagerProps) {
  const appProducts = useProductsStore(s => s.products);
  const appSales = useSalesStore(s => s.sales);
  const appStockHistory = useInventoryStore(s => s.stockHistory);
  const appSettings = useSettingsStore(s => s.settings);
  const [search, setSearch] = useState('');
  const [statusFilter, _setStatusFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  React.useEffect(() => {
    if (globalCategory) setCategoryFilter(globalCategory);
    if (globalSupplier) setSupplierFilter(globalSupplier);
  }, [globalCategory, globalSupplier]);

  const {
    inventoryData,
    totalStockValue,
    totalPotentialRevenue,
    totalActualRevenue,
    totalCOGS,
    totalGrossProfit,
    exportColumns,
    exportRows
  } = useInventoryReportData({
    appProducts,
    appSales,
    appStockHistory,
    appSettings,
    startDate,
    endDate,
    globalSupplier,
    globalCategory,
    globalStore,
    sales,
    search,
    statusFilter,
    categoryFilter,
    supplierFilter,
    sortField,
    sortDir
  });

  const { page, totalPages, pageItems: displayedData, goToPage, pageSize, setPageSize } = usePagination(inventoryData, 25);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Period:</span>
          <span className="text-[12px] font-mono text-neutral-900 dark:text-white">{formatAppDate(startDate)} — {formatAppDate(endDate)}</span>
        </div>
        <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block" />
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Store:</span>
          <span className="text-[12px] font-medium text-neutral-900 dark:text-white capitalize">{globalStore === 'all' ? "All Channels" : globalStore}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.06]">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400">Live Inventory</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Stock (Cost)</span>
            <DollarSign className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalStockValue, appSettings.currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Stock (Sale)</span>
            <Tag className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalPotentialRevenue, appSettings.currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Actual Revenue</span>
            <TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalActualRevenue, appSettings.currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">COGS Sold</span>
            <TrendingDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totalCOGS, appSettings.currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Gross Profit</span>
            <BarChart3 className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className={`mt-1.5 text-lg font-bold font-mono tabular-nums ${totalGrossProfit >= 0 ? 'text-primary' : 'text-rose-500'}`}>
            {formatCurrency(totalGrossProfit, appSettings.currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Products</span>
            <Package className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {inventoryData.length}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-white dark:bg-surface p-2 rounded-md border border-neutral-200 dark:border-white/[0.08]">
        <div className="flex-1 w-full sm:min-w-[200px]">
          <SharedSearchBar
            value={search}
            onChange={setSearch}
            placeholder={"Search name, SKU..."}
          />
        </div>
        <ExportButton
          data={exportRows}
          columns={exportColumns}
          title="Inventory Report"
          filtersSummary={`${formatAppDate(startDate)} — ${formatAppDate(endDate)}${globalStore && globalStore !== 'all' ? ` • Store: ${globalStore}` : ''}`}
          currencySymbol={getCurrencySymbol(appSettings.currency)}
          className="!min-h-0 !h-8 !px-3 !rounded !text-[11px] !bg-neutral-100 dark:!bg-white/[0.06] !text-neutral-700 dark:!text-neutral-300 !border-neutral-200 dark:!border-white/[0.08] hover:!bg-neutral-200 dark:hover:!bg-white/[0.1] shadow-none"
        />
      </div>

      <InventoryReportTable
        data={displayedData}
        allData={inventoryData}
        sortField={sortField}
        sortDir={sortDir}
        onToggleSort={toggleSort}
        expandedRows={expandedRows}
        onToggleRow={toggleRow}
        page={page}
        totalPages={totalPages}
        onPageChange={goToPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
