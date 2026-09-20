import React from 'react';
import { ToggleSwitch } from '../../../shared/ui';

interface Props {
  batchData: { date: string; notes: string; paidAmount: number; paymentMethod: string };
  setBatchData: React.Dispatch<React.SetStateAction<{ date: string; notes: string; paidAmount: number; paymentMethod: string }>>;
  recordAsSupplierBill: boolean;
  setRecordAsSupplierBill: (val: boolean) => void;
}

export function StockInMetadata({ batchData, setBatchData, recordAsSupplierBill, setRecordAsSupplierBill }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-2">
        <span className="w-4 h-px bg-neutral-200 dark:bg-white/10"></span>
        {'Sourcing Metadata'}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{'Transmission Date'}</label>
          <input
            type="date"
            value={batchData.date}
            onChange={(e) => setBatchData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-[13px] font-mono text-neutral-900 dark:text-white focus:border-primary focus:outline-none shadow-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{'Internal Ref'}</label>
          <input
            value={batchData.notes}
            onChange={(e) => setBatchData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-[13px] font-mono text-neutral-900 dark:text-white focus:border-primary focus:outline-none shadow-none placeholder:text-neutral-400"
            placeholder="PO_ID..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-neutral-50 dark:bg-surface p-3 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-neutral-900 dark:text-white">{'Record as Supplier Bill'}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">{'Creates payable in supplier ledger'}</p>
        </div>
        <ToggleSwitch
          checked={recordAsSupplierBill}
          onChange={setRecordAsSupplierBill}
          size="md"
          color="bg-primary"
        />
      </div>
    </div>
  );
}
