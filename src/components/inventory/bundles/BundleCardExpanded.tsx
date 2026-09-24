import { Package } from 'lucide-react';
import { ProductThumb } from '../../../shared/ui/ProductThumb';
import { formatCurrency } from '../../../lib/currencies';
import type { Bundle, Product } from '../../../types';

interface BundleCardExpandedProps {
  bundle: Bundle;
  products: Product[];
  appSettings: any;
  totalPrice: number;
  finalAmt: number;
}

export function BundleCardExpanded({ bundle, products, appSettings, totalPrice, finalAmt }: BundleCardExpandedProps) {
  return (
    <div className="border-t border-gray-100 dark:border-white/5 px-4 pb-4 pt-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
      {bundle.description && (
        <p className="text-[11px] text-gray-500 italic mb-2">"{bundle.description}"</p>
      )}
      {(bundle.items || []).slice(0, 5).map(bi => {
        const product = products.find(p => p.id === bi.productId);
        if (!product) return <p key={bi.id} className="text-[10px] text-red-400">{"Product not found (ID: {id})".replace('{id}', bi.productId)}</p>;
        return (
          <div key={bi.id} className="flex items-center gap-3">
            <div className="h-7 w-7 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 dark:border-white/5">
              {product.image ? (
                <ProductThumb image={product.image} fallback={<Package className="h-3.5 w-3.5 text-primary" />} />
              ) : (
                <Package className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <span className="flex-1 text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase truncate">{product.name}</span>
            <span className="text-[10px] text-gray-500 font-bold">×{bi.quantity}</span>
            <span className="text-[11px] font-black text-gray-900 dark:text-white">{formatCurrency(product.price * bi.quantity, appSettings.currency)}</span>
          </div>
        );
      })}
      {bundle.items && bundle.items.length > 5 && (
        <p className="text-[10px] text-primary font-black uppercase tracking-widest text-center pt-1 animate-pulse">
          + {(bundle.items.length - 5)} {"more items"}...
        </p>
      )}
      {finalAmt < totalPrice && (
        <>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
            <span className="text-[10px] text-gray-500">{"Before Discount"}</span>
            <span className="text-[11px] font-black text-gray-900 dark:text-white line-through">{formatCurrency(totalPrice, appSettings.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-primary dark:text-emerald-400 font-black">{"Bundle Price"}</span>
            <span className="text-sm font-black text-primary dark:text-emerald-400">{formatCurrency(finalAmt, appSettings.currency)}</span>
          </div>
        </>
      )}
      {finalAmt >= totalPrice && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
          <span className="text-[10px] text-gray-500">{"Price"}</span>
          <span className="text-sm font-black text-primary dark:text-emerald-400">{formatCurrency(finalAmt, appSettings.currency)}</span>
        </div>
      )}
    </div>
  );
}
