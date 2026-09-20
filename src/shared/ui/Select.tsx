import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, fullWidth = false, children, ...props }, ref) => {
    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        <select
          ref={ref}
          className={cn(
            'h-8 px-2.5 pr-8 rounded text-[13px] font-medium appearance-none w-full cursor-pointer border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-neutral-900 dark:text-white focus:outline-none focus:border-primary transition-colors',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-neutral-500">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
