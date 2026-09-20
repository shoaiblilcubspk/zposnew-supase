/**
 * Sync Vector Clock & Sequence Manager
 * Tracks monotonic sequences for outbox and inbox replication.
 */

import { getDatabase } from '../db';
import { SyncOutboxRecord } from '../events/types';

export async function getInboxMaxSequence(senderDeviceId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.queryOne<{ max_seq: number | null }>(
    `SELECT MAX(sequence) as max_seq FROM sync_inbox WHERE sender_device_id = ?`,
    [senderDeviceId]
  );
  return row?.max_seq ?? 0;
}

export async function getOutboxMaxSequence(deviceId?: string): Promise<number> {
  const db = await getDatabase();
  if (deviceId) {
    const row = await db.queryOne<{ max_seq: number | null }>(
      `SELECT MAX(sequence) as max_seq FROM sync_outbox WHERE device_id = ?`,
      [deviceId]
    );
    if (row?.max_seq) return row.max_seq;
  }
  const globalRow = await db.queryOne<{ max_seq: number | null }>(
    `SELECT MAX(sequence) as max_seq FROM sync_outbox`
  );
  return globalRow?.max_seq ?? 0;
}

export async function getUnsyncedOutboxEvents(
  deviceId?: string,
  fromSequence: number = 0,
  limit: number = 50
): Promise<SyncOutboxRecord[]> {
  const db = await getDatabase();
  if (deviceId) {
    return db.query<SyncOutboxRecord>(
      `SELECT * FROM sync_outbox 
       WHERE device_id = ? AND sequence > ?
       ORDER BY sequence ASC 
       LIMIT ?`,
      [deviceId, fromSequence, limit]
    );
  }
  return db.query<SyncOutboxRecord>(
    `SELECT * FROM sync_outbox 
     WHERE sequence > ?
     ORDER BY sequence ASC 
     LIMIT ?`,
    [fromSequence, limit]
  );
}

export async function getPendingOutboxCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_outbox WHERE is_synced = 0`
  );
  return row?.count ?? 0;
}

export async function markEventsSynced(eventIds: string[]): Promise<void> {
  if (!eventIds || eventIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = eventIds.map(() => '?').join(',');
  await db.execute(
    `UPDATE sync_outbox SET is_synced = 1 WHERE event_id IN (${placeholders})`,
    eventIds
  );
}
