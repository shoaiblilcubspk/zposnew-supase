import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { SharedProductListProps } from './types';
import { SharedProductListItem } from './SharedProductListItem';
import { useDragDropList } from './SharedDragDropList';
import { EmptyState } from '../../ui/EmptyState';

/**
 * SharedProductList — the single standardized item/product listing used on all
 * non-POS routes.
 *
 * - loading            → shimmer rows matching the item-row shape
 * - empty              → centered box icon + uppercase empty state text
 * - draggable+onReorder → rows become reorderable via the shared drag module
 * - onClearSearch      → renders the "Smart Match Results (N)" header with a
 *                        CLOSE pill, mirroring the restock/PO experience
 *
 * The module is presentation + interaction only — data fetching and filtering
 * stay in the page. No business types are hardcoded.
 */
export function SharedProductList({
  items,
  loading = false,
  emptyStateText = 'NO ITEMS SELECTED YET',
  emptyStateSubtext,
  selectedIds = [],
  onItemAdd,
  onItemSelect,
  onClearSearch,
  headerTitle = 'Smart Match Results',
  maxHeight,
  skeletonCount = 5,
  draggable = false,
  onReorder,
  compact = false,
  className,
}: SharedProductListProps) {
  const dnd = useDragDropList(onReorder);

  const renderRow = (item: (typeof items)[number], index: number) => {
    const selected = selectedIds.includes(item.id);
    const row = (
      <SharedProductListItem
        item={item}
        selected={selected}
        onAdd={onItemAdd}
        onSelect={onItemSelect}
        showDragHandle={draggable}
        compact={compact}
      />
    );

    if (!draggable || !onReorder) return row;

    return (
      <div
        draggable
        onDragStart={() => dnd.handleDragStart(index)}
        onDragEnter={() => dnd.handleDragEnter(index)}
        onDragOver={dnd.handleDragOver}
        onDragEnd={dnd.handleDragEnd}
        className={cn(dnd.rowCls(index), 'rounded-md')}
      >
        {row}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-surface rounded-md shadow-none border border-neutral-200 dark:border-white/[0.08] overflow-hidden',
        className
      )}
    >
      {onClearSearch && (
        <div className="h-8 px-3 bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            {headerTitle} ({items.length})
          </span>
          <button
            onClick={onClearSearch}
            className="h-6 px-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white text-[11px] font-medium rounded hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            <span>Close</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className={cn('overflow-y-auto custom-scrollbar p-2')} style={maxHeight ? { maxHeight } : undefined}>
          <SkeletonLoader type="item-rows" count={skeletonCount} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={emptyStateText} subtext={emptyStateSubtext} />
      ) : (
        <div
          className="overflow-y-auto custom-scrollbar p-2"
          style={maxHeight ? { maxHeight } : undefined}
        >
          <div className="flex flex-col gap-1">
            {items.map((item, index) => (
              <React.Fragment key={item.id}>{renderRow(item, index)}</React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
