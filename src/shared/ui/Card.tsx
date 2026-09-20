import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Card — the single standardized surface container for all non-POS routes.
 *
 * Consolidates the app's drifting surface conventions (dark:bg-[#1C1C1C],
 * dark:bg-[#111], dark:bg-[#1f1f1f], dark:bg-surface) onto one token.
 * `premium-card` / `glass-card` CSS classes are rescued and exposed as
 * variants rather than left as dead code.
 *
 * `className` is an escape hatch (page-specific tweaks).
 */
export type CardVariant = 'default' | 'stat' | 'premium' | 'glass' | 'listRow';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const variantClass: Record<CardVariant, string> = {
  default:
    'bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none transition-colors duration-100',
  stat: 'stat-card',
  premium:
    'bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none transition-colors duration-100',
  glass:
    'bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none',
  listRow:
    'bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none transition-colors duration-100 hover:bg-neutral-50 dark:hover:bg-surface-hover',
};

const paddingClass: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(variantClass[variant], variant !== 'stat' && paddingClass[padding], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
