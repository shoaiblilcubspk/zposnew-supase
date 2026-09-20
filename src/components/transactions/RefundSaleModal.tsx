import React, { useState, useEffect } from 'react';
import { Sale, RefundRequest } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { useSettingsStore } from '../../stores';
import { Button, Select } from '../../shared/ui';
import { paymentModesService } from '../../lib/services/paymentsService';

interface RefundSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onConfirmRefund: (request: RefundRequest) => Promise<void>;
  isProcessing: boolean;
}

export default function RefundSaleModal({ isOpen, onClose, sale, onConfirmRefund, isProcessing }: RefundSaleModalProps) {
  const settings = useSettingsStore(s => s.settings);
  const [modes, setModes] = useState<{ id: string; name: string }[]>([]);
  // Default refund method = original sale method (fall back to cash for split/cheque)
  const defaultMethod = (['cash', 'card', 'online', 'digital'].includes(sale.paymentMethod))
    ? sale.paymentMethod
    : 'cash';
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<string>(defaultMethod);

  useEffect(() => {
    paymentModesService.getAll().then(list => {
      setModes(list.map((m: any) => ({ id: m.id, name: m.name })));
      const ids = list.map((m: any) => m.id);
      if (!ids.includes(method)) setMethod(ids.includes(defaultMethod) ? defaultMethod : (ids[0] || 'cash'));
    }).catch(() => setModes([{ id: 'cash', name: 'Cash' }, { id: 'card', name: 'Card' }, { id: 'online', name: 'Online Wallet' }]));
  }, [sale.id]);

  // Partial refunds are removed: a refund is ALWAYS a full refund of the remaining
  // balance. This keeps the wallet reversal exact (the real amount) — never kam/ziyada.
  const totalAvailableToRefund = sale.total - (sale.refundedAmount || 0);

  const handleConfirm = () => {
    onConfirmRefund({
      type: 'full',
      items: [],
      totalRefundAmount: totalAvailableToRefund,
      reason: reason.trim() || undefined,
      method,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Refund Sale"
      maxWidth="lg"
      showClose={!isProcessing}
    >
      <div className="p-4 space-y-4">
        <div className="bg-rose-500/10 text-rose-700 dark:text-rose-400 p-3 rounded-md border border-rose-500/20 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
          <p className="text-[13px] leading-relaxed">
            Refunding will restore stock for ALL items and adjust revenue reports. This is a full refund and cannot be undone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Refund Via Wallet</label>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-8 text-[13px]"
            >
              {modes.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Reason (Optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged item, wrong size..."
              className="w-full h-8 text-[13px] px-2.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 transition-colors"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 dark:border-white/[0.08] flex justify-between items-center">
          <p className="text-[13px] font-medium text-neutral-500">Refund Amount</p>
          <p className="text-[15px] font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatCurrency(totalAvailableToRefund, settings?.currency || 'Rs')}
          </p>
        </div>
      </div>

      <div className="p-3 border-t border-neutral-200 dark:border-white/[0.08] flex justify-end gap-2 bg-neutral-50/50 dark:bg-white/[0.01]">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isProcessing}
          className="h-8 text-[13px] px-3 font-medium rounded-md"
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="h-8 text-[13px] px-3 font-medium rounded-md"
        >
          <RotateCcw className={`h-3.5 w-3.5 mr-1.5 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? 'Processing...' : 'Confirm Refund'}
        </Button>
      </div>
    </Modal>
  );
}
