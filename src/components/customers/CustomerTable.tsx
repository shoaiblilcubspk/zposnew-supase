import { User, Eye, MessageCircle, Edit, Trash2 } from 'lucide-react';
import { Customer } from '../../types';
import { formatAppDate } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/currencies';
import { Badge, Button, EmptyState, Pagination } from '../../shared/ui';

interface CustomerTableProps {
  filteredCustomers: Customer[];
  paginatedCustomers: Customer[];
  appSettings: any;
  canManageCustomers: boolean;
  currentPage: number;
  totalPages: number;
  ITEMS_PER_PAGE: number;
  setCurrentPage: (val: number | ((prev: number) => number)) => void;
  setPageSize: (val: number) => void;
  handleViewCustomer: (customer: Customer) => void;
  handleEditCustomer: (customer: Customer) => void;
  handleDeleteCustomer: (id: string) => void;
  handleWhatsAppRedirect: (phone: string) => void;
  getCustomerTotalPurchases: (id: string, total: number | undefined) => number;
}

export function CustomerTable({
  filteredCustomers,
  paginatedCustomers,
  appSettings,
  canManageCustomers,
  currentPage,
  totalPages,
  ITEMS_PER_PAGE,
  setCurrentPage,
  setPageSize,
  handleViewCustomer,
  handleEditCustomer,
  handleDeleteCustomer,
  handleWhatsAppRedirect,
  getCustomerTotalPurchases
}: CustomerTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-8 bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
              <th className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Customer"}</th>
              <th className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Contact"}</th>
              <th className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-right">{"Total Purchases"}</th>
              <th className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">{"Last Purchase"}</th>
              <th className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-right">{"Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <EmptyState
                    icon={<User className="h-8 w-8 text-neutral-400" />}
                    title={"No customers found"}
                    className="!p-0 opacity-60"
                  />
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((customer: Customer) => (
                <tr key={customer.id} className="h-11 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 bg-neutral-100 dark:bg-white/[0.06] rounded flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-neutral-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-white truncate leading-tight">{customer.name}</p>
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">#{customer.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5">
                    <p className="text-[12px] font-mono text-neutral-900 dark:text-white truncate max-w-[200px]">{customer.phone || 'No phone'}</p>
                    <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[200px]">{customer.email || '—'}</p>
                  </td>
                  <td className="px-3.5 text-right font-mono font-semibold text-neutral-900 dark:text-white text-[13px] tabular-nums">
                    {formatCurrency(getCustomerTotalPurchases(customer.id, customer.totalPurchases), appSettings.currency)}
                  </td>
                  <td className="px-3.5 text-center">
                    <Badge tone="neutral" size="sm">
                      {customer.lastPurchase ? formatAppDate(customer.lastPurchase, appSettings.country) : "NEVER"}
                    </Badge>
                  </td>
                  <td className="px-3.5 text-right">
                    <div className="flex justify-end items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCustomer(customer)}
                        aria-label="View customer"
                        className="!p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => customer.phone && handleWhatsAppRedirect(customer.phone)}
                        disabled={!customer.phone}
                        aria-label="Send WhatsApp message"
                        className="!p-1 text-neutral-500 hover:text-emerald-600 disabled:opacity-30"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                        aria-label="Edit customer"
                        className="!p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer.id)}
                        disabled={!canManageCustomers}
                        aria-label="Delete customer"
                        className="!p-1 text-neutral-500 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-3 flex-1">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={<User className="h-8 w-8 text-neutral-400 opacity-40" />}
            title={"No customers found"}
            className="!py-10"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {paginatedCustomers.map((customer: Customer) => (
              <div
                key={customer.id}
                onClick={() => handleViewCustomer(customer)}
                className="flex flex-col p-3 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none cursor-pointer hover:border-neutral-300 dark:hover:border-white/[0.15] transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 bg-neutral-100 dark:bg-white/[0.06] rounded flex items-center justify-center shrink-0">
                      <User className="h-3 w-3 text-neutral-500" />
                    </div>
                    <h3 className="font-medium text-neutral-900 dark:text-white text-[13px] truncate">
                      {customer.name}
                    </h3>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {customer.phone && (
                      <button
                        onClick={() => handleWhatsAppRedirect(customer.phone!)}
                        className="p-1 text-neutral-500 hover:text-emerald-600"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {canManageCustomers && (
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="p-1 text-neutral-500 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 font-mono mb-2">
                  {customer.phone || 'No phone'}
                </p>

                <div className="mt-auto pt-2 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between text-[12px]">
                  <span className="font-semibold font-mono tabular-nums text-neutral-900 dark:text-white">
                    {formatCurrency(getCustomerTotalPurchases(customer.id, customer.totalPurchases), appSettings.currency)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono uppercase">
                    {customer.lastPurchase ? formatAppDate(customer.lastPurchase, appSettings.country) : 'Never'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pinned Pagination Footer */}
      <div className="px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-4 mt-auto">
        <p className="hidden sm:block text-[11px] text-neutral-500 font-mono">
          Showing {filteredCustomers.length === 0 ? '0 of 0' : `${((currentPage - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of ${filteredCustomers.length}`}
        </p>
        <div className="mx-auto sm:mx-0">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredCustomers.length}
            onPageChange={setCurrentPage}
            siblingCount={1}
            pageSize={ITEMS_PER_PAGE}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </>
  );
}
