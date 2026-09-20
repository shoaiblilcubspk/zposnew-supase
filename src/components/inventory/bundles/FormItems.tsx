import { X, Info, Package } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SharedSearchBar, SharedProductList } from '../../../shared/modules/search-and-list';
import { formatCurrency } from '../../../lib/currencies';
import type { Product } from '../../../types';
import type { BundleForm } from './formTypes';

interface FormItemsProps {
  form: BundleForm;
  setForm: (updater: (prev: BundleForm) => BundleForm) => void;
  products: Product[];
  appSettings: any;
  productSearch: string;
  setProductSearch: (val: string) => void;
  showProductPicker: boolean | string;
  setShowProductPicker: (val: boolean | string) => void;
  filteredSearchProducts: Product[];
  addProduct: (product: Product) => void;
  updateQty: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
}

export function FormItems({
  form,
  products,
  appSettings,
  productSearch,
  setProductSearch,
  showProductPicker,
  setShowProductPicker,
  filteredSearchProducts,
  addProduct,
  updateQty,
  removeItem,
}: FormItemsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{"Products in Bundle *"}</label>
        <span className="text-[9px] font-black text-gray-400">
          {"{count} products".replace('{count}', String(form.items.length))}
        </span>
      </div>

      {/* Product search — shared module */}
      <div className="relative mb-3">
        <SharedSearchBar
          value={showProductPicker === true ? productSearch : ''}
          onChange={val => { setProductSearch(val); setShowProductPicker(true); }}
          onFocus={() => { setProductSearch(''); setShowProductPicker(true); }}
          placeholder={"Search product name..."}
        />
        {showProductPicker === true && productSearch && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50">
            <SharedProductList
              items={filteredSearchProducts.slice(0, 8)}
              onItemAdd={(id) => {
                const p = products.find(x => x.id === id);
                if (p) addProduct(p);
              }}
              emptyStateText={"No product found"}
              maxHeight={192}
              className="rounded-md shadow-lg"
            />
          </div>
        )}
      </div>

      {/* Selected items */}
      {form.items.length === 0 ? (
        <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-surface rounded-md border border-dashed border-neutral-200 dark:border-white/[0.08]">
          <Info className="h-4 w-4 text-neutral-400 shrink-0" />
          <p className="text-[12px] text-neutral-500">{"Search and add products above"}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {form.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return null;
            return (
              <div key={item.productId} className="flex items-center gap-2.5 p-2 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08]">
                <div className="h-7 w-7 bg-neutral-100 dark:bg-white/5 rounded border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  {product.image ? <img src={product.image} className="h-full w-full rounded object-cover" /> : <Package className="h-3.5 w-3.5 text-neutral-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-neutral-900 dark:text-white uppercase truncate">{product.name}</p>
                  <p className="text-[11px] font-mono text-neutral-500">{formatCurrency(product.price * item.quantity, appSettings.currency)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateQty(item.productId, -1)} className="w-5 h-5 rounded border border-neutral-200 dark:border-white/[0.08] bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:text-rose-500 text-[12px] font-mono font-medium flex items-center justify-center">−</button>
                  <span className="w-5 text-center text-[12px] font-mono font-medium text-neutral-900 dark:text-white">{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.productId, 1)} className="w-5 h-5 rounded border border-neutral-200 dark:border-white/[0.08] bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:text-emerald-500 text-[12px] font-mono font-medium flex items-center justify-center">+</button>
                </div>
                <button type="button" onClick={() => removeItem(item.productId)} className="p-1 rounded text-neutral-400 hover:text-rose-500 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
