/**
 * Sync Status Store (Zustand) — Supabase-only cloud-direct.
 * Reflects the REAL cloud sync queue (device → Supabase): pending = rows still to push,
 * failed = permanently-failed bundles awaiting Retry. Numbers come straight from the
 * `sync_queue` (countPending / countFailed) — never faked. "Peers" no longer exist (P2P
 * removed); connectedPeersCount stays 0 for source compatibility.
 */

import { create } from 'zustand';

export interface SyncStatusState {
  pendingOutboxCount: number;
  failedCount: number;
  connectedPeersCount: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  setConnectedPeersCount: (count: number) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  /** Pull the real pending + failed counts from the local sync_queue. */
  refresh: () => Promise<void>;
  /** @deprecated use refresh() — kept for source compatibility. */
  refreshPendingCount: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusState>((set, get) => ({
  pendingOutboxCount: 0,
  failedCount: 0,
  connectedPeersCount: 0,
  isSyncing: false,
  lastSyncTime: null,

  setPendingCount: (pendingOutboxCount) => set({ pendingOutboxCount }),
  setFailedCount: (failedCount) => set({ failedCount }),
  setConnectedPeersCount: (connectedPeersCount) => set({ connectedPeersCount }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

  refresh: async () => {
    try {
      const { countPending, countFailed } = await import('../../data');
      const [pending, failed] = await Promise.all([countPending(), countFailed()]);
      set({ pendingOutboxCount: pending, failedCount: failed });
    } catch {
      // Ignore if the local DB is still initializing.
    }
  },

  refreshPendingCount: async () => {
    await get().refresh();
  },
}));
