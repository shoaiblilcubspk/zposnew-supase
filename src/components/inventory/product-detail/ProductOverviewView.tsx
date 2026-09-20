import { CircleDollarSign, ShoppingBag, Package, TrendingUp, Database, PackagePlus, ShieldAlert, Tag } from 'lucide-react';
import { Button, HelpTooltip } from '../../../shared/ui';
import { productsService } from '../../../lib/services';
import { useProductsStore } from '../../../stores';
import { sonner } from '../../../lib/sonner';
import { formatCurrency } from '../../../lib/currencies';
import { ProductIdentityDetails } from './ProductIdentityDetails';
import type { ProductDetailController } from './useProductDetail';

export function ProductOverview({ d }: { d: ProductDetailController }) {
  const { totalRevenue, totalSoldUnits, totalCOGS, profitMargin, stockValueCost, stockValueSale, currency, isInfinite, isEditMode, product, formData, setFormData, setRestockData, setShowRestock, setShowAdjustment } = d;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Revenue', value: formatCurrency(totalRevenue, currency), icon: CircleDollarSign },
            { label: 'Sold Units', value: `${totalSoldUnits}`, icon: ShoppingBag },
            { label: 'COGS (Cost)', value: formatCurrency(totalCOGS, currency), icon: Package },
            { label: 'Margin', value: `${profitMargin.toFixed(1)}%`, icon: TrendingUp },
            { label: 'Stock Value (Cost)', value: formatCurrency(stockValueCost, currency), icon: Database },
            { label: 'Stock Value (Sale)', value: formatCurrency(stockValueSale, currency), icon: Tag },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-surface p-3.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{m.label}</p>
                <m.icon className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <p className="text-[15px] font-mono tabular-nums font-semibold text-neutral-900 dark:text-white mt-2">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-surface p-4 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-neutral-400 shrink-0" />
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Quick Controls"}</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {d.canManageStock && !isInfinite && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setRestockData({
                      quantity: '1',
                      supplier: product.supplier || '',
                      cost: product.cost?.toString() || '',
                      recordAsSupplierBill: true
                    });
                    setShowRestock(true);
                  }}
                  className="h-8 px-2.5 text-[12px] font-medium rounded-md"
                  icon={<PackagePlus className="w-3.5 h-3.5 mr-1" />}
                >
                  {"Restock"}
                </Button>
              )}
              {d.canManageStock && !isInfinite && (
                <Button
                  variant="secondary"
                  onClick={() => setShowAdjustment(true)}
                  className="h-8 px-2.5 text-[12px] font-medium rounded-md"
                >
                  {"Adjust"}
                </Button>
              )}
            </div>
          </div>

          {formData.productType === 'simple' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Min Stock Alert"}</p>
                  {parseInt(formData.minStock) !== (product.minStock || 0) && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const newMin = parseInt(formData.minStock) || 0;
                          const saved = await productsService.update(product.id, { minStock: newMin });
                          useProductsStore.getState().updateProduct(saved);
                          sonner.success('Min stock alert updated');
                        } catch (_e) {
                          sonner.error('Failed to save min stock');
                        }
                      }}
                      className="!min-h-0 !p-0 !bg-transparent text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {"Save"}
                    </Button>
                  )}
                </div>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-2.5 rounded-md text-[13px] font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
              {isEditMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Stock Qty"}</p>
                    </div>
                    <input
                      type="number"
                      disabled={formData.trackInventory === false}
                      value={formData.trackInventory === false ? '' : formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder={formData.trackInventory === false ? '∞' : '0'}
                      className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-2.5 rounded-md text-[13px] font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-400 transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Sale Price"}</p>
                      {parseFloat(formData.price) !== product.price && (
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const newPrice = parseFloat(formData.price) || 0;
                              const saved = await productsService.update(product.id, { price: newPrice });
                              useProductsStore.getState().updateProduct(saved);
                              sonner.success('Sale price updated');
                            } catch (_e) {
                              sonner.error('Failed to save sale price');
                            }
                          }}
                          className="!min-h-0 !p-0 !bg-transparent text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          {"Save"}
                        </Button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-2.5 rounded-md text-[13px] font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Cost Price"}</p>
                        <HelpTooltip content="Cost changes will instantly update the product's cost price for accurate profit calculations." />
                      </div>
                      {parseFloat(formData.cost) !== product.cost && (
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const newCost = parseFloat(formData.cost) || 0;
                              const saved = await productsService.update(product.id, { cost: newCost });
                              useProductsStore.getState().updateProduct(saved);
                              sonner.success('Cost price updated');
                            } catch (_e) {
                              sonner.error('Failed to save cost price');
                            }
                          }}
                          className="!min-h-0 !p-0 !bg-transparent text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          {"Save"}
                        </Button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-2.5 rounded-md text-[13px] font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditMode && (
        <ProductIdentityDetails d={d} />
      )}
    </>
  );
}
