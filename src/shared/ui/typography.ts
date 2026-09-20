import React from 'react';
import { cn } from '../../lib/utils';

/**
 * 🎨 Centralized Typography & Text Visibility System
 * Single Source of Truth for all text sizes, weights, and dark/light mode contrast.
 * Updating here updates the typography across the entire application.
 */
export const TYPOGRAPHY = {
  // Form Labels & Inputs
  label: 'text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100',
  labelRequired: 'text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100 after:content-["*"] after:ml-0.5 after:text-rose-500',
  hint: 'text-[12px] font-medium text-neutral-600 dark:text-neutral-400',
  error: 'text-[12px] font-medium text-rose-600 dark:text-rose-400',

  // Section & Group Headers
  sectionHeader: 'text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider',
  cardTitle: 'text-[14.5px] font-bold text-neutral-900 dark:text-white tracking-tight',
  cardSubtitle: 'text-[12.5px] font-medium text-neutral-600 dark:text-neutral-400',

  // Tables & Matrices
  tableHeader: 'text-[13px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider',
  tableCell: 'text-[14px] font-medium text-neutral-900 dark:text-white',
  tableCellMuted: 'text-[13px] font-medium text-neutral-700 dark:text-neutral-300',

  // Financial & Monospace (Tabular)
  money: 'font-mono font-bold tabular-nums text-neutral-900 dark:text-white text-[14px]',
  moneyGreen: 'font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-[14px]',
  moneyRed: 'font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400 text-[14px]',
  moneyAmber: 'font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400 text-[14px]',

  // Stat / Metric Cards
  statLabel: 'text-[13px] font-bold tracking-tight text-neutral-800 dark:text-neutral-200',
  statValue: 'text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white tracking-tight',

  // Modals & Popups
  modalTitle: 'text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight',
  modalSubtitle: 'text-[12px] font-mono text-neutral-500 uppercase tracking-wider',

  // Items, Cart & List Rows
  itemName: 'text-[13.5px] font-bold text-neutral-900 dark:text-white leading-snug',
  itemVariant: 'text-[12px] font-semibold text-neutral-600 dark:text-neutral-400 leading-tight',
  itemModifier: 'text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight',
  itemAddon: 'text-[12px] font-semibold text-violet-600 dark:text-violet-400 leading-tight',
  itemTopping: 'text-[12px] font-medium text-neutral-600 dark:text-neutral-300 leading-tight',
  cartTotalLabel: 'text-[12px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider leading-none',
  cartTotalValue: 'text-2xl font-black font-mono tracking-tight leading-none text-amber-600 dark:text-amber-400',

  // Badges & Specialized tags
  sublabel: 'text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-300',
  dealBadge: 'text-[11px] font-bold text-violet-600 dark:text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none',
  snBadge: 'text-[11.5px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded leading-none uppercase',
  discountBadge: 'text-[11.5px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none shrink-0',
  costWarning: 'text-[11px] font-bold font-mono text-rose-500',
  badgeText: 'text-[12px] font-bold uppercase tracking-wide',
  kbd: 'inline-flex items-center text-[11px] font-mono font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-white/10 border border-neutral-200 dark:border-white/10 rounded px-1.5 py-0.5 leading-none shadow-sm',
} as const;

export type TypographyVariant = keyof typeof TYPOGRAPHY;

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
}

export const Text = React.forwardRef<HTMLElement, TextProps>(({
  variant = 'tableCell',
  as: Component = 'span',
  className,
  children,
  ...props
}, ref) => {
  return React.createElement(
    Component,
    {
      ref,
      className: cn(TYPOGRAPHY[variant], className),
      ...props,
    },
    children
  );
});

Text.displayName = 'Text';
