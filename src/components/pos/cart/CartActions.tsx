import { useCartStore } from '../../../stores';
import { FileText } from 'lucide-react';

interface CartActionsProps {
  onSaveDraft: () => void;
  onCheckout: () => void;
}

export function CartActions({ onSaveDraft, onCheckout }: CartActionsProps) {
  const appCart = useCartStore(s => s.cart);
  const isCartEmpty = appCart.length === 0 || appCart.reduce((s, i) => s + Math.abs(i.quantity), 0) === 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSaveDraft}
        disabled={isCartEmpty}
        title="Hold Order / Save Draft (F8)"
        className="p-2.5 rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-40"
      >
        <FileText className="h-4 w-4" />
      </button>
      <button
        onClick={onCheckout}
        disabled={isCartEmpty}
        title="Proceed to settlement (Enter)"
        className="px-6 py-2.5 h-[42px] rounded-full bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {"Checkout"}
      </button>
    </div>
  );
}
