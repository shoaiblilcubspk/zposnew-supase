import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Select } from './Select';

/**
 * usePagination — the single page-state hook replacing the fragmented
 * ITEMS_PER_PAGE / itemsPerPage / ITEMS_PER_PAGE_REPORT / displayLimit
 * constants across the app.
 *
 * Contract: pass RAW (unsliced) data in; get the page slice out.
 */
export function usePagination<T>(items: T[], initialPageSize: number = 50) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems: items.length,
    pageItems,
    hasMore: safePage < totalPages,
    hasPrev: safePage > 1,
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    goToPage: setPage,
    reset: () => setPage(1),
  };
}

/**
 * Pagination — the single standardized pager for all non-POS routes.
 * Desktop: numbered pager. Mobile (<768px): collapses to Prev/Next with a
 * "Page X of Y" indicator.
 */
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  totalItems?: number;
  mode?: 'numbered' | 'prevNext';
  siblingCount?: number;
  className?: string;
}

function pageNumbers(page: number, totalPages: number, siblingCount: number): (number | '…')[] {
  const start = Math.max(1, page - siblingCount);
  const end = Math.min(totalPages, page + siblingCount);

  const nums: (number | '…')[] = [];
  if (start > 1) {
    nums.push(1);
    if (start > 2) nums.push('…');
  }
  for (let i = start; i <= end; i++) nums.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) nums.push('…');
    nums.push(totalPages);
  }
  return nums;
}

const navBtn =
  'w-7 h-7 flex items-center justify-center rounded border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors duration-100';

export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  totalItems,
  mode = 'numbered',
  siblingCount = 1,
  className,
}: PaginationProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2 sm:gap-4 flex-wrap w-full py-0.5 sm:py-0', className)}>
      <nav
        className="flex items-center gap-1 select-none"
        aria-label="Pagination"
      >
        <button
          type="button"
          className={navBtn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Numbered pages: desktop only */}
        {mode === 'numbered' && totalPages > 0 && (
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers(page, totalPages, siblingCount).map((num, i) =>
              num === '…' ? (
                <span key={`e${i}`} className="px-1 text-xs text-neutral-400">
                  …
                </span>
              ) : (
                <button
                  key={num}
                  type="button"
                  onClick={() => onPageChange(num)}
                  aria-current={num === page ? 'page' : undefined}
                  className={cn(
                    'min-w-[28px] h-7 px-2 rounded text-[12.5px] tabular-nums font-medium transition-colors duration-100',
                    num === page
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-none border border-emerald-600'
                      : 'border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
                  )}
                >
                  {num}
                </button>
              )
            )}
          </div>
        )}

        {/* Mobile page indicator */}
        <span className="sm:hidden text-[12px] font-medium text-neutral-700 dark:text-neutral-300 px-2 tabular-nums">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          className={navBtn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {totalItems != null && (
          <span className="hidden lg:inline text-[12px] font-medium text-neutral-600 dark:text-neutral-300 ml-2 tabular-nums">
            {totalItems} total
          </span>
        )}
      </nav>

      {pageSize && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium">Per Page:</span>
          <Select
            value={pageSize.toString()}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-20 !h-7 !min-h-0 !text-[12px] !py-0 !pl-2.5 !pr-7 font-mono border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-neutral-900 dark:text-white"
          >
            {pageSizeOptions.map(sz => (
              <option key={sz} value={sz.toString()} className="bg-white dark:bg-[#18181b] text-neutral-900 dark:text-white">{sz}</option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}

