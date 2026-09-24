import type { CSSProperties } from 'react';
import { ShoppingBagIcon, GiftIcon } from '../../../shared/icons';
import { TYPOGRAPHY } from '../../../shared/ui/typography';
import { CartItem } from '../../../types';
import { CompactItemRow } from '../CompactItemRow';
import { formatCurrency } from '../../../lib/currencies';
import { cn } from '../../../lib/utils';
import { ProductThumb } from '../../../shared/ui/ProductThumb';

interface OrderSummaryItemsProps {
  checkoutCartItems: CartItem[];
  appBundles: any;
  showDiscount: boolean;
  currency: string;
}

export function OrderSummaryItems({ checkoutCartItems, appBundles, showDiscount, currency }: OrderSummaryItemsProps) {
  return (
    <div className="space-y-1.5 overflow-y-auto custom-scrollbar max-h-[30vh] md:max-h-[40vh] pr-1" style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}>
      {(() => {
        const groupCartItems = (cartItems: CartItem[]) => {
          const bundlesMap = new Map<string, {
            bundleId: string;
            bundleName: string;
            bundleImage?: string;
            items: { item: CartItem; originalIndex: number }[];
            totalOriginal: number;
            totalDiscount: number;
            totalSubtotal: number;
          }>();
          const standaloneItems: { item: CartItem; originalIndex: number }[] = [];

          cartItems.forEach((item, index) => {
            const bundleId = item.bundleId || item.bundle_id;
            const bundleName = item.bundleName || item.bundle_name;

            if (bundleId) {
              if (!bundlesMap.has(bundleId)) {
                bundlesMap.set(bundleId, {
                  bundleId,
                  bundleName: bundleName || 'Deal',
                  items: [],
                  totalOriginal: 0,
                  totalDiscount: 0,
                  totalSubtotal: 0
                });
              }
              const b = bundlesMap.get(bundleId)!;
              b.items.push({ item, originalIndex: index });
              b.totalOriginal += item.product.price * item.quantity;
              b.totalDiscount += item.discount || 0;
              b.totalSubtotal += item.subtotal || 0;
            } else {
              standaloneItems.push({ item, originalIndex: index });
            }
          });

          bundlesMap.forEach((b) => {
            const bundleDef = appBundles?.find((x: any) => x.id === b.bundleId);
            if (bundleDef?.image) b.bundleImage = bundleDef.image;
          });

          return {
            bundles: Array.from(bundlesMap.values()),
            standaloneItems
          };
        };

        const { bundles, standaloneItems } = groupCartItems(checkoutCartItems);

        const renderItemCard = (itemData: { item: CartItem; originalIndex: number }, isNested = false, sIdx?: number) => {
          const { item, originalIndex } = itemData;
          const hidePrices = isNested && item.bundleHideItemPrices === true;
          return (
            <div key={originalIndex} className={cn(
              "flex items-start gap-2 p-2 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none",
              isNested && "shadow-none border-none bg-transparent dark:bg-transparent p-1"
            )}>
              <span className="flex items-center justify-center w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-mono shrink-0 mt-0.5">
                {isNested ? '-' : (sIdx !== undefined ? sIdx + 1 : originalIndex + 1)}
              </span>
              <div className="h-8 w-8 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5 aspect-square">
                <ProductThumb
                  image={item.product.image}
                  imgClassName="h-full w-full object-cover"
                  fallback={<ShoppingBagIcon size="xs" className="text-neutral-400" />}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(TYPOGRAPHY.itemName, "uppercase truncate")}>{item.product.name}</p>
                {(item.selectedVariant || item.selectedVariantLabel || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                  <div className="flex flex-col gap-0.5 my-1">
                    {(item.selectedVariantLabel || item.selectedVariant) && (
                      <span className={cn(TYPOGRAPHY.itemVariant, "truncate")}>
                        {item.selectedVariantLabel || item.selectedVariant}
                      </span>
                    )}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <span className={cn(TYPOGRAPHY.itemModifier, "truncate")}>
                        + {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), currency)})`).join(', ')}
                      </span>
                    )}
                  </div>
                )}
                {item.addonItems && item.addonItems.length > 0 && (
                  <div className="my-1">
                    <span className={cn(TYPOGRAPHY.itemAddon, "truncate block")}>
                      + Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), currency)})`).join(', ')}
                    </span>
                  </div>
                )}
                {item.toppings && item.toppings.length > 0 && (
                  <div className="my-1">
                    <span className={TYPOGRAPHY.itemTopping}>
                      + {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), currency)})`).join(', ')}
                    </span>
                  </div>
                )}
                {item.displayToppings && item.displayToppings.length > 0 && (
                  <div className="my-1">
                    <span className={cn(TYPOGRAPHY.itemTopping, "text-neutral-500 dark:text-neutral-400")}>
                      + {item.displayToppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}
                    </span>
                  </div>
                )}
                {item.serialNumber && (
                  <div className="my-1">
                    <span className={TYPOGRAPHY.snBadge}>
                      SN: {item.serialNumber}
                    </span>
                  </div>
                )}
                {!hidePrices && (
                  <div className="flex items-center justify-between mt-1">
                    <p className={cn(TYPOGRAPHY.money, "text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300")}>
                      {Math.abs(item.quantity)} × {formatCurrency(item.product.price, currency)}
                    </p>
                    {isNested && (
                      <p className={cn(TYPOGRAPHY.money, "text-[12.5px] shrink-0 self-start")}>
                        {formatCurrency(item.product.price * item.quantity, currency)}
                      </p>
                    )}
                  </div>
                )}
                {showDiscount && !isNested && item.discount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1.5 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md border border-rose-200 dark:border-rose-500/20">
                    <span className="flex items-center gap-1">
                      <GiftIcon size="xs" />
                      {"Discount"} {item.discountType === 'percentage' && item.discountValue ? `(${item.discountValue}%)` : ''}
                    </span>
                    <span className={TYPOGRAPHY.moneyRed}>-{formatCurrency(item.discount, currency)}</span>
                  </div>
                )}
              </div>
              {!isNested && (
                <p className={cn(TYPOGRAPHY.money, "text-[12.5px] shrink-0 self-start mt-0.5")}>
                  {formatCurrency(item.product.price * item.quantity, currency)}
                </p>
              )}
            </div>
          );
        };

        const renderedBundlesHeader = bundles.length > 0 ? (
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-1">
            <GiftIcon size="sm" className="text-violet-500 shrink-0" />
            <span>{"Bundle / Deal Items"} ({bundles.length})</span>
          </div>
        ) : null;

        const renderedStandalonesHeader = bundles.length > 0 && standaloneItems.length > 0 ? (
          <div className={cn("flex items-center gap-1.5 px-1 pt-2 border-t border-neutral-200 dark:border-white/10 mt-2 mb-1", TYPOGRAPHY.sectionHeader)}>
            <ShoppingBagIcon size="sm" className="text-neutral-500 dark:text-neutral-400 shrink-0" />
            <span>{"Other / Standalone Items"} ({standaloneItems.length})</span>
          </div>
        ) : null;

        const bundleThumb = (b: typeof bundles[number]) => b.bundleImage || b.items[0]?.item.product?.image || null;

        const renderedBundles = bundles.map((b, bIdx) => {
          const discountStr = showDiscount && b.totalDiscount > 0 ? `-${formatCurrency(b.totalDiscount, currency)}` : undefined;
          return (
            <div key={`checkout-page-bundle-${b.bundleId}`} className="p-2.5 my-1.5 rounded-md border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-surface/50 shadow-none">
              <CompactItemRow
                image={bundleThumb(b)}
                name={`${bIdx + 1}. ${b.bundleQty > 1 ? `${b.bundleQty}x ${b.bundleName}` : b.bundleName}`}
                price={formatCurrency(b.totalSubtotal, currency)}
                discount={discountStr}
              />
              {b.items[0]?.item.toppings && b.items[0].item.toppings.length > 0 && (
                <div className="pl-[3.25rem] pr-3 mt-0.5 mb-1">
                  <span className={TYPOGRAPHY.itemTopping}>
                    + {b.items[0].item.toppings.map((t: any) => `${t.name} (${formatCurrency(t.price, currency)})`).join(', ')}
                  </span>
                </div>
              )}
              <div className="mt-2 pl-8 border-t border-dashed border-violet-500/10 pt-1.5 space-y-1">
                {b.items.map(({ item, originalIndex }) => (
                  <div key={originalIndex} className="flex flex-col text-[11px] text-neutral-800 dark:text-neutral-200 font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 truncate">- {b.bundleQty > 0 ? Math.round(Math.abs(item.quantity) / b.bundleQty) : Math.abs(item.quantity)} × {item.product.name}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {(item.selectedVariantLabel || item.selectedVariant) && (
                          <span className={cn(TYPOGRAPHY.sublabel, "text-[10px]")}>({item.selectedVariantLabel || item.selectedVariant})</span>
                        )}
                      </div>
                    </div>
                    {item.addonItems && item.addonItems.length > 0 && (
                      <div className="mt-0.5">
                        <span className={TYPOGRAPHY.itemAddon}>
                          + Add-ons: {item.addonItems.map(a => `${a.addon?.name || a.name} ${a.quantity}x (${formatCurrency(a.subtotal, currency)})`).join(', ')}
                        </span>
                      </div>
                    )}
                    {item.displayToppings && item.displayToppings.length > 0 && (
                      <div className="mt-0.5">
                        <span className={cn(TYPOGRAPHY.itemTopping, "text-neutral-500 dark:text-neutral-400")}>
                          + {item.displayToppings.map(t => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        });

        const renderedStandalones = standaloneItems.map((item, sIdx) => renderItemCard(item, false, sIdx));

        return (
          <>
            {renderedBundlesHeader}
            {renderedBundles}
            {renderedStandalonesHeader}
            {renderedStandalones}
          </>
        );
      })()}
    </div>
  );
}
