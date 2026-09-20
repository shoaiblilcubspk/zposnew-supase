import React from 'react';
import { Hash, RotateCcw, Eye } from 'lucide-react';
import { Button } from '../../../shared/ui';
import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptInvoicingSection({
  formData,
  handleChange,
  handleRepairCounter,
  canEditSettings,
}: ReceiptSettingsFormProps) {
  const prefix = (formData.invoicePrefix || 'INV').trim().toUpperCase();
  const counterNum = parseInt(formData.invoiceCounter, 10) || 1;
  const padDigits = formData.invoicePadDigits !== undefined ? parseInt(formData.invoicePadDigits, 10) : 4;

  const sampleSerial = padDigits > 0
    ? counterNum.toString().padStart(padDigits, '0')
    : counterNum.toString();

  const previewInvoice = `${prefix ? prefix + '-' : ''}${sampleSerial}`;

  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center text-neutral-600 dark:text-neutral-300">
            <Hash className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">
              Business Logic & Invoicing
            </h3>
            <p className="text-[11px] text-neutral-500 font-mono tracking-tight">
              Prefix, starting serial, and numbering controls
            </p>
          </div>
        </div>

        {handleRepairCounter && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRepairCounter}
            disabled={!canEditSettings}
            icon={<RotateCcw className="w-3 h-3 text-neutral-500" />}
            className="h-7 px-2 text-[11px] font-medium"
            title="Scan local sales to auto-sync next serial counter"
          >
            <span className="hidden sm:inline">Sync with Sales</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Invoice Prefix
          </label>
          <input
            type="text"
            name="invoicePrefix"
            value={formData.invoicePrefix || ''}
            onChange={handleChange}
            placeholder="INV"
            disabled={!canEditSettings}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono uppercase"
          />
          <p className="text-[10px] text-neutral-600 dark:text-neutral-300">
            e.g. INV, BILL, POS, or leave empty
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Next Serial Number
          </label>
          <input
            type="number"
            name="invoiceCounter"
            min="1"
            value={formData.invoiceCounter || '1'}
            onChange={handleChange}
            disabled={!canEditSettings}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono tabular-nums"
          />
          <p className="text-[10px] text-neutral-600 dark:text-neutral-300">
            Sequence starts or increments from here
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Number Length / Padding
          </label>
          <select
            name="invoicePadDigits"
            value={padDigits}
            onChange={handleChange}
            disabled={!canEditSettings}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono"
          >
            <option value="4">4 Digits (e.g. 0001)</option>
            <option value="5">5 Digits (e.g. 00001)</option>
            <option value="6">6 Digits (e.g. 000001)</option>
            <option value="0">No Leading Zeros (e.g. 1, 2, 3)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Live Sample Preview
          </label>
          <div className="h-8 px-3 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-between font-mono">
            <span className="text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-neutral-500" />
              Receipt #:
            </span>
            <span className="text-[13px] font-bold text-primary tracking-wide">
              #{previewInvoice}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
