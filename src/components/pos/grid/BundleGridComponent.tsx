import { useState, useMemo } from 'react';
import { Gift } from 'lucide-react';
import { Product } from '../../../types';
import { DealSizeSelectorModal } from '../DealSizeSelectorModal';
import { BundleCard } from './BundleCard';
import { buildGroupedBundles } from './bundleUtils';
import { getGridClasses } from './bundleGridClasses';
import { useBundleGridHandlers } from './useBundleGridHandlers';

interface BundleGridProps {
  onAddToCart: (product: Product) => void;
  currency: string;
  isTouchMode: boolean;
  isReturnMode: boolean;
  gridCols?: number;
  appBundles: any[];
  appProducts: any[];
  appCart: any[];
}

export function BundleGrid({ onAddToCart: _onAddToCart, currency, isTouchMode, isReturnMode, gridCols = 4, appBundles, appProducts, appCart }: BundleGridProps) {
  const rawBundles = (appBundles || []).filter(b => b.active !== false);

  const [activeGroup, setActiveGroup] = useState<any>(null);

  const groupedBundles = useMemo(() => buildGroupedBundles(rawBundles, appProducts), [rawBundles, appProducts]);

  const { handleBundleQuantity, processBundleAdd, handleAddBundle } = useBundleGridHandlers({ appCart, appProducts, isReturnMode, currency, setActiveGroup });

  if (groupedBundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Gift className="h-10 w-10 text-neutral-400 mb-3 opacity-60" />
        <p className="text-neutral-900 dark:text-white text-[13px] font-semibold">{"No Bundles & Deals Yet"}</p>
        <p className="text-[12px] text-neutral-500 mt-0.5 mb-3 font-mono">{"Go to Inventory → Bundles to create combo deals"}</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/inventory/bundles';
          }}
          className="h-8 px-3.5 rounded bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors shadow-none"
        >
          Create Bundle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between bg-neutral-50 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-2 rounded-md shadow-none">
        <div className="flex items-center gap-2 min-w-0">
          <Gift className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400 font-medium truncate">
            {"Create & Manage your combo deals in Inventory"}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/inventory/bundles';
          }}
          className="h-7 px-2.5 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[12px] font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-none shrink-0"
        >
          {"Manage Deals"}
        </button>
      </div>

      <div className={getGridClasses(gridCols)}>
        {groupedBundles.map(item => {
          let visibleProducts: any[] = [];
          const isGroup = item.isGroup;
          const displayName = item.name;
          let minPrice = 0;
          let maxPrice = 0;

          if (isGroup) {
            const allProducts = item.bundles.flatMap((b: any) => b.bundleProducts || []);
            const uniqueProducts = Array.from(new Map(allProducts.map((p: any) => [p.id, p])).values());
            visibleProducts = uniqueProducts.slice(0, 4);

            const prices = item.bundles.map((b: any) => b.finalPrice || 0);
            minPrice = Math.min(...prices);
            maxPrice = Math.max(...prices);
          } else {
            visibleProducts = (item.bundleProducts || []).slice(0, 4);
          }

          let bundleQty = 0;
          if (!isGroup) {
            const bundleItemsInCart = appCart.filter((x: any) => {
              const bId = x.bundleId || x.bundle_id;
              return bId && bId.startsWith(item.id + '-');
            });
            if (bundleItemsInCart.length > 0) {
              if (item.items && item.items.length > 0) {
                const firstBi = item.items[0];
                const cartItem = bundleItemsInCart.find(x => x.product.id === firstBi.productId);
                if (cartItem) {
                  bundleQty = Math.round(cartItem.quantity / firstBi.quantity);
                }
              } else {
                bundleQty = bundleItemsInCart[0].quantity;
              }
            }
          }

          return (
            <BundleCard
              key={item.id}
              item={item}
              bundleQty={bundleQty}
              isTouchMode={isTouchMode}
              currency={currency}
              gridCols={gridCols ?? 4}
              onAddBundle={handleAddBundle}
              onUpdateBundleQuantity={handleBundleQuantity}
              visibleProducts={visibleProducts}
              minPrice={minPrice}
              maxPrice={maxPrice}
              displayName={displayName}
              isGroup={isGroup}
            />
          );
        })}
      </div>

      {activeGroup && (
        <DealSizeSelectorModal
          isOpen={true}
          onClose={() => setActiveGroup(null)}
          groupName={activeGroup.name}
          bundles={activeGroup.bundles}
          currency={currency}
          onSelect={(selectedBundle) => {
            processBundleAdd(selectedBundle);
          }}
        />
      )}
    </div>
  );
}
