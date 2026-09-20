import React from 'react';
import { useSyncStatusStore } from '../../lib/sync/syncStatusStore';

export const SyncStatusWidget: React.FC = () => {
  const pendingCount = useSyncStatusStore((s) => s.pendingOutboxCount);
  const connectedPeers = useSyncStatusStore((s) => s.connectedPeersCount);
  const isSyncing = useSyncStatusStore((s) => s.isSyncing);

  const handleClick = async () => {
    const { sonner } = await import('../../lib/sonner');
    if (connectedPeers > 0) {
      sonner.info(`Reconciling mesh across ${connectedPeers} peer(s)...`);
      try {
        const { getSyncEngine } = await import('../../lib/sync/syncEngine');
        await getSyncEngine().forceFullMeshReconcile();
        sonner.success('Synchronized: All sales, stock & ledger reconciled across terminals!');
      } catch (err: any) {
        sonner.error(`Sync error: ${err.message || 'Check terminal connection'}`);
      }
    } else {
      sonner.info(`Local Standalone: 100% saved in SQLite. ${pendingCount} event(s) queued for peers.`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        connectedPeers > 0
          ? `Mesh Active: ${connectedPeers} peer terminal(s) connected. ${pendingCount} pending local event(s). Click for details.`
          : `Local Standalone: 100% saved locally in SQLite. ${pendingCount} event(s) queued for peer sync. Click for details.`
      }
      className="hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-100/80 dark:bg-white/[0.06] text-[12px] font-sans font-medium tracking-tight text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-white/20 transition-colors select-none cursor-pointer shrink-0"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      <span>{connectedPeers > 0 ? (isSyncing ? 'Syncing' : `${connectedPeers}P`) : 'Local'}</span>
      {pendingCount > 0 && (
        <span
          className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-bold tabular-nums"
          title={`${pendingCount} local event(s) ready to sync with peer terminals`}
        >
          {pendingCount}
        </span>
      )}
    </button>
  );
};
