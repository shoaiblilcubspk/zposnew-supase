/**
 * Spreadsheet (Excel) export/import roundtrip: export domains to .xlsx, parse it back, and import
 * via the SAME bundle pipeline as archives (applyRows). Proves the human-editable format works
 * and reuses one import engine (no duplicate code).
 *
 * Run: npx tsx tests/spreadsheet.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { buildExport, exportToExcelBlob, parseSpreadsheet } from '../src/lib/backup/exportEngineV2.ts';
import { applyRows, previewRows } from '../src/lib/backup/importEngine.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'xls-test', platform: 'wasm', isOpen: true,
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

async function main() {
  console.log('Spreadsheet (Excel) export/import roundtrip');
  const dbA = new Database(':memory:'); dbA.exec(SCHEMA);
  dbA.prepare(`INSERT INTO categories VALUES ('c1','op-c1','Clothes',1,'2020','2020')`).run();
  dbA.prepare(`INSERT INTO products VALUES ('p1','op-p1','jeans','c1',1,'2020','2020')`).run();
  dbA.prepare(`INSERT INTO products VALUES ('p2','op-p2','shirt','c1',1,'2020','2020')`).run();
  setLocalDbForTesting(makeDriver(dbA));

  const exp = await buildExport(['products'], { appVersion: '1.0.0' });
  const blob = await exportToExcelBlob(exp);
  assert(blob && blob.size > 0, 'Excel workbook produced');

  const buf = await blob.arrayBuffer();
  const rowsByTable = await parseSpreadsheet(buf);
  assert(Array.isArray(rowsByTable.products) && rowsByTable.products.length === 2, 'parsed 2 products from the .xlsx');
  assert(rowsByTable.products[0].name === 'jeans', 'product fields parsed from Excel');

  // Import the parsed spreadsheet into a fresh device via the shared bundle pipeline.
  const dbB = new Database(':memory:'); dbB.exec(SCHEMA);
  setLocalDbForTesting(makeDriver(dbB));
  const preview = await previewRows(rowsByTable);
  assert(preview.find((r) => r.table === 'products').newRows === 2, 'preview: 2 new products from spreadsheet');
  await applyRows(rowsByTable, { importId: 'xls-test-1' });
  assert(dbB.prepare(`SELECT COUNT(*) AS n FROM products`).get().n === 2, 'device B imported 2 products from the Excel file');
  assert(dbB.prepare(`SELECT COUNT(*) AS n FROM sync_queue`).get().n > 0, 'import queued bundles (syncs to all devices)');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
