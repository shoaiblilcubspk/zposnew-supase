/**
 * Import conflict modes: 'skip' leaves an existing row unchanged; 'update' overwrites it.
 * Uses the shared applyRows core (same pipeline archives + spreadsheets use).
 *
 * Run: npx tsx tests/conflictMode.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { applyRows } from '../src/lib/backup/importEngine.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'cm-test', platform: 'wasm', isOpen: true,
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
    CREATE TABLE categories (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, active INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT, payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
  `);
  db.prepare(`INSERT INTO categories VALUES ('c1','op-c1','Original',1,'2020','2020')`).run();
  setLocalDbForTesting(makeDriver(db));
  return db;
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };
const nameOf = (db) => db.prepare(`SELECT name FROM categories WHERE id='c1'`).get().name;

async function main() {
  console.log('Import conflict modes');

  let db = freshDb();
  await applyRows({ categories: [{ id: 'c1', name: 'Changed', active: 1 }] }, { conflictMode: 'skip', importId: 'cm1' });
  assert(nameOf(db) === 'Original', "conflict 'skip' leaves the existing row unchanged");

  db = freshDb();
  await applyRows({ categories: [{ id: 'c1', name: 'Changed', active: 1 }] }, { conflictMode: 'update', importId: 'cm2' });
  assert(nameOf(db) === 'Changed', "conflict 'update' overwrites the existing row");

  // A brand-new id inserts regardless of mode.
  db = freshDb();
  await applyRows({ categories: [{ id: 'c2', name: 'New', active: 1 }] }, { conflictMode: 'skip', importId: 'cm3' });
  assert(db.prepare(`SELECT COUNT(*) AS n FROM categories`).get().n === 2, 'new rows are inserted even in skip mode');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
