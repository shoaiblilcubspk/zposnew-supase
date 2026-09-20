import { Tag } from 'lucide-react';
import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import type { ProductDetailController } from './useProductDetail';

export function ProductStatus({ d }: { d: ProductDetailController }) {
  const { formData, setFormData, setShowStockIn } = d;

  return (
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white dark:bg-surface p-4 sm:p-5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col justify-between h-fit">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <Tag className="w-4 h-4 text-neutral-400" />
            <div>
              <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Product Status"}</h3>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Status & Controls"}</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08]">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200 flex items-center">
                  {"Active Status"}
                  <HelpTooltip content="Toggles whether this item is selectable or scannable at the POS checkout." />
                </span>
                <span className="text-[11px] text-neutral-500">{"Visible in POS"}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <div className="w-9 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
              formData.productType === 'variable'
                ? 'bg-neutral-50 dark:bg-white/[0.01] border-neutral-200 dark:border-white/[0.08] opacity-60 cursor-not-allowed'
                : 'bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08]'
            }`}>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200 flex items-center">
                  {"Track Stock"}
                  <HelpTooltip content="Maintains physical inventory balance. Unchecking allows infinite sales without stock validation." />
                </span>
                <span className="text-[11px] text-neutral-500">
                  {formData.productType === 'variable' ? 'MANAGED BY VARIATIONS' : 'Inventory Control'}
                </span>
              </div>
              <label className={`relative inline-flex items-center ${formData.productType === 'variable' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.productType === 'variable' ? true : formData.trackInventory}
                  disabled={formData.productType === 'variable'}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({ ...formData, trackInventory: checked });
                    if (checked) setShowStockIn(true);
                  }}
                />
                <div className={`w-9 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${formData.productType === 'variable' ? 'peer-checked:bg-neutral-400' : 'peer-checked:bg-emerald-600'}`}></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08]">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200 flex items-center">
                  {"Service Item"}
                  <HelpTooltip content="Flags item as labor or consultation. Auto-disables stock tracking and ignores low stock warnings." />
                </span>
                <span className="text-[11px] text-neutral-500">{"No Stock Tracking"}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isService}
                  onChange={(e) => setFormData({ ...formData, isService: e.target.checked, trackInventory: e.target.checked ? false : formData.trackInventory })}
                />
                <div className="w-9 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08]">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200 flex items-center">
                  {"Require Serial/IMEI"}
                  <HelpTooltip content="Forces scanner or keyboard prompt at POS for unique serial number / IMEI registration." />
                </span>
                <span className="text-[11px] text-neutral-500">{"Prompt on POS"}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.requireSerial}
                  onChange={(e) => setFormData({ ...formData, requireSerial: e.target.checked })}
                />
                <div className="w-9 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
