import React from 'react';
import { PlusIcon, CloseIcon } from '../../../shared/icons';
import { getCurrencySymbol } from '../../../lib/currencies';
import { cn } from '../../../lib/utils';

interface CartItemDiscountInputProps {
  currency: string;
  discountType: 'percentage' | 'fixed';
  setDiscountType: (type: 'percentage' | 'fixed') => void;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function CartItemDiscountInput({
  currency,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  onSubmit,
  onClose,
}: CartItemDiscountInputProps) {
  return (
    <div className="mt-1 flex items-center gap-1 bg-gray-50 dark:bg-black/75 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1">
      <div className="flex bg-gray-200 dark:bg-white/5 p-0.5 rounded-md shrink-0">
        {(['percentage', 'fixed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setDiscountType(t)}
            className={cn(
              'px-1.5 py-0.5 text-[10.5px] font-bold rounded-md transition-all',
              discountType === t
                ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400'
            )}
          >
            {t === 'percentage' ? '%' : getCurrencySymbol(currency)}
          </button>
        ))}
      </div>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={discountValue}
        onChange={(e) => setDiscountValue(e.target.value.replace(/[^0-9.]/g, ''))}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape') onClose();
        }}
        className="flex-1 bg-white dark:bg-white/5 rounded-md px-2 py-1 text-[11px] font-bold font-mono text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none border-0"
        autoFocus
      />
      <button
        onClick={onSubmit}
        className="w-5 h-5 flex items-center justify-center bg-primary text-white rounded-md hover:bg-emerald-700 transition-colors"
      >
        <PlusIcon size="xs" />
      </button>
      <button
        onClick={onClose}
        className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
      >
        <CloseIcon size="xs" />
      </button>
    </div>
  );
}
