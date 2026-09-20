import React from 'react';
import { Delete } from 'lucide-react';

interface PinKeypadProps {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  disabled?: boolean;
  clearDisabled?: boolean;
}

export function PinKeypad({
  onDigit,
  onClear,
  onBackspace,
  disabled = false,
  clearDisabled = false,
}: PinKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full mt-2 select-none">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <button
          key={digit}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onDigit(digit)}
          disabled={disabled}
          className="h-11 bg-neutral-100 dark:bg-neutral-900/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-white/[0.06] rounded text-[17px] font-mono font-medium text-neutral-900 dark:text-white active:bg-neutral-300 dark:active:bg-neutral-700 transition-colors cursor-pointer"
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear}
        disabled={disabled || clearDisabled}
        className="h-11 bg-neutral-100/60 dark:bg-neutral-900/40 hover:bg-neutral-200 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-white/[0.06] rounded text-[13px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        Clear
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onDigit('0')}
        disabled={disabled}
        className="h-11 bg-neutral-100 dark:bg-neutral-900/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-white/[0.06] rounded text-[17px] font-mono font-medium text-neutral-900 dark:text-white active:bg-neutral-300 dark:active:bg-neutral-700 transition-colors cursor-pointer"
      >
        0
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onBackspace}
        disabled={disabled || clearDisabled}
        className="h-11 bg-neutral-100/60 dark:bg-neutral-900/40 hover:bg-neutral-200 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-white/[0.06] rounded flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        <Delete className="w-5 h-5" />
      </button>
    </div>
  );
}
