import { ArrowLeft, Package, Camera, BadgeInfo, ShieldAlert, Edit3, X } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';
import type { ProductDetailController } from './useProductDetail';

export function ProductDetailHeader({ d }: { d: ProductDetailController }) {
  const {
    product, onBack, formData, isEditMode, setIsEditMode, setShowMediaLibrary,
    isInfinite, isOut, isLow, stockPct,
  } = d;

  return (
    <div className="bg-white dark:bg-surface border-b border-neutral-200 dark:border-white/[0.08] px-4 sm:px-6 py-4 rounded-t-md relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative">
        <Button variant="secondary" onClick={onBack} className="absolute left-0 top-0 sm:relative h-8 w-8 !p-0 rounded-md z-20" icon={<ArrowLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />} />

        <div className="relative group/img mt-2 sm:mt-0">
          <div className="w-16 h-16 rounded-md bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
            {formData.image ? <img src={formData.image} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-neutral-400" />}
          </div>

          {isEditMode && formData.image && (
            <button
              type="button"
              onClick={() => d.setFormData(prev => ({ ...prev, image: '' }))}
              title="Remove image"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 bg-neutral-900/80 hover:bg-rose-600 text-white z-10"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          )}

          {isEditMode && (
            <div className="absolute -bottom-1 -right-1">
              <Button
                variant="primary"
                onClick={() => setShowMediaLibrary(true)}
                className="h-6 w-6 !p-0 rounded-md shadow-none"
                icon={<Camera className="w-3.5 h-3.5" />}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-0.5 text-[11px] font-mono rounded border ${
              isOut
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : isLow
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}>
              {isInfinite ? 'Infinity Mode' : isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
            </span>

            {d.canEditProduct && (
              <Button
                variant={isEditMode ? 'danger' : 'secondary'}
                onClick={() => setIsEditMode(!isEditMode)}
                className="h-7 px-2.5 text-[12px] font-medium rounded-md ml-auto sm:ml-2"
              >
                {isEditMode ? <><X className="h-3 w-3 mr-1" /> {"Cancel"}</> : <><Edit3 className="h-3 w-3 mr-1" /> {"Edit"}</>}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1 w-full max-w-xs sm:max-w-none">
            {isEditMode ? (
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] px-3 py-1.5 rounded-md text-[16px] font-medium text-neutral-900 dark:text-white outline-none focus:border-primary text-center sm:text-left transition-colors"
                placeholder={'Product Name *'.replace(' *', '')}
              />
            ) : (
              <h2 className="text-lg font-medium text-neutral-900 dark:text-white tracking-tight line-clamp-1">{product.name}</h2>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">{"SKU"}</p>
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400 font-bold">{product.sku}</span>
              </div>
              <div className="w-px h-6 bg-gray-100 dark:bg-white/5" />
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">{"Category"}</p>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-bold">{product.category}</span>
              </div>
            </div>
          </div>
        </div>



        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 flex-shrink-0 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
          {[
            { label: 'Stock', value: isInfinite ? '∞' : `${product.stock}`, color: isLow || isOut ? 'text-red-500' : 'text-gray-900 dark:text-white' },
            { label: 'Sales', value: `${d.totalSoldUnits}`, color: 'text-gray-900 dark:text-white' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-gray-600 font-bold">{stat.label}</p>
            </div>
          ))}
          <div className="w-28">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1 font-bold">
              <span>{"Health"}</span>
              <span>{stockPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isLow || isOut ? 'bg-gradient-to-r from-red-400 to-red-500' : stockPct < 60 ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-6 px-6 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
          <BadgeInfo className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">{"Integrated Smart Hub"}</span>
        </div>
        {isEditMode && (
          <div className="flex items-center gap-2 bg-amber-500/5 px-3 py-1.5 rounded-full border border-amber-500/10 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">{"Edit Mode Active"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
