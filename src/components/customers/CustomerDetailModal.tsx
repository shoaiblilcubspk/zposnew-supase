import { useCustomersStore, useSalesStore, useSettingsStore } from '../../stores';
import { useState, useMemo } from 'react';
import { Phone, CreditCard, Receipt, MessageCircle, ChevronRight, User, TrendingUp } from 'lucide-react';
import { Customer, Sale } from '../../types';
import { formatCurrency } from '../../lib/currencies';
import { formatAppDateTime } from '../../lib/dateUtils';
import { Modal } from '../../shared/ui/Modal';
import { TransactionDetailModal } from '../transactions/TransactionDetailModal';
import { Badge, EmptyState, Pagination, usePagination } from '../../shared/ui';
import { getEffectiveTotal } from '../reports/useReportsData';
import { CustomerLedgerTab } from './CustomerLedgerTab';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { can } from '../../lib/permissions';
import { useUsersStore } from '../../stores';

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
}

export function CustomerDetailModal({ customer: initialCustomer, onClose }: CustomerDetailModalProps) {
  const appCustomers = useCustomersStore(s => s.customers);
  const appSales = useSalesStore(s => s.sales);
  const appSettings = useSettingsStore(s => s.settings);
  const currentUser = useUsersStore(s => s.currentUser);
  const userRole = currentUser?.role || 'cashier';
  const [activeTab, setActiveTab] = useState<'details' | 'transactions' | 'ledger'>('details');
  const [viewingTransaction, setViewingTransaction] = useState<Sale | null>(null);
  const [showReceivePayment, setShowReceivePayment] = useState(false);

  // Always read fresh customer from state
  const customer = useMemo(() =>
    appCustomers.find(c => c.id === initialCustomer.id) || initialCustomer,
    [appCustomers, initialCustomer]
  );

  const customerTransactions = useMemo(() => {
    return appSales
      .filter(sale => sale.customerId === customer.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [appSales, customer.id]);

  const totalTransactions = customerTransactions.length;
  const validTransactions = customerTransactions.filter(s => s.status !== 'deleted');
  const totalOrders = validTransactions.length;
  const totalSpent = customerTransactions.reduce((sum, sale) => sum + getEffectiveTotal(sale), 0);
  const averageTransaction = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const { page: paidPage, totalPages: paidTotalPages, pageItems: paidPageItems, goToPage: goToPaidPage, pageSize: paidPageSize, setPageSize: setPaidPageSize } = usePagination(customerTransactions, 10);

  const footer = (
    <div className="flex items-center gap-2 w-full font-mono text-[12px]">
      {can(userRole, 'receive_payment') && (
        <button
          type="button"
          onClick={() => setShowReceivePayment(true)}
          className="h-8 px-3 rounded bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-none"
        >
          <CreditCard className="h-3.5 w-3.5" /> Receive Payment
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="h-8 ml-auto px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-[12px] font-medium transition-colors"
      >
        Close
      </button>
    </div>
  );

  const tabs = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'transactions', label: `Sales (${totalTransactions})`, icon: Receipt },
    { id: 'ledger', label: `Ledger`, icon: TrendingUp },
  ];

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={customer.name} maxWidth="lg" footer={footer}>
        <div className="space-y-4 text-[13px] tracking-[-0.01em]">
          {/* Segmented Sub-Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 h-7 px-2.5 flex items-center justify-center gap-1.5 rounded text-[12px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-white/[0.1] text-neutral-900 dark:text-white shadow-none border border-neutral-200 dark:border-white/[0.1]'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-neutral-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Details Tab ── */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3 rounded-md shadow-none">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-0.5">Total Spent</p>
                  <p className="text-[15px] font-mono tabular-nums font-bold text-neutral-900 dark:text-white">{formatCurrency(totalSpent, appSettings.currency)}</p>
                </div>
                <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3 rounded-md shadow-none">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-0.5">Total Orders</p>
                  <p className="text-[15px] font-mono tabular-nums font-bold text-neutral-900 dark:text-white">{totalOrders}</p>
                </div>
                <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3 rounded-md shadow-none">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-0.5">Average Sale</p>
                  <p className="text-[15px] font-mono tabular-nums font-bold text-neutral-900 dark:text-white">{formatCurrency(averageTransaction, appSettings.currency)}</p>
                </div>
              </div>

              {/* Contact & Profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-[12px] font-semibold text-neutral-900 dark:text-white">Phone & WhatsApp</span>
                    </div>
                    {customer.phone && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}`, '_blank')}
                        className="h-6 px-2 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] font-mono text-neutral-900 dark:text-white">{customer.phone || 'No phone set'}</p>
                  <div className="pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-0.5">Address</span>
                    <p className="text-[12px] text-neutral-700 dark:text-neutral-300">{customer.address || 'No address set'}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] space-y-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-white/[0.08]">
                    <User className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[12px] font-semibold text-neutral-900 dark:text-white">Account Details</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-0.5">Email</span>
                    <p className="text-[13px] text-neutral-900 dark:text-white font-mono">{customer.email || 'No email set'}</p>
                  </div>
                  <div className="pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-0.5">Pricing Tier</span>
                    <span className="inline-block px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] text-[11px] font-mono uppercase text-neutral-700 dark:text-neutral-300">
                      {customer.priceTier || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Transactions Tab ── */}
          {activeTab === 'transactions' && (
            <div className="min-h-[300px] flex flex-col justify-between">
              {customerTransactions.length > 0 ? (
                <div className="flex-1 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {paidPageItems.map((tx) => (
                      <div key={tx.id} onClick={() => setViewingTransaction(tx)} className="p-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md space-y-1.5 cursor-pointer hover:border-neutral-300 dark:hover:border-white/[0.15] transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white uppercase">#{tx.invoiceNumber || tx.receiptNumber || 'N/A'}</p>
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{formatAppDateTime(tx.timestamp, appSettings.country)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <p className="text-[13px] font-mono font-semibold tabular-nums text-neutral-900 dark:text-white">{formatCurrency(tx.total, appSettings.currency)}</p>
                            <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Badge tone="info" size="sm">{tx.paymentMethod}</Badge>
                          <Badge tone="success" size="sm">{tx.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Receipt className="h-8 w-8 text-neutral-400 opacity-40" />}
                  title="No transactions yet"
                  className="!py-12"
                />
              )}
              <div className="pt-3 border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between mt-auto">
                <span className="text-[11px] font-mono text-neutral-500">
                  {customerTransactions.length} records
                </span>
                <Pagination
                  page={paidPage}
                  totalPages={paidTotalPages}
                  onPageChange={goToPaidPage}
                  totalItems={customerTransactions.length}
                  mode="numbered"
                  pageSize={paidPageSize}
                  onPageSizeChange={setPaidPageSize}
                />
              </div>
            </div>
          )}

          {/* Ledger Tab */}
          {activeTab === 'ledger' && (
            <CustomerLedgerTab customer={customer} />
          )}
        </div>
      </Modal>

      {viewingTransaction && (
        <TransactionDetailModal
          transaction={viewingTransaction}
          allTransactions={customerTransactions}
          onNavigate={setViewingTransaction}
          onClose={() => setViewingTransaction(null)}
          onReprint={() => {}}
          onBack={() => setViewingTransaction(null)}
        />
      )}

      {showReceivePayment && (
        <ReceivePaymentModal
          customer={customer}
          onClose={() => setShowReceivePayment(false)}
        />
      )}
    </>
  );

}
