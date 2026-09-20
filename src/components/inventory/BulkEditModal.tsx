import { useProductsStore } from '../../stores';
import { useState } from 'react';
import { DollarSign, Tag, User, Image as ImageIcon, CheckCircle2, Loader2, X } from 'lucide-react';
import { productsService } from '../../lib/services';
import { Product } from '../../types';
import { sonner } from '../../lib/sonner';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { MediaLibrary } from '../../shared/MediaLibrary';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  categories: string[];
  suppliers: string[];
}

export function BulkEditModal({ isOpen, onClose, selectedIds, categories, suppliers }: BulkEditModalProps) {
  const appProducts = useProductsStore(s => s.products);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Filter out 'All' from categories and suppliers for selection
  const availableCategories = categories.filter(c => c !== 'All' && c !== '');
  const availableSuppliers = suppliers.filter(s => s !== 'All' && s !== '');

  // Form State for Overrides
  const [updates, setUpdates] = useState<{
    price?: number;
    cost?: number;
    category?: string;
    supplier?: string;
    active?: boolean;
    taxable?: boolean;
    image?: string;
  }>({});

  const handleApply = async () => {
    if (selectedIds.length === 0) return;
    setIsUpdating(true);

    try {
      let updateCount = 0;
      for (const id of selectedIds) {
        const product = appProducts.find(p => p.id === id);
        if (!product) continue;

        const updatedData: Partial<Product> = {};
        if (updates.price !== undefined) updatedData.price = updates.price;
        if (updates.cost !== undefined) updatedData.cost = updates.cost;
        if (updates.category !== undefined) updatedData.category = updates.category;
        if (updates.supplier !== undefined) updatedData.supplier = updates.supplier;
        if (updates.active !== undefined) updatedData.active = updates.active;
        if (updates.taxable !== undefined) updatedData.taxable = updates.taxable;
        if (updates.image !== undefined) updatedData.image = updates.image;

        if (Object.keys(updatedData).length > 0) {
          await productsService.updateProduct(id, updatedData);
          updateCount++;
        }
      }

      sonner.success("Bulk Update Applied", {
        description: `Successfully updated ${updateCount} products.`
      });
      onClose();
    } catch (err: any) {
      sonner.error("Update Failed", {
        description: err.message || "Failed to update selected products."
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-[11px] font-mono text-neutral-500">
        Targets: <strong className="text-neutral-900 dark:text-white">{selectedIds.length}</strong> items
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isUpdating}
          className="h-8 px-3 text-[13px]"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleApply}
          disabled={isUpdating}
          className="h-8 px-4 text-[13px]"
          icon={isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        >
          Apply Bulk Changes
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Batch Edit Products"
        description="Fields left unchanged or blank will remain as they currently are on each target product."
        size="lg"
        footer={footer}
      >
        <div className="space-y-6">
          {/* Financial Overrides */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
              {"Financial Overrides"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Retail Price"}</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="number"
                    placeholder={"No Change"}
                    className="w-full h-8 pl-8 pr-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                    onChange={(e) => setUpdates(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Acquisition Cost"}</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="number"
                    placeholder={"No Change"}
                    className="w-full h-8 pl-8 pr-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                    onChange={(e) => setUpdates(prev => ({ ...prev, cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Classification Matrix */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
              {"Classification Matrix"}
            </h3>
            <div className="space-y-3.5 relative z-30">
              <SearchableSelect
                label={"Global Category"}
                options={[{ id: '', label: "no_change" }, ...availableCategories.map(cat => ({ id: cat, label: cat }))]}
                value={updates.category || ''}
                onChange={(val) => setUpdates(prev => ({ ...prev, category: val || undefined }))}
                icon={Tag}
              />
              <SearchableSelect
                label={"Primary Supplier"}
                options={[{ id: '', label: "no_change" }, ...availableSuppliers.map(sup => ({ id: sup, label: sup }))]}
                value={updates.supplier || ''}
                onChange={(val) => setUpdates(prev => ({ ...prev, supplier: val || undefined }))}
                icon={User}
              />
            </div>
          </div>

          {/* Media Asset Override */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
              {"Media Asset Override"}
            </h3>
            <div>
              <div
                className="flex flex-col items-center justify-center p-5 bg-neutral-50 dark:bg-app rounded-md border-2 border-dashed border-neutral-300 dark:border-white/[0.12] hover:border-primary/40 transition-colors cursor-pointer group gap-2.5"
                onClick={() => setShowMediaLibrary(true)}
              >
                <div className="relative h-14 w-14 rounded bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] flex items-center justify-center shadow-none">
                  {updates.image ? (
                    <>
                      <img src={updates.image} className="h-full w-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUpdates(prev => ({ ...prev, image: undefined }));
                        }}
                        title="Remove image"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 bg-neutral-900/80 hover:bg-rose-600 text-white z-10"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-neutral-400 group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-neutral-900 dark:text-white">Choose / Upload Image</p>
                  <p className="text-[12px] text-neutral-600 dark:text-neutral-400 mt-0.5">Select existing from gallery or upload a new compressed image</p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational State */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
              {"Operational State"}
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                { label: "asset_activation", key: 'active' },
                { label: "fiscal_taxation", key: 'taxable' },
              ].map(({ label, key }) => (
                <label key={key} className={`flex items-center justify-between p-3 rounded-md border transition-colors cursor-pointer ${(updates as any)[key] !== undefined ? 'bg-primary/5 border-primary/30' : 'bg-neutral-50 dark:bg-surface border-neutral-200 dark:border-white/[0.08]'}`}>
                  <span className={`text-[12px] font-medium ${(updates as any)[key] !== undefined ? 'text-primary dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>{label}</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 dark:border-white/10 dark:bg-transparent text-primary focus:ring-0 h-4 w-4 transition-colors cursor-pointer"
                      checked={(updates as any)[key] === true}
                      ref={el => {
                        if (el) el.indeterminate = (updates as any)[key] === undefined;
                      }}
                      onChange={(_e) => {
                        const current = (updates as any)[key];
                        let next: boolean | undefined;
                        if (current === undefined) next = true;
                        else if (current === true) next = false;
                        else next = undefined;
                        setUpdates(prev => ({ ...prev, [key]: next }));
                      }}
                    />
                    {(updates as any)[key] === undefined && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-2 h-0.5 bg-neutral-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(url) => setUpdates(prev => ({ ...prev, image: url }))}
      />
    </>
  );
}
