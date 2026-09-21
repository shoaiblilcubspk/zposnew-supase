import React from 'react';
import { formatCurrency } from '../../../lib/currencies';

interface SplitPaymentSectionProps {
  splitMethodA: 'cash' | 'card' | 'online';
  setSplitMethodA: (v: 'cash' | 'card' | 'online') => void;
  splitMethodB: 'cash' | 'card' | 'online';
  setSplitMethodB: (v: 'cash' | 'card' | 'online') => void;
  splitAmountA: string;
  setSplitAmountA: (v: string) => void;
  splitAmountB: string;
  setSplitAmountB: (v: string) => void;
  finalTotal: number;
  currency?: string;
}

export function SplitPaymentSection({
  splitMethodA,
  setSplitMethodA,
  splitMethodB,
  setSplitMethodB,
  splitAmountA,
  setSplitAmountA,
  splitAmountB,
  setSplitAmountB,
  finalTotal,
  currency = 'PKR',
}: SplitPaymentSectionProps) {
  const parts = [
    { m: splitMethodA, setM: setSplitMethodA, amt: splitAmountA, setAmt: setSplitAmountA, label: 'Part 1' },
    { m: splitMethodB, setM: setSplitMethodB, amt: splitAmountB, setAmt: setSplitAmountB, label: 'Part 2' },
  ];

  const splitSum = (parseFloat(splitAmountA) || 0) + (parseFloat(splitAmountB) || 0);
  const isMatch = Math.abs(splitSum - finalTotal) < 0.01;

  return (
    <div className="space-y-2.5">
      {parts.map((p, i) => (
        <div key={i} className="p-2.5 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{p.label}</span>
            <div className="flex gap-1">
              {(['cash', 'card', 'online'] as const).map((mm) => (
                <button
                  key={mm}
                  type="button"
                  onClick={() => p.setM(mm)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    p.m === mm
                      ? 'bg-primary text-white'
                      : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {mm}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-neutral-400">{currency}</span>
            <input
              type="text"
              inputMode="decimal"
              value={p.amt}
              onChange={(e) => p.setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full h-8 pl-10 pr-3 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded-md text-[13px] font-mono font-medium text-neutral-900 dark:text-white focus:border-primary outline-none text-right"
              placeholder="0"
            />
          </div>
        </div>
      ))}
      <div
        className={`p-3 rounded-md flex items-center justify-between border ${
          isMatch
            ? 'bg-primary/5 border-primary/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
        }`}
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider mb-0.5">Split Total</p>
          <p className="text-[15px] font-mono font-semibold tabular-nums">
            {formatCurrency(splitSum, currency)}
            <span className="text-[12px] font-normal opacity-60"> / {formatCurrency(finalTotal, currency)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
