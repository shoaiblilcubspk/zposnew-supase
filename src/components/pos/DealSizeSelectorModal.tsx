import { Modal } from '../../shared/ui/Modal';
import { formatCurrency } from '../../lib/currencies';
import { ChevronRight } from 'lucide-react';

interface DealSizeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  bundles: any[];
  currency: string;
  onSelect: (bundle: any) => void;
}

export function DealSizeSelectorModal({
  isOpen,
  onClose,
  groupName,
  bundles,
  currency,
  onSelect
}: DealSizeSelectorModalProps) {
  
  // Sort bundles by price ascending
  const sortedBundles = [...bundles].sort((a, b) => (a.finalPrice || 0) - (b.finalPrice || 0));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={groupName} maxWidth="md">
      <div className="p-4 sm:p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
          Select Deal Size / Variant
        </p>
        
        <div className="space-y-2">
          {sortedBundles.map((bundle) => (
            <button
              key={bundle.id}
              onClick={() => {
                onSelect(bundle);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-md border border-neutral-200 dark:border-white/[0.08] hover:border-emerald-500/40 hover:bg-neutral-50 dark:hover:bg-surface-hover transition-colors text-left group shadow-none"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-neutral-900 dark:text-white text-[13px] truncate">
                  {bundle.variantName}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="font-mono font-medium tabular-nums text-emerald-600 dark:text-emerald-400 text-[14px]">
                  {formatCurrency(bundle.finalPrice, currency)}
                </div>
                <div className="h-7 w-7 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
