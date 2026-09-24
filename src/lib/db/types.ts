/**
 * SQLite Driver Abstraction Types
 * Single authoritative interface for all SQLite drivers across platforms.
 */

export type SqliteValue = string | number | boolean | null | Uint8Array;

export type SqliteParams = SqliteValue[] | Record<string, SqliteValue>;

export interface QueryResult<T = Record<string, any>> {
  rows: T[];
  rowsAffected: number;
  lastInsertId?: number;
}

export interface ISqliteTransaction {
  /** Execute an INSERT, UPDATE, DELETE, or DDL statement within transaction */
  execute(sql: string, params?: SqliteParams): Promise<QueryResult>;

  /** Query multiple rows within transaction */
  query<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]>;

  /** Query single row or null within transaction */
  queryOne<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T | null>;
}

export interface ISqliteDriver {
  readonly name: string;
  readonly platform: 'electron' | 'capacitor' | 'wasm';
  readonly isOpen: boolean;

  /** Open and initialize the database connection with pragmas */
  open(dbName?: string): Promise<void>;

  /** Close the database connection */
  close(): Promise<void>;

  /** Execute an INSERT, UPDATE, DELETE, or DDL statement */
  execute(sql: string, params?: SqliteParams): Promise<QueryResult>;

  /** Query multiple rows returning typed objects */
  query<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]>;

  /** Query a single row returning typed object or null */
  queryOne<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T | null>;

  /** Run an atomic transaction. Auto-commits on success, auto-rolls back on error. */
  transaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T>;

  /** Export database binary for backup or inspection */
  exportBinary?(): Promise<Uint8Array>;

  /** Import and replace database binary (e.g. initial backup restore) */
  importBinary?(binary: Uint8Array): Promise<void>;

  /** Flush any pending debounced writes to persistent storage immediately */
  flush?(): Promise<void>;
}

export interface DriverOptions {
  dbName?: string;
  debug?: boolean;
}
