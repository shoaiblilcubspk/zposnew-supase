import { useAppStore, useCustomersStore, useProductsStore, useSalesStore, useSettingsStore, useUsersStore } from '../../stores';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, Edit, UserCheck, Tag } from 'lucide-react';
import { formatAppDate } from '../../lib/dateUtils';
import { formatCurrency } from '../../lib/currencies';
import { Sale } from '../../types';
import { sonner } from '../../lib/sonner';
import { Modal } from '../../shared/ui/Modal';
import { Badge } from '../../shared/ui';
import RefundSaleModal from './RefundSaleModal';
import { SupervisorPinModal } from './SupervisorPinModal';
import { TransactionItemsTable } from './TransactionItemsTable';
import { TransactionSummary } from './TransactionSummary';
import { useTransactionDetailActions } from './TransactionDetailModal.actions';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { getSaleById } from '../../lib/services/sales/salesRepository';

import { TransactionDetailFooter } from './TransactionDetailModal.footer';

interface TransactionDetailModalProps {
  transaction: Sale;
  allTransactions: Sale[];
  onNavigate: (sale: Sale) => void;
  onClose: () => void;
  onReprint: (sale: Sale) => void;
  onBack?: () => void;
}

export function TransactionDetailModal({ transaction, allTransactions, onNavigate, onClose, onReprint, onBack }: TransactionDetailModalProps) {
  const detailNavigate = useNavigate();
  const appSettings = useSettingsStore(s => s.settings);
  const appSales = useSalesStore(s => s.sales);
  const appCustomers = useCustomersStore(s => s.customers);
  const appBundles = useAppStore(s => s.bundles);
  const appProducts = useProductsStore(s => s.products);
  const appUsers = useUsersStore(s => s.users);
  const { profile: userProfile } = useAuth();
  // RBAC matrix: refund = admin|manager|cashier(limited); edit/delete = admin|manager
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager';
  const canRefund = can(userProfile?.role, 'refund_sale');
  const profile = {
    canEditSale: !!userProfile?.canEditSale,
    canDeleteSale: !!userProfile?.canDeleteSale,
  };

  const [currentSale, setCurrentSale] = useState<Sale>(transaction);

  React.useEffect(() => {
    setCurrentSale(transaction);
    if (!transaction.items || transaction.items.length === 0) {
      getSaleById(transaction.id).then(full => {
        if (full && full.items && full.items.length > 0) {
          setCurrentSale(full);
        }
      });
    }
  }, [transaction]);

  const showDiscount = appSettings.receiptShowDiscount !== false &&
    !(currentSale.items || []).some((item: any) => item.bundleHideItemPrices === true || item.bundle_hide_item_prices === true);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const {
    isProcessingAction,
    handleEditSale,
    executeRefund,
    handleWhatsAppShare,
    handleDeleteSale,
    sourceTag,
    supervisorGate,
    isVerifyingSupervisor,
    retryWithSupervisor,
    clearSupervisorGate,
  } = useTransactionDetailActions({
    transaction: currentSale,
    appCustomers,
    appSales,
    onClose,
    onNavigate,
    detailNavigate,
    setIsRefundModalOpen,
    profile,
    currency: appSettings.currency,
  });

  const handleRefundSale = () => {
    if (!canRefund) {
      sonner.error('You do not have permission to refund sales.');
      return;
    }
    if (transaction.total < 0) {
      sonner.error('Cannot refund a return receipt.');
      return;
    }
    if (transaction.status === 'refunded') {
      sonner.error('Sale is already fully refunded.');
      return;
    }
    setIsRefundModalOpen(true);
  };

  const editFromInvoice = transaction.editedFromInvoice ?? null;
  const oldSale = editFromInvoice ? (appSales || []).find(s => s.invoiceNumber === editFromInvoice) ?? null : null;
  const replacedSale = !editFromInvoice ? (appSales || []).find(s => s.editedFromInvoice === transaction.invoiceNumber) ?? null : null;

  const currentIndex = allTransactions.findIndex(tx => tx.id === transaction.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allTransactions.length - 1;

  const handlePrev = () => hasPrev && onNavigate(allTransactions[currentIndex - 1]);
  const handleNext = () => hasNext && onNavigate(allTransactions[currentIndex + 1]);

  const invoiceDisplay = (transaction.invoiceNumber || transaction.receiptNumber || 'N/A').replace(/^undefined-/i, 'INV-');

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={"Sale Breakdown"}
        showClose={true}
        maxWidth="lg"
        footer={
          <TransactionDetailFooter
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={handlePrev}
            onNext={handleNext}
            profile={profile}
            canRefund={canRefund}
            isProcessingAction={isProcessingAction}
            isRefunded={transaction.status === 'refunded'}
            onDelete={handleDeleteSale}
            onEdit={handleEditSale}
            onRefund={handleRefundSale}
            onWhatsApp={handleWhatsAppShare}
            onReprint={() => onReprint(transaction)}
          />
        }
      >
        <div className="space-y-3.5 text-[13px] tracking-[-0.01em]">
          {(onBack || transaction.saleType) && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="h-7 px-2.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-neutral-100 dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/[0.08] text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back to Customer</span>
                </button>
              )}
              <Badge tone={sourceTag.tone} size="sm" className="ml-auto font-mono">
                {sourceTag.label}
              </Badge>
            </div>
          )}

          {transaction.status === 'refunded' && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-2.5 rounded text-[12px] font-mono text-center flex items-center justify-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 shrink-0" /> <span>This sale is fully refunded</span>
            </div>
          )}
          {transaction.status === 'partially_refunded' && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded text-[12px] font-mono text-center flex items-center justify-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 shrink-0" /> <span>This sale is partially refunded</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-neutral-50 dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none font-mono">
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Receipt</p>
              <p className="text-[13px] font-bold text-neutral-900 dark:text-white uppercase truncate mt-0.5">#{invoiceDisplay}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Date & Time</p>
              <p className="text-[12.5px] font-medium text-neutral-900 dark:text-white uppercase mt-0.5 truncate">{formatAppDate(currentSale.timestamp, appSettings.country)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Customer</p>
              <p className="text-[13px] font-sans font-semibold text-neutral-900 dark:text-white truncate mt-0.5">{currentSale.customerName || "Walk-in"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Payment Mode</p>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <Badge tone={currentSale.paymentMethod === 'cash' ? 'emerald' : currentSale.paymentMethod === 'credit' ? 'amber' : 'neutral'} size="sm">
                  {currentSale.paymentMethod === 'split' ? 'SPLIT' : (currentSale.paymentMethod?.toUpperCase() || 'CASH')}
                </Badge>
                {((currentSale.deliveryFee != null && Number(currentSale.deliveryFee) > 0) || (currentSale.extraCharges && currentSale.extraCharges.some((c: any) => Number(c.amount) > 0))) && (
                  <span className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase tracking-tight bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40" title="Includes Delivery Charges (DC)">
                    + DC
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Cashier</p>
              <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] font-medium truncate max-w-full">
                <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{currentSale.cashier || 'System'}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Salesman</p>
              {(() => {
                const smName = currentSale.salesmanName || (currentSale.salesmanId ? appUsers.find(u => u.id === currentSale.salesmanId)?.name : null);
                return (
                  <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-semibold truncate max-w-full">
                    <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{smName || 'None'}</span>
                  </div>
                );
              })()}
            </div>
            {currentSale.dcNumber && (
              <div className="col-span-full pt-1 border-t border-dashed border-neutral-200 dark:border-white/[0.08]">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">DC Number: <span className="text-[12.5px] font-bold text-neutral-900 dark:text-white">#{currentSale.dcNumber}</span></p>
              </div>
            )}
          </div>

          {editFromInvoice && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] text-[12px] font-mono">
              <Edit className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              {oldSale ? (
                <button type="button" onClick={() => onNavigate(oldSale)} className="text-neutral-800 dark:text-neutral-200 hover:underline font-medium">
                  {"Edited from"} #{editFromInvoice}
                </button>
              ) : (
                <span className="text-neutral-600 dark:text-neutral-400">{"Edited from"} #{editFromInvoice}</span>
              )}
            </div>
          )}
          {!editFromInvoice && replacedSale && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] text-[12px] font-mono">
              <Edit className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <button type="button" onClick={() => onNavigate(replacedSale)} className="text-neutral-800 dark:text-neutral-200 hover:underline font-medium">
                {"This bill was edited →"} #{replacedSale.invoiceNumber}
              </button>
            </div>
          )}

          <TransactionItemsTable
            items={currentSale.items || []}
            appBundles={appBundles}
            appProducts={appProducts}
            appSettings={appSettings}
            showDiscount={showDiscount}
            isAdmin={isAdmin}
            profile={profile}
            transactionId={currentSale.id}
            onNavigateToProduct={(productId, fromSale) => {
              detailNavigate('/inventory/products', { state: { productId, fromSale } });
              onClose();
            }}
          />

          <TransactionSummary
            transaction={currentSale}
            appSettings={appSettings}
            showDiscount={showDiscount}
          />
        </div>
      </Modal>

      {isRefundModalOpen && (
        <RefundSaleModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          sale={transaction}
          onConfirmRefund={executeRefund}
          isProcessing={isProcessingAction}
        />
      )}

      <SupervisorPinModal
        isOpen={!!supervisorGate}
        title={supervisorGate?.action === 'delete' ? 'Admin Approval — Delete Sale' : 'Admin Approval — Refund'}
        description={
          supervisorGate?.action === 'delete'
            ? 'Sale reverse/delete sirf admin approve kar sakta hai. Admin credentials enter karein.'
            : `Ye refund admin threshold se zyada hai. Admin approval zaroori hai. Amount: ${formatCurrency(transaction.total - (transaction.refundedAmount || 0), appSettings.currency)}`
        }
        isProcessing={isVerifyingSupervisor || isProcessingAction}
        onSubmit={retryWithSupervisor}
        onClose={clearSupervisorGate}
      />
    </>
  );
}
