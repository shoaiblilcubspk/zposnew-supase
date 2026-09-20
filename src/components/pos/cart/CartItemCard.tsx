import { useState } from 'react';
import { MinusIcon, PlusIcon, TrashIcon, PackageIcon, AlertIcon, EditIcon, CloseIcon } from '../../../shared/icons';
import { TYPOGRAPHY } from '../../../shared/ui/typography';
import { useCartStore } from '../../../stores';
import { formatCurrency, getCurrencySymbol } from '../../../lib/currencies';
import { CartItem } from '../../../types';
import { cn } from '../../../lib/utils';
import { CartItemDiscountInput } from './CartItemDiscountInput';
import { getExpiryStatus } from '../../../utils/expiryUtils';

interface CartItemCardProps {
  item: CartItem;
  index: number;
  visualIndex?: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onApplyDiscount: (index: number, discount: number, type: 'percentage' | 'fixed') => void;
  currency: string;
  profile: any;
  showDiscount: boolean;
  isNested?: boolean;
  isFromBundle?: boolean;
  baseQuantity?: number;
}

export function CartItemCard({
  item,
  index,
  visualIndex,
  onUpdateQuantity,
  onRemove,
  onApplyDiscount,
  currency,
  profile,
  showDiscount,
  isNested,
  isFromBundle,
  baseQuantity,
}: CartItemCardProps) {
  const canViewExpiry = profile?.role === 'admin' || Boolean(profile?.canViewExpiry);
  const hidePrices = item.bundleHideItemPrices === true;
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');

  const handleDiscountSubmit = () => {
    const value = parseFloat(discountValue);
    if (!isNaN(value) && value > 0) {
      onApplyDiscount(index, value, discountType);
      setShowDiscountInput(false);
      setDiscountValue('');
    }
  };

  const handlePriceSubmit = () => {
    const newPrice = parseFloat(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      const toppingsTotal = (item.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
      const updatedProduct = { ...item.product, price: newPrice };
      const quantityTotal = (newPrice + toppingsTotal) * item.quantity;
      const calculatedDiscount = item.discountValue && item.discountValue > 0
        ? (item.discountType === 'percentage' ? (quantityTotal * item.discountValue) / 100 : item.discountValue)
        : 0;
      useCartStore.getState().updateCartItem({
        index,
        item: { ...item, product: updatedProduct, discount: calculatedDiscount, subtotal: quantityTotal - calculatedDiscount },
      });
    }
    setIsEditingPrice(false);
  };

  const clearItemDiscount = () => {
    const toppingsTotal = (item.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
    useCartStore.getState().updateCartItem({
      index,
      item: { ...item, discount: 0, discountValue: 0, subtotal: (item.product.price + toppingsTotal) * item.quantity },
    });
    setShowDiscountInput(false);
    setDiscountValue('');
  };

  return (
    <div className={cn(
      'group hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors overflow-hidden',
      isNested ? 'pl-0 pr-1 py-0.5 hover:bg-transparent dark:hover:bg-transparent' : isFromBundle ? 'pl-3 pr-4 py-1' : 'pl-3 pr-4 py-1.5'
    )}>
      <div className="flex items-center gap-1.5">
        {isFromBundle ? (
          <span className="flex items-center justify-center w-6 h-6 text-gray-700 dark:text-gray-300 text-[12px] font-bold shrink-0">-</span>
        ) : (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-bold shrink-0">
            {visualIndex || (index + 1)}
          </span>
        )}

        {!isNested && (
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 flex items-center justify-center self-start mt-0.5 aspect-square">
            {item.product.image ? (
              <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
            ) : (
              <PackageIcon size="md" className="text-gray-300" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className={cn(TYPOGRAPHY.itemName, 'truncate leading-tight')}>{item.product.name}</p>
            {isFromBundle && <span className={TYPOGRAPHY.dealBadge}>deal</span>}
            {canViewExpiry && item.product.expiryDate && (() => {
              const exp = getExpiryStatus(item.product.expiryDate, item.product.expiryAlertDays);
              if (exp.status === 'expired') {
                return <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">Expired</span>;
              }
              if (exp.status === 'expiring_soon') {
                return <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">Exp: {exp.daysRemaining}d</span>;
              }
              return null;
            })()}
          </div>

          {(item.selectedVariant || item.selectedVariantLabel || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
              {(item.selectedVariantLabel || item.selectedVariant) && (
                <span className={TYPOGRAPHY.itemVariant}>{item.selectedVariantLabel || item.selectedVariant}</span>
              )}
              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                <span className={TYPOGRAPHY.itemModifier}>
                  +{item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), currency)})`).join(', ')}
                </span>
              )}
            </div>
          )}

          {item.addonItems && item.addonItems.length > 0 && (
            <div className="mt-0.5">
              <span className={TYPOGRAPHY.itemAddon}>
                + Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), currency)})`).join(', ')}
              </span>
            </div>
          )}

          {item.toppings && item.toppings.length > 0 && (
            <div className="mt-0.5">
              <span className={TYPOGRAPHY.itemTopping}>
                + {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), currency)})`).join(', ')}
              </span>
            </div>
          )}

          {item.serialNumber && (
            <div className="mt-0.5">
              <span className={TYPOGRAPHY.snBadge}>SN: {item.serialNumber}</span>
            </div>
          )}

          {!hidePrices && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {isEditingPrice ? (
                <input
                  type="text" inputMode="decimal" value={tempPrice} autoFocus
                  onChange={(e) => setTempPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  onBlur={handlePriceSubmit}
                  onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handlePriceSubmit(); if (e.key === 'Escape') setIsEditingPrice(false); }}
                  className="w-16 h-5 text-[11px] font-bold font-mono bg-white dark:bg-zinc-800 border border-emerald-500 rounded px-1.5 focus:outline-none"
                />
              ) : (
                <div
                  onClick={() => profile?.canEditPrice && (setTempPrice(item.product.price.toString()), setIsEditingPrice(true))}
                  className={cn('flex items-center gap-1 -ml-1 px-1 py-0.5 rounded-lg transition-all', profile?.canEditPrice && 'cursor-pointer hover:bg-emerald-50 dark:hover:bg-primary/10 active:scale-95 group/price')}
                >
                  <span className={cn('text-[12px] font-bold font-mono', item.product.price < item.product.cost ? 'text-rose-500' : profile?.canEditPrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300')}>
                    {formatCurrency(item.product.price, currency)}
                  </span>
                  {item.originalPrice !== undefined && Math.round(item.product.price) !== Math.round(item.originalPrice) && (
                    <span className="text-[10px] font-medium font-mono text-neutral-400 line-through">{formatCurrency(item.originalPrice, currency)}</span>
                  )}
                  {item.product.price < item.product.cost && (
                    <div className="flex items-center gap-0.5 px-1 bg-rose-500/10 rounded">
                      <AlertIcon size="xs" className="text-rose-500" />
                      <span className={TYPOGRAPHY.costWarning}>Cost: {formatCurrency(item.product.cost, currency)}</span>
                    </div>
                  )}
                  {profile?.canEditPrice && <EditIcon size="xs" className="text-primary/50 group-hover/price:text-primary transition-colors" />}
                </div>
              )}

              {showDiscount && Math.abs(item.discount) > 0 && (
                <span className={TYPOGRAPHY.discountBadge}>
                  -{(item.bundleId || item.bundle_id) ? Math.abs(item.discount).toLocaleString() : item.discountValue}{(item.bundleId || item.bundle_id) ? getCurrencySymbol(currency) : (item.discountType === 'percentage' ? '%' : getCurrencySymbol(currency))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Qty stepper */}
        {(isNested || isFromBundle) ? (
          <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-violet-500/10 text-violet-700 dark:text-violet-300 rounded shrink-0 self-center select-none">
            {baseQuantity !== undefined ? baseQuantity : Math.abs(item.quantity)}x
          </span>
        ) : (
          <div className="flex items-center self-center bg-gray-150/70 dark:bg-white/5 rounded-full p-0.5 shrink-0">
            <button onClick={() => onUpdateQuantity(index, item.quantity - 1)} className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-red-500 active:scale-90 transition-all">
              <MinusIcon size="xs" />
            </button>
            <input
              type="text" inputMode="decimal" value={item.quantity || ''}
              onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9.-]/g, '')); onUpdateQuantity(index, isNaN(v) ? 0 : v); }}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn('w-7 bg-transparent text-center text-[12px] font-bold font-mono focus:outline-none no-spinners', item.quantity < 0 ? 'text-red-500' : 'text-neutral-900 dark:text-white')}
            />
            <button onClick={() => onUpdateQuantity(index, item.quantity + 1)} className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-primary active:scale-90 transition-all">
              <PlusIcon size="xs" />
            </button>
          </div>
        )}

        {/* Subtotal + Actions */}
        <div className="flex flex-col items-end shrink-0 min-w-[50px]">
          {!hidePrices && (
            <span className={cn(
              TYPOGRAPHY.money,
              'text-[12.5px] leading-tight',
              (item.quantity < 0 || item.subtotal < (item.product.cost * item.quantity)) && 'text-red-500'
            )}>
              {formatCurrency(item.subtotal, currency)}
            </span>
          )}
          {!(isNested || isFromBundle) && (
            <div className="flex items-center gap-2 mt-1">
              {profile?.canGiveDiscount && (
                <button
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className={cn(
                    'w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-[11px] font-bold leading-none rounded-full transition-colors',
                    item.discount > 0 ? 'text-primary bg-emerald-500/10' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-primary'
                  )}
                  title="Discount"
                >
                  %
                </button>
              )}
              {profile?.canGiveDiscount && item.discount > 0 && (
                <button
                  onClick={clearItemDiscount}
                  className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-primary hover:text-red-500 hover:bg-rose-500/10 rounded-full transition-colors"
                  title="Clear Item Discount"
                >
                  <CloseIcon size="xs" />
                </button>
              )}
              {profile?.canEditPrice && (
                <button
                  onClick={() => {
                    setTempPrice(item.product.price.toString());
                    setIsEditingPrice(!isEditingPrice);
                  }}
                  className={cn(
                    'w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-colors',
                    isEditingPrice ? 'text-primary bg-emerald-500/10' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary'
                  )}
                  title="Edit Price"
                >
                  <EditIcon size="xs" />
                </button>
              )}
              <button
                onClick={() => onRemove(index)}
                className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-rose-500/10 rounded-full transition-colors"
                title="Remove"
              >
                <TrashIcon size="xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showDiscountInput && (
        <CartItemDiscountInput
          currency={currency}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
          onSubmit={handleDiscountSubmit}
          onClose={() => setShowDiscountInput(false)}
        />
      )}
    </div>
  );
}
