import { Package } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { Product } from '../../../types';

interface ProductModalFooterProps {
  product: Product | null;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function ProductModalFooter({ product, onClose, onSubmit, isSubmitting }: ProductModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 w-full font-mono text-[12px]">
      <button
        type="button"
        onClick={onClose}
        className="h-8 px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] font-medium transition-colors"
      >
        {"Discard"}
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onSubmit}
        className="h-8 px-4 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 font-medium flex items-center gap-1.5 transition-colors shadow-none"
      >
        <Package className="w-3.5 h-3.5 shrink-0" />
        <span>
          {product ? "Update Product" : "Save Product"}
        </span>
      </button>
    </div>
  );
}
