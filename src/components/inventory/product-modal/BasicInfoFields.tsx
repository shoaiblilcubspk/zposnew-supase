import { Camera, Wand2, Plus } from 'lucide-react';
import { SegmentedControl, Button, Select } from '../../../shared/ui';
import { BarcodePreview } from '../../../shared/ui/BarcodePreview';
import type { ProductFormFieldsProps } from './ProductFormFieldsMain';

export function BasicInfoFields(props: ProductFormFieldsProps) {
  const {
    formData,
    setFormData,
    categories,
    suppliers,
    onFieldChange,
    onGenerateSku,
    onGenerateBarcode,
    onAddCategory,
    onAddSupplier,
    onOpenScanner,
  } = props;

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2">
        <span className="w-4 h-px bg-neutral-300 dark:bg-white/10"></span>
        Product Details
      </h3>

      <SegmentedControl
        options={[
          { value: 'simple', label: 'Simple Product' },
          { value: 'variable', label: 'Variable Product' },
        ]}
        value={formData.productType}
        onChange={(v) => setFormData(prev => ({ ...prev, productType: v }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onFieldChange}
            placeholder="Enter product name..."
            className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] rounded focus:border-primary focus:outline-none transition-colors placeholder:text-neutral-400"
          />
        </div>

        <div>
          <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
            Category *
          </label>
          <div className="flex gap-1.5">
            <div className="flex-1">
              <Select
                name="category"
                value={formData.category}
                onChange={onFieldChange}
                className="!h-8 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-200 dark:!border-white/[0.08]"
              >
                <option value="" disabled>Select Category</option>
                {categories.map(c => <option key={c} value={c} className="dark:bg-surface">{c}</option>)}
              </Select>
            </div>
            <Button type="button" variant="ghost" onClick={onAddCategory} title="Add New Category" className="!min-h-0 !w-8 !h-8 !p-0 !rounded !bg-white dark:!bg-surface hover:!bg-neutral-100 dark:hover:!bg-white/5 border border-neutral-200 dark:border-white/[0.08] !text-neutral-600 dark:!text-neutral-400 shrink-0" icon={<Plus className="w-3.5 h-3.5" />} />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
            Supplier
          </label>
          <div className="flex gap-1.5">
            <div className="flex-1">
              <Select
                name="supplier"
                value={formData.supplier}
                onChange={onFieldChange}
                className="!h-8 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-200 dark:!border-white/[0.08]"
              >
                <option value="">Select Supplier (Optional)</option>
                {suppliers.map(s => <option key={s} value={s} className="dark:bg-surface">{s}</option>)}
              </Select>
            </div>
            <Button type="button" variant="ghost" onClick={onAddSupplier} title="Add New Supplier" className="!min-h-0 !w-8 !h-8 !p-0 !rounded !bg-white dark:!bg-surface hover:!bg-neutral-100 dark:hover:!bg-white/5 border border-neutral-200 dark:border-white/[0.08] !text-neutral-600 dark:!text-neutral-400 shrink-0" icon={<Plus className="w-3.5 h-3.5" />} />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
            SKU
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={onFieldChange}
              placeholder="e.g. SHIRT-101"
              className="flex-1 min-w-0 h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] font-mono rounded focus:border-primary focus:outline-none transition-colors uppercase placeholder:text-neutral-400"
            />
            <Button type="button" variant="ghost" onClick={onGenerateSku} title="Auto-generate SKU" className="!min-h-0 !w-8 !h-8 !p-0 !rounded !bg-emerald-500/10 hover:!bg-emerald-500/20 border border-emerald-500/20 !text-emerald-600 dark:!text-emerald-400 shrink-0" icon={<Wand2 className="w-3.5 h-3.5" />} />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
            Barcode
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={onFieldChange}
              placeholder="Scan or generate..."
              className="flex-1 min-w-0 h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] font-mono rounded focus:border-primary focus:outline-none transition-colors uppercase placeholder:text-neutral-400"
            />
            <Button type="button" variant="ghost" onClick={onGenerateBarcode} title="Generate Barcode" className="!min-h-0 !w-8 !h-8 !p-0 !rounded !bg-emerald-500/10 hover:!bg-emerald-500/20 border border-emerald-500/20 !text-emerald-600 dark:!text-emerald-400 shrink-0" icon={<Wand2 className="w-3.5 h-3.5" />} />
            <Button type="button" variant="ghost" onClick={onOpenScanner} title="Camera Scanner" className="!min-h-0 !w-8 !h-8 !p-0 !rounded !bg-neutral-100 dark:!bg-surface hover:!bg-neutral-200 dark:hover:!bg-white/5 border border-neutral-200 dark:border-white/[0.08] !text-neutral-600 dark:!text-neutral-400 shrink-0" icon={<Camera className="w-3.5 h-3.5" />} />
          </div>
          {formData.barcode && (
            <div className="mt-2">
              <BarcodePreview value={formData.barcode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
