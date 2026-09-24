/**
 * PHASE 1 failure-injection test for the Atomic Action Bundle write path (AGENTS.md §1.5.3).
 *
 * Verifies:
 *   1. Success: a multi-op bundle writes ALL rows + exactly ONE sync_queue bundle entry.
 *   2. Failure on row N of M: the whole SQLite transaction rolls back — zero rows written,
 *      zero queue entries. No half-saved local state, ever.
 *   3. Single-op wrappers (insertRow / updateRow / softDeleteRow) also produce one bundle each.
 *
 * Runs against a real in-memory SQLite via better-sqlite3, injected into the data layer.
 * Run with:  npx tsx tests/atomicWrite.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { atomicWrite, insertRow, updateRow, softDeleteRow } from '../src/data/writeThrough.ts';

// ── Minimal better-sqlite3 adapter implementing ISqliteDriver / ISqliteTransaction ──

function makeTx(db) {
  return {
    async execute(sql, params = []) {
      const info = db.prepare(sql).run(...(params ?? []));
      return { rows: [], rowsAffected: info.changes, lastInsertId: Number(info.lastInsertRowid) };
    },
    async query(sql, params = []) {
      return db.prepare(sql).all(...(params ?? []));
    },
    async queryOne(sql, params = []) {
      return db.prepare(sql).get(...(params ?? [])) ?? null;
    },
  };
}

function makeDriver(db) {
  return {
    name: 'better-sqlite3-test',
    platform: 'wasm',
    isOpen: true,
    async open() {},
    async close() {},
    async execute(sql, params = []) {
      const info = db.prepare(sql).run(...(params ?? []));
      return { rows: [], rowsAffected: info.changes, lastInsertId: Number(info.lastInsertRowid) };
    },
    async query(sql, params = []) {
      return db.prepare(sql).all(...(params ?? []));
    },
    async queryOne(sql, params = []) {
      return db.prepare(sql).get(...(params ?? [])) ?? null;
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        const result = await fn(makeTx(db));
        db.exec('COMMIT');
        return result;
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch { /* ignore */ }
        throw err;
      }
    },
  };
}

// ── Assertion helpers ────────────────────────────────────────────────────────

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  passed++;
  console.log(`  ok - ${msg}`);
}

async function expectThrow(fn, msg) {
  let threw = false;
  try { await fn(); } catch { threw = true; }
  assert(threw, msg);
}

