/**
 * Atomic Transaction Manager with Durable Outbox Emitter
 * Guarantees that business mutations and their corresponding sync_outbox events
 * commit atomically or roll back completely with zero residual records.
 */

import { transaction, query, queryOne, execute } from '../db';
import { ISqliteTransaction } from '../db/types';
import { createOutboxEvent } from './eventFactory';
import { LocalTransactionOptions, SyncOutboxRecord, OutboxStats } from './types';

/**
 * Execute business operations and atomically record an immutable outbox event.
 * If either fails, the entire transaction is rolled back.
 */
export async function commitLocalTransaction<T = any>(options: LocalTransactionOptions<T>): Promise<T> {
  const res = await transaction(async (tx: ISqliteTransaction) => {
    // 1. Execute the business state mutations (tables: sales, inventory, products, etc.)
    const result = await options.execute(tx);

    // 2. Generate the immutable event envelope with monotonic sequence
    const outboxRecord = await createOutboxEvent(options, tx);

    // 3. Atomically persist into sync_outbox within the SAME transaction
    await tx.execute(
      `INSERT INTO sync_outbox (
        event_id,
        device_id,
        sequence,
        entity_type,
        entity_id,
        operation,
        payload,
        created_at,
        is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        outboxRecord.event_id,
        outboxRecord.device_id,
        outboxRecord.sequence,
        outboxRecord.entity_type,
        outboxRecord.entity_id,
        outboxRecord.operation,
        outboxRecord.payload,
        outboxRecord.created_at,
        outboxRecord.is_synced,
      ]
    );

    // 4. Return the business mutation result
    return result;
  });

  // 5. Update sync store pending counter & broadcast to online mesh peers immediately
  try {
    const { useSyncStatusStore } = await import('../sync/syncStatusStore');
    useSyncStatusStore.getState().refreshPendingCount().catch(() => {});
    const { getSyncEngine } = await import('../sync/syncEngine');
    getSyncEngine().pushPendingEventsToPeers().catch(() => {});
  } catch {
    // Ignore if store/engine is not yet mounted
  }

  return res;
}

/**
 * Query pending outbox events awaiting P2P replication to peers.
 */
export async function getPendingOutboxEvents(limit = 100): Promise<SyncOutboxRecord[]> {
  return query<SyncOutboxRecord>(
    `SELECT * FROM sync_outbox 
     WHERE is_synced = 0 
     ORDER BY sequence ASC 
     LIMIT ?;`,
    [limit]
  );
}

/**
 * Mark an outbox event as acknowledged/synced by network peers.
 */
export async function markOutboxEventSynced(eventId: string): Promise<void> {
  await execute(
    'UPDATE sync_outbox SET is_synced = 1 WHERE event_id = ?;',
    [eventId]
  );
}

/**
 * Retrieve current statistics on the sync_outbox queue.
 */
export async function getOutboxStats(deviceId?: string): Promise<OutboxStats> {
  const whereClause = deviceId ? 'WHERE device_id = ?' : '';
  const params = deviceId ? [deviceId] : [];

  const counts = await queryOne<{ total: number; pending: number; synced: number; last_seq: number }>(
    `SELECT 
       COUNT(*) AS total,
       SUM(CASE WHEN is_synced = 0 THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN is_synced = 1 THEN 1 ELSE 0 END) AS synced,
       COALESCE(MAX(sequence), 0) AS last_seq
     FROM sync_outbox ${whereClause};`,
    params
  );

  return {
    totalEvents: counts?.total ?? 0,
    pendingEvents: counts?.pending ?? 0,
    syncedEvents: counts?.synced ?? 0,
    lastSequence: counts?.last_seq ?? 0,
  };
}

/**
 * Retrieve the latest sequence number generated on this device.
 */
export async function getLatestDeviceSequence(deviceId: string): Promise<number> {
  const row = await queryOne<{ last_seq: number }>(
    'SELECT COALESCE(MAX(sequence), 0) AS last_seq FROM sync_outbox WHERE device_id = ?;',
    [deviceId]
  );
  return row?.last_seq ?? 0;
}
