/**
 * Sync orchestrator — the single entry the app calls at boot to bring cloud-direct sync up.
 *
 *   initDataLayer():
 *     1. init local mirror SQLite
 *     2. bootstrap pull if this device has never synced (fresh install)
 *     3. start the background push worker
 *     4. do an initial pull so the mirror is warm
 *
 * Pull runs on an interval + on reconnect + on window focus/visibility so a second device
 * converges quickly; push is event-driven via the queue worker. Pull status (last success +
 * in-flight) is tracked so the UI can show the TRUTH (not just the push queue).
 */

import { initLocalDb } from './localDb';
import { startSyncWorker, flushQueue } from './syncWorker';
import { pullAll, needsBootstrap, forceFullResync } from './pullSync';

const PULL_INTERVAL_MS = 15_000;

let pullTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let isPulling = false;
let lastPullAt: number | null = null;
let lastPullOk = true;

export interface InitResult {
  bootstrapped: boolean;
  pulled: Record<string, number>;
}

export interface PullStatus {
  isPulling: boolean;
  lastPullAt: number | null;
  lastPullOk: boolean;
}

export function getPullStatus(): PullStatus {
  return { isPulling, lastPullAt, lastPullOk };
}

/** Run a pull, tracking status. Concurrency-guarded so overlapping triggers don't stack. */
async function runPull(fn: () => Promise<Record<string, number>> = pullAll): Promise<void> {
  if (isPulling) return;
  isPulling = true;
  try {
    await fn();
    lastPullAt = Date.now();
    lastPullOk = true;
  } catch {
    lastPullOk = false;
  } finally {
    isPulling = false;
  }
}

/** Manual pull (e.g. Cloud Sync "Sync now" / pull-on-focus). */
export async function pullNow(): Promise<void> {
  await runPull();
}

/** Drop cursors and re-pull everything (recovery); unsynced local bundles are preserved. */
export async function fullResync(): Promise<void> {
  await runPull(forceFullResync);
}

export async function initDataLayer(): Promise<InitResult> {
  await initLocalDb();

  const bootstrapped = await needsBootstrap();
  let pulled: Record<string, number> = {};
  try {
    // Time-box the initial pull so a slow/half-connected network can NEVER hang boot (local-first:
    // first paint must not wait on the cloud). If it times out, the background pull loop + the
    // 'online'/focus handlers below converge as soon as the network is usable.
    const INITIAL_PULL_TIMEOUT_MS = 4000;
    pulled = await Promise.race([
      pullAll(),
      new Promise<Record<string, number>>((_, reject) =>
        setTimeout(() => reject(new Error('initial pull timed out')), INITIAL_PULL_TIMEOUT_MS)
      ),
    ]);
    lastPullAt = Date.now();
    lastPullOk = true;
  } catch (e) {
    lastPullOk = false;
    console.warn('[dataLayer] initial pull skipped (offline/slow):', (e as Error).message);
  }

  startSyncWorker();
  startPullLoop();
  started = true;

  return { bootstrapped, pulled };
}

function onVisible(): void {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  void runPull();
}

function startPullLoop(): void {
  if (pullTimer) return;
  pullTimer = setInterval(() => { void runPull(); }, PULL_INTERVAL_MS);

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onReconnect);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
  }
}

function onReconnect(): void {
  // On reconnect: push local changes first, then pull server changes.
  flushQueue().then(() => runPull()).catch(() => {});
}

export function stopDataLayer(): void {
  if (pullTimer) { clearInterval(pullTimer); pullTimer = null; }
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', onReconnect);
    window.removeEventListener('focus', onVisible);
    document.removeEventListener('visibilitychange', onVisible);
  }
  started = false;
}

export function isDataLayerStarted(): boolean {
  return started;
}
