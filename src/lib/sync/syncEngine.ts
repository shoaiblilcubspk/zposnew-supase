import { getDatabase, TABLES } from '../db';
import { getP2PMesh, P2PMeshManager } from '../mesh/p2pMesh';
import { getDeviceProfile, DeviceProfile } from '../mesh/deviceIdentity';
import { SyncOutboxRecord } from '../events/types';
import { MeshMessage } from '../mesh/meshProtocol';
import { getInboxMaxSequence, getUnsyncedOutboxEvents, markEventsSynced } from './vectorClock';
import { useSyncStatusStore } from './syncStatusStore';
import { refreshAllStoresFromLocalDb } from './storeSync';
import { entityReconciler } from './entityReconciler';

export class SyncEngine {
  private mesh: P2PMeshManager;
  private currentDevice: DeviceProfile | null = null;
  private isRunning = false;
  private syncTimer: any = null;
  private unsubscribeMeshMessage: (() => void) | null = null;
  private unsubscribeMeshStatus: (() => void) | null = null;
  private hasRequestedSnapshot = false;

  constructor() {
    this.mesh = getP2PMesh();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentDevice = await getDeviceProfile();

    this.unsubscribeMeshMessage = this.mesh.onMessage((senderId, msg) => {
      this.handleIncomingMessage(senderId, msg).catch((err) => {
        console.error('[SyncEngine] Error handling message:', err);
      });
    });

    this.unsubscribeMeshStatus = this.mesh.onPeerStatusChange((peerId, status) => {
      const connectedCount = this.mesh.getConnectedPeers().length;
      useSyncStatusStore.getState().setConnectedPeersCount(connectedCount);

      if (status === 'connected') {
        this.initiatePeerSync(peerId).catch((err) => {
          console.error(`[SyncEngine] Error initiating sync with ${peerId}:`, err);
        });
      }
    });

    // Initial status update
    await useSyncStatusStore.getState().refreshPendingCount();
    const connectedPeers = this.mesh.getConnectedPeers();
    useSyncStatusStore.getState().setConnectedPeersCount(connectedPeers.length);

    // Immediately initiate sync for all peers that are ALREADY connected
    for (const peerId of connectedPeers) {
      this.initiatePeerSync(peerId).catch((err) => {
        console.error(`[SyncEngine] Error initiating initial sync with ${peerId}:`, err);
      });
    }

    // Periodic sweep every 5 seconds
    this.syncTimer = setInterval(() => this.periodicSweep(), 5000);
  }

