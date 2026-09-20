import { Tag } from 'lucide-react';
import { Discount } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { Button, ToggleSwitch, Select } from '../../shared/ui';
import { useDiscountModalData } from './useDiscountModalData';
import { DiscountConditionsSection } from './DiscountConditionsSection';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  discount: Discount | null;
}

export function DiscountModal({ isOpen, onClose, discount }: DiscountModalProps) {
  const {
    appSettings, formData, setFormData, conditions,
    validDays, productSearch, setProductSearch, pickerProducts, toggleConditionProduct,
    handleSubmit, handleChange, addCondition, updateCondition, removeCondition,
    toggleDay, cardConditionWarning
  } = useDiscountModalData(discount, onClose);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={discount ? 'Edit Discount' : 'New Discount'}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            className="border border-rose-200 dark:border-rose-900/30 text-[#ff4b6e] hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
          >
            {"Discard"}
          </Button>
          <Button
            size="md"
            icon={<Tag className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
            onClick={handleSubmit}
            className="flex-1 sm:flex-none sm:min-w-[240px]"
          >
            {discount ? 'Edit Discount' : 'New Discount'}
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Promotion Details"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Promotion Name *"}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder={'e.g. Eid Mega Sale'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Privilege Type *"}</label>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="!h-8 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-300 dark:!border-white/[0.12] text-neutral-900 dark:text-white"
              >
                <option value="percentage" className="dark:bg-surface">{"Percentage Off"}</option>
                <option value="fixed" className="dark:bg-surface">{"Fixed Amount Off"}</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">
                {formData.type === 'percentage' ? "Factor (%)" : `Amount (${appSettings.currency})`} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  required
                  className="w-full h-8 pl-2.5 pr-8 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 font-mono text-[11px] font-semibold">{formData.type === 'percentage' ? '%' : appSettings.currency}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Min Basket Amount"}</label>
              <input
                type="number"
                step="0.01"
                name="minAmount"
                value={formData.minAmount}
                onChange={handleChange}
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Max Cap Ceiling"}</label>
              <input
                type="number"
                step="0.01"
                name="maxDiscount"
                value={formData.maxDiscount}
                onChange={handleChange}
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder={"No cap"}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Operational Window"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Activation Date"}</label>
              <input
                type="date"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleChange}
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Expiry Date"}</label>
              <input
                type="date"
                name="validTo"
                value={formData.validTo}
                onChange={handleChange}
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block">{"Weekly Cyclic Schedule"}</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`h-8 rounded text-[12px] font-semibold border transition-colors ${validDays.includes(index)
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-neutral-300 dark:border-white/[0.12] bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DiscountConditionsSection
          conditions={conditions}
          addCondition={addCondition}
          updateCondition={updateCondition}
          removeCondition={removeCondition}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          pickerProducts={pickerProducts}
          toggleConditionProduct={toggleConditionProduct}
          cardConditionWarning={cardConditionWarning}
        />

        <div className="space-y-3 pt-1">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Status & Behavior"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded-md transition-colors">
              <span className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Active Status"}</span>
              <ToggleSwitch checked={formData.active} onChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))} size="sm" color="bg-emerald-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded-md transition-colors">
              <span className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Auto-Apply"}</span>
              <ToggleSwitch checked={formData.isAutoApply} onChange={(checked) => setFormData(prev => ({ ...prev, isAutoApply: checked }))} size="sm" color="bg-emerald-600" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
