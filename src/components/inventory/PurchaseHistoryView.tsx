import React from 'react';
import { Plus } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { Button, DateRangePicker, Pagination } from '../../shared/ui';
import { ExportButton } from '../../shared/export';
import { getCurrencySymbol } from '../../lib/currencies';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { BatchStockInSystem } from './BatchStockInSystem';
import { PurchaseHistoryTable } from './PurchaseHistoryTable';
import { PurchaseHistorySummary } from './PurchaseHistorySummary';
import { usePurchaseHistory } from './usePurchaseHistory';

export function PurchaseHistory() {
  const {
    appSettings,
    view,
    setView,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    supplierFilter,
    setSupplierFilter,
    suppliers,
    categoryFilter,
    setCategoryFilter,
    categoriesList,
    userFilter,
    setUserFilter,
    usersList,
    dateRange,
    setDateRange,
    startDateInput,
    setStartDateInput,
    endDateInput,
    setEndDateInput,
    currentPage,
    totalPages,
    itemsPerPage,
    setPageSize,
    paginatedRecords,
    appProducts,
    filteredRecords,
    exportColumns,
    exportRows,
    handleDeleteRecord,
  } = usePurchaseHistory();

  if (view === 'entry') {
    return <BatchStockInSystem onClose={() => setView('list')} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PurchaseHistorySummary
        filteredRecords={filteredRecords}
        supplierFilter={supplierFilter}
        currency={appSettings.currency}
      />

      <div className="bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px]">
            <SharedSearchBar
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
              placeholder="Search by Product Name, SKU, or Supplier..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 min-w-[160px]">
              <SearchableSelect
                label={"SUPPLIER"}
                options={suppliers.map(s => ({ id: s, label: s === 'All' ? "All" : s }))}
                value={supplierFilter}
                onChange={(val) => { setSupplierFilter(val); setCurrentPage(1); }}
              />
            </div>

            <div className="flex-1 min-w-[160px]">
              <SearchableSelect
                label={"CATEGORY"}
                options={categoriesList.map(c => ({ id: c, label: c === 'All' ? "All" : c }))}
                value={categoryFilter}
                onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
              />
            </div>

            <div className="flex-1 min-w-[160px]">
              <SearchableSelect
                label={"USER"}
                options={usersList.map(u => ({ id: u, label: u === 'All' ? "All" : u.toUpperCase() }))}
                value={userFilter}
                onChange={(val) => { setUserFilter(val); setCurrentPage(1); }}
              />
            </div>

            <DateRangePicker
              preset={dateRange}
              presets={[
                { id: 'today', label: "TODAY" },
                { id: 'yesterday', label: "YESTERDAY" },
                { id: 'last7', label: "LAST 7 DAYS" },
                { id: 'last30', label: "LAST 30 DAYS" },
                { id: 'thisMonth', label: "THIS MONTH" },
                { id: 'lastMonth', label: "PREVIOUS MONTH" },
                { id: 'custom', label: "CUSTOM RANGE" },
                { id: 'all', label: "ALL TIME" }
              ]}
              onPresetChange={(val) => { setDateRange(val); setCurrentPage(1); }}
              startDate={startDateInput}
              endDate={endDateInput}
              onStartDateChange={setStartDateInput}
              onEndDateChange={setEndDateInput}
              label={"RANGE"}
              className="flex-1 min-w-[180px]"
            />

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setView('entry')}
                variant="primary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                {"New Stock In"}
              </Button>

              <ExportButton
                data={exportRows}
                columns={exportColumns}
                title="Purchase History"
                filtersSummary={supplierFilter !== 'All' ? `Supplier: ${supplierFilter}` : undefined}
                currencySymbol={getCurrencySymbol(appSettings.currency)}
                compact
              />
            </div>
          </div>
        </div>
      </div>

      <PurchaseHistoryTable
        paginatedRecords={paginatedRecords}
        appProducts={appProducts}
        currency={appSettings.currency}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        setCurrentPage={setCurrentPage}
        setPageSize={setPageSize}
        handleDeleteRecord={handleDeleteRecord}
      />
    </div>
  );
}
