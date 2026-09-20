import React from 'react';
import { Check, Keyboard } from 'lucide-react';
import { Sale } from '../../../types';
import { KOTPrint } from '../KOTPrint';
import { ReceiptPrint } from '../ReceiptPrint';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { ShortcutsModal } from '../ShortcutsModal';
import { PaymentForm } from './PaymentForm';
import { OrderSummary } from './OrderSummary';
import { useCheckoutData } from './useCheckoutData';
import { formatCurrency } from '../../../lib/currencies';
import { CheckoutPinVerifyModal } from './CheckoutPinVerifyModal';

interface CheckoutPageProps {
  onClose: () => void;
  onComplete: (sale: Sale) => void;
}

export function CheckoutPage({ onClose, onComplete }: CheckoutPageProps) {
  const {
    appSettings, paymentMethod, handleSelectMethod, amountPaid, setAmountPaid,
    splitMethodA, setSplitMethodA, splitMethodB, setSplitMethodB,
    splitAmountA, setSplitAmountA, splitAmountB, setSplitAmountB,
    finalTotal, change, quickAmounts, extraCharges, setExtraCharges,
    saleType, setSaleType, saleTypes, payMethods, salesmanId, setSalesmanId,
    appUsers, appSalesmen, saleNotes, setSaleNotes, appActiveSalesTab,
    checkoutCartItems, appBundles, showDiscount, subtotal, totalDiscount,
    taxAmount, totalQty, showReceipt, completedSale, setShowReceipt,
    setCompletedSale, isShortcutsModalOpen, setIsShortcutsModalOpen,
    handlePayment, initiatePayment, isPinVerifyOpen, setIsPinVerifyOpen, profile,
    canProcessPayment, isProcessing,
    appSelectedCustomer, appCustomers, handleSelectCustomer, isCreditAllowed,
  } = useCheckoutData(onClose, onComplete);

  if (showReceipt && completedSale) {
    return (
      <>
        <ReceiptPrint
          sale={completedSale}
          onClose={() => { setShowReceipt(false); setCompletedSale(null); onClose(); }}
        />
        {appSettings.enableKotPrinter && <KOTPrint sale={completedSale} />}
      </>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
      <button
        onClick={() => setIsShortcutsModalOpen(true)}
        className="h-8 px-2.5 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200 dark:border-white/[0.08] hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
        title={"Shortcuts Guide"}
      >
        <Keyboard className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline text-[12px] font-medium leading-none">{"Shortcuts"}</span>
      </button>

      <Button
        onClick={initiatePayment}
        disabled={!canProcessPayment() || isProcessing}
        loading={isProcessing}
        icon={<Check className="h-3.5 w-3.5 shrink-0" />}
        className="md:hidden !h-8 !px-3 !text-[12px]"
      >
        <span className="truncate">{"SAVE"}</span>
      </Button>

      <div className="hidden sm:flex flex-col items-end">
        <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider leading-none">{"Net Total"}</p>
        <p className="text-base sm:text-lg font-mono font-semibold text-primary dark:text-emerald-400 tabular-nums leading-tight mt-0.5">{formatCurrency(finalTotal, appSettings.currency)}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col w-full gap-2">
      <div
        onClick={() => setIsShortcutsModalOpen(true)}
        className="hidden sm:flex items-center justify-center gap-3 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
        title={"Click to open shortcuts guide"}
      >
        {[
          { key: '1', label: 'Cash' },
          { key: '2', label: 'Card' },
          { key: '3', label: 'Online' },
          { key: '5', label: 'Split' },
          { key: 'E', label: 'Exact Amt' },
          { key: 'Enter', label: 'Pay' },
          { key: 'Esc', label: 'Cancel' },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/10 border border-neutral-200 dark:border-white/10 text-[10px] font-mono font-bold text-neutral-700 dark:text-neutral-300 shadow-sm leading-none">
              {key}
            </kbd>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
          </span>
        ))}
      </div>
      <div className="flex w-full items-center gap-2 sm:gap-3">
        <button onClick={onClose} disabled={isProcessing}
          className="px-5 py-2.5 h-[40px] rounded-full border border-rose-500/20 text-[#ff4b6e] hover:bg-rose-500/10 text-[11px] font-bold uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center shrink-0">
          {"Cancel"}
        </button>
        <Button 
          onClick={initiatePayment} 
          disabled={!canProcessPayment() || isProcessing}
          loading={isProcessing}
          icon={<Check className="h-4 w-4 sm:h-5 sm:w-5" />}
          className="flex-1 !rounded-full !h-[40px] !py-2.5 !text-[12px] font-bold uppercase tracking-wider active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:grayscale transition-all"
        >
          <span>{"Process Payment"}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={"Settlement"}
      subtitle={"Finalization"}
      maxWidth="lg"
      headerActions={headerActions}
      footer={footer}
    >
      <div className="flex flex-col md:grid md:grid-cols-2 md:divide-x divide-gray-100 dark:divide-white/5 min-h-full">
        <PaymentForm
          appSettings={appSettings}
          paymentMethod={paymentMethod}
          handleSelectMethod={handleSelectMethod}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          splitMethodA={splitMethodA}
          setSplitMethodA={setSplitMethodA}
          splitMethodB={splitMethodB}
          setSplitMethodB={setSplitMethodB}
          splitAmountA={splitAmountA}
          setSplitAmountA={setSplitAmountA}
          splitAmountB={splitAmountB}
          setSplitAmountB={setSplitAmountB}
          finalTotal={finalTotal}
          change={change}
          totalQty={totalQty}
          quickAmounts={quickAmounts}
          extraCharges={extraCharges}
          setExtraCharges={setExtraCharges}
          saleType={saleType}
          setSaleType={setSaleType}
          saleTypes={saleTypes}
          payMethods={payMethods}
          salesmanId={salesmanId}
          setSalesmanId={setSalesmanId}
          appUsers={appUsers}
          appSalesmen={appSalesmen}
          saleNotes={saleNotes}
          setSaleNotes={setSaleNotes}
          appActiveSalesTab={appActiveSalesTab}
          appCustomers={appCustomers}
          appSelectedCustomer={appSelectedCustomer}
          handleSelectCustomer={handleSelectCustomer}
          isCreditAllowed={isCreditAllowed}
        />

        <OrderSummary
          checkoutCartItems={checkoutCartItems}
          appBundles={appBundles}
          showDiscount={showDiscount}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          taxAmount={taxAmount}
          finalTotal={finalTotal}
          totalQty={totalQty}
          currency={appSettings.currency}
          saleTypes={saleTypes}
        />
      </div>

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {profile?.id && (
        <CheckoutPinVerifyModal
          isOpen={isPinVerifyOpen}
          userId={profile.id}
          userName={profile.name}
          onAuthorized={() => {
            setIsPinVerifyOpen(false);
            handlePayment();
          }}
          onCancel={() => setIsPinVerifyOpen(false)}
        />
      )}
    </Modal>
  );
}
