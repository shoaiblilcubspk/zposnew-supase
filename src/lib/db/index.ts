/**
 * Unified Local SQLite Database Access Layer
 * Authoritative single entry point for all database queries and transactions across platforms.
 */

import { getDriver } from './driverFactory';
import { ISqliteDriver, ISqliteTransaction, QueryResult, SqliteParams } from './types';
import { runMigrations } from './migrationRunner';

export * from './types';
export * from './schemaConstants';
export { detectPlatform } from './driverFactory';
export { runMigrations, getCurrentSchemaVersion } from './migrationRunner';

let isInitialized = false;
let initPromise: Promise<ISqliteDriver> | null = null;

/**
 * Initialize the active SQLite database connection.
 * Applies standard pragmas and executes any pending schema migrations.
 */
export async function initDb(dbName = 'zaynahs_pos.sqlite'): Promise<ISqliteDriver> {
  if (isInitialized) {
    return getDriver();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const driver = getDriver();
    if (!driver.isOpen) {
      await driver.open(dbName);
    }
    // Execute pending migrations
    await runMigrations(driver);
    isInitialized = true;
    return driver;
  })();

  return initPromise;
}

/**
 * Get the active SQLite database driver instance.
 * Automatically initializes if not already opened.
 */
export async function getDb(): Promise<ISqliteDriver> {
  if (!isInitialized) {
    return initDb();
  }
  return getDriver();
}

export const getDatabase = getDb;
export const initDatabase = initDb;

/**
 * Flush any pending in-memory database writes to disk/IndexedDB immediately.
 */
export async function flushDb(): Promise<void> {
  const db = await getDb();
  if (typeof db.flush === 'function') {
    await db.flush();
  }
}

/**
 * Execute an INSERT, UPDATE, DELETE, or DDL statement.
 */
export async function execute(sql: string, params?: SqliteParams): Promise<QueryResult> {
  const db = await getDb();
  return db.execute(sql, params);
}

/**
 * Query multiple records returning an array of typed objects.
 */
export async function query<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(sql, params);
}

/**
 * Query a single record returning typed object or null.
 */
export async function queryOne<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T | null> {
  const db = await getDb();
  return db.queryOne<T>(sql, params);
}

/**
 * Execute a batch of operations inside an atomic transaction.
 * Automatically executes COMMIT on success, ROLLBACK on any error.
 */
export async function transaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction<T>(fn);
}
