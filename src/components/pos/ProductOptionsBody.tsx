import { Product, ProductVariant, CartAddonItem, ProductAddon } from '../../types';
import { Plus, Minus } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';

interface ProductOptionsBodyProps {
  product: Product;
  appProducts: any[];
  appSettings: any;
  childVariations: Product[];
  selectedVariationChildId: string;
  setSelectedVariationChildId: (id: string) => void;
  selectedVariants: Record<string, string>;
  setSelectedVariants: (v: Record<string, string>) => void;
  addonItems: CartAddonItem[];
  updateAddonQuantity: (addon: ProductAddon, delta: number) => void;
  serialNumber: string;
  setSerialNumber: (v: string) => void;
}

export function ProductOptionsBody({ product, appProducts, appSettings, childVariations, selectedVariationChildId, setSelectedVariationChildId, selectedVariants, setSelectedVariants, addonItems, updateAddonQuantity, serialNumber, setSerialNumber }: ProductOptionsBodyProps) {
  return (
    <div className="space-y-6">

      {product.productType === 'variable' && childVariations.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2">
            {"Select Variation"}
          </h4>
          <div className="grid grid-cols-1 gap-1.5">
            {childVariations.map(child => {
              const isOutOfStock = child.trackInventory && child.stock <= 0;
              return (
                <button
                  key={child.id}
                  onClick={() => !isOutOfStock && setSelectedVariationChildId(child.id)}
                  disabled={isOutOfStock}
                  className={`text-left p-2.5 rounded-md border transition-colors shadow-none ${
                    selectedVariationChildId === child.id
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : isOutOfStock
                        ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-white/5 opacity-50 cursor-not-allowed'
                        : 'bg-white dark:bg-surface text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium">{child.name.replace(`${product.name} - `, '')}</span>
                    <span className="text-[13px] font-mono font-medium tabular-nums">
                      {formatCurrency(child.price, appSettings.currency)}
                    </span>
                  </div>
                  {child.trackInventory && (
                    <div className={`text-[11px] font-mono mt-0.5 ${
                      selectedVariationChildId === child.id ? 'text-emerald-600 dark:text-emerald-400' : isOutOfStock ? 'text-rose-500' : 'text-neutral-400'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : `Stock: ${child.stock}`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : product.variants && product.variants.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider border-b border-neutral-200 dark:border-white/[0.08] pb-1.5">
            {"Select Variants"}
          </h4>
          {product.variants.map((variant: ProductVariant) => (
            <div key={variant.name} className="space-y-1.5">
              <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{variant.name}</label>
              <div className="flex flex-wrap gap-1.5">
                {variant.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedVariants({ ...selectedVariants, [variant.name]: opt })}
                    className={`px-3 h-8 text-[13px] font-medium rounded border transition-colors shadow-none ${
                      selectedVariants[variant.name] === opt
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {product.productAddons && product.productAddons.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider border-b border-neutral-200 dark:border-white/[0.08] pb-1.5">
            {"Add-ons & Extras"}
          </h4>
          <div className="grid grid-cols-1 gap-1.5">
            {product.productAddons
              .filter(addon => addon.active)
              .map((addon) => {
                const cartItem = addonItems.find(item => item.addon.id === addon.id);
                const quantity = cartItem ? cartItem.quantity : 0;
                const addonProduct = appProducts.find(p => p.id === addon.addonProductId);
                const isOutOfStock = addonProduct?.trackInventory && (addonProduct.stock || 0) <= 0;

                return (
                  <div
                    key={addon.id}
                    className={`flex items-center justify-between p-2.5 rounded-md border transition-colors shadow-none ${
                      quantity > 0
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isOutOfStock
                          ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-white/5 opacity-50'
                          : 'bg-white dark:bg-surface border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-[13px] font-medium ${quantity > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                        {addon.name}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500 mt-0.5">
                        +{formatCurrency(addon.price, appSettings.currency)} {isOutOfStock ? '(Out of Stock)' : ''}
                      </span>
                    </div>

                    {!isOutOfStock && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-white/[0.08] p-0.5 shadow-none">
                          <button
                            onClick={() => updateAddonQuantity(addon, -1)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-[12px] font-mono font-medium text-neutral-900 dark:text-white">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateAddonQuantity(addon, 1)}
                            disabled={quantity >= addon.maxQty}
                            className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded transition-colors disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {product.requireSerial && (
        <div className="space-y-4">
          <h4 className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider border-b border-neutral-200 dark:border-white/[0.08] pb-1.5">
            {"Device Registration"}
          </h4>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{"Serial Number / IMEI *"}</label>
            <input
              type="text"
              autoFocus
              placeholder={"Scan or type serial number..."}
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
              className="w-full bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] font-mono rounded h-8 px-2.5 focus:border-primary focus:outline-none placeholder:text-neutral-400 placeholder:font-normal"
            />
          </div>
        </div>
      )}

    </div>
  );
}
