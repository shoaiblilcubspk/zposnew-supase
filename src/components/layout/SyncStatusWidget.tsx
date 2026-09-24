import React from 'react';
import { useSyncStatusStore } from '../../lib/sync/syncStatusStore';

/**
 * Header sync indicator — shows the REAL cloud-sync state from the local sync_queue:
 *   green  "Synced"  — nothing pending, nothing failed
 *   amber  "Queued N" — N offline changes waiting to push to Supabase
 *   red    "Failed N" — N bundles permanently failed (open Settings → Cloud Sync to retry)
 * Polls every 4s and refreshes immediately after a manual push. Numbers are never faked.
 */
export const SyncStatusWidget: React.FC = () => {
  const pendingCount = useSyncStatusStore((s) => s.pendingOutboxCount);
  const failedCount = useSyncStatusStore((s) => s.failedCount);
  const isSyncing = useSyncStatusStore((s) => s.isSyncing);
  const refresh = useSyncStatusStore((s) => s.refresh);
  const setIsSyncing = useSyncStatusStore((s) => s.setIsSyncing);

  React.useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    const onOnline = () => void refresh();
    if (typeof window !== 'undefined') window.addEventListener('online', onOnline);
    return () => {
      clearInterval(id);
      if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    };
  }, [refresh]);

  const handleClick = async () => {
    const { sonner } = await import('../../lib/sonner');
    setIsSyncing(true);
    try {
      const { flushQueue } = await import('../../data');
      const { synced, permanent } = await flushQueue();
      await refresh();
      if (permanent > 0) sonner.error(`${permanent} change(s) failed to sync. Open Settings → Cloud Sync to retry.`);
      else if (synced > 0) sonner.success(`Synced ${synced} change(s) to cloud.`);
      else sonner.success('All changes are synced.');
    } catch {
      sonner.info(`Offline: ${pendingCount} change(s) queued. Will sync when online.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const state = failedCount > 0 ? 'failed' : pendingCount > 0 ? 'pending' : 'synced';
  const dot = state === 'failed' ? 'bg-red-500' : state === 'pending' ? 'bg-amber-500' : 'bg-emerald-500';
  const label = isSyncing ? 'Syncing' : state === 'failed' ? 'Failed' : state === 'pending' ? 'Queued' : 'Synced';
  const badge = state === 'failed' ? failedCount : state === 'pending' ? pendingCount : 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isSyncing
          ? 'Syncing changes with Supabase cloud…'
          : failedCount > 0
          ? `${failedCount} change(s) failed to sync. Open Settings → Cloud Sync to retry.`
          : pendingCount > 0
          ? `${pendingCount} change(s) queued for cloud sync. Click to push now.`
          : 'All changes synced with cloud. Click to sync.'
      }
      className="hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-100/80 dark:bg-white/[0.06] text-[12px] font-sans font-medium tracking-tight text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-white/20 transition-colors select-none cursor-pointer shrink-0"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${isSyncing ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
      {badge > 0 && (
        <span
          className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums ${
            state === 'failed'
              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
