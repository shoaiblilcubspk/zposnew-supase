import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, FileText } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui';
import { Customer } from '../../types';
import { refundCustomerPayment, fetchCustomerLedger } from '../../lib/services/customerLedgerService';
import { useSettingsStore, useCustomersStore } from '../../stores';
import { formatCurrency } from '../../lib/currencies';
import { sonner } from '../../lib/sonner';

interface Props {
  customer: Customer;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
  initialAmount?: number;
}

export function RefundCustomerModal({ customer, onClose, onSuccess, initialAmount }: Props) {
  const settings = useSettingsStore(s => s.settings);
  const updateCustomer = useCustomersStore(s => s.updateCustomer);
  const currency = settings?.currency || 'PKR';

  const paymentModes = useSettingsStore(s => s.paymentModes) || [];
  const activeModes = paymentModes.filter(m => m.enabled !== false);

  const [amount, setAmount] = useState(initialAmount ? initialAmount.toString() : '');
  const [mode, setMode] = useState(activeModes.length > 0 ? activeModes[0].id : 'cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('Clear Khata (Refund)');
  const [loading, setLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomerLedger(customer.id).then(data => {
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (data.length > 0) setLiveBalance(data[0].balanceAfter);
    }).catch(() => {});
  }, [customer.id]);

  const balance = liveBalance !== null ? liveBalance : (customer.balance || 0);
  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (amountNum <= 0) { sonner.error('Amount must be greater than 0'); return; }
    setLoading(true);
    try {
      const result = await refundCustomerPayment({
        customerId: customer.id,
        amount: amountNum,
        paymentMode: mode,
        paymentModeId: mode,
        reference: reference || undefined,
        note: note || undefined,
      });

      // Update customer in store
      updateCustomer?.({ ...customer, balance: result.balanceAfter });

      sonner.success(`Refund processed! New balance: ${formatCurrency(result.balanceAfter, currency)}`);
      onSuccess?.(result.balanceAfter);
      onClose();
    } catch (e: any) {
      sonner.error(e?.message || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const balanceAfterPreview = balance + amountNum;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Refund / Pay Customer"
      maxWidth="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={loading || amountNum <= 0}>
            Confirm Payment Out
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Customer + current balance */}
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-3">
          <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono uppercase tracking-wider">{customer.name} — We Owe</div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(Math.abs(balance), currency)}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Amount to Pay Out</label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-8 pl-8 pr-2.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
              autoFocus
            />
          </div>
          {amountNum > 0 && (
            <div className="text-[11px] font-mono text-neutral-500 mt-1 flex justify-between">
              <span>Balance After:</span>
              <span className={`font-mono tabular-nums font-semibold ${balanceAfterPreview > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {formatCurrency(Math.abs(balanceAfterPreview), currency)} {balanceAfterPreview > 0 ? 'DR' : 'CR'}
              </span>
            </div>
          )}
        </div>

        {/* Mode */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Payment Mode / Wallet</label>
          <div className="grid grid-cols-2 gap-1.5">
            {activeModes.map(m => (
              <label
                key={m.id}
                className={`h-8 flex items-center justify-center px-3 border rounded text-[12px] font-mono cursor-pointer transition-colors ${
                  mode === m.id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="refund_mode"
                  value={m.id}
                  checked={mode === m.id}
                  onChange={() => setMode(m.id)}
                  className="sr-only"
                />
                <span className="capitalize">{m.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Reference & Note */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Reference (Optional)</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Txn ID, Cheque No..."
              className="w-full h-8 px-2.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">Note (Optional)</label>
            <div className="relative">
              <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <textarea
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Reason for payment..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors resize-none placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
