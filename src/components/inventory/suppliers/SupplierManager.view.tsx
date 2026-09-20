import { Plus, Edit, Trash2, Phone, Mail, MapPin, Briefcase, Wallet, ArrowRight, User, Truck, CreditCard, Receipt, ChevronLeft } from 'lucide-react';
import { SharedSearchBar } from '../../../shared/modules/search-and-list';
import { formatCurrency } from '../../../lib/currencies';
import { SupplierLedger } from './SupplierLedger';
import { SupplierModal } from './SupplierModal';
import { Button, EmptyState, DateRangePicker, Pagination } from '../../../shared/ui';
import { useSupplierManagerLogic } from './useSupplierManagerLogic';

export function SupplierManager() {
  const {
    appSuppliers,
    appSettings,
    isAdmin,
    canManage,
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    startDateInput,
    setStartDateInput,
    endDateInput,
    setEndDateInput,
    selectedSupplierId,
    setSelectedSupplierId,
    totalRemaining,
    isModalOpen,
    setIsModalOpen,
    editingSupplier,
    activeSuppliers,
    filteredSuppliers,
    page,
    totalPages,
    pageItems,
    goToPage,
    pageSize,
    setPageSize,
    handleAddEdit,
    handleSaveSupplier,
    handleDelete,
    validStartDate,
    validEndDate,
  } = useSupplierManagerLogic();

  const selectedSupplier = selectedSupplierId
    ? appSuppliers.find(s => s.id === selectedSupplierId) ?? null
    : null;

  return (
    <>
      {/* ─── Supplier Ledger (stays mounted across syncs) ─── */}
      {selectedSupplierId && selectedSupplier && (
        <SupplierLedger
          supplier={selectedSupplier}
          onBack={() => setSelectedSupplierId(null)}
          startDate={validStartDate}
          endDate={validEndDate}
          dateFilter={dateFilter}
        />
      )}

      {/* ─── Supplier List (hidden when ledger is open) ─── */}
      {!selectedSupplierId && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-4 max-w-[1400px] mx-auto">
      {/* Layer 1: Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="h-8 px-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08] shrink-0"
          >
            <span className="hidden sm:inline text-[12px] font-medium">POS</span>
          </Button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Truck className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight truncate">
                Suppliers
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5">
                {appSuppliers.length} vendor partners
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleAddEdit()}
          icon={<Plus className="h-3.5 w-3.5" />}
          className="shrink-0 h-8 !px-2.5 sm:!px-3 !text-[11px] sm:!text-[12px]"
        >
          <span>{"Add Supplier"}</span>
        </Button>
      </div>

      {/* Layer 2: Filter Toolbar */}
      <div className="relative z-30 bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <SharedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={"Search partners..."}
            />
          </div>

          <div className="w-full sm:w-auto min-w-0 shrink-0">
            <DateRangePicker
              preset={dateFilter}
              presets={[
                { id: 'all', label: "ALL TIME" },
                { id: 'today', label: "TODAY" },
                { id: 'yesterday', label: "YESTERDAY" },
                { id: 'last7', label: "LAST 7 DAYS" },
                { id: 'thisMonth', label: "THIS MONTH" },
                { id: 'lastMonth', label: "PREVIOUS MONTH" },
                { id: 'custom', label: "CUSTOM RANGE" }
              ]}
              onPresetChange={setDateFilter}
              startDate={startDateInput}
              endDate={endDateInput}
              onStartDateChange={setStartDateInput}
              onEndDateChange={setEndDateInput}
              label={"RANGE"}
              icon={Receipt}
            />
          </div>
        </div>
      </div>

      {/* Layer 3: Flat Linear Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Active Partners
            </span>
            <Truck className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
            {activeSuppliers}
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Payables
            </span>
            <Briefcase className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className={`text-xl sm:text-2xl font-bold tracking-tight font-mono tabular-nums ${totalRemaining > 0 ? 'text-rose-500' : 'text-primary'}`}>
              {formatCurrency(totalRemaining, appSettings.currency)}
            </span>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
              {totalRemaining > 0 ? "Outstanding Debt" : "Clear Balance"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid View (Pinned Height for Pagination) */}
      <div className="min-h-[calc(100vh-320px)] flex flex-col justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-2 flex-1">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] p-12 text-center text-neutral-500">
              <EmptyState
                icon={<Briefcase className="h-8 w-8 text-neutral-400 mx-auto mb-2" />}
                title={"No partners found"}
              />
            </div>
          ) : (
            pageItems.map((supplier) => (
              <div key={supplier.id} className="bg-white dark:bg-surface p-3.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 bg-neutral-100 dark:bg-white/[0.06] rounded flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white leading-none truncate max-w-[150px]">{supplier.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono uppercase text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded">
                          {supplier.businessType || "Partner"}
                        </span>
                        {typeof supplier.rating === 'number' && supplier.rating > 0 && (
                          <span className="text-[10px] font-medium text-amber-500">
                            {'★'.repeat(supplier.rating)}{'☆'.repeat(5 - supplier.rating)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleAddEdit(supplier)} className="!p-1">
                        <Edit className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier.id, supplier.name)} className="!p-1">
                          <Trash2 className="h-3.5 w-3.5 text-rose-500 hover:text-rose-600" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-1.5 py-2.5 border-y border-neutral-100 dark:border-white/[0.04] mb-3 text-[12px] text-neutral-600 dark:text-neutral-400">
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
                      <span className="font-mono">{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-neutral-400 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
                    <span className="truncate">{supplier.address || "Address not set"}</span>
                  </div>
                  {supplier.paymentTerms && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3 w-3 text-neutral-400 shrink-0" />
                      <span className="truncate font-mono">{supplier.paymentTerms}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className="mt-auto justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{"View Ledger"}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Pinned Pagination Footer */}
        <div className="px-3 py-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md flex items-center justify-between gap-4 mt-auto">
          <p className="hidden sm:block text-[11px] text-neutral-500 font-mono">
            Showing {filteredSuppliers.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredSuppliers.length)} of ${filteredSuppliers.length}`}
          </p>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={filteredSuppliers.length}
              mode="numbered"
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      </div>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSupplier}
        supplier={editingSupplier}
      />
    </div>
  )} {/* end !selectedSupplierId list */}
</>
  );
}
