import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Badge — the single standardized status pill for all non-POS routes.
 *
 * Unifies the app's 4 competing badge conventions onto one component.
 * Default `soft` variant uses the `/10`-opacity + text-color convention
 * (closest to majority usage across the app).
 *
 * Presentation only.
 */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';
export type BadgeVariant = 'soft' | 'solid' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  variant?: BadgeVariant;
  icon?: React.ReactNode | React.ElementType;
}

const softToneClass: Record<BadgeTone, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  neutral: 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/[0.08]',
};

const solidToneClass: Record<BadgeTone, string> = {
  success: 'bg-emerald-600 text-white border-transparent',
  warning: 'bg-amber-600 text-white border-transparent',
  danger: 'bg-rose-600 text-white border-transparent',
  info: 'bg-sky-600 text-white border-transparent',
  neutral: 'bg-neutral-700 text-white border-transparent',
};

const outlineToneClass: Record<BadgeTone, string> = {
  success: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-transparent',
  warning: 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-transparent',
  danger: 'border-rose-500/30 text-rose-700 dark:text-rose-400 bg-transparent',
  info: 'border-sky-500/30 text-sky-700 dark:text-sky-400 bg-transparent',
  neutral: 'border-neutral-300 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 bg-transparent',
};

const toneClass: Record<BadgeVariant, Record<BadgeTone, string>> = {
  soft: softToneClass,
  solid: solidToneClass,
  outline: outlineToneClass,
};

const sizeClass: Record<BadgeSize, string> = {
  sm: 'text-[12px] font-bold px-2 py-0.5 gap-1 tracking-tight',
  md: 'text-[13px] font-bold px-2.5 py-0.5 gap-1.5 tracking-tight',
};

function renderBadgeIcon(iconNode?: React.ReactNode | React.ElementType): React.ReactNode {
  if (!iconNode) return null;
  if (React.isValidElement(iconNode)) return iconNode;
  if (typeof iconNode === 'function' || (typeof iconNode === 'object' && (iconNode as any)?.$$typeof)) {
    const IconComponent = iconNode as React.ElementType;
    return <IconComponent className="h-3 w-3" />;
  }
  return iconNode as React.ReactNode;
}

export function Badge({
  tone = 'neutral',
  size = 'md',
  variant = 'soft',
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  const iconEl = renderBadgeIcon(icon);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium tracking-[-0.01em] border whitespace-nowrap',
        sizeClass[size],
        toneClass[variant][tone],
        className
      )}
      {...rest}
    >
      {iconEl && <span className="shrink-0">{iconEl}</span>}
      {children}
    </span>
  );
}
