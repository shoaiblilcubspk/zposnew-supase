import React from 'react';
import { Button } from '../../../shared/ui';
import { ToggleSwitch } from '../../../shared/ui/ToggleSwitch';
import { HelpTooltip } from '../../../shared/ui/HelpTooltip';
import { Modal } from '../../../shared/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  billAmount: string;
  setBillAmount: (v: string) => void;
  billNote: string;
  setBillNote: (v: string) => void;
  isBillManualOverride: boolean;
  setIsBillManualOverride: (v: boolean) => void;
  submitBill: () => void;
  formLoading: boolean;
}

export function BillModal({
  isOpen, onClose, billAmount, setBillAmount, billNote, setBillNote,
  isBillManualOverride, setIsBillManualOverride, submitBill, formLoading
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'RECORD MANUAL BILL'}
      subtitle={'ADD MANUAL INVOICE AMOUNT TO LEDGER'}
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
            onClick={submitBill}
            disabled={formLoading}
            className="h-8 px-4 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors shadow-none"
          >
            {formLoading ? 'Recording...' : 'Record Bill'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-[13px] tracking-[-0.01em]">
        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded text-center">
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">{'THIS WILL INCREASE THE OUTSTANDING BALANCE'}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{'Bill Amount *'}</label>
            <input
              type="number"
              step="0.01"
              className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono tabular-nums"
              placeholder="0.00"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{'Note / Reference'}</label>
            <input
              type="text"
              className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
              placeholder="e.g. Invoice #9988"
              value={billNote}
              onChange={(e) => setBillNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] p-3 rounded-md">
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 uppercase">{'Manual Override'}</p>
                <HelpTooltip content="Forces the system to accept irregular amounts (e.g., adding an arbitrary bill amount). Logs this action as an admin correction." />
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{'Admin amount correction — logged'}</p>
            </div>
            <ToggleSwitch checked={isBillManualOverride} onChange={setIsBillManualOverride} color="bg-primary" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
