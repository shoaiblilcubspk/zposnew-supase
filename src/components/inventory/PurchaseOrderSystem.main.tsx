import React from 'react';
import { PackageOpen, TrendingDown, Building2, Trash2, Filter, CheckCircle2 } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { Button, ToggleSwitch } from '../../shared/ui';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { usePurchaseOrder } from './usePurchaseOrder';

export function PurchaseOrderSystem() {
  const {
    appProducts,
    appSuppliers,
    appSettings,
    appCategories,
    isAdmin,
    poMode,
    setPoMode,
    selectedSupplier,
    setSelectedSupplier,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    isGenerated,
    setIsGenerated,
    activeList,
    totalItemsNeeded,
    estimatedCost,
    paginatedList,
    totalPages,
    searchQuery,
    setSearchQuery,
    batchSupplier,
    batchCategory,
    showScanner,
    setShowScanner,
    manualList,
    setManualList,
    setAutoOverrides,
    recordAsSupplierBill,
    setRecordAsSupplierBill,
    exportColumns,
    exportRows,
    handleGenerate,
    handleBulkAdmit,
    handleReset
  } = usePurchaseOrder();

  return (
    <div className="space-y-4">
      <div className="print-hide bg-white dark:bg-surface p-4 sm:p-5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <PackageOpen className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <div>
                <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">
                  Purchase Order Generation
                </h2>
                <p className="text-[11px] text-neutral-500 font-mono tracking-tight">
                  Auto-reorder &amp; restock requirements based on minimum inventory thresholds
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-neutral-100/80 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md w-full sm:w-fit">
              {[
                { id: 'auto', label: "Auto (Reorder Levels)" },
                { id: 'manual', label: "Manual Custom Order" }
              ].map(mode => {
                const isActive = poMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => { setPoMode(mode.id as any); setIsGenerated(false); }}
                    className={`h-7 px-3 rounded text-[12px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-white dark:bg-white/[0.1] text-neutral-900 dark:text-white shadow-none border border-neutral-200 dark:border-white/[0.1]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-transparent'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2 bg-neutral-50/50 dark:bg-white/[0.02] px-2.5 py-1.5 rounded border border-neutral-200 dark:border-white/[0.08] h-8">
              <Building2 className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-[140px]">
                <SearchableSelect
                  label={"SUPPLIER"}
                  options={[{ id: 'All', label: "All" }, ...appSuppliers.map(s => ({ id: s.name, label: s.name }))]}
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-neutral-50/50 dark:bg-white/[0.02] px-2.5 py-1.5 rounded border border-neutral-200 dark:border-white/[0.08] h-8">
              <Filter className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-[140px]">
                <SearchableSelect
                  label={"CATEGORY"}
                  options={[{ id: 'All', label: "All" }, ...appCategories.map(c => ({ id: c.name, label: c.name }))]}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                />
              </div>
            </div>

            <Button
              onClick={handleReset}
              variant="secondary"
              size="sm"
              className="h-8 text-[12px]"
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Reset
            </Button>

            <Button
              onClick={handleGenerate}
              variant="primary"
              size="sm"
              className="h-8 text-[12px]"
              icon={<TrendingDown className="h-3.5 w-3.5" />}
            >
              Preview PO
            </Button>
          </div>

          {isGenerated && activeList.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-200 dark:border-white/[0.08]">
              <Button
                onClick={handleBulkAdmit}
                variant="primary"
                size="sm"
                className="h-8 px-4 text-[12px]"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Commit &amp; Add to Stock
              </Button>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-neutral-200 dark:border-white/[0.08] bg-neutral-50/50 dark:bg-white/[0.02]">
                <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Supplier Bill</span>
                <ToggleSwitch
                  checked={recordAsSupplierBill}
                  onChange={setRecordAsSupplierBill}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <PurchaseOrderForm
        isGenerated={isGenerated}
        poMode={poMode}
        activeList={activeList}
        totalItemsNeeded={totalItemsNeeded}
        estimatedCost={estimatedCost}
        selectedSupplier={selectedSupplier}
        selectedCategory={selectedCategory}
        appSettings={appSettings}
        paginatedList={paginatedList}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isAdmin={isAdmin}
        appProducts={appProducts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        batchSupplier={batchSupplier}
        batchCategory={batchCategory}
        showScanner={showScanner}
        setShowScanner={setShowScanner}
        manualList={manualList}
        setManualList={setManualList}
        setAutoOverrides={setAutoOverrides}
        setIsGenerated={setIsGenerated}
        exportColumns={exportColumns}
        exportRows={exportRows}
      />

      <style>{`
        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          .print-hide { display: none !important; }
          #root { height: auto !important; overflow: auto !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
