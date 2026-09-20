import { useSalesStore, useSettingsStore } from '../../stores';
import { FileText, Trash2, ShoppingCart } from 'lucide-react';
import { Sale } from '../../types';
import { formatCurrency } from '../../lib/currencies';
import { salesService } from '../../lib/services';
import { Modal } from '../../shared/ui/Modal';

interface DraftsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadDraft: (draft: Sale) => void;
}

export function DraftsModal({ isOpen, onClose, onLoadDraft }: DraftsModalProps) {
    const appSales = useSalesStore(s => s.sales);
const appSettings = useSettingsStore(s => s.settings);
    const drafts = appSales
        .filter(sale => sale.notes?.includes('DRAFT_SALE'))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await salesService.delete(id);
            // Update global state so draft count badge and modal list updates instantly
            useSalesStore.getState().deleteSale(id);
        } catch (error) {
            console.error('Error deleting draft:', error);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={"Draft Archives"}
            subtitle={"Suspended Protocol • {count} Sessions".replace('{count}', drafts.length.toString())}
            maxWidth="lg"
            footer={
                <div className="flex items-center justify-end w-full font-mono text-[12px]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] font-medium transition-colors"
                    >
                        {"Close"}
                    </button>
                </div>
            }
        >
            <div className="min-h-[260px] text-[13px] tracking-[-0.01em]">
                {drafts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <FileText className="h-10 w-10 text-neutral-400 mb-3 opacity-40" />
                        <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white">{"No Drafts Saved"}</h3>
                        <p className="text-[12px] text-neutral-500 font-mono mt-1">
                            {"No suspended sales sessions registered."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {drafts.map((draft) => (
                            <div
                                key={draft.id}
                                onClick={() => onLoadDraft(draft)}
                                className="group p-3 rounded-md border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface hover:border-neutral-300 dark:hover:border-white/[0.15] transition-colors cursor-pointer space-y-2 shadow-none"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <ShoppingCart className="w-4 h-4 text-primary shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-neutral-900 dark:text-white truncate">
                                                {draft.customerName || "Walk-in Customer"}
                                            </p>
                                            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                                                {new Date(draft.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDelete(draft.id, e)}
                                        className="p-1 text-neutral-400 hover:text-rose-500 transition-colors"
                                        title="Delete Draft"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-white/[0.04]">
                                    <span className="text-[11px] font-mono text-neutral-500">
                                        {draft.items.length} {draft.items.length === 1 ? 'item' : 'items'}
                                    </span>
                                    <span className="text-[14px] font-mono tabular-nums font-bold text-neutral-900 dark:text-white">
                                        {formatCurrency(draft.total, appSettings.currency)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
