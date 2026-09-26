import React, { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { Sale } from '../../../../types';
import { formatCurrency, getCurrencySymbol } from '../../../../lib/currencies';
import { formatAppDateTime } from '../../../../lib/dateUtils';
import { Pagination, usePagination } from '../../../../shared/ui';
import { ExportButton } from '../../../../shared/export';

interface Props {
  filteredSales: Sale[];
  currency: string;
  country: string;
  users: any[];
}

export function SalesHistoryTable({ filteredSales, currency, country }: Props) {
  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredSales, 25);

  const statusLabel = (s: any) => {
    if (s.status === 'completed') return "Completed";
    if (s.status === 'refunded') return "Refunded";
    if (s.status === 'partially_refunded') return "Partially Refunded";
    if (s.status === 'deleted') return "Deleted";
    if (s.status === 'pending' || s.notes?.includes('DRAFT_SALE')) return "Draft";
    return s.status;
  };

  const netTotal = (s: any) =>
    s.status === 'refunded' || s.status === 'deleted' ? 0 :
    s.status === 'partially_refunded' ? (Number(s.total) || 0) - (Number(s.refundedAmount) || 0) :
    (Number(s.total) || 0);

  const exportColumns = [
    { key: 'invoiceNumber', label: "Invoice Number" },
    { key: 'dateTime', label: "Date & Time" },
    { key: 'customer', label: "Customer" },
    { key: 'paymentMethod', label: "Payment Method" },
    { key: 'cashier', label: "Cashier" },
    { key: 'salesman', label: "Salesman" },
    { key: 'revenue', label: "Revenue", format: 'currency' as const },
    { key: 'status', label: "Status" },
  ];

  const exportRows = useMemo(() => filteredSales.map(sale => ({
    invoiceNumber: sale.invoiceNumber || '',
    dateTime: formatAppDateTime(sale.timestamp, country),
    customer: sale.customerName || "Walk-in Customer",
    paymentMethod: sale.paymentMethod,
    cashier: sale.cashier || 'System',
    salesman: sale.salesmanName || '',
    revenue: netTotal(sale),
    status: statusLabel(sale),
  })), [filteredSales, country]);

  return (
    <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md overflow-hidden shadow-none min-h-[calc(100vh-340px)] flex flex-col justify-between">
      <div className="px-3.5 py-2.5 border-b border-neutral-200 dark:border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
            Detailed Sales Ledger
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 dark:bg-white/[0.06] px-2 py-0.5 rounded border border-neutral-200 dark:border-white/[0.06]">
            {filteredSales.length} records
          </span>
          <ExportButton
            data={exportRows}
            columns={exportColumns}
            title={"Sales Report"}
            currencySymbol={getCurrencySymbol(currency)}
            className="!min-h-0 !h-7 !px-2.5 !rounded !text-[11px] !bg-neutral-100 dark:!bg-white/[0.06] !text-neutral-700 dark:!text-neutral-300 !border-neutral-200 dark:!border-white/[0.08] hover:!bg-neutral-200 dark:hover:!bg-white/[0.1] shadow-none"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.06] h-8">
              <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Invoice #</th>
              <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Date & Time</th>
              <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Customer</th>
              <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Cashier</th>
              <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Salesman</th>
              <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-right">Revenue</th>
              <th className="px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {filteredSales.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-500 text-[12px]">No transactions found for the selected period.</td></tr>
            ) : pageItems.map(sale => (
              <tr key={sale.id} className="h-9 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-3 font-mono font-medium text-neutral-900 dark:text-white text-[12px]">{sale.invoiceNumber}</td>
                <td className="px-3 text-[12px] text-neutral-600 dark:text-neutral-400 font-mono">{formatAppDateTime(sale.timestamp, country)}</td>
                <td className="px-3">
                  <span className="font-medium text-neutral-900 dark:text-white text-[13px]">{sale.customerName || "Walk-in Customer"}</span>
                  <span className="ml-1.5 text-[10px] uppercase font-mono text-neutral-400">{sale.paymentMethod}</span>
                </td>
                <td className="px-3 text-[12px] text-neutral-700 dark:text-neutral-300 font-medium">{sale.cashier}</td>
                <td className="px-3 text-[12px] text-neutral-700 dark:text-neutral-300">{sale.salesmanName || <span className="text-neutral-400 font-mono">—</span>}</td>
                <td className="px-3 font-mono tabular-nums font-semibold text-neutral-900 dark:text-white text-right text-[13px]">{formatCurrency(sale.total - (sale.refundedAmount || 0), currency)}</td>
                <td className="px-3 text-center">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                    sale.status === 'partially_refunded'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/[0.08]'
                  }`}>
                    {sale.status === 'partially_refunded' ? 'Partial' : 'Completed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-neutral-100 dark:divide-white/[0.04] flex-1">
        {filteredSales.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-500 text-[12px]">No transactions found</div>
        ) : pageItems.map(sale => (
          <div key={sale.id} className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[12px] font-mono font-bold text-neutral-900 dark:text-white">{sale.invoiceNumber}</p>
                <p className="text-[11px] text-neutral-500 font-mono">{formatAppDateTime(sale.timestamp, country)}</p>
              </div>
              <p className="text-[14px] font-mono tabular-nums font-bold text-neutral-900 dark:text-white">{formatCurrency(sale.total - (sale.refundedAmount || 0), currency)}</p>
            </div>
            <div className="flex justify-between items-center mt-2 text-[12px]">
              <span className="text-neutral-700 dark:text-neutral-300">{sale.customerName || "Walk-in"} • {sale.cashier}</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08]">
                {sale.paymentMethod}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-neutral-50/50 dark:bg-white/[0.01] border-t border-neutral-200 dark:border-white/[0.06] px-4 py-2 flex items-center justify-between mt-auto">
        <span className="hidden sm:inline text-[11px] text-neutral-500 font-mono">
          Showing {filteredSales.length > 0 ? ((page - 1) * pageSize) + 1 : 0}–{Math.min(page * pageSize, filteredSales.length)} of {filteredSales.length}
        </span>
        <div className="mx-auto sm:mx-0">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredSales.length}
            mode="numbered"
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
}
