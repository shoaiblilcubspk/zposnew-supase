import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * EmptyState — the single standardized empty/placeholder state for all
 * non-POS routes. Generalized from SharedProductList's embedded empty
 * block; replaces the ~30 bespoke empty states across the app.
 *
 * Presentation only.
 */
export interface EmptyStateProps {
  icon?: React.ReactNode | React.ElementType;
  title: string;
  subtext?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

function renderEmptyStateIcon(iconNode?: React.ReactNode | React.ElementType, defaultClass = 'h-full w-full'): React.ReactNode {
  if (!iconNode) return <PackageOpen className={defaultClass} />;
  if (React.isValidElement(iconNode)) return iconNode;
  if (typeof iconNode === 'function' || (typeof iconNode === 'object' && (iconNode as any)?.$$typeof)) {
    const IconComponent = iconNode as React.ElementType;
    return <IconComponent className={defaultClass} />;
  }
  return iconNode as React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  subtext,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-center flex flex-col items-center justify-center',
        compact ? 'p-6' : 'p-10',
        className
      )}
    >
      <div className={cn('mx-auto text-primary/30 mb-3', compact ? 'h-8 w-8' : 'h-12 w-12')}>
        {renderEmptyStateIcon(icon)}
      </div>
      <p className="text-sm font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">
        {title}
      </p>
      {subtext && (
        <p className="text-[9px] font-bold mt-2 uppercase tracking-[0.2em] text-gray-600 dark:text-gray-500">
          {subtext}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
