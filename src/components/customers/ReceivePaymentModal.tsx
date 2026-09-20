import { useState } from 'react';
import { CreditCard, DollarSign, FileText } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui';
import { Customer } from '../../types';
import { receiveCustomerPayment, fetchCustomerLedger } from '../../lib/services/customerLedgerService';
import { useSettingsStore, useCustomersStore } from '../../stores';
import { formatCurrency } from '../../lib/currencies';
import { sonner } from '../../lib/sonner';
import { refreshAllStoresFromLocalDb } from '../../lib/sync/storeSync';

interface Props {
  customer: Customer;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

import { useEffect, useRef } from 'react';

export function ReceivePaymentModal({ customer, onClose, onSuccess }: Props) {
  const settings = useSettingsStore(s => s.settings);
  const updateCustomer = useCustomersStore(s => s.updateCustomer);
  const currency = settings?.currency || 'PKR';

  const paymentModes = useSettingsStore(s => s.paymentModes) || [];
  const activeModes = paymentModes.filter(m => m.enabled !== false);

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState(activeModes.length > 0 ? activeModes[0].id : 'cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  
  // Stable idempotency key for this payment session
  const idempotencyKey = useRef(`rcv_${customer.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    fetchCustomerLedger(customer.id).then(data => {
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (data.length > 0) setLiveBalance(data[0].balanceAfter);
    }).catch(() => {});
  }, [customer.id]);

  const balance = liveBalance !== null ? liveBalance : (customer.balance || 0);
  const amountNum = parseFloat(amount) || 0;

  const processingLock = useRef(false);

  const handleSubmit = async () => {
    if (processingLock.current) return;
    if (amountNum <= 0) { sonner.error('Amount must be greater than 0'); return; }
    
    processingLock.current = true;
    setLoading(true);
    try {
      const result = await receiveCustomerPayment({
        customerId: customer.id,
        amount: amountNum,
        paymentMode: mode,
        paymentModeId: mode,
        reference: reference || undefined,
        note: note || undefined,
        idempotencyKey: idempotencyKey.current,
      });

      // Update customer in store + refresh payments store for Reports
      updateCustomer?.({ ...customer, balance: result.balanceAfter });
      refreshAllStoresFromLocalDb().catch(() => {});

      sonner.success(`Payment received! New balance: ${formatCurrency(result.balanceAfter, currency)}`);
      onSuccess?.(result.balanceAfter);
      onClose();
    } catch (e: any) {
      sonner.error(e?.message || 'Failed to receive payment');
    } finally {
      processingLock.current = false;
      setLoading(false);
    }
  };

  const balanceAfterPreview = balance - amountNum;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Receive Payment"
      maxWidth="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || amountNum <= 0}>
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Customer + current balance */}
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-3">
          <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-mono uppercase tracking-wider">{customer.name} — Outstanding</div>
            <div className={`text-base font-bold font-mono tabular-nums ${balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(balance, currency)}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Amount Received *</label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-8 pl-8 pr-2.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
              autoFocus
            />
          </div>
          {amountNum > 0 && (
            <div className="mt-1 text-[11px] font-mono text-neutral-500">
              Balance after: <span className={`font-mono tabular-nums font-semibold ${balanceAfterPreview <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {formatCurrency(balanceAfterPreview, currency)}
              </span>
            </div>
          )}
        </div>

        {/* Payment Mode */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Payment Method</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {activeModes.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`h-8 rounded text-[12px] font-mono border transition-colors ${
                  mode === m.id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {m.name || m.label || m.id}
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Reference # (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Cheque no. / Transfer ID"
            className="w-full h-8 px-2.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">
            <FileText className="inline h-3.5 w-3.5 mr-1" />Note (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="w-full px-2.5 py-1.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors resize-none placeholder:text-neutral-400"
          />
        </div>
      </div>
    </Modal>
  );
}
