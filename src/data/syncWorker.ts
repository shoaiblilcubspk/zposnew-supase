/**
 * Background sync worker — pushes the local sync_queue to Supabase (device → server).
 *
 * - Runs on an interval and on reconnect (online event) and at app boot.
 * - Atomic bundles (§1.5.4): each bundle is pushed as ONE `apply_bundle` RPC that runs in a
 *   single Postgres transaction and is idempotent on bundle_operations.operation_id — a replay
 *   returns the original result, never a duplicate or partial write.
 * - On success -> mark 'synced'. On a RETRYABLE error (network / 5xx / transient SQLSTATE) ->
 *   mark 'error' + exponential backoff; the SAME bundle (same operation_id) is retried on the
 *   next tick, never split. On a PERMANENT error (400 / constraint / bad payload) -> mark
 *   'failed' and surface it in Settings → Cloud Sync. No partial cloud rows are left behind.
 * - Uses the ANON client + authenticated session only (Rule 6). No service-role key here.
 */

import { getSupabase } from './supabaseClient';
import {
  getPending, markSynced, markError, markFailed, pruneSynced, countPending, type SyncQueueRow,
} from './syncQueue';
import { APPEND_ONLY_TABLES, type SyncedTable } from './localSchema';

const BASE_INTERVAL_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let inFlight = false;

/** A push error we could not resolve; `permanent` decides retry vs. park-as-failed. */
class SyncError extends Error {
  permanent: boolean;
  constructor(message: string, permanent: boolean) {
    super(message);
    this.name = 'SyncError';
    this.permanent = permanent;
  }
}

/**
 * Classify a Supabase/PostgREST error. Permanent errors never succeed on retry (constraint
 * violations, bad payload, undefined function/column). Transient ones (no code = network,
 * or SQLSTATE classes 08/40/53/57/58) are worth retrying with backoff.
 */
function toSyncError(err: unknown): SyncError {
  const e = err as { message?: string; code?: string } | null;
  const message = e?.message ?? String(err);
  const code = typeof e?.code === 'string' ? e.code : '';
  if (!code) return new SyncError(message, false); // no SQLSTATE -> treat as network/transient
  const cls = code.slice(0, 2);
  const retryableClasses = ['08', '40', '53', '57', '58'];
  return new SyncError(message, !retryableClasses.includes(cls));
}

function backoffFor(retryCount: number): number {
  return Math.min(BASE_INTERVAL_MS * 2 ** retryCount, MAX_BACKOFF_MS);
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

async function pushRow(row: SyncQueueRow): Promise<void> {
  const supabase = getSupabase();
  const payload = JSON.parse(row.payload) as Record<string, any>;

  if (row.operation_type === 'rpc') {
    const { error } = await supabase.rpc(payload.fn as string, payload.args ?? {});
    if (error) throw toSyncError(error);
    return;
  }

  // Atomic bundle (§1.5.4): push the WHOLE bundle as ONE idempotent Postgres transaction.
  // apply_bundle applies every row or none, and a replay (same operation_id) returns the
  // original stored result — so a retry can never duplicate or half-write.
  if (row.operation_type === 'bundle') {
    const { error } = await supabase.rpc('apply_bundle', {
      p_operation_id: row.operation_id,
      p_action: (payload.action as string) ?? row.table_name,
      p_rows: payload.rows ?? [],
    });
    if (error) throw toSyncError(error);
    return;
  }

  // Legacy per-row entries (enqueued before the bundle write path shipped). Kept for
  // backward compatibility so a mid-migration queue still drains.
  try {
    await pushTableWrite(supabase, row.table_name, row.operation_type, payload);
  } catch (err) {
    throw toSyncError(err);
  }
}

/** Idempotent single-table write used only for draining legacy pre-bundle queue entries. */
async function pushTableWrite(
  supabase: ReturnType<typeof getSupabase>,
  table: string,
  op: string,
  payload: Record<string, any>
): Promise<void> {
  if (op === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', payload.id);
    if (error) throw error;
    return;
  }
  const appendOnly = APPEND_ONLY_TABLES.includes(table as SyncedTable);
  const { error } = appendOnly
    ? await supabase.from(table).upsert(payload, { onConflict: 'operation_id', ignoreDuplicates: true })
    : await supabase.from(table).upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

/** Drain as many pending rows as possible right now. Safe to call repeatedly. */
export async function flushQueue(): Promise<{ synced: number; failed: number; permanent: number }> {
  if (inFlight || !isOnline()) return { synced: 0, failed: 0, permanent: 0 };
  inFlight = true;
  let synced = 0;
  let failed = 0;
  let permanent = 0;

  try {
    const pending = await getPending();
    for (const row of pending) {
      // Respect per-row backoff window based on retry_count.
      const dueAt = new Date(row.updated_at).getTime() + backoffFor(row.retry_count);
      if (row.status === 'error' && Date.now() < dueAt) continue;

      try {
        await pushRow(row);
        await markSynced(row.operation_id);
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (err instanceof SyncError && err.permanent) {
          // Whole bundle rolled back server-side; park it for the user, never retry blindly.
          await markFailed(row.operation_id, msg);
          permanent++;
        } else {
          await markError(row.operation_id, msg);
          failed++;
        }
      }
    }
    if (synced > 0) await pruneSynced();
  } finally {
    inFlight = false;
  }

  return { synced, failed, permanent };
}

async function tick(): Promise<void> {
  if (!running) return;
  await flushQueue().catch((e) => console.error('[syncWorker] tick error', e));
  if (running) {
    timer = setTimeout(tick, BASE_INTERVAL_MS);
  }
}

/** Start the background worker. Idempotent. */
export function startSyncWorker(): void {
  if (running) return;
  running = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onReconnect);
  }
  // Kick immediately (drains any leftover pending rows from a prior session).
  tick();
}

export function stopSyncWorker(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', onReconnect);
  }
}

function onReconnect(): void {
  flushQueue().catch(() => {});
}

export { countPending };
