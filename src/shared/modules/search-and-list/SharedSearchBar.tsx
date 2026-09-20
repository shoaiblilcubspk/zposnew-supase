import { Search, Camera } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SharedSearchBarProps } from './types';

/**
 * SharedSearchBar — the single standardized search input used across all
 * non-POS routes. Renders a magnifying-glass icon on the left, a bordered
 * rounded input with an emerald focus border, an optional camera/scan icon
 * button on the right, and an optional trailing "Add All Items" bulk action.
 *
 * Business-type-agnostic: works for items, products, categories, orders,
 * customers, expenses, discounts, sales records — whatever the page searches.
 */
export function SharedSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onScanClick,
  onAddAll,
  addAllLabel = 'ADD ALL ITEMS',
  resultsCount,
  className,
  inputClassName,
}: SharedSearchBarProps) {
  return (
    <div className={cn('relative flex-1 flex items-center gap-1.5 group', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full h-9 pl-9 pr-3 bg-white dark:bg-surface border border-gray-200 dark:border-white/[0.08] rounded-md text-[13.5px] sm:text-[14px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-none transition-colors shadow-none',
            inputClassName
          )}
        />
      </div>
      {onScanClick && (
        <button
          type="button"
          onClick={onScanClick}
          title="Scan with Camera"
          className="h-9 w-9 rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-surface text-gray-500 hover:text-primary flex items-center justify-center transition-colors shrink-0"
        >
          <Camera className="h-4 w-4" />
        </button>
      )}
      {onAddAll && value && (
        <button
          type="button"
          onClick={onAddAll}
          className="h-8 px-3 rounded bg-primary text-white text-[11px] font-medium tracking-wide hover:bg-primary-hover transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 shadow-none"
        >
          {resultsCount != null && (
            <span className="opacity-80 font-mono">({resultsCount})</span>
          )}
          {addAllLabel}
        </button>
      )}
    </div>
  );
}
