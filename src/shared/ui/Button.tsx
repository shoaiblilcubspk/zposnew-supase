import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { sonner } from '../../lib/sonner';

/**
 * Button — the single standardized button for all non-POS routes.
 *
 * Built on the global `.btn` CSS system (rounded, 32px height standard).
 * `btn-ghost` / `btn-sm` / `btn-lg` modifiers are rescued and wired in here
 * as `variant` / `size` instead of being dropped.
 *
 * Presentation only — no business logic.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'blue' | 'indigo' | 'amber' | 'soft-blue' | 'soft-emerald';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode | React.ElementType;
  iconPosition?: 'left' | 'right';
  shortcut?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
  blue: 'btn-blue',
  indigo: 'btn-indigo',
  amber: 'btn-amber',
  'soft-blue': 'btn-soft-blue',
  'soft-emerald': 'btn-soft-emerald',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

function renderIcon(iconNode?: React.ReactNode | React.ElementType, defaultClass = 'h-3.5 w-3.5'): React.ReactNode {
  if (!iconNode) return null;
  if (React.isValidElement(iconNode)) return iconNode;
  if (typeof iconNode === 'function' || (typeof iconNode === 'object' && (iconNode as any)?.$$typeof)) {
    const IconComponent = iconNode as React.ElementType;
    return <IconComponent className={defaultClass} />;
  }
  return iconNode as React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  shortcut,
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  useEffect(() => {
    let timeout: any;
    if (loading) {
      timeout = setTimeout(() => {
        sonner.info('Network is slow, please wait...', { id: 'slow_net_warning', duration: 4000 });
      }, 4000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
      sonner.dismiss('slow_net_warning');
    };
  }, [loading]);

  const iconEl = loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : renderIcon(icon);

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'btn',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {iconEl && iconPosition === 'left' && <span className="shrink-0 inline-flex items-center">{iconEl}</span>}
      {children !== undefined && <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{children}</span>}
      {iconEl && iconPosition === 'right' && <span className="shrink-0 inline-flex items-center">{iconEl}</span>}
      {shortcut && (
        <kbd className={cn(
          "ml-auto text-[10px] font-mono rounded px-1.5 py-0.5 leading-tight border transition-colors",
          variant === 'soft-blue'
            ? "bg-blue-100/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-400/20"
            : variant === 'soft-emerald'
            ? "bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/20"
            : variant === 'secondary' || variant === 'ghost'
            ? "bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-white/10"
            : "bg-white/20 text-white border-white/20 shadow-none"
        )}>
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
