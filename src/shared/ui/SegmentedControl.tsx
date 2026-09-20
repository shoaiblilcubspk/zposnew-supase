import React from 'react';
import { cn } from '../../lib/utils';

/**
 * SegmentedControl — the single standardized segmented tab/toggle control
 * for all non-POS routes.
 *
 * Replaces the ~11 copy-pasted segmented bars (same
 * `isActive ? 'bg-white dark:bg-surface ... shadow-sm' : ...` template),
 * including the verbatim-duplicate Simple/Variable product-type toggle in
 * ProductModal / ProductDetailHub.
 */
export interface SegmentedOption {
  label: React.ReactNode;
  value: string;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = true,
  className,
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cn(
        size === 'sm' ? 'h-8 text-[12px]' : 'h-9.5 text-[13.5px] sm:text-[14px]',
        'p-0.5 sm:p-1 bg-neutral-100 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-lg sm:rounded-xl inline-flex items-center gap-0.5 sm:gap-1 shadow-none',
        fullWidth && 'w-full',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 flex items-center justify-center text-center font-bold tracking-tight rounded-md sm:rounded-lg transition-all duration-150 whitespace-nowrap active:scale-95',
              size === 'sm' ? 'h-7 px-1.5 sm:px-2.5 text-[12px]' : 'h-7.5 sm:h-8 px-3 text-[13px] sm:text-[13.5px]',
              active
                ? 'bg-primary text-white font-bold border border-primary shadow-none'
                : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:bg-neutral-200/50 dark:hover:bg-white/[0.04]'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
