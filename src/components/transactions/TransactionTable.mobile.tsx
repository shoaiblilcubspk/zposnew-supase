import { Eye, Printer, Edit, Trash2, Package, UserCheck, Tag } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { Sale } from '../../types';
import { Badge } from '../../shared/ui';
import { getStatusTone } from './TransactionTable.utils';

interface TransactionTableMobileProps {
  transactions: Sale[];
  isSearchingRemote: boolean;
  currency: string;
  canEditSale: boolean;
  canDeleteSale: boolean;
  onView: (sale: Sale) => void;
  onReprint: (sale: Sale) => void;
  onEditSale: (sale: Sale) => Promise<void>;
  onDeleteSale: (sale: Sale) => Promise<void>;
  getItemCount: (tx: Sale) => number;
  pageTotalItems: number;
  pageTotalRevenue: number;
}

export function TransactionTableMobile({
  transactions,
  isSearchingRemote,
  currency,
  canEditSale,
  canDeleteSale,
  onView,
  onReprint,
  onEditSale,
  onDeleteSale,
  getItemCount,
  pageTotalItems,
  pageTotalRevenue,
}: TransactionTableMobileProps) {
  return (
    <div className="lg:hidden p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 flex-1">
      {transactions.length === 0 ? (
        <div className="col-span-full py-12 text-center text-neutral-500 text-[12px] font-mono">
          {isSearchingRemote ? 'Searching all records...' : 'No sales found for this filter.'}
        </div>
      ) : (
        <>
          {transactions.map((tx) => (
            <div
              key={tx.id}
              onClick={() => onView(tx)}
              className="p-3.5 rounded-xl bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none cursor-pointer hover:border-neutral-300 dark:hover:border-white/[0.15] transition-colors"
            >
              <div className="flex justify-between items-start gap-1 mb-1">
                <p className="text-[13px] font-mono font-bold text-neutral-900 dark:text-white uppercase">
                  #{tx.invoiceNumber || tx.receiptNumber}
                </p>
                <div className="flex items-center gap-1.5">
                  {tx.paymentMethod && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-tight ${
                      tx.paymentMethod === 'cash'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                        : tx.paymentMethod === 'credit'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40'
                    }`}>
                      {tx.paymentMethod}
                    </span>
                  )}
                  {((tx.deliveryFee != null && Number(tx.deliveryFee) > 0) || (tx.extraCharges && tx.extraCharges.some((c: any) => Number(c.amount) > 0))) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-tight bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40">
                      + DC
                    </span>
                  )}
                  {tx.status !== 'completed' && (
                    <Badge tone={getStatusTone(tx.status)} size="sm">
                      {tx.status}
                    </Badge>
                  )}
                </div>
              </div>
              <h3 className="text-[14px] font-bold text-neutral-900 dark:text-white truncate mb-1">
                {tx.customerName || 'Walk-in'}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {tx.cashier && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]" title={`Cashier: ${tx.cashier}`}>
                    <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[100px]">By {tx.cashier}</span>
                  </span>
                )}
                {tx.salesmanName && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40" title={`Salesman: ${tx.salesmanName}`}>
                    <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[100px]">SM: {tx.salesmanName}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-dashed border-neutral-200 dark:border-white/[0.08]">
                <div className="flex items-center gap-1 font-mono font-bold text-[12.5px] text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-white/[0.06] px-2 py-0.5 rounded border border-neutral-200 dark:border-white/[0.08]">
                  <Package className="w-3.5 h-3.5 text-neutral-500" />
                  <span>
                    {getItemCount(tx)} {getItemCount(tx) === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`text-[15px] font-mono font-black text-neutral-900 dark:text-white tabular-nums ${
                      tx.refundedAmount > 0 ? 'line-through text-neutral-500 text-[12px]' : ''
                    }`}
                  >
                    {formatCurrency(tx.total, currency)}
                  </span>
                  {tx.refundedAmount > 0 && (
                    <span className="text-[13px] font-mono font-bold text-rose-500 leading-none mt-0.5">
                      {formatCurrency(tx.total - tx.refundedAmount, currency)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(tx);
                  }}
                  className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReprint(tx);
                  }}
                  className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                  title="Print"
                >
                  <Printer className="h-4 w-4" />
                </button>
                {canEditSale && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onEditSale(tx);
                    }}
                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-amber-600"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {canDeleteSale && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onDeleteSale(tx);
                    }}
                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="col-span-full p-3 rounded-xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-between font-mono">
            <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200">
              Total ({transactions.length} sales):
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-primary flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> {pageTotalItems} Items
              </span>
              <span className="text-[15px] font-black text-neutral-900 dark:text-white">
                {formatCurrency(pageTotalRevenue, currency)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
