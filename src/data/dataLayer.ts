/**
 * Sync orchestrator — the single entry the app calls at boot to bring cloud-direct sync up.
 *
 *   initDataLayer():
 *     1. init local mirror SQLite
 *     2. bootstrap pull if this device has never synced (fresh install)
 *     3. start the background push worker
 *     4. do an initial pull so the mirror is warm
 *
 * Realtime table subscriptions are intentionally absent (Rule 2.10 §3). Pull runs on an
 * interval + on reconnect; push is event-driven via the queue worker.
 */

import { initLocalDb } from './localDb';
import { startSyncWorker, flushQueue } from './syncWorker';
import { pullAll, needsBootstrap } from './pullSync';

const PULL_INTERVAL_MS = 15_000;

let pullTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

export interface InitResult {
  bootstrapped: boolean;
  pulled: Record<string, number>;
}

export async function initDataLayer(): Promise<InitResult> {
  await initLocalDb();

  const bootstrapped = await needsBootstrap();
  // First pull (bootstrap or warm) — safe to run even offline (it just no-ops on error).
  let pulled: Record<string, number> = {};
  try {
    pulled = await pullAll();
  } catch (e) {
    console.warn('[dataLayer] initial pull skipped (likely offline):', (e as Error).message);
  }

  startSyncWorker();
  startPullLoop();
  started = true;

  return { bootstrapped, pulled };
}

function startPullLoop(): void {
  if (pullTimer) return;
  pullTimer = setInterval(() => {
    pullAll().catch(() => { /* offline / transient — retried next tick */ });
  }, PULL_INTERVAL_MS);

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onReconnect);
  }
}

function onReconnect(): void {
  // On reconnect: push local changes first, then pull server changes.
  flushQueue().then(() => pullAll()).catch(() => {});
}

export function stopDataLayer(): void {
  if (pullTimer) { clearInterval(pullTimer); pullTimer = null; }
  if (typeof window !== 'undefined') window.removeEventListener('online', onReconnect);
  started = false;
}

export function isDataLayerStarted(): boolean {
  return started;
}
