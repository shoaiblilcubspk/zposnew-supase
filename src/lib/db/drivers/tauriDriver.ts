/**
 * Tauri Native SQLite Driver
 * Interacts with native SQLite via Tauri Rust plugin-sql.
 */

import { ISqliteDriver, ISqliteTransaction, QueryResult, SqliteParams } from '../types';

export class TauriSqliteDriver implements ISqliteDriver {
  readonly name = 'TauriSqliteDriver';
  readonly platform = 'tauri' as const;
  private db: any = null;
  private _isOpen = false;

  get isOpen(): boolean {
    return this._isOpen && this.db !== null;
  }

  async open(dbName = 'sqlite:zaynahs_pos.db'): Promise<void> {
    if (this._isOpen && this.db) return;

    // Dynamically import Tauri SQL plugin
    try {
      const tauriSql: any = await import('@tauri-apps/plugin-sql');
      const DatabaseClass = tauriSql.default || tauriSql;
      const connectionString = dbName.startsWith('sqlite:') ? dbName : `sqlite:${dbName}`;
      this.db = await DatabaseClass.load(connectionString);
      this._isOpen = true;

      // Apply required SQLite performance pragmas
      await this.db.execute('PRAGMA journal_mode = WAL;');
      await this.db.execute('PRAGMA synchronous = NORMAL;');
      await this.db.execute('PRAGMA foreign_keys = ON;');
      await this.db.execute('PRAGMA cache_size = -64000;');
    } catch (err) {
      throw new Error(`Failed to load native Tauri SQLite database: ${err instanceof Error ? err.message : String(err)}`);
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
    const res = await this.db.execute(sql, normalized);
    return {
      rows: [],
      rowsAffected: res.rowsAffected ?? 0,
      lastInsertId: res.lastInsertId,
    };
  }

  async query<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]> {
    this.assertOpen();
    const normalized = this.normalizeParams(params);
    const rows = await this.db.select(sql, normalized);
    return rows as T[];
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
      throw new Error('Tauri SQLite database is not open. Call open() first.');
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
