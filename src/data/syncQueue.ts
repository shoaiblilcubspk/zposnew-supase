/**
 * Sync queue — the durable local outbox for cloud-direct writes (device → server only).
 *
 * Golden pattern (Rule 10): every local mutation performs, in ONE SQLite transaction:
 *   (a) the write to the local mirror table, and
 *   (b) an enqueue() into sync_queue.
 * The background worker (syncWorker.ts) later pushes pending rows to Supabase using
 * operation_id for idempotent UPSERT. There is NO device↔device path.
 */

import type { ISqliteTransaction } from '../lib/db/types';
import { localQuery, localExecute } from './localDb';
import type { SyncedTable } from './localSchema';

export type SyncOperationType = 'insert' | 'update' | 'delete' | 'rpc' | 'bundle';

/** One row inside an atomic bundle payload. */
export interface BundleRow {
  table: string;
  op: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
}

/** Payload shape stored for an `operation_type = 'bundle'` queue entry. */
export interface BundlePayload {
  action: string;
  rows: BundleRow[];
}

export interface SyncQueueRow {
  operation_id: string;
  table_name: string;
  operation_type: SyncOperationType;
  payload: string; // JSON
  status: 'pending' | 'synced' | 'error' | 'failed';
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnqueueInput {
  operation_id: string;
  table_name: SyncedTable | 'rpc' | 'bundle';
  operation_type: SyncOperationType;
  /** Row data for insert/update/delete, { fn, args } for rpc, or { action, rows } for bundle. */
  payload: Record<string, unknown>;
}

/**
 * Enqueue a mutation inside an EXISTING transaction (preferred — keeps local write
 * and queue insert atomic). Use this from repository write functions.
 */
export function enqueueInTx(tx: ISqliteTransaction, input: EnqueueInput): Promise<unknown> {
  const now = new Date().toISOString();
  return tx.execute(
    `INSERT OR REPLACE INTO sync_queue
       (operation_id, table_name, operation_type, payload, status, retry_count, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, NULL, ?, ?)`,
    [input.operation_id, input.table_name, input.operation_type, JSON.stringify(input.payload), now, now]
  );
}

/** Enqueue outside a transaction (e.g. retry re-arm). Prefer enqueueInTx for writes. */
export async function enqueue(input: EnqueueInput): Promise<void> {
  const now = new Date().toISOString();
  await localExecute(
    `INSERT OR REPLACE INTO sync_queue
       (operation_id, table_name, operation_type, payload, status, retry_count, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, NULL, ?, ?)`,
    [input.operation_id, input.table_name, input.operation_type, JSON.stringify(input.payload), now, now]
  );
}

export async function getPending(limit = 200): Promise<SyncQueueRow[]> {
  return localQuery<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE status IN ('pending','error') ORDER BY created_at ASC LIMIT ?`,
    [limit]
  );
}

export async function countPending(): Promise<number> {
  const rows = await localQuery<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sync_queue WHERE status IN ('pending','error')`
  );
  return rows[0]?.n ?? 0;
}

export async function markSynced(operationId: string): Promise<void> {
  await localExecute(
    `UPDATE sync_queue SET status='synced', last_error=NULL, updated_at=? WHERE operation_id=?`,
    [new Date().toISOString(), operationId]
  );
}

export async function markError(operationId: string, error: string): Promise<void> {
  await localExecute(
    `UPDATE sync_queue
       SET status='error', retry_count = retry_count + 1, last_error=?, updated_at=?
     WHERE operation_id=?`,
    [error.slice(0, 500), new Date().toISOString(), operationId]
  );
}

/**
 * Mark a bundle permanently failed (§1.5.4). A permanent error (400 / constraint / bad
 * payload) will never succeed on retry, so the bundle is parked out of the active queue and
 * surfaced in Settings → Cloud Sync for the user to retry after a fix. No partial cloud rows
 * are left behind because the whole bundle is ONE server transaction that rolled back.
 */
