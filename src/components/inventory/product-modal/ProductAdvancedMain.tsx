import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import type { ProductFormData } from './useProductForm';
import type { Product, ProductVariant, VariantData, ProductAddon } from '../../../types';
import { VariantsBuilder } from './VariantsBuilder';
import { AddonsBuilder } from './AddonsBuilder';

interface ProductAdvancedProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  variants: ProductVariant[];
  setVariants: React.Dispatch<React.SetStateAction<ProductVariant[]>>;
  variantData: VariantData[];
  setVariantData: React.Dispatch<React.SetStateAction<VariantData[]>>;
  productAddons: ProductAddon[];
  setProductAddons: React.Dispatch<React.SetStateAction<ProductAddon[]>>;
  appProducts: Product[];
  product: Product | null;
}

export function ProductAdvanced({
  formData,
  setFormData,
  variants,
  setVariants,
  variantData,
  setVariantData,
  productAddons,
  setProductAddons,
  appProducts,
  product,
}: ProductAdvancedProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/[0.08]">
      <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
        <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
        {"Universal POS Enhancements"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-start gap-3 cursor-pointer group p-3 bg-white dark:bg-surface rounded-md border border-neutral-300 dark:border-white/[0.12] hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
          <input
            type="checkbox"
            name="isService"
            checked={formData.isService}
            onChange={(e) => setFormData(prev => ({ ...prev, isService: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded border-neutral-300 dark:border-white/10 text-primary"
          />
          <div>
            <div className="text-[13px] font-semibold text-neutral-900 dark:text-white flex items-center">
              {"Service Item"}
              <HelpTooltip content="Flags this item as a non-physical service (e.g. repair fee, labor, consultation). Physical stock tracking will be automatically disabled, and sales will not trigger negative stock warnings." />
            </div>
            <div className="text-[12px] text-neutral-600 dark:text-neutral-400 mt-0.5">Labor, Delivery, Consultation (No Stock)</div>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group p-3 bg-white dark:bg-surface rounded-md border border-neutral-300 dark:border-white/[0.12] hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
          <input
            type="checkbox"
            name="requireSerial"
            checked={formData.requireSerial}
            onChange={(e) => setFormData(prev => ({ ...prev, requireSerial: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded border-neutral-300 dark:border-white/10 text-primary"
          />
          <div>
            <div className="text-[13px] font-semibold text-neutral-900 dark:text-white flex items-center">
              {"Require Serial IMEI"}
              <HelpTooltip content="When enabled, cashier will be prompted to enter or scan the device's unique Serial Number / IMEI before adding this item to the POS cart." />
            </div>
            <div className="text-[12px] text-neutral-600 dark:text-neutral-400 mt-0.5">Force scanner prompt at POS checkout</div>
          </div>
        </label>
      </div>

      {/* Expiry Tracking Section */}
      <div className="p-3 bg-white dark:bg-surface rounded-md border border-neutral-300 dark:border-white/[0.12] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-neutral-900 dark:text-white">
              {"Product Expiry Date"}
            </span>
            <HelpTooltip content="Sets product expiration date. When approaching or past expiry, warning badges appear in inventory and at POS checkout." />
          </div>
          {formData.expiryDate && (
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, expiryDate: '' }))}
              className="text-[11px] text-rose-500 hover:underline"
            >
              Clear Expiry
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              className="w-full h-8 px-2.5 text-[12.5px] bg-neutral-50 dark:bg-black/20 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
              Alert Days Before Expiry
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={formData.expiryAlertDays}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryAlertDays: e.target.value }))}
              className="w-full h-8 px-2.5 text-[12.5px] font-mono bg-neutral-50 dark:bg-black/20 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
              placeholder="90"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Quick Presets:</span>
          {[
            { label: '+3 Months (Default)', months: 3 },
            { label: '+6 Months', months: 6 },
            { label: '+1 Year', months: 12 },
          ].map((preset) => (
            <button
              key={preset.months}
              type="button"
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() + preset.months);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                setFormData(prev => ({ ...prev, expiryDate: `${yyyy}-${mm}-${dd}` }));
              }}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {formData.productType === 'variable' && (
        <VariantsBuilder
          formData={formData}
          setFormData={setFormData}
          variants={variants}
          setVariants={setVariants}
          variantData={variantData}
          setVariantData={setVariantData}
        />
      )}

      <AddonsBuilder
        productAddons={productAddons}
        setProductAddons={setProductAddons}
        appProducts={appProducts}
        product={product}
      />
    </div>
  );
}
