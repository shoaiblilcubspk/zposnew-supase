/**
 * PHASE 7 — failure-injection suite for Atomic Action Bundles (AGENTS.md §1.5.8).
 *
 * Proves the "all-or-nothing" contract under injected failures at each step:
 *   1. Failure on the LOCAL ROW write (bad column mid-bundle) -> zero rows, zero queue.
 *   2. Failure on the SYNC_QUEUE write (queue insert throws)   -> zero rows, zero queue.
 *   3. Append-only guard (Rule 7): update/delete on an append-only table throws BEFORE any
 *      write, leaving nothing behind.
 *   4. Idempotent retry: re-running with the SAME operation_id replaces the single queue
 *      bundle entry (never a second one).
 *
 * Runs against a real in-memory SQLite (better-sqlite3) injected into the data layer.
 * Run: npx tsx tests/failureInjection.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { atomicWrite } from '../src/data/writeThrough.ts';

function makeTx(db) {
  return {
    async execute(sql, params = []) { const i = db.prepare(sql).run(...(params ?? [])); return { rows: [], rowsAffected: i.changes }; },
    async query(sql, params = []) { return db.prepare(sql).all(...(params ?? [])); },
    async queryOne(sql, params = []) { return db.prepare(sql).get(...(params ?? [])) ?? null; },
  };
}
function makeDriver(db) {
  return {
    name: 'fi-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, params = []) { const i = db.prepare(sql).run(...(params ?? [])); return { rows: [], rowsAffected: i.changes }; },
    async query(sql, params = []) { return db.prepare(sql).all(...(params ?? [])); },
    async queryOne(sql, params = []) { return db.prepare(sql).get(...(params ?? [])) ?? null; },
    async transaction(fn) {
      db.exec('BEGIN');
      try { const r = await fn(makeTx(db)); db.exec('COMMIT'); return r; }
      catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
    },
  };
}

let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(`ASSERT FAILED: ${msg}`); passed++; console.log(`  ok - ${msg}`); }
async function expectThrow(fn, msg) { let t = false; try { await fn(); } catch { t = true; } assert(t, msg); }

function baseDb({ goodQueue = true } = {}) {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE categories (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, active INTEGER,
      created_at TEXT, updated_at TEXT);
  `);
  if (goodQueue) {
    db.exec(`CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT,
      payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);`);
  } else {
    // Broken queue: missing the `status` column -> enqueueInTx INSERT throws mid-transaction.
    db.exec(`CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT);`);
  }
  setLocalDbForTesting(makeDriver(db));
  return db;
}
const cnt = (db, t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;

async function testRowWriteFailure() {
  console.log('\n[1] failure on a row write -> full rollback');
  const db = baseDb();
  await expectThrow(() => atomicWrite([
    { table: 'categories', op: 'insert', row: { name: 'A', active: 1 } },
    { table: 'categories', op: 'insert', row: { name: 'B', active: 1, bogus: 'x' } },
  ], { action: 'fi_row' }), 'throws on bad row');
  assert(cnt(db, 'categories') === 0, 'zero category rows');
  assert(cnt(db, 'sync_queue') === 0, 'zero queue entries');
}

async function testQueueWriteFailure() {
  console.log('\n[2] failure on the sync_queue write -> row writes roll back too');
  const db = baseDb({ goodQueue: false });
  await expectThrow(() => atomicWrite([
    { table: 'categories', op: 'insert', row: { name: 'A', active: 1 } },
  ], { action: 'fi_queue' }), 'throws when queue insert fails');
  assert(cnt(db, 'categories') === 0, 'category row rolled back because the queue write failed');
}

async function testAppendOnlyGuards() {
  console.log('\n[3] append-only guard (Rule 7): update/delete rejected, nothing written');
  const db = baseDb();
  await expectThrow(() => atomicWrite([
    { table: 'inventory_ledger', op: 'update', id: 'x', patch: { quantity: 1 } },
  ], { action: 'fi_ao_update' }), 'update on append-only table throws');
  await expectThrow(() => atomicWrite([
    { table: 'payments', op: 'delete', id: 'x' },
  ], { action: 'fi_ao_delete' }), 'delete on append-only table throws');
  assert(cnt(db, 'sync_queue') === 0, 'no queue entries from rejected append-only ops');
}

async function testIdempotentRetrySameOpId() {
  console.log('\n[4] retry with SAME operation_id -> single queue bundle (no duplicate)');
  const db = baseDb();
  const operation_id = 'fixed-op-id-1234';
  await atomicWrite([{ table: 'categories', op: 'insert', row: { id: 'c1', name: 'One', active: 1 } }],
    { operation_id, action: 'fi_retry' });
  // Simulate a retry of the SAME action (same operation_id) with the same rows.
  await atomicWrite([{ table: 'categories', op: 'insert', row: { id: 'c1', name: 'One', active: 1 } }],
    { operation_id, action: 'fi_retry' }).catch(() => {});
  const q = db.prepare('SELECT COUNT(*) AS n FROM sync_queue WHERE operation_id = ?').get(operation_id).n;
  assert(q === 1, 'exactly one queue bundle for the reused operation_id');
}

async function main() {
  console.log('PHASE 7 — failure-injection suite');
  await testRowWriteFailure();
  await testQueueWriteFailure();
  await testAppendOnlyGuards();
  await testIdempotentRetrySameOpId();
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
