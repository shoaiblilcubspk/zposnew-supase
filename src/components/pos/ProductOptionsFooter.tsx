import { Check } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';

interface ProductOptionsFooterProps {
  totalPrice: number;
  appSettings: any;
  isFormValid: boolean;
  isVariantOutOfStock: boolean;
  matchingVariant: any;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProductOptionsFooter({ totalPrice, appSettings, isFormValid, isVariantOutOfStock, matchingVariant, onClose, onConfirm }: ProductOptionsFooterProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="text-left">
        <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{"Total Price"}</p>
        <p className="text-base font-mono font-semibold text-primary dark:text-emerald-400 leading-tight tabular-nums">
          {formatCurrency(totalPrice, appSettings.currency)}
        </p>
        {isVariantOutOfStock && (
          <p className="text-[11px] text-rose-500 mt-0.5">Out of Stock</p>
        )}
        {matchingVariant?.trackInventory && matchingVariant.stock !== undefined && !isVariantOutOfStock && (
          <p className="text-[11px] font-mono text-neutral-400 mt-0.5">Stock: {matchingVariant.stock}</p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="h-8 px-3 rounded-md border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 text-[13px] font-medium transition-colors shrink-0"
        >
          {"Cancel"}
        </button>
        <button
          onClick={onConfirm}
          disabled={!isFormValid}
          className="h-8 px-3.5 rounded-md bg-primary hover:bg-primary-hover text-white text-[13px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{"Add to Cart"}</span>
        </button>
      </div>
    </div>
  );
}
