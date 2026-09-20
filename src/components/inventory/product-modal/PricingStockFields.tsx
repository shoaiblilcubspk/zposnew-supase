import type { ProductFormFieldsProps } from './ProductFormFieldsMain';

export function PricingStockFields(props: ProductFormFieldsProps) {
  const { formData, onFieldChange } = props;

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-4 h-px bg-neutral-300 dark:bg-white/10"></span>
          Pricing & Stock
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
              Selling Price *
            </label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={onFieldChange}
              placeholder="0.00"
              className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] font-mono tabular-nums rounded focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
              Cost Price
            </label>
            <input
              type="text"
              name="cost"
              value={formData.cost}
              onChange={onFieldChange}
              placeholder="0.00"
              className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] font-mono tabular-nums rounded focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className={`flex items-start gap-3 cursor-pointer group p-3 rounded-md border transition-colors ${formData.productType === 'variable'
              ? 'bg-neutral-100/50 dark:bg-white/[0.02] border-neutral-200 dark:border-white/[0.08] opacity-60 cursor-not-allowed'
              : 'bg-neutral-50 dark:bg-surface border-neutral-200 dark:border-white/[0.08] hover:bg-neutral-100 dark:hover:bg-white/[0.04]'
            }`}>
            <input
              type="checkbox"
              name="trackInventory"
              checked={formData.productType === 'variable' ? true : formData.trackInventory}
              onChange={onFieldChange}
              disabled={formData.productType === 'variable'}
              className="w-4 h-4 mt-0.5 rounded border-neutral-300 dark:border-white/10 text-primary disabled:opacity-50"
            />
            <div>
              <div className="text-[13px] font-medium text-neutral-900 dark:text-white flex items-center">
                Track Inventory Quantity
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {formData.productType === 'variable' ? 'Managed by variations below' : 'Maintain real-time stock levels & low stock alerts'}
              </div>
            </div>
          </label>

          {formData.trackInventory && formData.productType === 'simple' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                  Initial Stock
                </label>
                <input
                  type="text"
                  name="stock"
                  value={formData.stock}
                  onChange={onFieldChange}
                  placeholder="0"
                  className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] font-mono tabular-nums rounded focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                  Low Stock Alert (Min)
                </label>
                <input
                  type="text"
                  name="minStock"
                  value={formData.minStock}
                  onChange={onFieldChange}
                  placeholder="5"
                  className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] font-mono tabular-nums rounded focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
