import { Package, Plus, CheckCircle2, GripVertical } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SharedProductListItemProps } from './types';

/**
 * SharedProductListItem — the single standardized row used for any item /
 * product / category listing across non-POS routes.
 *
 * Layout (desktop baseline):
 *   [thumb 64x64] [badge] [sku]             [ + add ]
 *                 [bold title]
 *                 [stock pill] [direct tag]
 *
 * Mobile (<768px): thumbnail shrinks to 48x48; row stays touch-friendly.
 * Selected rows receive the emerald-50 highlight; the add button transitions
 * from outline to solid emerald fill on hover/active.
 */
export function SharedProductListItem({
  item,
  selected = false,
  disabled = false,
  onAdd,
  onSelect,
  addButton = true,
  selectedLabel = 'ADDED',
  showDragHandle = false,
  dragHandle,
  compact = false,
}: SharedProductListItemProps) {
  const handleClick = () => {
    if (onSelect && !disabled) onSelect(item);
  };

  return (
    <div
      onClick={handleClick}
      role={onSelect ? 'button' : undefined}
      className={cn(
        'w-full text-left p-2 sm:p-2.5 rounded-md group flex items-center justify-between transition-colors border border-transparent',
        onSelect ? 'cursor-pointer' : '',
        !disabled && 'hover:bg-neutral-50 dark:hover:bg-surface-hover hover:border-neutral-200 dark:hover:border-white/[0.08]',
        selected && 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-500/20',
        disabled && 'opacity-60 cursor-not-allowed',
        compact && 'p-1.5'
      )}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {showDragHandle && (
          <div className="shrink-0 text-neutral-400">
            {dragHandle || <GripVertical className="h-3.5 w-3.5" />}
          </div>
        )}

        {/* Thumbnail */}
        <div className={cn(
          'bg-neutral-100 dark:bg-neutral-900 rounded-md flex items-center justify-center border border-neutral-200 dark:border-white/[0.08] shrink-0 overflow-hidden',
          compact ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'
        )}>
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Package className={cn('text-neutral-400', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {(item.badgeLabel || item.sku) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.badgeLabel && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-surface text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.08]">
                  {item.badgeLabel}
                </span>
              )}
              {item.sku && (
                <span className="text-[10px] font-mono text-neutral-400 truncate">
                  #{item.sku}
                </span>
              )}
            </div>
          )}
          <p className="text-[13px] font-medium text-neutral-900 dark:text-white truncate leading-tight mt-0.5">
            {item.title}
          </p>
          {(item.subtitle || item.stock != null || item.tag) && (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {item.subtitle && (
                <span className="text-[11px] text-neutral-500 truncate">
                  {item.subtitle}
                </span>
              )}
              {item.stock != null && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {compact ? String(item.stock) : `STOCK: ${item.stock}`}
                </span>
              )}
              {item.tag && (
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider truncate">
                  {item.tag}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Selected action */}
      {addButton && (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (onAdd) onAdd(item);
          }}
          className={cn(
            'h-8 w-8 rounded flex items-center justify-center transition-colors shrink-0',
            selected
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          title={selected ? selectedLabel : 'Add'}
        >
          {selected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
