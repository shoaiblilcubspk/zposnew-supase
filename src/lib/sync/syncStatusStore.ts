/**
 * Sync Status Store (Zustand) — Supabase-only cloud-direct.
 * Reflects the cloud sync queue (device → Supabase). "Peers" no longer exist (P2P removed);
 * connectedPeersCount stays 0. pendingOutboxCount = rows still pending in the src/data queue.
 */

import { create } from 'zustand';

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
      const { countPending } = await import('../../data');
      const count = await countPending();
      set({ pendingOutboxCount: count });
    } catch {
      // Ignore if the local DB is still initializing.
    }
  },
}));
