import { memo } from 'react';
import { Package, Plus, Minus, Infinity as InfinityIcon } from 'lucide-react';
import { Product } from '../../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (product: Product, delta: number) => void;
  cartQuantity?: number;
  currency: string;
  isTouchMode: boolean;
  gridCols?: number;
}

export const ProductCard = memo(function ProductCard({ product, onAddToCart, onUpdateQuantity, cartQuantity = 0, isTouchMode, currency, gridCols = 4 }: ProductCardProps) {
  const shouldTrackInventory = product.trackInventory !== false;
  const isNegativeStock = shouldTrackInventory && product.stock < 0;
  const isNoStock = shouldTrackInventory && product.stock === 0;
  const isLowStock = shouldTrackInventory && product.stock > 0 && product.stock <= (product.minStock || 5);
  const isInfinite = !shouldTrackInventory || product.stock >= 990000;

  return (
    <div
      onClick={() => {
        onAddToCart(product);
      }}
      className={`group relative bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden transition-colors hover:border-neutral-300 dark:hover:border-white/20 cursor-pointer shadow-none ${
        cartQuantity !== 0 ? 'border-emerald-500/50 ring-1 ring-emerald-500/50 bg-emerald-500/[0.02]' : ''
      }`}
      style={{
        minHeight: (typeof window !== 'undefined' && window.innerWidth >= 1024)
          ? (gridCols === 0 || gridCols >= 4 ? (isTouchMode ? '120px' : '140px') :
            gridCols === 3 ? (isTouchMode ? '150px' : '180px') :
              (isTouchMode ? '180px' : '220px'))
          : (isTouchMode ? '120px' : '140px')
      }}
    >
      <div className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${isTouchMode ? 'aspect-square' : 'aspect-[4/3]'}`}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className={`${isTouchMode ? 'h-7 w-7' : 'h-5 w-5'} text-neutral-400`} />
          </div>
        )}

        {cartQuantity !== 0 && (
          <div className="absolute inset-x-1 bottom-1 flex items-center justify-between bg-white dark:bg-surface rounded border border-neutral-200 dark:border-white/[0.08] p-0.5 shadow-none z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity?.(product, -1);
              }}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-surface-hover rounded transition-colors text-neutral-500"
            >
              <Minus className="h-2.5 w-2.5" />
            </button>
            <span className="font-mono font-medium text-[11px] tabular-nums text-neutral-900 dark:text-white px-0.5">
              {cartQuantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity?.(product, 1);
              }}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-surface-hover rounded transition-colors text-emerald-600 dark:text-emerald-400"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {cartQuantity === 0 && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-1.5 rounded shadow-sm">
                <Plus className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        )}

        <div className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border shadow-sm z-10 ${isInfinite
          ? 'bg-neutral-900/95 dark:bg-neutral-100/95 text-white dark:text-neutral-900 border-neutral-700 dark:border-neutral-200 font-mono'
          : isNegativeStock
            ? 'bg-rose-600 text-white border-rose-600 font-mono tabular-nums'
            : isNoStock
              ? 'bg-rose-600 text-white border-rose-600 font-sans tracking-wide uppercase'
              : isLowStock
                ? 'bg-amber-500 text-white border-amber-500 font-mono tabular-nums'
                : 'bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-700 font-mono tabular-nums'
          }`}>
          {isInfinite
            ? <InfinityIcon className="h-3 w-3" />
            : isNegativeStock
              ? product.stock
              : isNoStock
                ? "NO STOCK"
                : product.stock
          }
        </div>
      </div>

      <div className="p-2 space-y-0.5">
        <h3 className={`font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-snug break-words line-clamp-2 ${isTouchMode ? 'text-[12px]' : 'text-[13px]'}`}>
          {product.name}
        </h3>
        <div className="flex items-center justify-between pt-0.5">
          <div className="text-emerald-600 dark:text-emerald-400 font-mono font-bold tabular-nums text-[13px]">
            {currency}{product.price.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.cartQuantity === next.cartQuantity &&
    prev.isTouchMode === next.isTouchMode &&
    prev.currency === next.currency &&
    prev.gridCols === next.gridCols &&
    prev.product.id === next.product.id &&
    prev.product.name === next.product.name &&
    prev.product.price === next.product.price &&
    prev.product.stock === next.product.stock &&
    prev.product.image === next.product.image &&
    prev.product.active === next.product.active &&
    prev.product.trackInventory === next.product.trackInventory &&
    prev.product.minStock === next.product.minStock
  )
});
