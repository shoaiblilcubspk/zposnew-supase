import { PackageSearch, Wand2, X } from 'lucide-react';
import { Button } from '../../../shared/ui';
import type { ProductDetailController } from './useProductDetail';
import { ProductExtras } from './ProductExtras';

export function ProductVariants({ d }: { d: ProductDetailController }) {
  const { formData, variants, setVariants, variantData, setVariantData } = d;

  return (
    <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-white/[0.08]">
      <div className="flex items-center gap-2.5 mb-4">
        <PackageSearch className="w-5 h-5 text-neutral-400" />
        <div>
          <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Customizations & Options"}</h3>
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Manage product variants and add-on modifiers"}</p>
        </div>
      </div>
      <div className="space-y-4">
        {formData.productType === 'variable' && (
          <>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase">{"Product Variants"}</h4>
              <p className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider">{"Size, Color, Material (e.g. Garments, Shoes)"}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setVariants([...variants, { name: '', options: [], optionsRaw: '' }])}
              className="h-7 px-2.5 text-[12px] font-medium rounded-md"
            >
              {"Add Variant Option"}
            </Button>
          </div>

          {variants.map((variant, index) => {
            const addTag = (text: string) => {
              const trimmed = text.trim();
              if (!trimmed) return;
              const parts = trimmed.split(/[,;]+/).map(p => p.trim()).filter(p => p && !variant.options.includes(p));
              if (parts.length > 0) {
                const newVariants = [...variants];
                newVariants[index].options = [...variant.options, ...parts];
                newVariants[index].optionsRaw = '';
                setVariants(newVariants);
              } else {
                const newVariants = [...variants];
                newVariants[index].optionsRaw = '';
                setVariants(newVariants);
              }
            };

            const removeTag = (optIndex: number) => {
              const newVariants = [...variants];
              newVariants[index].options = variant.options.filter((_, i) => i !== optIndex);
              setVariants(newVariants);
            };

            return (
              <div key={index} className="flex gap-2 items-start p-3 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08]">
                <input
                  type="text"
                  placeholder={"Variant Name (e.g. Size)"}
                  value={variant.name}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].name = e.target.value;
                    setVariants(newVariants);
                  }}
                  className="w-1/3 h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-[13px] rounded focus:border-emerald-500 focus:outline-none transition-colors"
                />

                <div
                  className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[32px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded px-2.5 py-1 focus-within:border-emerald-500 transition-colors cursor-text"
                  onClick={(e) => {
                    const inputEl = e.currentTarget.querySelector('input[type="text"]');
                    if (inputEl) (inputEl as HTMLInputElement).focus();
                  }}
                >
                  {variant.options.map((opt, optIndex) => (
                    <span
                      key={optIndex}
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 select-none"
                    >
                      {opt}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(optIndex);
                        }}
                        className="!min-h-0 !p-0 !bg-transparent !text-emerald-600 dark:!text-emerald-400 hover:!text-emerald-700 dark:hover:!text-emerald-300"
                      >
                        &times;
                      </Button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={variant.options.length === 0 ? 'Options (Comma/Enter)' : ""}
                    value={variant.optionsRaw || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(',') || val.includes(';')) {
                        addTag(val);
                      } else {
                        const newVariants = [...variants];
                        newVariants[index].optionsRaw = val;
                        setVariants(newVariants);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        addTag(e.currentTarget.value);
                      } else if (e.key === 'Backspace' && !variant.optionsRaw && variant.options.length > 0) {
                        removeTag(variant.options.length - 1);
                      }
                    }}
                    onBlur={(e) => {
                      addTag(e.target.value);
                    }}
                    className="flex-1 min-w-[60px] bg-transparent border-0 outline-none p-0 text-[13px] text-neutral-900 dark:text-white focus:ring-0 placeholder-neutral-400"
                  />
                </div>

                <Button type="button" variant="ghost" onClick={() => setVariants(variants.filter((_, i) => i !== index))} className="!min-h-0 !h-8 !w-8 !p-0 !rounded !bg-transparent !text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 border border-neutral-200 dark:border-white/[0.08]" icon={<X className="w-3.5 h-3.5" />} />
              </div>
            );
          })}
        </div>

        {variants.length > 0 && variants.some(v => v.options.length > 0) && (
          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (variants.length === 0) return;
                const newVariantData: any[] = [];
                const v1 = variants[0];
                const v2 = variants.length > 1 ? variants[1] : null;

                v1.options.forEach((opt1: string) => {
                  if (v2 && v2.options.length > 0) {
                    v2.options.forEach((opt2: string) => {
                      const option1Label = `${v1.name}: ${opt1}`;
                      const option2Label = `${v2.name}: ${opt2}`;
                      const existing = variantData.find(vd => vd.option1 === option1Label && vd.option2 === option2Label);
                      newVariantData.push(existing || {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        option1: option1Label,
                        option2: option2Label
                      });
                    });
                  } else {
                    const option1Label = `${v1.name}: ${opt1}`;
                    const existing = variantData.find(vd => vd.option1 === option1Label && !vd.option2);
                    newVariantData.push(existing || {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                      option1: option1Label
                    });
                  }
                });
                setVariantData(newVariantData);
              }}
              className="!min-h-0 !px-3 !py-1.5 !rounded !text-[12px] font-medium !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400 !border-emerald-500/20 hover:!bg-emerald-500/20"
              icon={<Wand2 className="w-3.5 h-3.5" />}
            >
              {"Generate Price/Stock Matrix"}
            </Button>
          </div>
        )}

        {variantData.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-md border border-neutral-200 dark:border-white/[0.08]">
            <table className="w-full text-left text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              <thead className="bg-neutral-50 dark:bg-surface border-b border-neutral-200 dark:border-white/[0.08]">
                <tr>
                  <th className="px-3 py-2">Variant</th>
                  <th className="px-3 py-2 w-24">Cost</th>
                  <th className="px-3 py-2 w-24">Exact Price</th>
                  <th className="px-3 py-2 w-20">Stock</th>
                  <th className="px-3 py-2 w-28">Barcode</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-surface divide-y divide-neutral-200 dark:divide-white/[0.08]">
                {variantData.map((vd, idx) => (
                  <tr key={vd.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-[13px] text-neutral-900 dark:text-white font-sans font-medium">
                      {vd.option1} {vd.option2 ? ` / ${vd.option2}` : ''}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={vd.cost || ''}
                        onChange={(e) => {
                          const newData = [...variantData];
                          newData[idx].cost = e.target.value ? parseFloat(e.target.value) : undefined;
                          setVariantData(newData);
                        }}
                        placeholder={formData.cost}
                        className="w-full h-7 px-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-[12px] font-mono tabular-nums rounded focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={vd.priceOverride || ''}
                        onChange={(e) => {
                          const newData = [...variantData];
                          newData[idx].priceOverride = e.target.value ? parseFloat(e.target.value) : undefined;
                          setVariantData(newData);
                        }}
                        placeholder={formData.price}
                        className="w-full h-7 px-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-[12px] font-mono tabular-nums rounded focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={vd.stock || ''}
                        onChange={(e) => {
                          const newData = [...variantData];
                          newData[idx].stock = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          setVariantData(newData);
                        }}
                        placeholder="0"
                        className="w-full h-7 px-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-[12px] font-mono tabular-nums rounded focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={vd.barcode || ''}
                        onChange={(e) => {
                          const newData = [...variantData];
                          newData[idx].barcode = e.target.value;
                          setVariantData(newData);
                        }}
                        placeholder="Auto"
                        className="w-full h-7 px-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-[12px] font-mono rounded focus:border-emerald-500 focus:outline-none uppercase"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}

        <ProductExtras d={d} />
      </div>
    </div>
  );
}
