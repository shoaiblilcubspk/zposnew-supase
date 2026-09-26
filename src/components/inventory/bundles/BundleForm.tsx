import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MediaLibrary } from '../../../shared/MediaLibrary';
import { Button } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { Bundle, Product } from '../../../types';
import { emptyForm, type BundleForm } from './formTypes';
import { saveBundle } from './saveBundle';
import { FormBasics } from './FormBasics';
import { FormItems } from './FormItems';

interface BundleFormProps {
  editingBundle: Bundle | null;
  products: Product[];
  appSettings: any;
  onClose: () => void;
}

function buildFormFromBundle(bundle: Bundle): BundleForm {
  return {
    name: bundle.name || '',
    description: bundle.description || '',
    image: bundle.image || '',
    barcode: bundle.barcode || '',
    discountValue: bundle.discountValue || 0,
    discountType: bundle.discountType || 'percentage',
    overridePrice: bundle.overridePrice || 0,
    hideItemPrices: bundle.hideItemPrices || false,
    items: (bundle.items || []).map(bi => ({ productId: bi.productId, quantity: bi.quantity })),
  };
}

export function BundleForm({ editingBundle, products, appSettings, onClose }: BundleFormProps) {
  const [form, setForm] = useState<BundleForm>(() =>
    editingBundle ? buildFormFromBundle(editingBundle) : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState<boolean | string>(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  useEffect(() => {
    setForm(editingBundle ? buildFormFromBundle(editingBundle) : emptyForm);
    setProductSearch('');
  }, [editingBundle]);

  const currencySymbol = formatCurrency(0, appSettings.currency).replace('0', '').trim();

  const filteredSearchProducts = products.filter(p =>
    p.active !== false &&
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addProduct = (product: Product) => {
    setForm(prev => {
      const existing = prev.items.find(i => i.productId === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...prev, items: [...prev.items, { productId: product.id, quantity: 1 }] };
    });
    setProductSearch('');
    setShowProductPicker(false);
  };

  const removeItem = (productId: string) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.productId !== productId) }));
  };

  const updateQty = (productId: string, delta: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items
        .map(i => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
        .filter(i => i.quantity > 0),
    }));
  };

  const bundleTotal = form.items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const discountAmount = form.discountType === 'percentage'
    ? (bundleTotal * form.discountValue) / 100
    : Math.min(form.discountValue, bundleTotal);

  const finalPrice = bundleTotal - discountAmount;

  const handleSave = () =>
    saveBundle({ form, editingBundle, products, setSaving, onClose });

  return (
    <div className="animate-in fade-in duration-300 space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose} className="!min-h-0 !p-1.5 !rounded !bg-transparent hover:!bg-neutral-100 dark:hover:!bg-white/5 border border-neutral-200 dark:border-white/[0.08]" icon={<X className="h-4 w-4 text-neutral-500" />} />
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              {editingBundle ? "Edit Bundle / Deal" : "New Bundle / Deal"}
            </h2>
            <p className="text-[11px] text-neutral-500 font-mono">
              {editingBundle ? "Update combo deal pricing and products" : "Configure bundle deal with multiple products and pricing"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 px-3 rounded-md border border-neutral-200 dark:border-white/[0.08] text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
            onClick={onClose}
          >
            {"Cancel"}
          </button>
          <button
            type="button"
            disabled={saving}
            className="h-8 px-4 rounded-md bg-primary hover:bg-primary-hover text-[13px] font-medium text-white transition-colors disabled:opacity-50"
            onClick={handleSave}
          >
            {saving ? "Saving..." : editingBundle ? "Update Bundle" : "Create Bundle"}
          </button>
        </div>
      </div>

      {/* Wide Two-Column Grid matching full Inventory Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Deal Basics & Pricing */}
        <div className="lg:col-span-6 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-none">
          <FormBasics
            form={form}
            setForm={setForm}
            currencySymbol={currencySymbol}
            bundleTotal={bundleTotal}
            onOpenMediaLibrary={() => setShowMediaLibrary(true)}
          />
        </div>

        {/* Right Column: Products & Price Summary */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-none">
            <FormItems
              form={form}
              setForm={setForm}
              products={products}
              appSettings={appSettings}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              showProductPicker={showProductPicker}
              setShowProductPicker={setShowProductPicker}
              filteredSearchProducts={filteredSearchProducts}
              addProduct={addProduct}
              updateQty={updateQty}
              removeItem={removeItem}
            />
          </div>

          {/* Live Price Breakdown */}
          {form.items.length > 0 && (
            <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 space-y-3 shadow-none">
              <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">{"Deal Pricing Breakdown"}</p>
              <div className="space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">{"Original Products Total"}</span>
                  <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(bundleTotal, appSettings.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-600 dark:text-rose-400">{"Deal Discount"} ({form.discountValue}{form.discountType === 'percentage' ? '%' : ' ' + currencySymbol})</span>
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">− {formatCurrency(discountAmount, appSettings.currency)}</span>
                </div>
                <div className="h-px bg-neutral-200 dark:border-white/[0.08] my-2" />
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-bold text-neutral-900 dark:text-white">{"Final Customer Price"}</span>
                  <span className="font-mono font-bold text-primary dark:text-emerald-400 tabular-nums text-base">{formatCurrency(finalPrice, appSettings.currency)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMediaLibrary && (
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
        />
      )}
    </div>
  );
}
