import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyncStatusStore } from '../../lib/sync/syncStatusStore';

/**
 * Header sync indicator — shows the REAL cloud-sync state from the local sync_queue:
 *   green  "Synced"  — nothing pending, nothing failed
 *   amber  "Queued N" — N offline changes waiting to push to Supabase
 *   red    "Failed N" — N bundles permanently failed
 * Clicking OPENS the full queue (Settings → Cloud Sync) where every action is listed by name
 * with its real status + Retry. Polls every 4s. Numbers are never faked.
 */
export const SyncStatusWidget: React.FC = () => {
  const navigate = useNavigate();
  const pendingCount = useSyncStatusStore((s) => s.pendingOutboxCount);
  const failedCount = useSyncStatusStore((s) => s.failedCount);
  const isSyncing = useSyncStatusStore((s) => s.isSyncing);
  const refresh = useSyncStatusStore((s) => s.refresh);

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

  const openQueue = () => {
    // Open the live queue viewer (Settings → Cloud Sync).
    try { navigate('/settings/mesh'); }
    catch { window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' })); }
  };

  const state = failedCount > 0 ? 'failed' : pendingCount > 0 ? 'pending' : 'synced';
  const dot = state === 'failed' ? 'bg-red-500' : state === 'pending' ? 'bg-amber-500' : 'bg-emerald-500';
  const label = isSyncing ? 'Syncing' : state === 'failed' ? 'Failed' : state === 'pending' ? 'Queued' : 'Synced';
  const badge = state === 'failed' ? failedCount : state === 'pending' ? pendingCount : 0;

  return (
    <button
      type="button"
      onClick={openQueue}
      title={
        isSyncing
          ? 'Syncing… — click to open the sync queue'
          : failedCount > 0
          ? `${failedCount} change(s) failed. Click to open the sync queue.`
          : pendingCount > 0
          ? `${pendingCount} change(s) queued. Click to open the sync queue.`
          : 'All changes synced. Click to open the sync queue.'
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
