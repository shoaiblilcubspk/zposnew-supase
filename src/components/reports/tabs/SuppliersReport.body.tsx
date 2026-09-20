import React, { Fragment } from 'react';
import { Building2, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { formatAppDate } from '../../../lib/dateUtils';
import { SharedSearchBar } from '../../../shared/modules/search-and-list';
import { Button, Pagination, usePagination } from '../../../shared/ui';
import { ExportButton } from '../../../shared/export';
import { useSuppliersReportData } from './SuppliersReport.data';
import { getSourceBadge } from './SuppliersReport.utils';

interface SuppliersReportProps {
  currency: string;
  country: string;
}

export function SuppliersReport({ currency, country }: SuppliersReportProps) {
  const {
    loading,
    expandedId,
    expandedLedger,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortDesc,
    setSortDesc,
    filteredRows,
    exportRows,
    totals,
    handleExpand,
  } = useSuppliersReportData();

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredRows, 15);

  const exportColumns = [
    { key: 'name', label: "Supplier" },
    { key: 'phone', label: "Phone" },
    { key: 'totalBilled', label: "Billed", format: 'currency' as const },
    { key: 'totalPaid', label: "Paid", format: 'currency' as const },
    { key: 'balance', label: "Balance", format: 'currency' as const },
    { key: 'transactionCount', label: "Transactions", format: 'number' as const },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-neutral-200/50 dark:bg-white/[0.03] rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total Billed</span>
            <Building2 className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totals.billed, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">{totals.count} suppliers</p>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total Paid</span>
            <Wallet className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(totals.paid, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">Disbursed</p>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Outstanding</span>
            <TrendingDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-rose-500">
            {formatCurrency(totals.outstanding, currency)}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">Payables balance</p>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Suppliers</span>
            <TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {totals.count}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">Registered vendors</p>
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
        <div className="flex-1">
          <SharedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={"Search suppliers..."}
          />
        </div>
        <ExportButton
          data={exportRows}
          columns={exportColumns}
          title={"Supplier Report"}
          filtersSummary={searchTerm ? `${"Search"}: ${searchTerm}` : undefined}
          currencySymbol={getCurrencySymbol(currency)}
          className="!min-h-0 !h-8 !px-3 !rounded !text-[11px] !bg-neutral-100 dark:!bg-white/[0.06] !text-neutral-700 dark:!text-neutral-300 !border-neutral-200 dark:!border-white/[0.08] hover:!bg-neutral-200 dark:hover:!bg-white/[0.1] shadow-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-360px)] flex flex-col justify-between">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.06] h-8">
                {[
                  { key: 'name' as const, label: "Supplier" },
                  { key: 'billed' as const, label: "Billed" },
                  { key: 'paid' as const, label: "Paid" },
                  { key: 'balance' as const, label: "Balance" },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => { setSortBy(col.key); setSortDesc(sortBy === col.key ? !sortDesc : true); }}
                    className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (sortDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                    </span>
                  </th>
                ))}
                <th className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-neutral-500 text-[12px]">No suppliers found</td>
                </tr>
              ) : (
                pageItems.map(row => (
                  <Fragment key={row.supplier.id}>
                    <tr className="h-9 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-3">
                        <span className="font-medium text-neutral-900 dark:text-white text-[13px]">{row.supplier.name}</span>
                        <span className="text-[11px] text-neutral-500 font-mono ml-2">{row.supplier.phone || '—'}</span>
                      </td>
                      <td className="px-3">
                        <span className="text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white">{formatCurrency(row.totalBilled, currency)}</span>
                      </td>
                      <td className="px-3">
                        <span className="text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white">{formatCurrency(row.totalPaid, currency)}</span>
                      </td>
                      <td className="px-3">
                        <span className={`text-[13px] font-mono tabular-nums font-semibold ${row.balance > 0 ? 'text-rose-500' : 'text-neutral-900 dark:text-white'}`}>
                          {formatCurrency(row.balance, currency)}
                        </span>
                      </td>
                      <td className="px-3 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleExpand(row.supplier.id)}
                          icon={expandedId === row.supplier.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          className="!min-h-0 !h-6 !px-2 !rounded !text-[10px] !bg-neutral-100 dark:!bg-white/[0.06] !text-neutral-600 dark:!text-neutral-400 hover:!text-neutral-900 dark:hover:!text-white"
                        />
                      </td>
                    </tr>
                    {expandedId === row.supplier.id && (
                      <tr key={`${row.supplier.id}-detail`}>
                        <td colSpan={5} className="px-3 py-2 bg-neutral-50/60 dark:bg-white/[0.01]">
                          <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                            {expandedLedger.length === 0 ? (
                              <p className="text-center text-neutral-500 text-[11px] py-3">No transactions recorded</p>
                            ) : (
                              expandedLedger.map((tx: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-surface rounded border border-neutral-200 dark:border-white/[0.06]">
                                  <div className="flex items-center gap-2">
                                    {getSourceBadge(tx.sourceType)}
                                    <div>
                                      <p className="text-[12px] font-medium text-neutral-900 dark:text-white">{tx.detail}</p>
                                      <p className="text-[10px] text-neutral-500 font-mono">{formatAppDate(tx.date, country)}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {tx.credit > 0 && <p className="text-[12px] font-mono tabular-nums font-semibold text-rose-500">+{formatCurrency(tx.credit, currency)}</p>}
                                    {tx.debit > 0 && <p className="text-[12px] font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">-{formatCurrency(tx.debit, currency)}</p>}
                                    {tx.isManualOverride && <span className="text-[8px] font-mono text-amber-500 uppercase">Override</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-neutral-100 dark:divide-white/[0.04] flex-1">
          {pageItems.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-[12px]">No suppliers found</div>
          ) : (
            pageItems.map(row => (
              <div key={row.supplier.id} className="p-3">
                <button onClick={() => handleExpand(row.supplier.id)} className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[13px] font-medium text-neutral-900 dark:text-white">{row.supplier.name}</p>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{row.supplier.phone || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[13px] font-mono tabular-nums font-bold ${row.balance > 0 ? 'text-rose-500' : 'text-neutral-900 dark:text-white'}`}>
                        {formatCurrency(row.balance, currency)}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-mono">Balance</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[11px] font-mono">
                    <span className="text-neutral-600 dark:text-neutral-400">Billed: {formatCurrency(row.totalBilled, currency)}</span>
                    <span className="text-neutral-600 dark:text-neutral-400">Paid: {formatCurrency(row.totalPaid, currency)}</span>
                  </div>
                </button>
                {expandedId === row.supplier.id && (
                  <div className="mt-2 space-y-1.5">
                    {expandedLedger.map((tx: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-white/[0.02] rounded">
                        <div className="flex items-center gap-2">
                          {getSourceBadge(tx.sourceType)}
                          <span className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">{tx.detail}</span>
                        </div>
                        <span className={`text-[11px] font-mono tabular-nums font-medium ${tx.credit > 0 ? 'text-rose-500' : 'text-neutral-900 dark:text-white'}`}>
                          {tx.credit > 0 ? `+${formatCurrency(tx.credit, currency)}` : `-${formatCurrency(tx.debit, currency)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pinned Pagination Footer */}
        <div className="px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-4 mt-auto">
          <p className="hidden sm:block text-[11px] text-neutral-500 font-mono">
            Showing {filteredRows.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredRows.length)} of ${filteredRows.length}`}
          </p>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={filteredRows.length}
              mode="numbered"
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      </div>
    </>
  );
}
