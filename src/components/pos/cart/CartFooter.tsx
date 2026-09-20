import { useCartStore, useAppStore, useSettingsStore } from '../../../stores';
import { useAuth } from '../../../context/AuthContext';
import { getDiscountIneligibilityReason } from '../../../lib/discountUtils';
import { GiftIcon, AlertIcon, CloseIcon } from '../../../shared/icons';
import { TYPOGRAPHY } from '../../../shared/ui/typography';
import { sonner } from '../../../lib/sonner';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { Modal } from '../../../shared/ui/Modal';
import { CartActions } from './CartActions';
import { cn } from '../../../lib/utils';

interface CartFooterProps {
  subtotal: number;
  taxAmount: number;
  manualItemDiscountTotal: number;
  activePromotions: { discountName: string; discountAmount: number }[];
  freeGifts: { product: { name: string } }[];
  billDiscountAmount: number;
  isBelowCost: boolean;
  total: number;
  billDiscountInput: string;
  setBillDiscountInput: (v: string) => void;
  showPromoModal: boolean;
  setShowPromoModal: (v: boolean) => void;
  onSaveDraft: () => void;
  onCheckout: () => void;
}

export function CartFooter({
  subtotal,
  taxAmount,
  manualItemDiscountTotal,
  activePromotions,
  freeGifts,
  billDiscountAmount,
  isBelowCost,
  total,
  billDiscountInput,
  setBillDiscountInput,
  showPromoModal,
  setShowPromoModal,
  onSaveDraft,
  onCheckout,
}: CartFooterProps) {
  const appSettings = useSettingsStore(s => s.settings);
  const appCart = useCartStore(s => s.cart);
  const appBillDiscountValue = useCartStore(s => s.billDiscountValue);
  const appActiveSalesTab = useCartStore(s => s.activeSalesTab);
  const appBillDiscountType = useCartStore(s => s.billDiscountType);
  const appSelectedCustomer = useCartStore(s => s.selectedCustomer);
  const appDiscounts = useAppStore(s => s.discounts);
  const { profile } = useAuth();
  const showDiscount = appSettings.receiptShowDiscount !== false &&
    !appCart.some(item => item.bundleHideItemPrices === true || item.bundle_hide_item_prices === true);

  return (
    <div className="shrink-0 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-black/75">
      {/* Subtotal / Tax / Discounts */}
      <div className="pl-4 pr-5 pt-2 pb-1 space-y-1">
        {showDiscount && (
          <div className="flex justify-between">
            <span className={TYPOGRAPHY.sublabel}>{"Subtotal"}</span>
            <span className={TYPOGRAPHY.money}>{formatCurrency(subtotal, appSettings.currency)}</span>
          </div>
        )}
        {Math.abs(taxAmount) > 0 && (
          <div className="flex justify-between">
            <span className={TYPOGRAPHY.sublabel}>{"Tax"} ({appSettings.taxRate}%)</span>
            <span className={TYPOGRAPHY.money}>{formatCurrency(Math.abs(taxAmount), appSettings.currency)}</span>
          </div>
        )}

        {showDiscount && Math.abs(manualItemDiscountTotal) > 0 && (
          <div className="flex justify-between text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
            <span>{"Discount"}</span>
            <span className={TYPOGRAPHY.moneyGreen}>-{formatCurrency(Math.abs(manualItemDiscountTotal), appSettings.currency)}</span>
          </div>
        )}

        {showDiscount && activePromotions.map((promo, i) => (
          <div key={i} className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase truncate pr-2">{promo.discountName}</span>
            <span className={cn(TYPOGRAPHY.moneyGreen, "text-[11.5px] shrink-0")}>-{formatCurrency(promo.discountAmount, appSettings.currency)}</span>
          </div>
        ))}
        {freeGifts.map((gift, i) => (
          <div key={i} className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-md px-2.5 py-1">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase truncate pr-2">FREE: {gift.product.name}</span>
            <GiftIcon size="xs" className="text-purple-500 shrink-0" />
          </div>
        ))}
      </div>

      {/* Bill Discount Row */}
      <div className="pl-4 pr-5 pb-2">
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex items-center bg-neutral-100 dark:bg-white/[0.04] p-0.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shrink-0 self-center">
            {(['percentage', 'fixed'] as const).map((type) => (
              <button
                key={type}
                onClick={() =>
                  useCartStore.getState().updateSalesTab({ id: appActiveSalesTab, updates: { billDiscountType: type } })
                }
                disabled={!profile?.canGiveDiscount}
                className={`flex items-center justify-center min-w-[28px] h-[26px] px-1.5 text-[11px] font-mono rounded transition-colors ${appBillDiscountType === type
                  ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/[0.08]'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  } disabled:opacity-40`}
              >
                {type === 'percentage' ? '%' : getCurrencySymbol(appSettings.currency)}
              </button>
            ))}
          </div>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={billDiscountInput}
              dir="ltr"
              inputMode="decimal"
              disabled={!profile?.canGiveDiscount}
              onChange={(e) => {
                const raw = e.target.value;
                if (!/^\d*\.?\d*$/.test(raw)) return;
                setBillDiscountInput(raw);
                const val = parseFloat(raw);
                useCartStore.getState().updateSalesTab({ id: appActiveSalesTab, updates: { billDiscountValue: Number.isFinite(val) ? val : 0 } });
              }}
              onBlur={() => {
                const val = parseFloat(billDiscountInput);
                const normalized = Number.isFinite(val) && val > 0 ? String(val) : '';
                setBillDiscountInput(normalized);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={"Bill discount"}
              className={`w-full text-left text-[12px] font-medium bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md h-8 py-1 pl-2.5 focus:outline-none focus:border-neutral-400 disabled:opacity-50 ${billDiscountAmount > 0 ? 'pr-16' : 'pr-3'}`}
            />
            {showDiscount && Math.abs(billDiscountAmount) > 0 && (
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[11px] font-mono text-rose-500 pointer-events-none">
                -{formatCurrency(Math.abs(billDiscountAmount), appSettings.currency)}
              </span>
            )}
          </div>

          {profile?.canGiveDiscount && appBillDiscountValue > 0 && (
            <button
              onClick={() => {
                setBillDiscountInput('');
                useCartStore.getState().updateSalesTab({ id: appActiveSalesTab, updates: { billDiscountValue: 0 } });
              }}
              className="shrink-0 w-8 h-8 flex items-center justify-center bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Clear Discount"
            >
              <CloseIcon size="xs" />
            </button>
          )}

          {profile?.canGiveDiscount && (
            <button
              onClick={() => {
                const promos = appDiscounts.filter((d: any) => d.active);
                if (!promos.length) { sonner.info('No active promotions.'); return; }
                setShowPromoModal(true);
              }}
              className="shrink-0 w-8 h-8 flex items-center justify-center bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md text-neutral-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
              title="Browse Promotions"
            >
              <GiftIcon size="xs" />
            </button>
          )}
        </div>
      </div>

      {/* Grand Total + Buttons */}
      <div className="flex items-center justify-between pl-4 pr-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2.5 border-t border-gray-200 dark:border-white/10">
        <div>
          <p className={TYPOGRAPHY.cartTotalLabel}>{"Grand Total"}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn(TYPOGRAPHY.cartTotalValue, isBelowCost && 'text-red-500 animate-pulse')}>
              {formatCurrency(total, appSettings.currency)}
            </span>
            {isBelowCost && <AlertIcon size="sm" className="text-red-500" />}
          </div>
          {appSettings.allowNegativeStock !== false && appCart.some(item =>
            !item.product.isService && item.product.trackInventory !== false &&
            (item.product.stock - item.quantity) < 0
          ) && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertIcon size="xs" className="text-amber-500 shrink-0" />
              <span className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">⚠ Stock will go negative</span>
            </div>
          )}
        </div>

        <CartActions onSaveDraft={onSaveDraft} onCheckout={onCheckout} />
      </div>

      {/* Promotion Selection Modal */}
      <Modal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        title={"SELECT PROMOTION"}
        subtitle={"APPLY ACTIVE OFFERS TO BILL"}
        maxWidth="sm"
      >
        <div className="space-y-3">
          {appDiscounts.filter((d: any) => d.active).map((d: any) => {
            const reason = getDiscountIneligibilityReason(d, appCart, appSelectedCustomer, 'cash', subtotal);
            const isEligible = !reason;
            const isAuto = d.isAutoApply !== false;
            const disabled = !isEligible || isAuto;
            return (
              <button
                key={d.id}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setBillDiscountInput(String(d.value));
                  useCartStore.getState().updateSalesTab({
                    id: appActiveSalesTab,
                    updates: {
                      billDiscountValue: d.value,
                      billDiscountType: d.type === 'percentage' ? 'percentage' : 'fixed'
                    }
                  });
                  setShowPromoModal(false);
                  sonner.success(`"${d.name}" applied!`);
                }}
                className={`w-full text-left p-3 bg-white dark:bg-surface border rounded-md transition-colors relative overflow-hidden ${disabled
                  ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-white/[0.08]'
                  : 'border-neutral-200 dark:border-white/[0.08] hover:border-neutral-400 group'
                  }`}
              >
                <div className="flex justify-between items-start mb-1.5 relative z-10">
                  <div className="space-y-0.5">
                    <p className={`font-semibold text-[13px] transition-colors ${disabled ? 'text-neutral-500' : 'text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>{d.name}</p>
                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Promotion ID: {d.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <span className="flex items-center gap-1.5">
                    {isAuto && isEligible && (
                      <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] px-1.5 py-0.5 rounded uppercase">
                        Auto
                      </span>
                    )}
                    <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {d.type === 'percentage' ? d.value + '%' : formatCurrency(d.value, appSettings.currency)} OFF
                    </span>
                  </span>
                </div>

                {!isEligible ? (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5 relative z-10">
                    <AlertIcon size="xs" className="text-rose-500 shrink-0" />
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide">{reason}</p>
                  </div>
                ) : d.minAmount ? (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5 relative z-10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[11px] text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wide">
                      Unlock at {formatCurrency(d.minAmount, appSettings.currency)}+
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5 relative z-10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide">
                      {isAuto ? 'Auto-applied to bill' : 'Available for all orders'}
                    </p>
                  </div>
                )}
              </button>
            );
          })}

          {appDiscounts.filter((d: any) => d.active).length === 0 && (
            <div className="py-12 text-center">
              <GiftIcon size="xl" className="w-12 h-12 text-gray-200 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">No Active Promotions</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
