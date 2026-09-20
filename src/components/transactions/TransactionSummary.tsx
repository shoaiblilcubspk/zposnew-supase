import { Layers, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';

interface TransactionSummaryProps {
  transaction: any;
  appSettings: any;
  showDiscount: boolean;
}

export function TransactionSummary({ transaction, appSettings, showDiscount }: TransactionSummaryProps) {
  return (
    <div className="p-3.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] space-y-2 shadow-none">
      {transaction.notes && (
        <div className="pb-2 mb-2 border-b border-neutral-200 dark:border-white/[0.08]">
          <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">{"Internal Memo"}</p>
          <p className="text-[12px] text-neutral-700 dark:text-neutral-300 italic">"{transaction.notes}"</p>
        </div>
      )}

      {/* Unified Payment & Wallet Breakdown Section */}
      <div className="p-3 rounded-md bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2 text-[12px] font-mono">
          <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 font-medium">
            <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
            Payment Mode:
            <strong className="text-neutral-900 dark:text-white font-bold uppercase">
              {transaction.paymentMethod === 'split' ? 'Split Payment' : (transaction.paymentMethod?.toUpperCase() || 'CASH')}
            </strong>
          </span>
          {transaction.receivedAmount != null && transaction.receivedAmount > 0 && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
              <span>
                Tendered: <strong className="text-neutral-900 dark:text-white font-bold tabular-nums">{formatCurrency(transaction.receivedAmount, appSettings.currency)}</strong>
              </span>
              {transaction.changeAmount != null && transaction.changeAmount > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Change: <strong className="tabular-nums font-bold">{formatCurrency(transaction.changeAmount, appSettings.currency)}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Per-Wallet Breakdown for Split Payments ("kis mein kitna gaya") */}
        {transaction.paymentMethod === 'split' && (
          <div className="pt-2 border-t border-neutral-200/80 dark:border-white/[0.06]">
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1 font-semibold">
              <Layers className="w-3 h-3 text-neutral-400" /> Wallet Breakdown
            </p>
            {transaction.splitPayments && transaction.splitPayments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {transaction.splitPayments
                  .filter((p: any) => Number(p.amount) > 0)
                  .map((p: any, i: number) => {
                    const rawMethod = String(p.method || 'wallet');
                    const displayName = rawMethod.toUpperCase() === 'SPLIT' 
                      ? 'Split Total' 
                      : (rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1));
                    return (
                      <div key={i} className="flex justify-between items-center px-2.5 py-1.5 rounded bg-white dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.06] text-[11px] font-mono">
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium capitalize flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                          {displayName}
                        </span>
                        <span className="text-neutral-900 dark:text-white font-bold tabular-nums">
                          {formatCurrency(p.amount, appSettings.currency)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex justify-between items-center px-2.5 py-1.5 rounded bg-white dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.06] text-[11px] font-mono">
                <span className="text-neutral-500">Split Total</span>
                <span className="text-neutral-900 dark:text-white font-bold tabular-nums">
                  {formatCurrency(transaction.total || transaction.subtotal, appSettings.currency)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {showDiscount && (
        <div className="flex justify-between items-center text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
          <span>{"Subtotal"}</span>
          <span className="text-neutral-900 dark:text-white font-mono font-bold tabular-nums">{formatCurrency(transaction.subtotal, appSettings.currency)}</span>
        </div>
      )}

      {showDiscount && transaction.discountAmount > 0 && (
        <div className="flex justify-between items-center text-[13px] font-medium text-rose-600 dark:text-rose-400">
          <span className="flex items-center gap-1">Discount</span>
          <span className="font-mono font-bold tabular-nums">-{formatCurrency(transaction.discountAmount, appSettings.currency)}</span>
        </div>
      )}
      {transaction.taxAmount > 0 && (
        <div className="flex justify-between items-center text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
          <span>{"Tax"}</span>
          <span className="text-neutral-900 dark:text-white font-mono font-bold tabular-nums">+{formatCurrency(transaction.taxAmount, appSettings.currency)}</span>
        </div>
      )}

      {(() => {
        const dcExtra = transaction.extraCharges?.find((c: any) => Number(c.amount) > 0 && (c.name?.toUpperCase() === 'DC' || c.name?.toUpperCase()?.includes('DELIVERY')));
        const dcVal = dcExtra ? Number(dcExtra.amount) : (Number(transaction.deliveryFee) || 0);
        if (dcVal > 0) {
          return (
            <div className="flex justify-between items-center text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
              <span className="flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                Delivery Charges (DC)
              </span>
              <span className="text-neutral-900 dark:text-white font-mono font-bold tabular-nums">
                +{formatCurrency(dcVal, appSettings.currency)}
              </span>
            </div>
          );
        }
        if (transaction.extraCharges && transaction.extraCharges.length > 0) {
          return transaction.extraCharges.map((charge: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
              <span>{charge.name || "Extra Charge"}</span>
              <span className="text-neutral-900 dark:text-white font-mono font-bold tabular-nums">+{formatCurrency(charge.amount, appSettings.currency)}</span>
            </div>
          ));
        }
        return null;
      })()}

      {transaction.refundedAmount > 0 && (
        <div className="flex justify-between items-center text-[13px] font-medium text-rose-600 dark:text-rose-400">
          <span>Refunded Amount</span>
          <span className="font-mono font-bold tabular-nums">-{formatCurrency(transaction.refundedAmount, appSettings.currency)}</span>
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-white/[0.08]">
        <span className="text-[14px] font-bold text-neutral-900 dark:text-white">{"Net Total"}</span>
        <div className="flex flex-col items-end">
          <span className={`tabular-nums font-mono ${transaction.refundedAmount > 0 ? 'text-[13px] line-through text-neutral-400' : 'text-[16px] font-bold text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(transaction.total, appSettings.currency)}
          </span>
          {transaction.refundedAmount > 0 && (
            <span className="text-[16px] font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums leading-none mt-0.5">
              {formatCurrency(transaction.total - transaction.refundedAmount, appSettings.currency)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
