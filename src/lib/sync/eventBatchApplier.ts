/**
 * Event Batch Applier
 * Transactionally applies batches of sync events, verifying idempotency and recording outbox relay logs.
 */

import { getDatabase } from '../db';
import { SyncOutboxRecord } from '../events/types';
import { eventDispatcher } from './eventDispatcher';

export interface BatchApplyResult {
  ackedIds: string[];
  newEvents: SyncOutboxRecord[];
  maxSequence: number;
}

export async function applyEventBatch(batch: SyncOutboxRecord[]): Promise<BatchApplyResult> {
  const db = await getDatabase();
  const ackedIds: string[] = [];
  const newEvents: SyncOutboxRecord[] = [];
  let maxSequence = 0;

  await db.transaction(async (tx) => {
    for (const event of batch) {
      if (event.sequence > maxSequence) {
        maxSequence = event.sequence;
      }

      // Idempotency: Check if already applied
      const existing = await tx.queryOne(
        `SELECT 1 FROM sync_inbox WHERE event_id = ?`,
        [event.event_id]
      );

      if (existing) {
        ackedIds.push(event.event_id);
        continue;
      }

      // Apply mutation to local state via registered dispatcher
      await eventDispatcher.dispatch(event, tx);

      // Record in sync_inbox
      await tx.execute(
        `INSERT INTO sync_inbox (event_id, sender_device_id, sequence, applied_at)
         VALUES (?, ?, ?, ?)`,
        [event.event_id, event.device_id, event.sequence, Date.now()]
      );

      // Persist into local sync_outbox so this node acts as a resilient mesh relay
      await tx.execute(
        `INSERT OR IGNORE INTO sync_outbox (
          event_id, device_id, sequence, entity_type, entity_id, operation, payload, created_at, is_synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);`,
        [
          event.event_id,
          event.device_id,
          event.sequence,
          event.entity_type,
          event.entity_id,
          event.operation,
          typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload),
          event.created_at || Date.now(),
        ]
      );

      ackedIds.push(event.event_id);
      newEvents.push(event);
    }
  });

  return { ackedIds, newEvents, maxSequence };
}
