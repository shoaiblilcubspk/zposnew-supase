import { memo } from 'react';
import { Plus, Minus, Gift, Package } from 'lucide-react';
import { ProductThumb } from '../../../shared/ui/ProductThumb';

interface BundleCardProps {
  item: any;
  bundleQty: number;
  isTouchMode: boolean;
  currency: string;
  gridCols: number;
  onAddBundle: (item: any) => void;
  onUpdateBundleQuantity: (item: any, delta: number) => void;
  visibleProducts: any[];
  minPrice: number;
  maxPrice: number;
  displayName: string;
  isGroup: boolean;
}

export const BundleCard = memo(
  function BundleCard({
    item,
    bundleQty,
    isTouchMode,
    currency,
    gridCols,
    onAddBundle,
    onUpdateBundleQuantity,
    visibleProducts,
    minPrice,
    maxPrice: _maxPrice,
    displayName,
    isGroup
  }: BundleCardProps) {
    return (
      <div
        className={`group relative bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden transition-colors hover:border-neutral-300 dark:hover:border-white/20 cursor-pointer shadow-none ${
          bundleQty > 0 ? 'border-emerald-500/50 ring-1 ring-emerald-500/50 bg-emerald-500/[0.02]' : ''
        }`}
        style={{
          minHeight: (typeof window !== 'undefined' && window.innerWidth >= 1024)
            ? (gridCols === 0 || gridCols >= 4 ? (isTouchMode ? '120px' : '140px') :
              gridCols === 3 ? (isTouchMode ? '150px' : '180px') :
                (isTouchMode ? '180px' : '220px'))
            : (isTouchMode ? '120px' : '140px')
        }}
        onClick={() => onAddBundle(item)}
      >
        <div className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${isTouchMode ? 'aspect-square' : 'aspect-[4/3]'}`}>
          {item.image ? (
            <ProductThumb image={item.image} imgClassName="w-full h-full object-cover" />
          ) : visibleProducts.length > 0 ? (
            <div className={`grid h-full ${visibleProducts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {visibleProducts.map((product: any, idx: number) => {
                const total = visibleProducts.length;
                const isLastOfThree = total === 3 && idx === 2;
                const cellClasses = [
                  'relative overflow-hidden bg-neutral-100 dark:bg-neutral-900',
                  idx >= 2 ? 'border-t border-neutral-200 dark:border-white/[0.08]' : '',
                  idx % 2 === 0 && idx < 2 ? 'border-r border-neutral-200 dark:border-white/[0.08]' : '',
                  isLastOfThree ? 'col-span-2' : '',
                ].filter(Boolean).join(' ');
                return (
                  <div key={product.id || idx} className={cellClasses}>
                    {product.image ? (
                      <ProductThumb image={product.image} imgClassName="w-full h-full object-cover" />
                    ) : item.bundleMinPrice !== null && item.bundleMaxPrice !== null && item.bundleMinPrice < item.bundleMaxPrice ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium text-[10px] sm:text-xs shrink-0">
                        {currency}{item.bundleMinPrice.toLocaleString()} – {currency}{item.bundleMaxPrice.toLocaleString()}
                      </span>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-neutral-400" />
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleProducts.length === 1 && (
                <div className="relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-200 dark:border-white/[0.08] flex items-center justify-center">
                  <Gift className="h-5 w-5 text-neutral-400" />
                </div>
              )}
              {visibleProducts.length === 2 && (
                <>
                  <div className="relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 border-t border-r border-neutral-200 dark:border-white/[0.08] flex items-center justify-center">
                    <Gift className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div className="relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-center">
                    <Gift className="h-5 w-5 text-neutral-400" />
                  </div>
                </>
              )}
              {visibleProducts.length === 3 && (
                <div className="relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-center">
                  <Gift className="h-5 w-5 text-neutral-400" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gift className="h-8 w-8 text-neutral-400" />
            </div>
          )}

          {!isGroup && item.discountValue > 0 && (
            <div className="absolute top-1 left-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shadow-none z-10 flex items-center gap-1">
              -{item.discountValue}{item.discountType === 'percentage' ? '%' : ` ${currency}`}
            </div>
          )}

          {isGroup && (
            <div className="absolute top-1 left-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shadow-none z-10">
              {item.bundles.length} Sizes
            </div>
          )}

          <div className="absolute top-1 right-1 flex items-center bg-neutral-800 text-white p-1 rounded text-[9px] shadow-none z-10">
            <Gift className="h-3 w-3" />
          </div>

          {bundleQty > 0 && (
            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between bg-white dark:bg-surface rounded border border-neutral-200 dark:border-white/[0.08] p-0.5 shadow-none z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateBundleQuantity(item, -1);
                }}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-surface-hover rounded transition-colors text-neutral-500"
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
              <span className="font-mono font-medium text-[11px] tabular-nums text-neutral-900 dark:text-white px-0.5">
                {bundleQty}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateBundleQuantity(item, 1);
                }}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-surface-hover rounded transition-colors text-emerald-600 dark:text-emerald-400"
              >
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          )}
        </div>

        <div className="p-2 space-y-0.5">
          <h3 className={`font-medium text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight line-clamp-2 ${isTouchMode ? 'text-[11px]' : 'text-[12px]'}`}>
            {displayName}
          </h3>

          <div className="flex items-center justify-between gap-1 font-mono font-medium tabular-nums text-[12px]">
            {isGroup ? (
              <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
                From {currency}{minPrice.toLocaleString()}
              </span>
            ) : (
              <>
                <span className="text-[11px] text-neutral-400 line-through truncate">{currency}{item.totalPrice.toLocaleString()}</span>
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0">{currency}{item.finalPrice.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.bundleQty === next.bundleQty &&
      prev.isTouchMode === next.isTouchMode &&
      prev.currency === next.currency &&
      prev.gridCols === next.gridCols &&
      prev.minPrice === next.minPrice &&
      prev.maxPrice === next.maxPrice &&
      prev.isGroup === next.isGroup &&
      prev.displayName === next.displayName &&
      prev.item.id === next.item.id &&
      prev.item.name === next.item.name &&
      prev.item.finalPrice === next.item.finalPrice &&
      prev.item.totalPrice === next.item.totalPrice &&
      prev.item.bundleMinPrice === next.item.bundleMinPrice &&
      prev.item.bundleMaxPrice === next.item.bundleMaxPrice &&
      JSON.stringify(prev.visibleProducts) === JSON.stringify(next.visibleProducts)
    );
  }
);
