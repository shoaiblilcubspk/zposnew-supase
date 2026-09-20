import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';

interface Props {
  selectedItems: any[];
  updateItem: (id: string, field: string, value: any) => void;
  removeItem: (id: string) => void;
}

export function SelectedItemsGrid({ selectedItems, updateItem, removeItem }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
        {'Staging Matrix'.replace('{count}', selectedItems.length.toString())}
      </h3>
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
                <th className="px-3 py-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{'Product'}</th>
                <th className="px-3 py-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{'Supplier'}</th>
                <th className="px-3 py-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{'Variant'}</th>
                <th className="px-3 py-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider text-center">{'Qty'}</th>
                <th className="px-3 py-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider text-right">{'Cost'}</th>
                <th className="px-3 py-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider text-right">{'Retail'}</th>
                <th className="px-3 py-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider text-center">{'Act'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {selectedItems.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-3 py-2">
                    <p className="text-[12px] font-medium text-neutral-900 dark:text-white leading-tight">{item.name}</p>
                    <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{item.sku || 'SKU_UNKNOWN'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.batchSupplier}
                      onChange={(e) => updateItem(item.id, 'batchSupplier', e.target.value)}
                      className="w-full h-7 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md px-2 text-[12px] font-medium text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
                      placeholder={'Direct Entry'}
                    />
                  </td>
                  <td className="px-3 py-2 min-w-[170px]">
                    {(item.variantData || []).some((vd: any) => vd.trackInventory !== false) ? (
                      <SearchableSelect
                        options={[
                          { id: '__general__', label: 'GENERAL STOCK' },
                          ...(item.variantData || []).map((vd: any) => ({
                            id: vd.id,
                            label: `${vd.option1 || ''}${vd.option2 ? ` / ${vd.option2}` : ''}`,
                            sublabel: vd.stock !== undefined ? `Stock: ${vd.stock}` : undefined
                          }))
                        ]}
                        value={item.variantId || '__general__'}
                        onChange={(val) => {
                          const vd = (item.variantData || []).find((v: any) => v.id === val);
                          updateItem(item.id, 'variantId', val === '__general__' ? undefined : val);
                          updateItem(item.id, 'variantLabel', val === '__general__' ? undefined : (vd ? `${vd.option1 || ''}${vd.option2 ? ` / ${vd.option2}` : ''}` : undefined));
                        }}
                      />
                    ) : (
                      <span className="text-[11px] font-mono text-neutral-400 uppercase">{'General'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-16 h-7 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 text-center text-[12px] font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={item.costPrice}
                      onChange={(e) => updateItem(item.id, 'costPrice', Number(e.target.value))}
                      className="w-20 h-7 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md px-2 text-right text-[12px] font-mono text-neutral-900 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={item.retailPrice}
                      onChange={(e) => updateItem(item.id, 'retailPrice', Number(e.target.value))}
                      className="w-20 h-7 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md px-2 text-right text-[12px] font-mono text-neutral-900 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button onClick={() => removeItem(item.id)} variant="ghost" className="h-7 w-7 !p-0 !text-neutral-400 hover:!text-rose-500 rounded" icon={<Trash2 className="h-3.5 w-3.5" />} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
