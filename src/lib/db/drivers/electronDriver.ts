/**
 * Electron SQLite Driver
 * Uses better-sqlite3 via Electron IPC for native SQLite performance.
 */

import { ISqliteDriver, ISqliteTransaction, QueryResult, SqliteParams } from '../types';

export class ElectronSqliteDriver implements ISqliteDriver {
  readonly name = 'ElectronSqliteDriver';
  readonly platform = 'electron' as const;
  private _isOpen = false;

  get isOpen(): boolean {
    return this._isOpen;
  }

  async open(_dbName = 'zaynahs_pos.sqlite'): Promise<void> {
    if (this._isOpen) return;
    
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('ElectronSqliteDriver can only run in Electron renderer process');
    }

    await window.electronAPI.sqlite.open(_dbName);
    this._isOpen = true;
  }

  async close(): Promise<void> {
    if (!this._isOpen) return;
    await window.electronAPI?.sqlite.close();
    this._isOpen = false;
  }

  async execute(sql: string, params?: SqliteParams): Promise<QueryResult> {
    this.assertOpen();
    const normalized = this.normalizeParams(params);
    const result = await window.electronAPI!.sqlite.execute(sql, normalized);
    return {
      rows: [],
      rowsAffected: result.rowsAffected ?? 0,
      lastInsertId: result.lastInsertId,
    };
  }

  async query<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]> {
    this.assertOpen();
    const normalized = this.normalizeParams(params);
    return window.electronAPI!.sqlite.query(sql, normalized) as Promise<T[]>;
  }

  async queryOne<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T | null> {
    this.assertOpen();
    const normalized = this.normalizeParams(params);
    const result = await window.electronAPI!.sqlite.queryOne(sql, normalized);
    return (result as T) ?? null;
  }

  async transaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T> {
    this.assertOpen();
    
    const statements: string[] = [];

    const tx: ISqliteTransaction = {
      execute: async (sql, params) => {
        const normalized = this.normalizeParams(params);
        statements.push(this.buildStatement(sql, normalized));
        return { rows: [], rowsAffected: 0, lastInsertId: undefined };
      },
      query: async (sql, params) => {
        const normalized = this.normalizeParams(params);
        return window.electronAPI!.sqlite.query(sql, normalized) as Promise<T[]>;
      },
      queryOne: async (sql, params) => {
        const normalized = this.normalizeParams(params);
        const result = await window.electronAPI!.sqlite.queryOne(sql, normalized);
        return (result as T) ?? null;
      },
    };

    const result = await fn(tx);
    if (statements.length > 0) {
      await window.electronAPI!.sqlite.transaction(statements);
    }
    return result;
  }

  private buildStatement(sql: string, params: any[]): string {
    if (!params || params.length === 0) return sql;
    return sql.replace(/\?/g, () => {
      const param = params.shift();
      if (param === null || param === undefined) return 'NULL';
      if (typeof param === 'string') return `'${param.replace(/'/g, "''")}'`;
      if (typeof param === 'boolean') return param ? '1' : '0';
      return String(param);
    });
  }

  private assertOpen(): void {
    if (!this._isOpen) {
      throw new Error('Electron SQLite database is not open. Call open() first.');
    }
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('Electron API not available');
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