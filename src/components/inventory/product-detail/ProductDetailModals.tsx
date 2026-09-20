import { Loader2, Save, PackagePlus, Package } from 'lucide-react';
import { Modal, BottomSheet, SearchableSelect, ToggleSwitch, Button, Badge } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { ProductDetailController } from './useProductDetail';

export function ProductDetailModals({ d }: { d: ProductDetailController }) {
  const {
    showAdjustment, setShowAdjustment, adjustmentData, setAdjustmentData, isUpdating, handleAdjustment,
    showRestock, setShowRestock, handleQuickRestock, restockData, setRestockData, appSuppliers, currency, product,
  } = d;

  return (
    <>
      <Modal
        isOpen={showAdjustment}
        onClose={() => setShowAdjustment(false)}
        title={"Stock Adjustment"}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="danger"
              onClick={() => setShowAdjustment(false)}
              className="!h-8 !px-3 !text-[13px] !rounded-md"
            >
              {"Discard"}
            </Button>
            <Button
              variant="primary"
              onClick={handleAdjustment}
              disabled={isUpdating || !adjustmentData.quantity}
              className="!h-8 !px-3.5 !bg-emerald-600 hover:!bg-emerald-500 !rounded-md !text-[13px] !font-medium !shadow-none"
              icon={isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            >
              <span>{"Apply Correction"}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{"Qty (+/-) *"}</label>
              <div className="flex items-center w-full bg-white dark:bg-surface rounded-md h-8 px-2.5 border border-neutral-200 dark:border-white/[0.08] focus-within:border-primary transition-colors shadow-none">
                <input
                  type="number"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                  className="w-full bg-transparent border-none text-left text-[13px] font-mono font-medium outline-none text-neutral-900 dark:text-white min-w-0"
                  placeholder="-5 or 5"
                />
              </div>
            </div>
            <div className="space-y-1 relative z-30">
              <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{"Reason *"}</label>
              <SearchableSelect
                options={['Correction', 'Damage', 'Theft', 'Expired', 'Gift', 'Return to Vendor'].map(r => ({ id: r, label: r }))}
                value={adjustmentData.reason}
                onChange={(val) => setAdjustmentData({ ...adjustmentData, reason: val })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{"Audit Notes"}</label>
            <textarea
              value={adjustmentData.notes}
              onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
              className="w-full bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-2.5 rounded-md text-[13px] outline-none focus:border-primary min-h-[100px] resize-none text-neutral-900 dark:text-white shadow-none placeholder:text-neutral-400"
              placeholder={"Explain the context of this adjustment..."}
            />
          </div>
        </div>
      </Modal>

      <BottomSheet
        open={showRestock}
        onClose={() => setShowRestock(false)}
        title={"Quick Restock"}
        subtitle={"Add stock directly to this product — same engine as Purchase Orders"}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowRestock(false)}
              className="!h-8 !px-3 !text-[13px] !rounded-md"
            >
              {"Cancel"}
            </Button>
            <Button
              variant="primary"
              onClick={handleQuickRestock}
              disabled={isUpdating || !parseFloat(restockData.quantity) || parseFloat(restockData.quantity) <= 0 || !restockData.supplier.trim()}
              className="!h-8 !px-3.5 !text-[13px] !rounded-md"
              icon={isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
            >
              <span>{"Add to Stock"}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-neutral-50 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover bg-neutral-100 dark:bg-white/5" />
            ) : (
                <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-neutral-900 dark:text-white text-[13px] truncate">{product.name}</p>
              <p className="text-[11px] font-mono text-neutral-500 truncate">{product.sku || 'No SKU'}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge
                tone={product.stock <= 0 ? 'danger' : 'neutral'}
                size="sm"
                className="!px-2 !py-0.5 !rounded !text-[11px]"
              >
                {"In Stock"}: {product.stock}
              </Badge>
              {product.supplier && (
                <Badge
                  tone="info"
                  size="sm"
                  className="!px-2 !py-0.5 !rounded !text-[11px]"
                >
                  {product.supplier}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{"Qty to Add *"}</label>
              <input
                type="number"
                min="1"
                value={restockData.quantity}
                onChange={(e) => setRestockData({ ...restockData, quantity: e.target.value })}
                className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-3 rounded-md text-[13px] font-mono font-medium outline-none focus:border-primary dark:text-white"
                placeholder="1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{"Cost Price"}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={restockData.cost}
                onChange={(e) => setRestockData({ ...restockData, cost: e.target.value })}
                className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] px-3 rounded-md text-[13px] font-mono font-medium outline-none focus:border-primary dark:text-white"
                placeholder="0"
              />
            </div>
            <div className="space-y-1 relative z-30 md:col-span-2">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{"Supplier *"}</label>
              <SearchableSelect
                options={appSuppliers.map(s => ({ id: s.id, label: s.name }))}
                value={restockData.supplier}
                onChange={(val) => setRestockData({ ...restockData, supplier: val })}
              />
              {!restockData.supplier.trim() && (
                <p className="text-[11px] text-rose-500">{"A supplier is required to record this stock entry"}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3">
            <div>
              <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{"Estimated Total"}</p>
              <p className="text-base font-mono font-semibold text-emerald-500 dark:text-emerald-400 mt-0.5 tabular-nums">
                {formatCurrency((parseFloat(restockData.quantity) || 0) * (parseFloat(restockData.cost) || 0), currency)}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-white/[0.08]">
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">{"Supplier Bill"}</span>
              <ToggleSwitch
                checked={restockData.recordAsSupplierBill}
                onChange={(v) => setRestockData({ ...restockData, recordAsSupplierBill: v })}
                size="sm"
                color="bg-primary"
              />
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
