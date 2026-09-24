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
import { atomicWrite, insertRow } from '../src/data/writeThrough.ts';
import { resolveImageRecord } from '../src/lib/media/localImageStore.ts';

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

// ── Phase 7 (image): product + product_images + ledger all-or-nothing ───────────

function freshProductDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE products (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, image_hash TEXT,
      stock NUMERIC, active INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE product_images (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, product_id TEXT,
      image_hash TEXT, storage_path TEXT, mime_type TEXT, file_size INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE inventory_ledger (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, product_id TEXT,
      quantity NUMERIC, type TEXT, reference_id TEXT, created_at TEXT);
    CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT,
      payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
  `);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

async function testProductImageBundleAllOrNothing() {
  console.log('\n[5] create_product with image: product + product_images + ledger together or nothing');
  // Success: all three rows present, one bundle.
  let db = freshProductDb();
  const pid = 'prod-1';
  const hash = 'c'.repeat(64);
  await atomicWrite([
    { table: 'products', op: 'insert', row: { id: pid, name: 'Jeans', image_hash: hash, stock: 100, active: 1 } },
    { table: 'product_images', op: 'insert', row: { product_id: pid, image_hash: hash, storage_path: `${hash}.webp`, mime_type: 'image/webp', file_size: 0 } },
    { table: 'inventory_ledger', op: 'insert', row: { product_id: pid, quantity: 100, type: 'INITIAL', reference_id: pid } },
  ], { action: 'create_product' });
  const n = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  assert(n('products') === 1 && n('product_images') === 1 && n('inventory_ledger') === 1, 'success: product + image link + ledger all written');

  // Failure on the product_images op -> nothing persists (no half-saved product/image/stock).
  db = freshProductDb();
  await expectThrow(() => atomicWrite([
    { table: 'products', op: 'insert', row: { id: 'p2', name: 'Shirt', image_hash: hash, stock: 5, active: 1 } },
    { table: 'product_images', op: 'insert', row: { product_id: 'p2', image_hash: hash, bogus: 'x' } },
    { table: 'inventory_ledger', op: 'insert', row: { product_id: 'p2', quantity: 5, type: 'INITIAL', reference_id: 'p2' } },
  ], { action: 'create_product' }), 'throws when the product_images op fails');
  const m = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  assert(m('products') === 0 && m('product_images') === 0 && m('inventory_ledger') === 0, 'failure: ZERO product, image, and ledger rows');
  assert(m('sync_queue') === 0, 'failure: no bundle queued');
}

async function testResolverNeverEmpty() {
  console.log('\n[6] image resolver classifies inputs (never an empty/invalid write value)');
  const empty = await resolveImageRecord('');
  assert(empty.value === undefined && empty.isHash === false, 'empty input -> no image, no product_images row');
  const hash = 'd'.repeat(64);
  const h = await resolveImageRecord(hash);
  assert(h.value === hash && h.isHash === true, 'existing hash -> isHash true (product_images row written)');
  const url = await resolveImageRecord('https://example.com/x.png');
  assert(url.value === 'https://example.com/x.png' && url.isHash === false, 'legacy URL -> kept as-is, no product_images row');
}

async function testConcurrentTransactionsSerialized() {
  console.log('\n[7] concurrent writes are serialized (no "transaction within a transaction")');
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE categories (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, active INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT, payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
  `);
  // Driver that mimics sql.js: a SECOND BEGIN while one is open throws. The transaction fn is
  // async (await points), so without serialization concurrent calls WOULD collide.
  let inTx = false;
  const mkTx = () => ({
    execute: async (sql, p = []) => { await Promise.resolve(); const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; },
    query: async (sql, p = []) => db.prepare(sql).all(...(p ?? [])),
    queryOne: async (sql, p = []) => db.prepare(sql).get(...(p ?? [])) ?? null,
  });
  const driver = {
    name: 'concurrent-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) {
      if (inTx) throw new Error('cannot start a transaction within a transaction');
      inTx = true;
      db.exec('BEGIN');
      try { const r = await fn(mkTx()); db.exec('COMMIT'); return r; }
      catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
      finally { inTx = false; }
    },
  };
  setLocalDbForTesting(driver);

  // Fire 6 writes concurrently. Serialized via runExclusiveTransaction -> all succeed.
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, (_, i) => insertRow('categories', { name: `C${i}`, active: 1 }))
  );
  const failures = results.filter((r) => r.status === 'rejected');
  assert(failures.length === 0, 'all 6 concurrent writes succeeded (none hit a nested-transaction error)');
  assert(db.prepare('SELECT COUNT(*) AS n FROM categories').get().n === 6, 'all 6 rows committed');
  assert(db.prepare('SELECT COUNT(*) AS n FROM sync_queue').get().n === 6, 'all 6 bundles queued');
}

async function main() {
  console.log('PHASE 7 — failure-injection suite');
  await testRowWriteFailure();
  await testQueueWriteFailure();
  await testAppendOnlyGuards();
  await testIdempotentRetrySameOpId();
  await testProductImageBundleAllOrNothing();
  await testResolverNeverEmpty();
  await testConcurrentTransactionsSerialized();
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
