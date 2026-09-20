import { RefObject } from 'react';
import { Search, X, Camera, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { RealIcon } from '../../../shared/icons';
import { CapsLockIndicator } from '../../../shared/ui';

interface GridControlsProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  onOpenDrafts?: () => void;
  draftsCount: number;
  setShowScanner: (v: boolean) => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  showLeftScroll: boolean;
  showRightScroll: boolean;
  scrollCategories: (dir: 'left' | 'right') => void;
  categoriesRef: RefObject<HTMLDivElement>;
  isTouchMode: boolean;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function GridControls({
  searchTerm,
  setSearchTerm,
  searchRef,
  onOpenDrafts,
  draftsCount,
  setShowScanner,
  categories,
  selectedCategory,
  setSelectedCategory,
  showLeftScroll,
  showRightScroll,
  scrollCategories,
  categoriesRef,
  isTouchMode,
  onSearchKeyDown,
}: GridControlsProps) {
  return (
    <div className="p-1 lg:p-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-app transition-colors">
      <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 xl:items-center">
        <div className="flex-1 xl:flex-none xl:w-[380px] flex items-center gap-1.5 lg:gap-2.5 w-full min-w-[280px] sm:min-w-[340px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <input
              ref={searchRef}
              type="text"
              placeholder={"Search or scan..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className={`w-full transition-all bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-200/60 dark:border-white/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-full pl-9 pr-20 lg:pl-11 lg:pr-24 outline-none ${isTouchMode ? 'h-9 lg:h-10 text-xs lg:text-sm' : 'h-9 lg:h-10 text-xs lg:text-sm'
                }`}
            />

            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <CapsLockIndicator variant="icon-only" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-full transition-all active:scale-95"
                  title="Clear Search"
                >
                  <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                </button>
              )}
              <button
                onClick={() => setShowScanner(true)}
                className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-all active:scale-95"
                title="Scan with Camera"
              >
                <Camera className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </button>
            </div>
          </div>
          {onOpenDrafts && (
            <button
              onClick={onOpenDrafts}
              className="h-9 lg:h-10 w-9 lg:w-10 rounded-full bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center flex-shrink-0 relative transition-all active:scale-95"
              title="View saved drafts"
            >
              <FileText className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              {draftsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[8px] lg:text-[9px] font-black h-4 lg:h-4.5 w-4 lg:w-4.5 flex items-center justify-center rounded-full border border-white dark:border-[#0A0A0A]">
                  {draftsCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="relative flex items-center w-full xl:flex-1 min-w-0">
          {showLeftScroll && (
            <button
              onClick={() => scrollCategories('left')}
              aria-label="Scroll left"
              className="hidden md:flex absolute left-0 z-30 items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-[#222226] text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/20 shadow-[0_3px_8px_rgba(0,0,0,0.16),0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:scale-110 hover:border-primary hover:text-primary active:scale-95 active:translate-y-0.5 transition-all duration-150 cursor-pointer -translate-x-1/2"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          <div
            ref={categoriesRef}
            className="flex items-center overflow-x-auto space-x-2 w-full no-scrollbar scrollbar-hide overscroll-x-contain touch-pan-x px-1 py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`group relative whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-2 px-3 h-8 rounded-full text-[12.5px] tracking-tight active:scale-95 border cursor-pointer select-none ${selectedCategory === category
                    ? category === '__BUNDLES__'
                      ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs'
                      : 'bg-primary text-white font-bold border-primary shadow-xs'
                    : 'bg-white dark:bg-white/[0.05] text-neutral-900 dark:text-neutral-100 font-semibold border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.08]'
                  }`}
              >
                {category === '__BUNDLES__' && (
                  <div className="shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                    <RealIcon name="deals" size={20} />
                  </div>
                )}
                {category === 'All' && (
                  <div className="shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                    <RealIcon name="product" size={20} />
                  </div>
                )}
                <span>
                  {category === '__BUNDLES__'
                    ? "Bundles & Deals"
                    : category === 'Featured'
                      ? "Featured"
                      : category === 'All'
                        ? "All"
                        : category}
                </span>
              </button>
            ))}
          </div>

          {showRightScroll && (
            <button
              onClick={() => scrollCategories('right')}
              aria-label="Scroll right"
              className="hidden md:flex absolute right-0 z-30 items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-[#222226] text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/20 shadow-[0_3px_8px_rgba(0,0,0,0.16),0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:scale-110 hover:border-primary hover:text-primary active:scale-95 active:translate-y-0.5 transition-all duration-150 cursor-pointer translate-x-1/2"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
