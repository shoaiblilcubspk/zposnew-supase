/**
 * Soft-delete tombstone propagation (AGENTS.md §1.7.5).
 * A delete becomes an UPDATE that sets deleted_at; local reads hide it; and a pull that brings
 * the tombstoned row down (INSERT OR REPLACE) hides it on the OTHER device too. No hard delete.
 *
 * Run: npx tsx tests/softDelete.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { insertRow, updateRow } from '../src/data/writeThrough.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'sd-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) { db.exec('BEGIN'); try { const r = await fn({ execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null }); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } },
  };
}

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE expenses (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, title TEXT, amount REAL,
      spent_at TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT);
    CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT,
      payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
  `);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };
const visible = (db) => db.prepare(`SELECT COUNT(*) AS n FROM expenses WHERE deleted_at IS NULL`).get().n;

async function main() {
  console.log('Soft-delete tombstone propagation');
  const db = freshDb();

  // Device A: create then soft-delete.
  const row = await insertRow('expenses', { title: 'Rent', amount: 100, spent_at: new Date().toISOString() });
  assert(visible(db) === 1, 'expense visible after create');

  await updateRow('expenses', row.id, { deleted_at: new Date().toISOString() });
  assert(visible(db) === 0, 'expense hidden after soft-delete (deleted_at set)');
  const raw = db.prepare(`SELECT deleted_at FROM expenses WHERE id = ?`).get(row.id);
  assert(raw && raw.deleted_at, 'row still present with a tombstone (not hard-deleted)');

  // Bundle for the soft-delete carries the tombstone (so the cloud + other devices get it).
  const q = db.prepare(`SELECT payload FROM sync_queue ORDER BY created_at DESC LIMIT 1`).get();
  const payload = JSON.parse(q.payload);
  assert(payload.rows[0].payload.deleted_at, 'sync bundle carries deleted_at to the cloud');

  // Device B: a pull brings the tombstoned row down via INSERT OR REPLACE -> hidden there too.
  const dbB = freshDb();
  dbB.prepare(`INSERT OR REPLACE INTO expenses (id, operation_id, title, amount, spent_at, created_at, updated_at, deleted_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(row.id, 'opB', 'Rent', 100, raw ? '' : '', new Date().toISOString(), new Date().toISOString(), new Date().toISOString());
  assert(visible(dbB) === 0, 'device B hides the row after pulling the tombstone');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
