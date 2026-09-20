import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll';

export interface ScrollableTabBarProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  activeItemSelector?: string;
  activeDep?: unknown;
}

export function ScrollableTabBar({
  children,
  className,
  containerClassName,
  activeItemSelector,
  activeDep
}: ScrollableTabBarProps) {
  const { containerRef, canScrollLeft, canScrollRight, scroll } = useHorizontalScroll({
    step: 240,
    enableDrag: true,
    enableWheel: true,
    activeItemSelector,
    activeDep
  });

  return (
    <div className={cn('relative flex items-center min-w-0 max-w-full', containerClassName)}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="hidden md:flex absolute -left-1 z-30 items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-[#222226] text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/20 shadow-[0_3px_8px_rgba(0,0,0,0.16),0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:scale-110 hover:border-primary hover:text-primary active:scale-95 active:translate-y-0.5 transition-all duration-150 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      <div
        ref={containerRef}
        className={cn(
          'flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide overscroll-x-contain touch-pan-x w-full py-1.5 px-0.5 cursor-grab',
          className
        )}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="hidden md:flex absolute -right-1 z-30 items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-[#222226] text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/20 shadow-[0_3px_8px_rgba(0,0,0,0.16),0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:scale-110 hover:border-primary hover:text-primary active:scale-95 active:translate-y-0.5 transition-all duration-150 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
