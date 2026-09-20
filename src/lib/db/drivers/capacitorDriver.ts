/**
 * Capacitor Mobile SQLite Driver
 * Interacts with native SQLite on Android and iOS via @capacitor-community/sqlite.
 */

import { ISqliteDriver, ISqliteTransaction, QueryResult, SqliteParams } from '../types';

export class CapacitorSqliteDriver implements ISqliteDriver {
  readonly name = 'CapacitorSqliteDriver';
  readonly platform = 'capacitor' as const;
  private db: any = null;
  private sqliteConnection: any = null;
  private _isOpen = false;

  get isOpen(): boolean {
    return this._isOpen && this.db !== null;
  }

  async open(dbName = 'zaynahs_pos'): Promise<void> {
    if (this._isOpen && this.db) return;

    try {
      const pluginName = '@capacitor-community/sqlite';
      // @ts-ignore - dynamic import in Capacitor runtime
      const { CapacitorSQLite, SQLiteConnection } = await import(/* @vite-ignore */ pluginName);
      this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
      const cleanDbName = dbName.replace(/\.sqlite$|\.db$/, '');

      const isConn = (await this.sqliteConnection.isConnection(cleanDbName, false)).result;
      if (isConn) {
        this.db = await this.sqliteConnection.retrieveConnection(cleanDbName, false);
      } else {
        this.db = await this.sqliteConnection.createConnection(
          cleanDbName,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();
      this._isOpen = true;

      // Apply pragmas
      await this.db.execute('PRAGMA journal_mode = WAL;');
      await this.db.execute('PRAGMA synchronous = NORMAL;');
      await this.db.execute('PRAGMA foreign_keys = ON;');
    } catch (err) {
      throw new Error(`Failed to load Capacitor SQLite database: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async close(): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.close();
    } catch {
      // Ignored
    }
    this.db = null;
    this._isOpen = false;
  }

  async execute(sql: string, params?: SqliteParams): Promise<QueryResult> {
    this.assertOpen();
    const normalized = this.normalizeParams(params);
    const res = await this.db.run(sql, normalized);
    return {
      rows: [],
      rowsAffected: res.changes?.changes ?? 0,
      lastInsertId: res.changes?.lastId,
    };
  }

  async query<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]> {
    this.assertOpen();
    const normalized = this.normalizeParams(params);
    const res = await this.db.query(sql, normalized);
    return (res.values || []) as T[];
  }

  async queryOne<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async transaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T> {
    this.assertOpen();
    await this.db.execute('BEGIN IMMEDIATE TRANSACTION;');

    const tx: ISqliteTransaction = {
      execute: (sql, params) => this.execute(sql, params),
      query: (sql, params) => this.query(sql, params),
      queryOne: (sql, params) => this.queryOne(sql, params),
    };

    try {
      const result = await fn(tx);
      await this.db.execute('COMMIT;');
      return result;
    } catch (error) {
      try {
        await this.db.execute('ROLLBACK;');
      } catch {
        // Rollback attempt
      }
      throw error;
    }
  }

  private assertOpen(): void {
    if (!this._isOpen || !this.db) {
      throw new Error('Capacitor SQLite database is not open. Call open() first.');
    }
  }

  private normalizeParams(params?: SqliteParams): any[] {
    if (!params) return [];
    if (Array.isArray(params)) {
      return params.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
    }
    return Object.values(params).map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
  }
}
