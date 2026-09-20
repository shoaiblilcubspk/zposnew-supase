/**
 * Sync Status Store (Zustand)
 * Real-time state for P2P sync indicators, pending counts, and peer metrics.
 */

import { create } from 'zustand';
import { getPendingOutboxCount } from './vectorClock';

export interface SyncStatusState {
  pendingOutboxCount: number;
  connectedPeersCount: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  setPendingCount: (count: number) => void;
  setConnectedPeersCount: (count: number) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  refreshPendingCount: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  pendingOutboxCount: 0,
  connectedPeersCount: 0,
  isSyncing: false,
  lastSyncTime: null,

  setPendingCount: (pendingOutboxCount) => set({ pendingOutboxCount }),
  setConnectedPeersCount: (connectedPeersCount) => set({ connectedPeersCount }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

  refreshPendingCount: async () => {
    try {
      const count = await getPendingOutboxCount();
      set({ pendingOutboxCount: count });
    } catch {
      // Ignore if DB is currently initializing
    }
  },
}));
