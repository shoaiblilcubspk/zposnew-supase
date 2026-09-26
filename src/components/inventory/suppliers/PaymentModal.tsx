import React from 'react';
import { Select } from '../../../shared/ui';
import { ToggleSwitch } from '../../../shared/ui/ToggleSwitch';
import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import { Modal } from '../../../shared/ui/Modal';
import { formatCurrency } from '../../../lib/currencies';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplierName: string;
  balance: number;
  appSettings: any;
  paymentAmount: string;
  setPaymentAmount: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  paymentNote: string;
  setPaymentNote: (v: string) => void;
  isPaymentManualOverride: boolean;
  setIsPaymentManualOverride: (v: boolean) => void;
  submitPayment: () => void;
  formLoading: boolean;
  t: (key: string, fallback?: string) => string;
}

export function PaymentModal({
  isOpen, onClose, supplierName, balance, appSettings,
  paymentAmount, setPaymentAmount, paymentMethod, setPaymentMethod,
  paymentNote, setPaymentNote, isPaymentManualOverride, setIsPaymentManualOverride,
  submitPayment, formLoading}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'RECORD PAYMENT'}
      subtitle={`${'SETTLE DEBT FOR'} ${supplierName.toUpperCase()}`}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full font-mono text-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] font-medium transition-colors"
          >
            {'Cancel'}
          </button>
          <button
            type="button"
            onClick={submitPayment}
            disabled={formLoading}
            className="h-8 px-4 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors shadow-none"
          >
            {formLoading ? 'Recording...' : 'Confirm Payment'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-[13px] tracking-[-0.01em]">
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3.5 rounded-md shadow-none text-center">
          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mb-0.5">{'Outstanding Balance'}</p>
          <p className="text-xl font-mono tabular-nums font-bold text-neutral-900 dark:text-white">{formatCurrency(balance, appSettings.currency)}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{'Amount Paid *'}</label>
            <input
              type="number"
              step="0.01"
              className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono tabular-nums"
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{'Payment Method *'}</label>
            <Select
              className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">{'Cash'}</option>
              <option value="card">{'Credit/Debit Card'}</option>
              <option value="online">{'Online Wallet'}</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{'Note / Reference'}</label>
            <input
              type="text"
              className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
              placeholder="e.g. Cleared invoice #1234"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] p-3 rounded-md">
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 uppercase">{'Manual Override'}</p>
                <HelpTooltip content="Turn on for custom payments or manual adjustments (e.g., advance payment or fixing old ledger). This will be recorded as an Admin correction in history." />
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{'Mark as Admin balance correction'}</p>
            </div>
            <ToggleSwitch checked={isPaymentManualOverride} onChange={setIsPaymentManualOverride} color="bg-primary" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
