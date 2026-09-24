import React from 'react';
import { useSyncStatusStore } from '../../lib/sync/syncStatusStore';

export const SyncStatusWidget: React.FC = () => {
  const pendingCount = useSyncStatusStore((s) => s.pendingOutboxCount);
  const connectedPeers = useSyncStatusStore((s) => s.connectedPeersCount);
  const isSyncing = useSyncStatusStore((s) => s.isSyncing);

  const handleClick = async () => {
    const { sonner } = await import('../../lib/sonner');
    try {
      const { flushQueue } = await import('../../data');
      const { synced } = await flushQueue();
      sonner.success(synced > 0 ? `Synced ${synced} change(s) to cloud.` : `Up to date. ${pendingCount} pending.`);
    } catch (err: any) {
      sonner.info(`Offline: ${pendingCount} change(s) queued. Will sync when online.`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isSyncing
          ? 'Syncing changes with Supabase cloud...'
          : pendingCount > 0
          ? `${pendingCount} change(s) queued for cloud sync. Click to push now.`
          : 'All changes synced with cloud. Click to sync.'
      }
      className="hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-100/80 dark:bg-white/[0.06] text-[12px] font-sans font-medium tracking-tight text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-white/20 transition-colors select-none cursor-pointer shrink-0"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      <span>{isSyncing ? 'Syncing' : pendingCount > 0 ? 'Queued' : 'Synced'}</span>
      {pendingCount > 0 && (
        <span
          className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-bold tabular-nums"
          title={`${pendingCount} change(s) queued for cloud sync`}
        >
          {pendingCount}
        </span>
      )}
    </button>
  );
};
