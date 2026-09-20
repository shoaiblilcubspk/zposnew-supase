import { Gift, Package, ShoppingCart, Trash2, Minus, Plus, Info } from 'lucide-react';
import { sonner } from '../../../lib/sonner';
import { CartItem, Bundle } from '../../../types';
import { formatCurrency } from '../../../lib/currencies';
import { CartItemCard } from './CartItemCard';

interface CartItemListBodyProps {
  cartItems: CartItem[];
  appBundles: any;
  appProducts: any;
  profile: any;
  currency: string;
  showDiscount: boolean;
  activePromotions: { discountName: string; discountAmount: number }[];
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onUpdateBundleQuantity: (bundleId: string, newBundleQty: number) => void;
  onRemove: (index: number) => void;
  onApplyDiscount: (index: number, discount: number, discountType: 'percentage' | 'fixed') => void;
}

export function CartItemListBody({
  cartItems,
  appBundles,
  appProducts,
  profile,
  currency,
  showDiscount,
  activePromotions,
  onUpdateQuantity,
  onUpdateBundleQuantity,
  onRemove,
  onApplyDiscount,
}: CartItemListBodyProps) {
  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 opacity-70">
        <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center mb-3">
          <ShoppingCart className="h-5 w-5 text-neutral-400" />
        </div>
        <p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">{"Cart is empty"}</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">{"Add products to get started"}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-white/5">
      {(() => {
        const groupCartItems = (items: CartItem[]) => {
          const bundlesMap = new Map<string, {
            bundleId: string;
            bundleName: string;
            bundleImage?: string;
            items: { item: CartItem; originalIndex: number }[];
            totalOriginal: number;
            totalDiscount: number;
            totalSubtotal: number;
            bundleQty: number;
          }>();
          const standaloneItems: { item: CartItem; originalIndex: number }[] = [];

          items.forEach((item, index) => {
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
                  totalSubtotal: 0,
                  bundleQty: 1
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
            const originalBundleDefId = b.bundleId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0] || b.bundleId;
            let bundleDef = appBundles?.find(x => x.id === originalBundleDefId);

            if (!bundleDef) {
              bundleDef = appProducts?.find(x => x.id === originalBundleDefId) as unknown as Bundle;
            }

            if (bundleDef?.image) b.bundleImage = bundleDef.image;

            let bundleQty = 1;
            if (bundleDef && bundleDef.items && bundleDef.items.length > 0) {
              const firstBi = bundleDef.items[0];
              const cartItem = b.items.find(x => x.item.product.id === firstBi.productId);
              if (cartItem) {
                bundleQty = Math.round(cartItem.item.quantity / firstBi.quantity);
              }
            } else if (b.items.length > 0) {
              bundleQty = b.items[0].item.quantity;
            }

            if (bundleQty === 0) bundleQty = 1; // Fallback
            b.bundleQty = bundleQty;
          });

          return {
            bundles: Array.from(bundlesMap.values()),
            standaloneItems
          };
        };

        const { bundles, standaloneItems } = groupCartItems(cartItems);

        const renderedBundlesHeader = bundles.length > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider bg-violet-500/[0.05] border-b border-violet-500/15 mb-1">
            <Gift className="h-3.5 w-3.5 text-violet-500 shrink-0" />
            <span>{"Bundle / Deal Items"} ({bundles.length})</span>
          </div>
        ) : null;

        const renderedStandalonesHeader = bundles.length > 0 && standaloneItems.length > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider bg-neutral-100 dark:bg-white/[0.03] border-y border-neutral-200 dark:border-white/10 my-1">
            <ShoppingCart className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <span>{"Other / Standalone Items"} ({standaloneItems.length})</span>
          </div>
        ) : null;

        const bundleImage = (b: typeof bundles[number]) => {
          return b.bundleImage || b.items[0]?.item.product.image || null;
        };

        const renderedBundleSummaries = bundles.map((b) => (
          <div key={`cart-bundle-${b.bundleId}`} className="px-2.5 py-2 mx-2 mb-1.5 rounded-md border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-surface/50">
            <div className="flex items-center gap-2">
              {/* Thumbnail */}
              <div className="w-9 h-9 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-900 shrink-0 flex items-center justify-center aspect-square border border-neutral-200 dark:border-white/[0.08]">
                {bundleImage(b) ? (
                  <img src={bundleImage(b)!} alt={b.bundleName} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-4 w-4 text-neutral-400" />
                )}
              </div>
              {/* Name + Price */}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-neutral-900 dark:text-white truncate leading-tight">{bundles.findIndex(x => x.bundleId === b.bundleId) + 1}. {b.bundleQty > 1 ? `${b.bundleQty}x ${b.bundleName}` : b.bundleName}</p>
                <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[12px] font-bold tabular-nums">
                  <span className={b.items.some(({ item }) => item.bundleHideItemPrices === true) ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}>
                    {formatCurrency(b.totalSubtotal, currency)}
                  </span>
                  {showDiscount && b.totalDiscount > 0 && (
                    <span className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded leading-none border border-rose-500/20">
                      -{formatCurrency(b.totalDiscount, currency)}
                    </span>
                  )}
                </div>
              </div>
              {/* Qty stepper */}
              <div className="flex items-center bg-white dark:bg-surface rounded border border-neutral-200 dark:border-white/[0.08] shrink-0 overflow-hidden">
                <button
                  onClick={() => onUpdateBundleQuantity(b.bundleId, b.bundleQty - 1)}
                  className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-surface-hover transition-colors"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={b.bundleQty || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/[^0-9-]/g, ''));
                    onUpdateBundleQuantity(b.bundleId, isNaN(val) ? 0 : val);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className={`w-6 bg-transparent text-center text-[11px] font-mono font-medium focus:outline-none border-0 p-0 no-spinners select-all ${b.bundleQty < 0 ? 'text-rose-500' : 'text-neutral-900 dark:text-white'
                    }`}
                />
                <button
                  onClick={() => onUpdateBundleQuantity(b.bundleId, b.bundleQty + 1)}
                  className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-surface-hover transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
              {/* Delete */}
              <button
                onClick={() =>
                  sonner.confirm('Remove Bundle?', `Are you sure you want to remove the bundle "${b.bundleName}"?`).then((r) => { if (r.isConfirmed) onUpdateBundleQuantity(b.bundleId, 0).catch(() => { }); })
                }
                className="p-1 text-violet-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                title="Remove Entire Bundle"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {/* Nested item list */}
            <div className="mt-2 pl-10 border-t border-dashed border-violet-500/10 pt-1.5 space-y-1">
              {b.items.map(({ item, originalIndex }) => (
                <CartItemCard
                  key={`${item.product.id}-${originalIndex}`}
                  item={item}
                  index={originalIndex}
                  visualIndex={originalIndex + 1}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                  onApplyDiscount={onApplyDiscount}
                  currency={currency}
                  profile={profile}
                  showDiscount={showDiscount}
                  isNested={true}
                  isFromBundle={true}
                />
              ))}
            </div>
          </div>
        ));

        const renderedStandalones = standaloneItems.map(({ item, originalIndex }, sIdx) => (
          <CartItemCard
            key={`${item.product.id}-${originalIndex}`}
            item={item}
            index={originalIndex}
            visualIndex={sIdx + 1}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
            onApplyDiscount={onApplyDiscount}
            currency={currency}
            profile={profile}
            showDiscount={showDiscount}
          />
        ));

        return (
          <>
            {/* No Active Promotions Banner */}
            {cartItems.length > 0 && activePromotions.length === 0 && (
              <div className="px-3 py-1.5 flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20">
                <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  No Active Promotions
                </span>
              </div>
            )}
            {renderedBundlesHeader}
            {renderedBundleSummaries}
            {renderedStandalonesHeader}
            {renderedStandalones}
          </>
        );
      })()}
    </div>
  );
}
