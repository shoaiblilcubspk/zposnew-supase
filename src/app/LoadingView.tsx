export const LoadingView = () => {
  return (
    <div className="fixed inset-0 w-full p-4 sm:p-6 space-y-4 bg-app w-full overflow-hidden animate-pulse">
      {/* Header Row Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <div className="h-5 w-40 bg-neutral-200 dark:bg-white/[0.06] rounded"></div>
          <div className="h-3 w-28 bg-neutral-200/60 dark:bg-white/[0.04] rounded"></div>
        </div>
        <div className="h-8 w-full sm:w-56 bg-neutral-200 dark:bg-white/[0.06] rounded-md"></div>
      </div>

      {/* Stats Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-20 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 flex flex-col justify-between">
            <div className="h-2.5 w-16 bg-neutral-200 dark:bg-white/10 rounded"></div>
            <div className="h-5 w-20 bg-neutral-200 dark:bg-white/10 rounded mt-1"></div>
          </div>
        ))}
      </div>

      {/* Main Workspace Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Heavy Content (Chart/Table) */}
        <div className="lg:col-span-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 h-[320px] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 bg-neutral-200 dark:bg-white/10 rounded"></div>
            <div className="h-7 w-20 bg-neutral-200 dark:bg-white/10 rounded"></div>
          </div>
          <div className="flex-1 flex items-end gap-2 mt-4">
            {[35, 60, 45, 80, 50, 75, 40, 95, 70, 85, 55, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-neutral-200/70 dark:bg-white/[0.06] rounded-t" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>

        {/* Right Sidebar List */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 h-[320px] flex flex-col gap-3">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-white/10 rounded mb-1"></div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-neutral-200 dark:bg-white/10"></div>
                <div className="space-y-1">
                  <div className="h-2.5 w-16 bg-neutral-200 dark:bg-white/10 rounded"></div>
                  <div className="h-2 w-10 bg-neutral-200/60 dark:bg-white/[0.06] rounded"></div>
                </div>
              </div>
              <div className="h-3 w-10 bg-neutral-200 dark:bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
