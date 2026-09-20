import React from 'react';
import { ChevronLeft, ChevronRight, Printer, MessageCircle, RotateCcw, Edit, Trash2 } from 'lucide-react';

interface TransactionDetailFooterProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  profile: {
    canEditSale: boolean;
    canDeleteSale: boolean;
  };
  canRefund: boolean;
  isProcessingAction: boolean;
  isRefunded: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onRefund: () => void;
  onWhatsApp: () => void;
  onReprint: () => void;
}

export function TransactionDetailFooter({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  profile,
  canRefund,
  isProcessingAction,
  isRefunded,
  onDelete,
  onEdit,
  onRefund,
  onWhatsApp,
  onReprint,
}: TransactionDetailFooterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full font-mono text-[12px]">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="h-8 px-2.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] disabled:opacity-30 transition-colors flex items-center gap-1 font-medium"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> <span>Prev</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="h-8 px-2.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] disabled:opacity-30 transition-colors flex items-center gap-1 font-medium"
        >
          <span>Next</span> <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {profile.canDeleteSale && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isProcessingAction}
            className="h-8 px-2.5 rounded border border-neutral-200 dark:border-white/[0.08] text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40 transition-colors ml-1"
            title="Delete Sale"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end">
        {profile.canEditSale && (
          <button
            type="button"
            onClick={onEdit}
            disabled={isProcessingAction}
            className="h-8 px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] disabled:opacity-40 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Edit className="h-3.5 w-3.5" /> <span>Edit</span>
          </button>
        )}
        {canRefund && (
          <button
            type="button"
            onClick={onRefund}
            disabled={isProcessingAction || isRefunded}
            className="h-8 px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] disabled:opacity-40 transition-colors flex items-center gap-1.5 font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" /> <span>Refund</span>
          </button>
        )}
        <button
          type="button"
          onClick={onWhatsApp}
          className="h-8 px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 font-medium"
        >
          <MessageCircle className="h-3.5 w-3.5" /> <span>WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={onReprint}
          className="h-8 px-4 rounded bg-primary text-white hover:bg-primary/90 font-medium flex items-center gap-1.5 transition-colors shadow-none"
        >
          <Printer className="h-3.5 w-3.5" /> <span>Print</span>
        </button>
      </div>
    </div>
  );
}
