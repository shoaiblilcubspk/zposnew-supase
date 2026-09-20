import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Printer, Edit, Trash2, Hash, Package, UserCheck, Tag } from 'lucide-react';
import { formatAppDate, formatAppTime } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/currencies';
import { Sale } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCartStore, useCustomersStore, useSalesStore } from '../../stores';
import { salesService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { Badge, Button, Pagination } from '../../shared/ui';
import { getStatusTone } from './TransactionTable.utils';
import { TransactionTableMobile } from './TransactionTable.mobile';

interface TransactionTableProps {
  transactions: Sale[];
  filteredCount: number;
  isSearchingRemote: boolean;
  currency: string;
  country: string;
  canEditSale: boolean;
  canDeleteSale: boolean;
  onView: (sale: Sale) => void;
  onReprint: (sale: Sale) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export function TransactionTable({
  transactions,
  filteredCount,
  isSearchingRemote,
  currency,
  country,
  canEditSale,
  canDeleteSale,
  onView,
  onReprint,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: TransactionTableProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const appCustomers = useCustomersStore(s => s.customers);

  const getItemCount = (tx: Sale) => {
    return (tx.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  };

  const pageTotalItems = React.useMemo(() => {
    return transactions.reduce((sum, tx) => sum + getItemCount(tx), 0);
  }, [transactions]);

  const pageTotalRevenue = React.useMemo(() => {
    return transactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  }, [transactions]);

  const handleEditSale = async (tx: Sale) => {
    const res = await sonner.confirm('Edit Sale?', 'Load items and notes to cart for editing?', 'Yes');
    if (res.isConfirmed) {
      try {
        useCartStore.getState().clearCart();
        tx.items.forEach(item => useCartStore.getState().addToCart(item));
        useCartStore.getState().setNotes(tx.notes || '');
        useCartStore.getState().setEditingSaleId(tx.id);
        useCartStore.getState().setSalesmanId(tx.salesmanId || null);
        if (tx.customerId) {
          const customer = appCustomers.find(c => c.id === tx.customerId);
          if (customer) useCartStore.getState().setSelectedCustomer(customer);
        }
        sonner.success('Loaded to POS for editing.');
        navigate('/pos');
      } catch { sonner.error('Error.'); }
    }
  };
  const handleDeleteSale = async (tx: Sale) => {
    const isGhost = !tx.items || tx.items.length === 0 || !tx.total;
    const title = isGhost ? 'Delete Empty Record?' : 'Delete Sale?';
    const msg = isGhost ? 'Remove this empty/ghost row?' : 'Revert all records?';
    const res = await sonner.confirm(title, msg, 'Delete');
    if (res.isConfirmed) {
      try {
        await salesService.delete(tx.id, profile?.name || 'Admin');
        useSalesStore.getState().deleteSale(tx.id);
        sonner.success('Deleted.');
      } catch (err) {
        if (/APPROVAL_REQUIRED|FORBIDDEN/i.test(String((err as any)?.message))) {
          sonner.error('Admin approval required to delete a sale.');
        } else {
          sonner.error('Error.');
        }
      }
    }
  };
  return (
    <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none overflow-hidden sm:min-h-[calc(100vh-340px)] min-h-[260px] flex flex-col justify-between">
      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto flex-1">
        <table className="table w-full">
          <thead className="h-10 bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
            <tr>
              <th className="px-3.5 py-2.5 text-left text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">{"Receipt"}</th>
              <th className="px-3.5 py-2.5 text-left text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">{"Date"}</th>
              <th className="px-3.5 py-2.5 text-left text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">{"Customer"}</th>
              <th className="px-3.5 py-2.5 text-center text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">{"Items"}</th>
              <th className="px-3.5 py-2.5 text-left text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">{"Total"}</th>
              <th className="px-3.5 py-2.5 text-left text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">{"Status"}</th>
              <th className="px-3.5 py-2.5 text-right text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">{"Action"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-neutral-600 dark:text-neutral-300 text-[14px] font-mono font-medium">
                  {isSearchingRemote ? "Searching all records..." : "No sales found for this filter."}
                </td>
              </tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors border-b border-neutral-100 dark:border-white/[0.04] h-13">
                <td className="px-3.5 py-2.5">
                  <div className="text-[14px] font-mono font-bold text-neutral-900 dark:text-white">#{tx.invoiceNumber || tx.receiptNumber}</div>
                  {tx.dcNumber && (
                    <div className="flex items-center gap-1 mt-0.5 text-[12px] font-mono font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded w-fit">
                      <Hash className="w-3 h-3" /> DC: {tx.dcNumber}
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="text-[13.5px] font-mono font-bold text-neutral-900 dark:text-white">{formatAppDate(tx.timestamp, country)}</div>
                  <div className="text-[12px] text-neutral-600 dark:text-neutral-400 font-mono font-medium">{formatAppTime(tx.timestamp, country, false)}</div>
                </td>
                <td className="px-3.5 py-2.5 text-[13.5px] text-neutral-700 dark:text-neutral-300">
                  <div className="font-bold text-neutral-900 dark:text-white text-[14px] leading-tight">{tx.customerName || "Walk-in"}</div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {tx.cashier && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]" title={`Cashier: ${tx.cashier}`}>
                        <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[90px]">By {tx.cashier}</span>
                      </span>
                    )}
                    {tx.salesmanName && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40" title={`Salesman: ${tx.salesmanName}`}>
                        <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[90px]">SM: {tx.salesmanName}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3.5 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[13.5px] text-neutral-900 dark:text-white tabular-nums bg-neutral-100 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-md border border-neutral-200 dark:border-white/[0.08]">
                    <Package className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                    {getItemCount(tx)}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-[14.5px] sm:text-[15px] font-mono font-black text-neutral-900 dark:text-white tabular-nums">
                  <div>{formatCurrency(tx.total, currency)}</div>
                  {tx.refundedAmount > 0 && (
                    <div className="text-[12px] font-mono font-bold text-rose-500 mt-0.5">
                      -{formatCurrency(tx.refundedAmount, currency)} {tx.status === 'partially_refunded' ? 'Refunded' : ''}
                    </div>
                  )}
                  {tx.paymentMethod && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase tracking-tight ${
                        tx.paymentMethod === 'cash'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                          : tx.paymentMethod === 'credit'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40'
                      }`}>
                        {tx.paymentMethod}
                      </span>
                      {((tx.deliveryFee != null && Number(tx.deliveryFee) > 0) || (tx.extraCharges && tx.extraCharges.some((c: any) => Number(c.amount) > 0))) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-tight bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40" title="Includes Delivery Charges (DC)">
                          + DC
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-2.5">
                  <Badge tone={getStatusTone(tx.status)} size="md">
                    {tx.status || 'Ghost / Empty'}
                  </Badge>
                </td>
                <td className="px-3.5 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onView(tx)} className="!p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white" title="View Detail"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onReprint(tx)} className="!p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white" title="Quick Print"><Printer className="h-4 w-4" /></Button>
                    {canEditSale && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => { e.stopPropagation(); await handleEditSale(tx); }}
                        className="!p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-amber-600"
                        title="Edit Sale"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteSale && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => { e.stopPropagation(); await handleDeleteSale(tx); }}
                        className="!p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-rose-600"
                        title="Delete Permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {transactions.length > 0 && (
            <tfoot className="bg-neutral-50 dark:bg-white/[0.03] border-t-2 border-neutral-300 dark:border-white/[0.12]">
              <tr className="h-12">
                <td className="px-3.5 py-2.5 font-bold text-neutral-900 dark:text-white">
                  <div className="flex items-center gap-1.5 font-mono text-[13px] uppercase tracking-wider">
                    <span>Total:</span>
                    <span className="font-bold text-primary">{transactions.length} Sales</span>
                  </div>
                </td>
                <td className="px-3.5 py-2.5"></td>
                <td className="px-3.5 py-2.5"></td>
                <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[14.5px] text-neutral-900 dark:text-white tabular-nums">
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    <span>{pageTotalItems} Items</span>
                  </div>
                </td>
                <td className="px-3.5 py-2.5 font-mono font-black text-[15.5px] text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrency(pageTotalRevenue, currency)}
                </td>
                <td className="px-3.5 py-2.5"></td>
                <td className="px-3.5 py-2.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {/* Mobile View */}
      <TransactionTableMobile
        transactions={transactions}
        isSearchingRemote={isSearchingRemote}
        currency={currency}
        canEditSale={canEditSale}
        canDeleteSale={canDeleteSale}
        onView={onView}
        onReprint={onReprint}
        onEditSale={handleEditSale}
        onDeleteSale={handleDeleteSale}
        getItemCount={getItemCount}
        pageTotalItems={pageTotalItems}
        pageTotalRevenue={pageTotalRevenue}
      />
      {/* Pinned Pagination */}
      <div className="px-3 py-2.5 sm:py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between mt-auto">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={filteredCount}
          mode="prevNext"
          className="w-full"
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
