import { BadgeInfo, Wand2, X, Camera } from 'lucide-react';
import { Button, SearchableSelect, SegmentedControl } from '../../../shared/ui';
import { BarcodePreview } from '../../../shared/ui/BarcodePreview';
import { ProductVariants } from './ProductVariants';
import { ProductStatus } from './ProductStatus';
import type { ProductDetailController } from './useProductDetail';

import { useInventoryStore } from '../../../stores/inventoryStore';

export function ProductIdentityDetails({ d }: { d: ProductDetailController }) {
  const { formData, setFormData, generateSku, generateBarcode, setActiveScannerField, setShowScanner } = d;
  const categories = useInventoryStore(s => s.categories);
  const suppliers = useInventoryStore(s => s.suppliers).map(s => s.name);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4">

      <div className="lg:col-span-8 bg-white dark:bg-surface p-4 sm:p-5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex items-center gap-2.5 mb-4">
          <BadgeInfo className="w-4 h-4 text-neutral-400" />
          <div>
            <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Identity Details"}</h3>
            <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Global product properties"}</p>
          </div>
        </div>
        <div className="space-y-4">
          <SegmentedControl
            options={[
              { value: 'simple', label: 'Simple Product' },
              { value: 'variable', label: 'Variable Product' },
            ]}
            value={formData.productType}
            onChange={(v) => setFormData(prev => ({ ...prev, productType: v }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <SearchableSelect
                label={'Category *'.replace(' *', '')}
                options={categories.map(c => ({ id: c, label: c }))}
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
              />
            </div>
            <div className="space-y-1">
              <SearchableSelect
                label={"SUPPLIER"}
                options={[{ id: '', label: 'NONE' }, ...suppliers.map(s => ({ id: s, label: s }))]}
                value={formData.supplier}
                onChange={(val) => setFormData({ ...formData, supplier: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"SKU (Optional)"}</label>
              <div className="relative">
                <input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-2.5 pr-16 rounded-md text-[13px] font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-400 transition-colors"
                  placeholder={"ENTER SKU"}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {formData.sku && (
                    <Button
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, sku: '' })}
                      className="h-6 w-6 !p-0 text-neutral-400 hover:text-rose-500"
                      icon={<X className="w-3.5 h-3.5" />}
                    />
                  )}
                  <Button
                    variant="secondary"
                    onClick={generateSku}
                    className="h-6 w-6 !p-0 rounded"
                    title={"Generate Smart SKU"}
                    icon={<Wand2 className="w-3.5 h-3.5" />}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Barcode / EAN"}</label>
              <div className="relative">
                <input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value.toUpperCase() })}
                  className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-2.5 pr-20 rounded-md text-[13px] font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-400 transition-colors"
                  placeholder={"SCAN BARCODE"}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {formData.barcode && (
                    <Button
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, barcode: '' })}
                      className="h-6 w-6 !p-0 text-neutral-400 hover:text-rose-500"
                      icon={<X className="w-3.5 h-3.5" />}
                    />
                  )}
                  <Button
                    variant="secondary"
                    onClick={generateBarcode}
                    className="h-6 w-6 !p-0 rounded"
                    title={"Generate Barcode"}
                    icon={<Wand2 className="w-3.5 h-3.5" />}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => { setActiveScannerField('barcode'); setShowScanner(true); }}
                    className="h-6 w-6 !p-0 rounded text-neutral-600 dark:text-neutral-300"
                    title={"Scan with Camera"}
                    icon={<Camera className="w-3.5 h-3.5" />}
                  />
                </div>
              </div>
              {formData.barcode && (
                <BarcodePreview value={formData.barcode} />
              )}
            </div>
          </div>
        </div>

        <ProductVariants d={d} />
      </div>

      <ProductStatus d={d} />

    </div>
  );
}
