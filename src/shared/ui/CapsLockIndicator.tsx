import React from 'react';
import { ArrowBigUp } from 'lucide-react';
import { useCapsLock } from '../../hooks/useCapsLock';

export interface CapsLockIndicatorProps {
  show?: boolean;
  isCapsLock?: boolean;
  className?: string;
  variant?: 'badge' | 'inline' | 'icon-only';
}

export function CapsLockIndicator({
  show,
  isCapsLock,
  className = '',
  variant = 'badge',
}: CapsLockIndicatorProps) {
  const activeCapsLock = useCapsLock();
  const isVisible = show !== undefined ? show : (isCapsLock !== undefined ? isCapsLock : activeCapsLock);

  if (!isVisible) return null;

  if (variant === 'icon-only') {
    return (
      <span
        title="Caps Lock is ON"
        className={`inline-flex items-center justify-center text-amber-500 dark:text-amber-400 animate-in fade-in zoom-in-90 duration-150 ${className}`}
      >
        <ArrowBigUp className="w-3.5 h-3.5 fill-current stroke-[2]" />
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0 animate-in fade-in duration-150 select-none ${className}`}
      >
        <ArrowBigUp className="w-3.5 h-3.5 fill-current stroke-[2]" />
        <span>Caps Lock is ON</span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium tracking-tight whitespace-nowrap shrink-0 animate-in fade-in duration-150 select-none ${className}`}
    >
      <ArrowBigUp className="w-3.5 h-3.5 fill-current stroke-[2]" />
      <span>Caps Lock is ON</span>
    </div>
  );
}
