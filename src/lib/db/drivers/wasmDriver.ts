/**
 * WASM SQLite Driver for Browser / Vite Dev Environment
 * Uses sql.js with IndexedDB binary persistence for 100% offline local dev.
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { ISqliteDriver, ISqliteTransaction, QueryResult, SqliteParams } from '../types';

const IDB_NAME = 'zaynahs_pos_sqlite_store';
const IDB_STORE = 'sqlite_blobs';
const IDB_KEY = 'active_database';

/**
 * Persistence key per database file. The legacy DB keeps the original 'active_database'
 * key (so existing data is untouched); any other db name (e.g. the Supabase-mirror
 * 'zaynahs_cloud.sqlite') gets its own key so multiple driver instances can coexist
 * without clobbering each other during the incremental migration.
 */
function idbKeyFor(dbName: string): string {
  return dbName === 'zaynahs_pos.sqlite' ? IDB_KEY : `db_${dbName}`;
}

async function initSqlJsEngine(): Promise<SqlJsStatic> {
  const isNode = typeof window === 'undefined';
  let wasmBinary: ArrayBuffer | undefined;

  if (!isNode && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/sql-wasm.wasm?v=pos12', { cache: 'no-cache' });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const h = new Uint8Array(buf.slice(0, 4));
        if (h[0] === 0x00 && h[1] === 0x61 && h[2] === 0x73 && h[3] === 0x6d) {
          wasmBinary = buf;
        }
      }
    } catch {
      // Fall back to locateFile
    }
  }

  return initSqlJs({
    locateFile: (file) => (isNode ? `./public/${file}` : `/${file}`),
    wasmBinary,
  });
}

export class WasmSqliteDriver implements ISqliteDriver {
  readonly name = 'WasmSqliteDriver';
  readonly platform = 'wasm' as const;
  private db: Database | null = null;
  private sqlJs: SqlJsStatic | null = null;
  private _isOpen = false;
  private saveDebounceTimer: any = null;
  private storageKey: string = IDB_KEY;

  get isOpen(): boolean {
    return this._isOpen && this.db !== null;
  }

  async open(dbName = 'zaynahs_pos.sqlite'): Promise<void> {
    if (this._isOpen && this.db) return;

    this.storageKey = idbKeyFor(dbName);

    if (!this.sqlJs) {
      this.sqlJs = await initSqlJsEngine();
    }

    const savedBinary = await this.loadFromIndexedDB();
    if (savedBinary && savedBinary.length > 0) {
      this.db = new this.sqlJs.Database(savedBinary);
    } else {
      this.db = new this.sqlJs.Database();
    }

    this._isOpen = true;

    // Flush to IndexedDB on page refresh or window close
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.persistToIndexedDB().catch(() => {});
      });
    }

    // Apply baseline pragmas
    this.db.run('PRAGMA foreign_keys = ON;');
  }

  async close(): Promise<void> {
    if (!this.db) return;
    await this.persistToIndexedDB();
    this.db.close();
    this.db = null;
    this._isOpen = false;
  }

  async flush(): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    await this.persistToIndexedDB();
  }

  async execute(sql: string, params?: SqliteParams): Promise<QueryResult> {
    this.assertOpen();
    const normalizedParams = this.normalizeParams(params);
    this.db!.run(sql, normalizedParams);

    const rowsAffected = this.db!.getRowsModified();
    // Fetch last inserted rowid if it was an insert
    let lastInsertId: number | undefined;
    try {
      const res = this.db!.exec('SELECT last_insert_rowid() AS id;');
      if (res.length > 0 && res[0].values.length > 0) {
        lastInsertId = Number(res[0].values[0][0]);
      }
    } catch {
      // Ignored if non-rowid table
    }

    this.scheduleSave();
    return { rows: [], rowsAffected, lastInsertId };
  }

  async query<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T[]> {
    this.assertOpen();
    const normalizedParams = this.normalizeParams(params);
    const stmt = this.db!.prepare(sql);
    try {
      if (normalizedParams && normalizedParams.length > 0) {
        stmt.bind(normalizedParams);
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  async queryOne<T = Record<string, any>>(sql: string, params?: SqliteParams): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async transaction<T>(fn: (tx: ISqliteTransaction) => Promise<T>): Promise<T> {
    this.assertOpen();
    this.db!.run('BEGIN IMMEDIATE TRANSACTION;');

    const tx: ISqliteTransaction = {
      execute: (sql, params) => this.execute(sql, params),
      query: (sql, params) => this.query(sql, params),
      queryOne: (sql, params) => this.queryOne(sql, params),
    };

    try {
      const result = await fn(tx);
      this.db!.run('COMMIT;');
      await this.persistToIndexedDB();
      return result;
    } catch (error) {
      try {
        this.db!.run('ROLLBACK;');
      } catch {
        // Rollback attempt
      }
      throw error;
    }
  }

  async exportBinary(): Promise<Uint8Array> {
    this.assertOpen();
    return this.db!.export();
  }

  async importBinary(binary: Uint8Array): Promise<void> {
    if (!this.sqlJs) {
      this.sqlJs = await initSqlJsEngine();
    }
    if (this.db) {
      this.db.close();
    }
    this.db = new this.sqlJs.Database(binary);
    this._isOpen = true;
    await this.persistToIndexedDB();
  }

  private assertOpen(): void {
    if (!this._isOpen || !this.db) {
      throw new Error('SQLite database is not open. Call open() first.');
    }
  }

  private normalizeParams(params?: SqliteParams): any[] | undefined {
    if (!params) return undefined;
    if (Array.isArray(params)) {
      return params.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
    }
    // Convert named parameters object to array or values
    const arr: any[] = [];
    for (const key of Object.keys(params)) {
      const val = params[key];
      arr.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
    }
    return arr;
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      this.persistToIndexedDB().catch(console.error);
    }, 200);
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const getReq = store.get(this.storageKey);
          getReq.onsuccess = () => {
            const res = getReq.result || null;
            db.close();
            resolve(res);
          };
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }

  private async persistToIndexedDB(): Promise<void> {
    if (!this.db || typeof indexedDB === 'undefined') return;
    const binary = this.db.export();
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          store.put(binary, this.storageKey);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        } catch (e) {
          db.close();
          reject(e);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}
