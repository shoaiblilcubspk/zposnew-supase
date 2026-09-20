/**
 * Event Factory & Monotonic Sequence Generator
 * Creates unique, strictly ordered event envelopes for P2P replication.
 */

import { ISqliteTransaction } from '../db/types';
import { SyncOutboxRecord, LocalTransactionOptions } from './types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the next monotonic sequence number for the specified device within the current transaction.
 */
export async function getNextDeviceSequence(deviceId: string, tx: ISqliteTransaction): Promise<number> {
  const row = await tx.queryOne<{ next_seq: number }>(
    'SELECT COALESCE(MAX(sequence), 0) + 1 AS next_seq FROM sync_outbox WHERE device_id = ?;',
    [deviceId]
  );
  return row?.next_seq ?? 1;
}

/**
 * Build a durable sync_outbox event record.
 */
export async function createOutboxEvent(
  options: Omit<LocalTransactionOptions, 'execute'>,
  tx: ISqliteTransaction
): Promise<SyncOutboxRecord> {
  const eventId = generateUUID();
  const sequence = await getNextDeviceSequence(options.deviceId, tx);
  const now = Date.now();

  const enrichedPayload = {
    ...options.payload,
    _meta: {
      eventId,
      eventType: options.eventType,
      deviceId: options.deviceId,
      userId: options.userId,
      timestamp: now,
    },
  };

  return {
    event_id: eventId,
    device_id: options.deviceId,
    sequence,
    entity_type: options.entityType,
    entity_id: options.entityId,
    operation: options.operation,
    payload: JSON.stringify(enrichedPayload),
    created_at: now,
    is_synced: 0,
  };
}
