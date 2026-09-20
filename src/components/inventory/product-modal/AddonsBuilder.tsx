import { X, Plus, Database } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';
import type { Product, ProductAddon } from '../../../types';

interface AddonsBuilderProps {
  productAddons: ProductAddon[];
  setProductAddons: React.Dispatch<React.SetStateAction<ProductAddon[]>>;
  appProducts: Product[];
  product: Product | null;
}

export function AddonsBuilder({ productAddons, setProductAddons, appProducts, product }: AddonsBuilderProps) {
  return (
    <div className="space-y-2.5 p-3 bg-neutral-50 dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08]">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[12px] font-medium text-neutral-900 dark:text-white uppercase tracking-wider">Linked Add-ons</h4>
          <p className="text-[11px] text-neutral-500">Attach inventory-tracked products as extras</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setProductAddons([...productAddons, { id: '', productId: product?.id || '', addonProductId: '', name: '', price: 0, maxQty: 1, active: true, createdAt: new Date() }])}
          className="!h-8 !px-2.5 !rounded-md !text-[12px] !font-medium"
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Link
        </Button>
      </div>

      {productAddons.map((addon, index) => (
        <div key={index} className="flex flex-col sm:flex-row gap-2 p-2.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] items-center">
          <div className="w-full sm:flex-1 min-w-0">
            <SearchableSelect
              options={appProducts.filter(p => p.id !== product?.id).map(p => ({
                id: p.id,
                label: `${p.name} (Stock: ${p.stock})`,
                image: p.image,
                sublabel: p.category
              }))}
              value={addon.addonProductId}
              onChange={(val) => {
                const selProd = appProducts.find(p => p.id === val);
                const newAddons = [...productAddons];
                newAddons[index].addonProductId = val;
                if (selProd) {
                  newAddons[index].name = selProd.name;
                  newAddons[index].price = selProd.price;
                }
                setProductAddons(newAddons);
              }}
              placeholder="Search Product to Link..."
              icon={Database}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
            <div className="relative flex-1 sm:flex-none w-full sm:w-24">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[11px] z-10">Max</span>
              <input
                type="number"
                min="1"
                value={addon.maxQty || ''}
                onChange={(e) => {
                  const newAddons = [...productAddons];
                  newAddons[index].maxQty = parseInt(e.target.value) || 1;
                  setProductAddons(newAddons);
                }}
                className="w-full h-8 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded-md pl-10 pr-2 text-right font-mono text-[12px] font-medium text-neutral-900 dark:text-white outline-none focus:border-primary"
              />
            </div>
            <div className="relative flex-1 sm:flex-none w-full sm:w-28">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[11px] z-10">Price</span>
              <input
                type="number"
                placeholder="0"
                value={addon.price === 0 ? '' : addon.price}
                onChange={(e) => {
                  const newAddons = [...productAddons];
                  newAddons[index].price = parseFloat(e.target.value) || 0;
                  setProductAddons(newAddons);
                }}
                className="w-full h-8 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded-md pl-11 pr-2 text-right font-mono text-[12px] font-medium text-neutral-900 dark:text-white outline-none focus:border-primary"
              />
            </div>
            <Button type="button" variant="ghost" onClick={() => setProductAddons(productAddons.filter((_, i) => i !== index))} className="!h-8 !w-8 !p-0 !rounded-md !bg-transparent !text-neutral-400 hover:!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 shrink-0" icon={<X className="w-4 h-4" />} />
          </div>
        </div>
      ))}
    </div>
  );
}