// ── Fixture ──────────────────────────────────────────────────────────────────

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, active INTEGER,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE sync_queue (
      operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT, payload TEXT,
      status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT
    );
  `);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

function countCategories(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
}
function queueRows(db) {
  return db.prepare('SELECT * FROM sync_queue').all();
}

// ── Tests ──────────────────────────────────────────────────────────────────

async function testMultiOpSuccess() {
  console.log('\n[1] multi-op bundle success -> all rows + ONE queue entry');
  const db = freshDb();

  const result = await atomicWrite(
    [
      { table: 'categories', op: 'insert', row: { name: 'Drinks', active: 1 } },
      { table: 'categories', op: 'insert', row: { name: 'Snacks', active: 1 } },
    ],
    { action: 'test_two_categories' }
  );

  assert(countCategories(db) === 2, 'both category rows written');
  const q = queueRows(db);
  assert(q.length === 1, 'exactly ONE bundle queue entry (not one per row)');
  assert(q[0].operation_type === 'bundle', 'queue entry is a bundle');
  assert(q[0].operation_id === result.operation_id, 'queue operation_id matches action id');
  const payload = JSON.parse(q[0].payload);
  assert(payload.action === 'test_two_categories', 'bundle payload carries action name');
  assert(Array.isArray(payload.rows) && payload.rows.length === 2, 'bundle payload holds both rows');
}

async function testFailureRollsBackEverything() {
  console.log('\n[2] failure on row 2 of 3 -> zero rows, zero queue entries');
  const db = freshDb();

  await expectThrow(
    () =>
      atomicWrite(
        [
          { table: 'categories', op: 'insert', row: { name: 'Good1', active: 1 } },
          // Bad op: references a column that does not exist -> SQLite throws mid-transaction.
          { table: 'categories', op: 'insert', row: { name: 'Bad', active: 1, bogus_col: 'x' } },
          { table: 'categories', op: 'insert', row: { name: 'Good2', active: 1 } },
        ],
        { action: 'test_partial_failure' }
      ),
    'atomicWrite throws when any op fails'
  );

  assert(countCategories(db) === 0, 'ZERO category rows after rollback (row 1 not left behind)');
  assert(queueRows(db).length === 0, 'ZERO queue entries after rollback (no half-saved bundle)');
}

async function testSingleOpWrappers() {
  console.log('\n[3] insertRow / updateRow / softDeleteRow each produce one bundle');
  const db = freshDb();

  const inserted = await insertRow('categories', { name: 'Bakery', active: 1 });
  assert(countCategories(db) === 1, 'insertRow wrote one row');
  assert(!!inserted.id && !!inserted.operation_id, 'insertRow returns id + operation_id');
  assert(queueRows(db).length === 1, 'insertRow enqueued one bundle');

  await updateRow('categories', inserted.id, { name: 'Bakery & Cakes' });
  const renamed = db.prepare('SELECT name FROM categories WHERE id = ?').get(inserted.id);
  assert(renamed.name === 'Bakery & Cakes', 'updateRow updated the row');
  assert(queueRows(db).length === 2, 'updateRow enqueued a second bundle');

  await softDeleteRow('categories', inserted.id, 'active');
  const deactivated = db.prepare('SELECT active FROM categories WHERE id = ?').get(inserted.id);
  assert(deactivated.active === 0, 'softDeleteRow set active = 0');
  assert(queueRows(db).length === 3, 'softDeleteRow enqueued a third bundle');

  // Every queue entry is a self-contained bundle.
  for (const r of queueRows(db)) {
    assert(r.operation_type === 'bundle', `queue entry ${r.operation_id.slice(0, 8)} is a bundle`);
  }
}

// ── Phase 3: money+stock bundle (create_sale shape) all-or-nothing ──────────────

function freshSaleDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE sales (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, invoice_number TEXT,
      total_amount NUMERIC, status TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE sale_items (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, sale_id TEXT,
      product_id TEXT, quantity NUMERIC, total_price NUMERIC, created_at TEXT);
    CREATE TABLE inventory_ledger (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, product_id TEXT,
      quantity NUMERIC, type TEXT, reference_id TEXT, created_at TEXT);
    CREATE TABLE payments (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, sale_id TEXT,
      mode_code TEXT, amount NUMERIC, created_at TEXT);
    CREATE TABLE products (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, stock NUMERIC,
      active INTEGER, created_at TEXT, updated_at TEXT);
    CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT,
      payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
    INSERT INTO products (id, operation_id, name, stock, active, created_at, updated_at)
      VALUES ('p1', 'op-seed', 'Widget', 10, 1, '2020-01-01', '2020-01-01');
  `);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

async function testSaleBundleAllOrNothing() {
  console.log('\n[4] create_sale-shaped bundle: failure on payments -> ZERO rows anywhere');
  const db = freshSaleDb();
  const saleId = crypto.randomUUID();

  // A sale bundle: header + item + inventory OUT + products.stock update + payment.
  // The payment op carries a bad column so the whole bundle must roll back.
  await expectThrow(
    () =>
      atomicWrite(
        [
          { table: 'sales', op: 'insert', row: { id: saleId, invoice_number: 'INV-TEST', total_amount: 100, status: 'completed' } },
          { table: 'sale_items', op: 'insert', row: { sale_id: saleId, product_id: 'p1', quantity: 2, total_price: 100 } },
          { table: 'inventory_ledger', op: 'insert', row: { product_id: 'p1', quantity: -2, type: 'INVENTORY_OUT', reference_id: saleId } },
          { table: 'products', op: 'update', id: 'p1', patch: { stock: 8 } },
          { table: 'payments', op: 'insert', row: { sale_id: saleId, mode_code: 'cash', amount: 100, bogus_col: 'x' } },
        ],
        { action: 'create_sale' }
      ),
    'create_sale bundle throws when the payment op fails'
  );

  const n = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  assert(n('sales') === 0, 'no sale header persisted');
  assert(n('sale_items') === 0, 'no sale items persisted');
  assert(n('inventory_ledger') === 0, 'no inventory ledger rows persisted (stock never drifts)');
  assert(n('payments') === 0, 'no payment rows persisted');
  const stock = db.prepare("SELECT stock FROM products WHERE id='p1'").get().stock;
  assert(Number(stock) === 10, 'products.stock cache unchanged (rolled back to 10)');
  assert(queueRows(db).length === 0, 'no bundle queued for the failed sale');
}

async function main() {
  console.log('Atomic Action Bundle tests (Phase 1 write path + Phase 3 money/stock)');
  await testMultiOpSuccess();
  await testFailureRollsBackEverything();
  await testSingleOpWrappers();
  await testSaleBundleAllOrNothing();
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => {
  console.error('\nTEST RUN FAILED:', err);
  process.exit(1);
});
