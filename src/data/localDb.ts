/**
 * Local SQLite for the Supabase-only architecture.
 * Reuses the platform driver factory (electron / capacitor / wasm) but opens a dedicated
 * database file whose schema mirrors Supabase 1:1 (see localSchema.ts). This runs in
 * parallel with the legacy P2P DB until Phase 11 removes the old layer entirely.
 */

import { createDriver } from '../lib/db/driverFactory';
import type { ISqliteDriver, ISqliteTransaction, QueryResult, SqliteParams } from '../lib/db/types';
import { LOCAL_SCHEMA_STATEMENTS, LOCAL_SCHEMA_MIGRATIONS } from './localSchema';

const DB_NAME = 'zaynahs_cloud.sqlite';

let driver: ISqliteDriver | null = null;
let initPromise: Promise<ISqliteDriver> | null = null;

export async function initLocalDb(): Promise<ISqliteDriver> {
  if (driver) return driver;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Dedicated driver instance (NOT the shared singleton) so the Supabase mirror opens its
    // own connection/file and never collides with the legacy DB during incremental migration.
    const d = createDriver();
    if (!d.isOpen) {
      await d.open(DB_NAME);
    }
    // Idempotent schema apply (CREATE TABLE IF NOT EXISTS ...).
    for (const stmt of LOCAL_SCHEMA_STATEMENTS) {
      await d.execute(stmt);
    }
    // Additive column migrations for existing DBs (CREATE TABLE IF NOT EXISTS won't alter an
    // existing table). Duplicate-column errors on already-migrated devices are expected/ignored.
    for (const stmt of LOCAL_SCHEMA_MIGRATIONS) {
      try { await d.execute(stmt); } catch { /* column already exists — safe to ignore */ }
    }
    driver = d;
    return d;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

export async function getLocalDb(): Promise<ISqliteDriver> {
  return driver ?? initLocalDb();
}

export async function localExecute(sql: string, params?: SqliteParams): Promise<QueryResult> {
  const db = await getLocalDb();
  return db.execute(sql, params);
}

export async function localQuery<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]> {
  const db = await getLocalDb();
  return db.query<T>(sql, params);
}

export async function localQueryOne<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T | null> {
  const db = await getLocalDb();
  return db.queryOne<T>(sql, params);
}

/**
 * Serialize ALL transactions on the single local connection. sql.js (wasm) has ONE connection
 * and `BEGIN IMMEDIATE`, so two overlapping `db.transaction()` calls (e.g. a bill's atomicWrite
 * racing the periodic pull) throw "cannot start a transaction within a transaction". A promise
 * chain guarantees one transaction runs at a time; try/finally always releases the lock so a
 * failed transaction never leaves the connection stuck.
 */
let txChain: Promise<unknown> = Promise.resolve();

export async function runExclusiveTransaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T> {
  const run = txChain.then(async () => {
    const db = await getLocalDb();
    return db.transaction<T>(fn);
  });
  // Keep the chain alive regardless of this call's success/failure.
  txChain = run.then(() => undefined, () => undefined);
  return run;
}

export async function localTransaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T> {
  return runExclusiveTransaction(fn);
}

/** For tests: forget the cached handle so init re-runs. */
export function resetLocalDbForTesting(): void {
  driver = null;
  initPromise = null;
}

/** For tests: inject a driver (e.g. a better-sqlite3-backed adapter) so writes hit a real DB. */
export function setLocalDbForTesting(d: ISqliteDriver): void {
  driver = d;
  initPromise = null;
}
