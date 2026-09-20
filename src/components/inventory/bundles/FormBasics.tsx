import { Package, Tag, Percent, DollarSign, X } from 'lucide-react';
import { Button } from '../../../shared/ui';
import type { BundleForm } from './formTypes';

interface FormBasicsProps {
  form: BundleForm;
  setForm: (updater: (prev: BundleForm) => BundleForm) => void;
  currencySymbol: string;
  bundleTotal: number;
  onOpenMediaLibrary: () => void;
}

export function FormBasics({ form, setForm, currencySymbol, bundleTotal, onOpenMediaLibrary }: FormBasicsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">{"Deal Name *"}</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder={"e.g. Summer Deal, Family Pack, Combo Offer"}
            className="input w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Deal Image</label>
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-20 rounded-md bg-neutral-100 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center shrink-0">
              {form.image ? (
                <>
                  <img src={form.image} alt="Deal" className="w-full h-full object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, image: '' }))}
                    title="Remove image"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 bg-neutral-900/80 hover:bg-rose-600 text-white z-10"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </>
              ) : (
                <Package className="h-6 w-6 text-neutral-400" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                onClick={onOpenMediaLibrary}
              >
                {form.image ? 'Change Image' : 'Upload / Choose Image'}
              </Button>
              <span className="text-[9px] text-gray-400">Recommended: 900×650px</span>
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">{"Description"} ({"Optional"})</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder={"Brief description of the bundle"}
            className="input w-full text-sm"
          />
        </div>
      </div>

      {/* Override Price (Fixed Price Mode) */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{"Pricing Mode *"}</label>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex bg-neutral-100 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-0.5 gap-1">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, overridePrice: 0 }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono transition-colors ${!form.overridePrice ? 'bg-primary text-white font-medium' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              <Tag className="h-3 w-3" /> {"Discount from Base"}
            </button>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, overridePrice: 1 }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono transition-colors ${form.overridePrice > 0 ? 'bg-primary text-white font-medium' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              <DollarSign className="h-3 w-3" /> {"Set Fixed Price"}
            </button>
          </div>
        </div>
        {form.overridePrice > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-gray-500">{currencySymbol}</span>
            <input
              type="number"
              min={0}
              value={form.overridePrice}
              onChange={e => setForm(p => ({ ...p, overridePrice: Math.max(0, Number(e.target.value)) }))}
              placeholder={"Final Price"}
              className="input flex-1 text-sm text-center font-black"
            />
          </div>
        ) : (
          <>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500 mb-1.5">{"Discount Amount *"}</label>
            <div className="flex items-center gap-2">
              <div className="flex bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] rounded-md p-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, discountType: 'percentage' }))}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${form.discountType === 'percentage' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                >
                  <Percent className="h-3 w-3" /> {"Percentage"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, discountType: 'fixed' }))}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${form.discountType === 'fixed' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                >
                  <DollarSign className="h-3 w-3" /> {"Fixed"}
                </button>
              </div>
              <input
                type="number"
                min={0}
                max={form.discountType === 'percentage' ? 100 : bundleTotal}
                value={form.discountValue}
                onChange={e => setForm(p => ({ ...p, discountValue: Math.max(0, Math.min(Number(e.target.value), form.discountType === 'percentage' ? 100 : bundleTotal)) }))}
                placeholder={form.discountType === 'percentage' ? '0-100' : "Amount"}
                className="input h-8 flex-1 text-[13px] text-center font-mono"
              />
              <span className="text-[12px] font-mono text-neutral-500">{form.discountType === 'percentage' ? '%' : currencySymbol}</span>
            </div>
          </>
        )}
      </div>

      {/* Receipt Display Option */}
      <div className="bg-neutral-50 dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[12px] font-medium text-neutral-900 dark:text-white uppercase tracking-wider">
              Hide Per-Item Original Prices
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-normal">
              {form.hideItemPrices
                ? 'Receipt & POS will only show the deal\'s final price, not individual item prices'
                : 'Individual original prices shown alongside deal discount on receipt & POS cart'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, hideItemPrices: !p.hideItemPrices }))}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              form.hideItemPrices
                ? 'bg-primary'
                : 'bg-neutral-300 dark:bg-white/10'
            }`}
            aria-checked={form.hideItemPrices}
            role="switch"
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                form.hideItemPrices ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </>
  );
}
