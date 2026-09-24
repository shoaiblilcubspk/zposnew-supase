/**
 * Backup import engine roundtrip: export from device A, import into a fresh device B via bundles
 * (no DB replace), rows converge, and a re-import is idempotent (no duplicates).
 *
 * Run: npx tsx tests/importEngine.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { buildExport } from '../src/lib/backup/exportEngineV2.ts';
import { buildImportPreview, applyImport } from '../src/lib/backup/importEngine.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'imp-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) { db.exec('BEGIN'); try { const r = await fn({ execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null }); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } },
  };
}

const SCHEMA = `
  CREATE TABLE categories (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, active INTEGER, created_at TEXT, updated_at TEXT);
  CREATE TABLE suppliers (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, balance REAL, active INTEGER, created_at TEXT, updated_at TEXT);
  CREATE TABLE products (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, category_id TEXT, active INTEGER, created_at TEXT, updated_at TEXT);
  CREATE TABLE product_variants (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, product_id TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE product_images (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, product_id TEXT, image_hash TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT, payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
`;

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };
const count = (db, t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;

async function main() {
  console.log('Backup import engine roundtrip');

  // Device A: seed + export.
  const dbA = new Database(':memory:');
  dbA.exec(SCHEMA);
  dbA.prepare(`INSERT INTO categories VALUES ('c1','op-c1','Clothes',1,'2020','2020')`).run();
  dbA.prepare(`INSERT INTO suppliers VALUES ('s1','op-s1','ALI',0,1,'2020','2020')`).run();
  dbA.prepare(`INSERT INTO products VALUES ('p1','op-p1','jeans','c1',1,'2020','2020')`).run();
  dbA.prepare(`INSERT INTO products VALUES ('p2','op-p2','shirt','c1',1,'2020','2020')`).run();
  setLocalDbForTesting(makeDriver(dbA));
  const exp = await buildExport(['products'], { appVersion: '1.0.0' });
  assert(JSON.parse(exp.files['data/products.json']).length === 2, 'exported 2 products from device A');

  // Device B: fresh, import.
  const dbB = new Database(':memory:');
  dbB.exec(SCHEMA);
  setLocalDbForTesting(makeDriver(dbB));

  const preview = await buildImportPreview(exp.files);
  const pProducts = preview.rows.find((r) => r.table === 'products');
  assert(pProducts.newRows === 2 && pProducts.existing === 0, 'preview: 2 new products, 0 existing on B');

  const report = await applyImport(exp.files, { conflictMode: 'update' });
  assert(count(dbB, 'products') === 2, 'device B has 2 products after import');
  assert(count(dbB, 'categories') === 1 && count(dbB, 'suppliers') === 1, 'dependencies (category + supplier) imported');
  const rProducts = report.find((r) => r.table === 'products');
  assert(rProducts.inserted === 2, 'report: 2 products inserted');
  assert(count(dbB, 'sync_queue') > 0, 'import queued bundles for cloud sync (not a DB replace)');

  // Re-import (idempotent): no duplicates — existing rows update, not insert.
  const report2 = await applyImport(exp.files, { conflictMode: 'update' });
  assert(count(dbB, 'products') === 2, 're-import created NO duplicate products (idempotent)');
  const r2 = report2.find((r) => r.table === 'products');
  assert(r2.inserted === 0 && r2.updated === 2, 're-import updated existing rows instead of inserting');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
