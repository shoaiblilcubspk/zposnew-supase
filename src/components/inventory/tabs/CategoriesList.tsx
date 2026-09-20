import React, { useState, useMemo } from 'react';
import { Layers, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Badge, Button } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import { Product } from '../../../types';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../../../stores/inventoryStore';
import { categoriesService } from '../../../lib/services/categoriesService';
import { sonner } from '../../../lib/sonner';

interface Props {
  categories: string[];
  appProducts: Product[];
  appSettings: any;
  setSelectedCategory: (cat: string) => void;
}

export function CategoriesList({ categories, appProducts, appSettings, setSelectedCategory }: Props) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const appCategories = useInventoryStore(s => s.categories);

  // Combine categories from store and passed prop
  const allCategoryNames = useMemo(() => {
    const storeNames = (appCategories || []).map(c => c?.name).filter(Boolean);
    const passedNames = (categories || []).filter(c => c !== 'All');
    return Array.from(new Set([...storeNames, ...passedNames])).sort();
  }, [appCategories, categories]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return allCategoryNames;
    return allCategoryNames.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allCategoryNames, searchTerm]);

  const handleCreateCategory = async () => {
    const result = await sonner.input('New Category', 'Enter category name:');
    if (result.isConfirmed && result.value) {
      const name = result.value.trim().toUpperCase();
      try {
        const created = await categoriesService.create(name);
        useInventoryStore.getState().addCategory(created);
        sonner.success(`Category "${name}" created successfully.`);
      } catch (err: any) {
        sonner.error(err?.message || 'Failed to create category');
      }
    }
  };

  const handleRenameCategory = async (catName: string) => {
    const result = await sonner.input('Rename Category', 'New category name:', catName);
    if (result.isConfirmed && result.value) {
      const newName = result.value.trim().toUpperCase();
      if (newName === catName) return;
      try {
        const catObj = appCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (catObj) {
          await categoriesService.update(catObj.id, { name: newName });
          useInventoryStore.getState().updateCategory({ ...catObj, name: newName });
        } else {
          const created = await categoriesService.create(newName);
          useInventoryStore.getState().addCategory(created);
        }
        sonner.success(`Category renamed to "${newName}".`);
      } catch (err: any) {
        sonner.error(err?.message || 'Failed to rename category');
      }
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    const confirmed = await sonner.confirm(
      'Delete Category?',
      `Are you sure you want to remove "${catName}"? Products in this category will remain safe.`
    );
    if (!confirmed) return;

    try {
      const catObj = appCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      if (catObj) {
        await categoriesService.delete(catObj.id);
        useInventoryStore.getState().deleteCategory(catObj.id);
      }
      sonner.success(`Category "${catName}" removed.`);
    } catch (err: any) {
      sonner.error(err?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-280px)] flex flex-col justify-between">
      <div className="flex-1">
        {/* Category Management Header Toolbar */}
        <div className="p-3 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category groups..."
              className="w-full h-8 pl-8 pr-3 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-[12px] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleCreateCategory}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="!h-8 !px-3 !text-[12px] !font-medium"
          >
            New Category
          </Button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-8 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
                <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Group Name</th>
                <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-center">Items</th>
                <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-center">Total Stock</th>
                <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">In Stock Value</th>
                <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {filteredCategories.map(cat => {
                const productsInCat = appProducts.filter(p => p.category === cat);
                const stockInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : (p.stock || 0)), 0);
                const valueInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : ((p.stock || 0) * (p.cost || 0))), 0);

                return (
                  <tr key={cat} className="h-10 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-3.5">
                      <div className="flex items-center gap-2.5">
                        <Layers className="h-4 w-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                        <span className="font-medium text-neutral-900 dark:text-white text-[13px] tracking-tight">{cat}</span>
                      </div>
                    </td>
                    <td className="px-3.5 text-center font-mono text-[12px] text-neutral-600 dark:text-neutral-300">
                      {productsInCat.length}
                    </td>
                    <td className="px-3.5 text-center">
                      <Badge tone={stockInCat > 0 ? "info" : "neutral"} size="sm">
                        {stockInCat}
                      </Badge>
                    </td>
                    <td className="px-3.5 text-right font-mono font-medium text-neutral-900 dark:text-white text-[13px] tabular-nums">
                      {formatCurrency(valueInCat, appSettings.currency)}
                    </td>
                    <td className="px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedCategory(cat); navigate('/inventory/products'); }}
                          className="!min-h-0 !h-7 !px-2.5 !text-[11px] !font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                        >
                          View Products
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Rename category"
                          onClick={() => handleRenameCategory(cat)}
                          className="!min-h-0 !h-7 !w-7 !p-0 !text-neutral-500 hover:!text-neutral-900 dark:hover:!text-white"
                          icon={<Pencil className="w-3.5 h-3.5" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete category"
                          onClick={() => handleDeleteCategory(cat)}
                          className="!min-h-0 !h-7 !w-7 !p-0 !text-neutral-400 hover:!text-rose-500 hover:!bg-rose-500/10"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[13px] text-neutral-400">
                    No categories found. Click &quot;New Category&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-neutral-100 dark:divide-white/[0.04]">
          {filteredCategories.map(cat => {
            const productsInCat = appProducts.filter(p => p.category === cat);
            const stockInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : (p.stock || 0)), 0);
            const valueInCat = productsInCat.reduce((sum, p) => sum + (p.trackInventory === false || p.stock >= 990000 ? 0 : ((p.stock || 0) * (p.cost || 0))), 0);

            return (
              <div
                key={cat}
                className="p-3.5 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                    <span className="font-medium text-neutral-900 dark:text-white text-[13px]">{cat}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRenameCategory(cat)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 text-neutral-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelectedCategory(cat); navigate('/inventory/products'); }}
                      className="text-[11px] font-mono text-primary pl-1"
                    >
                      View →
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-neutral-100 dark:border-white/[0.04] text-[12px] font-mono">
                  <div>
                    <span className="text-[10px] text-neutral-400 block uppercase">Items</span>
                    <span className="text-neutral-900 dark:text-white font-medium">{productsInCat.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block uppercase">Stock</span>
                    <span className="text-neutral-900 dark:text-white font-medium">{stockInCat}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block uppercase">Value</span>
                    <span className="text-neutral-900 dark:text-white font-medium tabular-nums truncate block">
                      {formatCurrency(valueInCat, appSettings.currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredCategories.length === 0 && (
            <div className="py-12 text-center text-[13px] text-neutral-400">
              No categories found. Click &quot;New Category&quot; to create one.
            </div>
          )}
        </div>
      </div>

      <div className="px-3.5 py-2.5 bg-neutral-50/50 dark:bg-white/[0.01] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-auto">
        <span>{filteredCategories.length} product groups</span>
        <span>Catalog Organized</span>
      </div>
    </div>
  );
}
