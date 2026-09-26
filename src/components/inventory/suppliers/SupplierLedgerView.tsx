import React from 'react';
import { ChevronLeft, Wallet, TrendingUp, TrendingDown, Clock, Plus, FileText } from 'lucide-react';
import { formatCurrency } from '../../../lib/currencies';
import { SharedSearchBar } from '../../../shared/modules/search-and-list';
import { Button } from '../../../shared/ui';
import { TransactionList } from './TransactionList';
import { PaymentModal } from './PaymentModal';
import { BillModal } from './BillModal';
import { useSupplierLedger } from './useSupplierLedger';

interface SupplierLedgerProps {
  supplier: any;
  onBack: () => void;
  startDate?: Date;
  endDate?: Date;
  dateFilter?: string;
}

export function SupplierLedger({ supplier, onBack, startDate, endDate, dateFilter }: SupplierLedgerProps) {
  const {
    appSettings,
    balance,
    loading,
    searchTerm,
    setSearchTerm,
    showPaymentModal,
    setShowPaymentModal,
    showBillModal,
    setShowBillModal,
    formLoading,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentNote,
    setPaymentNote,
    billAmount,
    setBillAmount,
    billNote,
    setBillNote,
    isPaymentManualOverride,
    setIsPaymentManualOverride,
    isBillManualOverride,
    setIsBillManualOverride,
    stats,
    handleMakePayment,
    submitPayment,
    handleRecordBill,
    submitBill,
    handleDeleteTransaction,
    filteredLedger,
    page,
    totalPages,
    pageItems,
    goToPage,
    pageSize,
    setPageSize,
  } = useSupplierLedger({ supplier, startDate, endDate, dateFilter });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            onClick={onBack}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="h-8 px-2 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08] shrink-0"
          >
            <span className="text-[12px] font-medium hidden sm:inline">{"Back to Suppliers"}</span>
            <span className="text-[12px] font-medium sm:hidden">{"Back"}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecordBill}
            icon={<FileText className="h-3.5 w-3.5" />}
          >
            <span className="hidden sm:inline">{"Record Bill"}</span>
            <span className="sm:hidden">{"Bill"}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleMakePayment}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            <span className="hidden sm:inline">{"Record Payment"}</span>
            <span className="sm:hidden">{"Pay"}</span>
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] p-4 shadow-none">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-neutral-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center">
              <Wallet className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">
                {supplier.name}
              </h2>
              <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono mt-0.5">
                <span>{supplier.phone || "No phone"}</span>
                <span>•</span>
                <span>{supplier.paymentTerms || "Standard Terms"}</span>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 block">Outstanding Balance</span>
            <span className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${balance > 0 ? 'text-rose-500' : 'text-neutral-900 dark:text-white'}`}>
              {formatCurrency(balance, appSettings.currency)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06] rounded p-3">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              <span>Total Billed</span>
              <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
              {formatCurrency(stats.totalBilled, appSettings.currency)}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06] rounded p-3">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              <span>Total Paid</span>
              <TrendingDown className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(stats.totalPaid, appSettings.currency)}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06] rounded p-3">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              <span>Remaining Debt</span>
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-rose-500 mt-1">
              {formatCurrency(Math.abs(stats?.remaining || 0), appSettings.currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-380px)] flex flex-col justify-between">
        <div className="px-3.5 py-2.5 border-b border-neutral-200 dark:border-white/[0.06] flex items-center justify-between gap-4">
          <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
            Ledger History
          </span>
          <div className="w-full max-w-xs">
            <SharedSearchBar value={searchTerm} onChange={setSearchTerm} placeholder={"Filter transactions..."} />
          </div>
        </div>
        <TransactionList
          loading={loading}
          filteredLedger={filteredLedger}
          pageItems={pageItems}
          page={page}
          totalPages={totalPages}
          goToPage={goToPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          handleDeleteTransaction={handleDeleteTransaction}
          appSettings={appSettings}
        />
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        supplierName={supplier.name}
        balance={balance}
        appSettings={appSettings}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        isPaymentManualOverride={isPaymentManualOverride}
        setIsPaymentManualOverride={setIsPaymentManualOverride}
        submitPayment={submitPayment}
        formLoading={formLoading}
      />

      <BillModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        billAmount={billAmount}
        setBillAmount={setBillAmount}
        billNote={billNote}
        setBillNote={setBillNote}
        isBillManualOverride={isBillManualOverride}
        setIsBillManualOverride={setIsBillManualOverride}
        submitBill={submitBill}
        formLoading={formLoading}
      />
    </div>
  );
}
