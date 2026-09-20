import { Camera, X } from 'lucide-react';
import { Button } from '../../../shared/ui';
import type { ProductFormFieldsProps } from './ProductFormFieldsMain';

export function MediaConfigFields(props: ProductFormFieldsProps) {
  const {
    formData,
    setFormData,
    onOpenMediaLibrary,
    onFieldChange,
  } = props;

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
          {"Visual Assets"}
        </h3>

        <div className="flex flex-col sm:flex-row gap-3.5 items-start">
          <div className="relative w-20 h-20 rounded-md bg-neutral-50 dark:bg-surface border border-neutral-300 dark:border-white/[0.12] flex items-center justify-center shrink-0">
            {formData.image ? (
              <>
                <img src={formData.image} alt="Product" className="w-full h-full object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  title="Remove image"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 bg-neutral-900/80 hover:bg-rose-600 text-white z-10"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </>
            ) : (
              <Camera className="w-5 h-5 text-neutral-400" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={onOpenMediaLibrary}
                className="!h-8 !px-3 !rounded-md !text-[13px] !font-medium"
              >
                Choose Image
              </Button>
            </div>
            <p className="text-[12px] text-neutral-600 dark:text-neutral-400">Supports WebP, JPG, PNG · Max 50KB</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-neutral-200 dark:border-white/[0.08] flex flex-wrap gap-4 sm:gap-6">
        {['taxable', 'active'].map((field) => (
          <label key={field} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name={field}
              checked={(formData as any)[field]}
              onChange={onFieldChange}
              className="w-4 h-4 rounded border-neutral-300 dark:border-white/10 text-primary"
            />
            <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
              {field === 'taxable' ? "Taxable" : "Active Item"}
            </span>
          </label>
        ))}
      </div>
    </>
  );
}