export async function markFailed(operationId: string, error: string): Promise<void> {
  await localExecute(
    `UPDATE sync_queue
       SET status='failed', retry_count = retry_count + 1, last_error=?, updated_at=?
     WHERE operation_id=?`,
    [error.slice(0, 500), new Date().toISOString(), operationId]
  );
}

/** Bundles parked as permanently failed — shown in Settings → Cloud Sync. */
export async function getFailed(limit = 200): Promise<SyncQueueRow[]> {
  return localQuery<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE status='failed' ORDER BY updated_at DESC LIMIT ?`,
    [limit]
  );
}

/** All not-yet-synced bundles (pending + error + failed), newest first — for the queue view. */
export async function getActiveQueue(limit = 200): Promise<SyncQueueRow[]> {
  return localQuery<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE status IN ('pending','error','failed') ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function countFailed(): Promise<number> {
  const rows = await localQuery<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sync_queue WHERE status='failed'`
  );
  return rows[0]?.n ?? 0;
}

/** Re-arm a failed bundle for another attempt (user pressed Retry after fixing the cause). */
export async function retryFailed(operationId: string): Promise<void> {
  await localExecute(
    `UPDATE sync_queue SET status='pending', retry_count=0, last_error=NULL, updated_at=?
     WHERE operation_id=? AND status='failed'`,
    [new Date().toISOString(), operationId]
  );
}

/**
 * Is this a Postgres UNIQUE-constraint (duplicate key) collision? SQLSTATE 23505 / the
 * "duplicate key value violates unique constraint" message. Used to auto-recover the
 * cross-device auto-number collision case (AGENTS.md §1.7.7): the server `apply_bundle`
 * renumbers a registered sequence column on collision, so re-pushing the bundle succeeds.
 */
export function isDuplicateKeyError(error: string | null | undefined): boolean {
  if (!error) return false;
  const e = error.toLowerCase();
  return e.includes('duplicate key value') || e.includes('unique constraint') || e.includes('23505');
}

/** Max auto-recovery attempts for a duplicate-key collision before a bundle stays parked for
 *  manual review (prevents an infinite loop on a genuine, non-sequence duplicate). */
export const MAX_RECOVERABLE_RETRIES = 6;

/**
 * Auto-requeue bundles that were parked as `failed` ONLY because of a duplicate-key /
 * auto-number collision (§1.7.7). The server-side renumber in `apply_bundle` now re-allocates
 * a free number on the next push, so these self-heal with ZERO user action (no Retry/Discard).
 * Bounded by MAX_RECOVERABLE_RETRIES so a genuine non-sequence duplicate eventually stays
 * parked instead of looping. Returns the number of bundles re-armed.
 */
export async function requeueRecoverable(): Promise<number> {
  const failed = await getFailed();
  const recoverable = failed.filter(
    (r) => isDuplicateKeyError(r.last_error) && r.retry_count < MAX_RECOVERABLE_RETRIES
  );
  if (recoverable.length === 0) return 0;
  const now = new Date().toISOString();
  for (const r of recoverable) {
    // Keep retry_count climbing (don't reset) so a truly unrecoverable dupe hits the cap.
    await localExecute(
      `UPDATE sync_queue SET status='pending', updated_at=? WHERE operation_id=? AND status='failed'`,
      [now, r.operation_id]
    );
  }
  return recoverable.length;
}

/** Permanently drop a failed bundle from the queue (user chose Discard). Local-only cleanup;
 *  nothing was written to the cloud for a failed bundle, so there is nothing to undo there. */
export async function discardFailed(operationId: string): Promise<void> {
  await localExecute(
    `DELETE FROM sync_queue WHERE operation_id=? AND status='failed'`,
    [operationId]
  );
}

/** Housekeeping: drop old synced rows so the queue stays small. */
export async function pruneSynced(keepHours = 24): Promise<void> {
  const cutoff = new Date(Date.now() - keepHours * 3600_000).toISOString();
  await localExecute(`DELETE FROM sync_queue WHERE status='synced' AND updated_at < ?`, [cutoff]);
}