  stop(): void {
    this.isRunning = false;
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.unsubscribeMeshMessage) this.unsubscribeMeshMessage();
    if (this.unsubscribeMeshStatus) this.unsubscribeMeshStatus();
  }

  async initiatePeerSync(peerId: string): Promise<void> {
    try {
      const db = await getDatabase();
      const pRow = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${TABLES.PRODUCTS};`);
      if ((pRow?.count ?? 0) === 0) {
        this.mesh.sendToPeer(peerId, 'SNAPSHOT_REQUEST', {});
        if (this.currentDevice) {
          entityReconciler.reconcileWithPeer(peerId, this.currentDevice.deviceId).catch(() => {});
        }
        // Still attempt incremental sync for other entity types (users, settings, etc.)
      }
    } catch {}
    await this.requestSyncFromPeer(peerId);
    if (this.currentDevice) {
      entityReconciler.reconcileWithPeer(peerId, this.currentDevice.deviceId).catch(() => {});
    }
  }

  async requestSyncFromPeer(peerId: string): Promise<void> {
    const knownSeq = await getInboxMaxSequence(peerId);
    this.mesh.sendToPeer(peerId, 'EVENT_SYNC_REQUEST', { remoteKnownSeq: knownSeq });
  }

  private async handleIncomingMessage(senderId: string, msg: MeshMessage): Promise<void> {
    switch (msg.type) {
      case 'SNAPSHOT_REQUEST': await this.handleSnapshotRequest(senderId); break;
      case 'SNAPSHOT_RESPONSE': await this.handleSnapshotResponse(msg.payload); break;
      case 'EVENT_SYNC_REQUEST': await this.handleSyncRequest(senderId, msg.payload); break;
      case 'EVENT_BATCH': await this.handleEventBatch(senderId, msg.payload); break;
      case 'EVENT_ACK': await this.handleEventAck(msg.payload); break;
      case 'RECONCILE_REQUEST':
        if (this.currentDevice) await entityReconciler.handleReconcileRequest(senderId, msg.payload, this.currentDevice.deviceId);
        break;
      case 'RECONCILE_PAYLOAD':
        await entityReconciler.handleReconcilePayload(senderId, msg.payload);
        break;
    }
  }

  private async handleSnapshotRequest(senderId: string): Promise<void> {
    try {
      const db = await getDatabase();
      const pRow = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${TABLES.PRODUCTS};`);
      if ((pRow?.count ?? 0) === 0) {
        console.warn('[SyncEngine] Skipping snapshot response: this device has 0 products.');
        return;
      }
      const { generateSnapshot } = await import('./snapshotEngine');
      this.mesh.sendToPeer(senderId, 'SNAPSHOT_RESPONSE', await generateSnapshot());
    } catch (err) {
      console.error('[SyncEngine] Failed to send snapshot:', err);
    }
  }

  private async handleSnapshotResponse(payload: any): Promise<void> {
    try {
      if (!payload) return;
      const { applySnapshot } = await import('./snapshotEngine');
      await applySnapshot(payload);
      this.hasRequestedSnapshot = false; // Reset guard — device now has data
      useSyncStatusStore.getState().setLastSyncTime(Date.now());
      await refreshAllStoresFromLocalDb();
    } catch (err) {
      console.error('[SyncEngine] Failed to apply snapshot:', err);
    }
  }

  private async handleSyncRequest(senderId: string, payload: { remoteKnownSeq?: number }): Promise<void> {
    if (!this.currentDevice) return;
    const fromSeq = payload?.remoteKnownSeq ?? 0;
    const events = await getUnsyncedOutboxEvents(this.currentDevice.deviceId, fromSeq, 50);

    if (events.length > 0) {
      const highestSeq = events[events.length - 1].sequence;
      const remainingEvents = await getUnsyncedOutboxEvents(this.currentDevice.deviceId, highestSeq, 1);
      const hasMore = remainingEvents.length > 0;

      this.mesh.sendToPeer(senderId, 'EVENT_BATCH', {
        batch: events,
        hasMore,
      });
    }
  }

  private async handleEventBatch(
    senderId: string,
    payload: { batch: SyncOutboxRecord[]; hasMore: boolean }
  ): Promise<void> {
    const { batch, hasMore } = payload;
    if (!batch || batch.length === 0) return;

    useSyncStatusStore.getState().setIsSyncing(true);
    const { applyEventBatch } = await import('./eventBatchApplier');
    const { ackedIds, newEvents, maxSequence } = await applyEventBatch(batch);

    // Instant 0ms reactive UI store refresh
    await refreshAllStoresFromLocalDb();

    // Send ACK back to sender peer
    this.mesh.sendToPeer(senderId, 'EVENT_ACK', {
      eventIds: ackedIds,
      maxSequence,
    });

    // MESH RELAY: Forward newly applied events to all other connected peers
    if (newEvents.length > 0) {
      const otherPeers = this.mesh.getConnectedPeers().filter((p) => p !== senderId);
      for (const otherPeer of otherPeers) {
        this.mesh.sendToPeer(otherPeer, 'EVENT_BATCH', {
          batch: newEvents,
          hasMore: false,
        });
      }
    }

    useSyncStatusStore.getState().setIsSyncing(false);
    useSyncStatusStore.getState().setLastSyncTime(Date.now());

    // If sender has more events, request the next batch
    if (hasMore) {
      this.mesh.sendToPeer(senderId, 'EVENT_SYNC_REQUEST', {
        remoteKnownSeq: maxSequence,
      });
    }
  }

  /**
   * Push unacknowledged local outbox events to all connected peers immediately.
   * Uses per-peer cursor (getInboxMaxSequence) to send only events the peer hasn't received.
   */
  async pushPendingEventsToPeers(): Promise<void> {
    if (!this.currentDevice) return;
    const peers = this.mesh.getAvailablePeers();
    if (peers.length === 0) return;

    const db = await getDatabase();
    const events = await db.query<SyncOutboxRecord>(
      `SELECT * FROM sync_outbox WHERE is_synced = 0 ORDER BY sequence ASC LIMIT 50;`
    );
    if (events.length === 0) return;

    for (const peerId of peers) {
      this.mesh.sendToPeer(peerId, 'EVENT_BATCH', {
        batch: events,
        hasMore: events.length >= 50,
      });
    }
  }

  private async handleEventAck(payload: { eventIds?: string[] }): Promise<void> {
    if (!payload?.eventIds || payload.eventIds.length === 0) return;
    await markEventsSynced(payload.eventIds);
    await useSyncStatusStore.getState().refreshPendingCount();
    useSyncStatusStore.getState().setLastSyncTime(Date.now());
  }

  private async periodicSweep(): Promise<void> {
    const store = useSyncStatusStore.getState();
    await store.refreshPendingCount();
    const peers = this.mesh.getAvailablePeers();
    const connectedDc = this.mesh.getConnectedPeers();
    store.setConnectedPeersCount(Math.max(connectedDc.length, peers.length));

    if (peers.length > 0) {
      try {
        const db = await getDatabase();
        const pRow = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM products;`);
        if ((pRow?.count ?? 0) === 0) {
          for (const peerId of peers) {
            this.mesh.sendToPeer(peerId, 'SNAPSHOT_REQUEST', {});
            if (this.currentDevice) {
              entityReconciler.reconcileWithPeer(peerId, this.currentDevice.deviceId).catch(() => {});
            }
          }
        }
      } catch {}

      for (const peerId of peers) {
        await this.requestSyncFromPeer(peerId).catch(() => {});
        if (this.currentDevice) {
          entityReconciler.reconcileWithPeer(peerId, this.currentDevice.deviceId).catch(() => {});
        }
      }

      await this.pushPendingEventsToPeers().catch(() => {});
    }
  }

  async forceFullMeshReconcile(): Promise<void> {
    const peers = this.mesh.getAvailablePeers();
    useSyncStatusStore.getState().setIsSyncing(true);

    try {
      await this.pushPendingEventsToPeers();
      for (const peerId of peers) {
        await this.requestSyncFromPeer(peerId).catch(() => {});
        if (this.currentDevice) {
          entityReconciler.reconcileWithPeer(peerId, this.currentDevice.deviceId).catch(() => {});
        }
      }
      await refreshAllStoresFromLocalDb();
    } finally {
      useSyncStatusStore.getState().setIsSyncing(false);
      useSyncStatusStore.getState().setLastSyncTime(Date.now());
    }
  }
}

let syncEngineInstance: SyncEngine | null = null;
export function getSyncEngine(): SyncEngine {
  return (syncEngineInstance ??= new SyncEngine());
}
