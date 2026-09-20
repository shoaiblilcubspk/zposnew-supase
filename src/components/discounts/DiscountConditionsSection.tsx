import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { SharedSearchBar, SharedProductList } from '../../shared/modules/search-and-list';
import { Select } from '../../shared/ui';

interface DiscountConditionsSectionProps {
  conditions: any[];
  addCondition: () => void;
  updateCondition: (index: number, field: any, value: any) => void;
  removeCondition: (index: number) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  pickerProducts: any[];
  toggleConditionProduct: (index: number, productId: string) => void;
  cardConditionWarning: { type: string; message: string } | null;
}

export function DiscountConditionsSection({
  conditions,
  addCondition,
  updateCondition,
  removeCondition,
  productSearch,
  setProductSearch,
  pickerProducts,
  toggleConditionProduct,
  cardConditionWarning,
}: DiscountConditionsSectionProps) {
  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
          {"Trigger Protocols"}
        </h3>
        <button
          type="button"
          onClick={addCondition}
          className="h-8 px-3 rounded text-[12px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {"Add Rule"}
        </button>
      </div>

      {cardConditionWarning && (
        <div className={`p-3 rounded-md border ${cardConditionWarning.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[12px] font-medium leading-tight">{cardConditionWarning.message}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={index} className="p-3.5 bg-white dark:bg-surface rounded-md border border-neutral-300 dark:border-white/[0.12] relative group">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Condition Type"}</label>
                <Select
                  value={condition.type}
                  onChange={(e) => updateCondition(index, 'type', e.target.value)}
                  className="h-8 text-[13px] text-neutral-900 dark:text-white border-neutral-300 dark:border-white/[0.12]"
                >
                  <option value="min_amount" className="dark:bg-surface">{"Threshold Amount"}</option>
                  <option value="specific_products" className="dark:bg-surface">{"Product Whitelist"}</option>
                  <option value="payment_method" className="dark:bg-surface">{"Payment Gateway"}</option>
                  <option value="customer_tier" className="dark:bg-surface">{"Membership Tier"}</option>
                  <option value="card_type" className="dark:bg-surface">{"Network (Visa/MC)"}</option>
                  <option value="bank_name" className="dark:bg-surface">{"Issuing Institution"}</option>
                </Select>
              </div>

              <div>
                <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Condition Value"}</label>
                {condition.type === 'specific_products' ? (
                  <div className="space-y-3">
                    <SharedSearchBar
                      value={productSearch}
                      onChange={setProductSearch}
                      placeholder={'Search products to add...'}
                    />
                    <SharedProductList
                      items={pickerProducts}
                      selectedIds={Array.isArray(condition.value) ? condition.value : []}
                      onItemSelect={(item) => toggleConditionProduct(index, item.id)}
                      onClearSearch={() => setProductSearch('')}
                      headerTitle={'Matching Products'}
                      maxHeight="220px"
                      emptyStateText={'NO PRODUCTS FOUND'}
                      className="rounded-md shadow-none"
                    />
                    <div className="flex items-center gap-3 p-2 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08]">
                      <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider shrink-0">{"Min Qty:"}</span>
                      <input
                        type="number"
                        min="1"
                        value={condition.minQuantity || 1}
                        onChange={(e) => updateCondition(index, 'minQuantity', parseInt(e.target.value) || 1)}
                        className="w-full bg-transparent border-none p-0 text-[13px] font-mono font-medium text-neutral-900 dark:text-white focus:ring-0 outline-none"
                      />
                    </div>
                  </div>
                ) : condition.type === 'payment_method' || condition.type === 'customer_tier' || condition.type === 'card_type' || condition.type === 'bank_name' ? (
                  <Select
                    value={condition.value as string}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    className="!bg-white dark:!bg-surface !border-neutral-200 dark:!border-white/[0.08] !rounded !px-3 !text-[13px] !text-neutral-900 dark:!text-white"
                  >
                    <option value="" className="dark:bg-surface">Select...</option>
                    {condition.type === 'payment_method' && (
                      <>
                        <option value="cash" className="dark:bg-surface">{"Cash Settlement"}</option>
                        <option value="card" className="dark:bg-surface">{"Card"}</option>
                        <option value="online" className="dark:bg-surface">{"Online Wallet"}</option>
                      </>
                    )}
                    {condition.type === 'customer_tier' && (
                      <>
                        <option value="Standard" className="dark:bg-surface">{'Standard Tier'}</option>
                        <option value="Premium" className="dark:bg-surface">{'Premium Tier'}</option>
                        <option value="VIP" className="dark:bg-surface">{'VIP Elite'}</option>
                        <option value="Wholesale" className="dark:bg-surface">{'Trade Partner'}</option>
                      </>
                    )}
                    {condition.type === 'card_type' && (
                      <>
                        <option value="visa" className="dark:bg-surface">{'Visa Network'}</option>
                        <option value="mastercard" className="dark:bg-surface">{'Mastercard Network'}</option>
                        <option value="amex" className="dark:bg-surface">{'Amex Enterprise'}</option>
                        <option value="discover" className="dark:bg-surface">{'Discover Net'}</option>
                      </>
                    )}
                    {condition.type === 'bank_name' && (
                      ['Bank of Ceylon', 'People\'s Bank', 'Commercial Bank', 'HNB', 'Sampath Bank', 'NTB', 'DFCC', 'Seylan Bank', 'NDB'].map(bank => (
                        <option key={bank} value={bank} className="dark:bg-surface">{bank}</option>
                      ))
                    )}
                  </Select>
                ) : (
                  <input
                    type={condition.type === 'min_amount' ? 'number' : 'text'}
                    value={condition.value as string}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-[13px] font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-gray-500"
                    placeholder="Value..."
                  />
                )}
              </div>
            </div>
            <button
              onClick={() => removeCondition(index)}
              className="absolute -top-2 -right-2 p-1 bg-white dark:bg-surface text-rose-500 rounded border border-neutral-200 dark:border-white/[0.08] hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
