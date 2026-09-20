import { ShoppingBagIcon, GiftIcon } from '../../../shared/icons';
import { TYPOGRAPHY } from '../../../shared/ui/typography';
import { CartItem } from '../../../types';
import { formatCurrency } from '../../../lib/currencies';
import { OrderSummaryItems } from './OrderSummaryItems';

interface OrderSummaryProps {
  checkoutCartItems: CartItem[];
  appBundles: any;
  showDiscount: boolean;
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  finalTotal: number;
  totalQty: number;
  currency: string;
  saleTypes: { id: string; label: string; icon: any; enabled: boolean }[];
  saleType: 'retail' | 'wholesale';
  setSaleType: (v: any) => void;
}

export function OrderSummary({
  checkoutCartItems,
  appBundles,
  showDiscount,
  subtotal,
  totalDiscount,
  taxAmount,
  finalTotal,
  totalQty,
  currency,
  saleTypes,
  saleType,
  setSaleType,
}: OrderSummaryProps) {
  return (
    <div className="p-4 flex flex-col order-2 md:order-1 border-t md:border-t-0 border-gray-200 dark:border-white/5 bg-white dark:bg-[#0C0C0C]">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <ShoppingBagIcon size="md" className="text-primary" />
        <span className={TYPOGRAPHY.sectionHeader}>{"Order Items"}</span>
      </div>

      <OrderSummaryItems
        checkoutCartItems={checkoutCartItems}
        appBundles={appBundles}
        showDiscount={showDiscount}
        currency={currency}
      />

      {/* Totals */}
      <div className="pt-3 border-t border-gray-200 dark:border-white/5 space-y-1.5 px-1">
        <div className="flex justify-between items-center">
          <span className={TYPOGRAPHY.sublabel}>{"Subtotal"}</span>
          <span className={TYPOGRAPHY.money}>{formatCurrency(subtotal - totalDiscount, currency)}</span>
        </div>
        {showDiscount && totalDiscount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"><GiftIcon size="sm" />{"Discount"}</span>
            <span className={TYPOGRAPHY.moneyRed}>-{formatCurrency(totalDiscount, currency)}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className={TYPOGRAPHY.sublabel}>{"Tax"}</span>
            <span className={TYPOGRAPHY.money}>+{formatCurrency(taxAmount, currency)}</span>
          </div>
        )}
      </div>

      {/* Net Payable — desktop only */}
      <div className="hidden md:block mt-4 space-y-2">
        <div className="p-4 rounded-xl bg-primary text-white border border-primary shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-emerald-100">{"Net Payable"}</p>
              <h3 className="text-3xl font-bold font-sans tabular-nums text-white tracking-tight leading-none mt-1.5">{formatCurrency(finalTotal, currency)}</h3>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/20 border border-white/20">
              <p className="text-[12px] font-sans font-bold tabular-nums text-white">{totalQty} {"QTY"}</p>
            </div>
          </div>
        </div>

        {/* Sale Type Selector (Desktop) */}
        {saleTypes.length > 0 && (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(saleTypes.length, 3)}, minmax(0, 1fr))` }}>
            {saleTypes.map(st => {
              const Icon = st.icon;
              return (
                <button key={st.id} onClick={() => setSaleType(st.id as any)}
                  className={`flex items-center justify-center gap-1.5 h-8 rounded-md border text-[12px] font-medium transition-colors ${saleType === st.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-surface text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/[0.08] hover:bg-neutral-50 dark:hover:bg-white/[0.04]'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {st.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
