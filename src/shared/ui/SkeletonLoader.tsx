interface SkeletonLoaderProps {
  type?: 'grid' | 'list' | 'detail' | 'order-timer' | 'item-rows';
  count?: number;
}

export function SkeletonLoader({ type = 'grid', count = 4 }: SkeletonLoaderProps) {
  // Shimmer pulse styling
  const shimmer = "animate-pulse bg-neutral-200 dark:bg-white/[0.06] rounded";

  if (type === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] p-3 flex flex-col gap-3 shadow-none h-full">
            <div className={`w-full aspect-square ${shimmer} rounded`} />
            <div className="space-y-1.5">
              <div className={`w-3/4 h-3.5 ${shimmer}`} />
              <div className={`w-1/2 h-3 ${shimmer}`} />
            </div>
            <div className={`w-full h-8 ${shimmer} rounded-md mt-auto`} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3 rounded-md flex items-center justify-between shadow-none">
            <div className="flex items-center gap-3 w-full">
              <div className={`w-8 h-8 ${shimmer} rounded shrink-0`} />
              <div className="space-y-1 w-full">
                <div className={`w-1/3 h-3.5 ${shimmer}`} />
                <div className={`w-1/4 h-3 ${shimmer}`} />
              </div>
            </div>
            <div className={`w-16 h-7 ${shimmer} rounded shrink-0`} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-5 space-y-4 shadow-none">
        <div className={`w-full h-48 ${shimmer} rounded-md`} />
        <div className="space-y-2">
          <div className={`w-1/3 h-6 ${shimmer}`} />
          <div className={`w-2/3 h-4 ${shimmer}`} />
          <div className={`w-1/2 h-3.5 ${shimmer}`} />
        </div>
        <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-white/[0.08]">
          <div className={`w-24 h-4 ${shimmer}`} />
          <div className="flex gap-2">
            <div className={`w-20 h-8 ${shimmer} rounded-md`} />
            <div className={`w-20 h-8 ${shimmer} rounded-md`} />
            <div className={`w-20 h-8 ${shimmer} rounded-md`} />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <div className={`w-28 h-8 ${shimmer} rounded-md`} />
          <div className={`flex-1 h-8 ${shimmer} rounded-md`} />
        </div>
      </div>
    );
  }

  if (type === 'order-timer') {
    return (
      <div className={`w-20 h-4 ${shimmer} rounded mt-1`} />
    );
  }

  if (type === 'item-rows') {
    return (
      <div className="space-y-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2 rounded-md">
            <div className={`w-8 h-8 ${shimmer} rounded shrink-0`} />
            <div className="space-y-1 w-full">
              <div className={`w-1/3 h-3 ${shimmer}`} />
              <div className={`w-2/3 h-3.5 ${shimmer}`} />
              <div className={`w-1/4 h-2.5 ${shimmer}`} />
            </div>
            <div className={`w-8 h-7 ${shimmer} rounded shrink-0`} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
