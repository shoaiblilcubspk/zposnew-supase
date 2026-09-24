/**
 * Backup export engine v2 tests: registry dependency resolution + export shape, and that
 * sensitive columns (staff password_hash) are stripped from a plain export by default.
 *
 * Run: npx tsx tests/exportEngine.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { buildExport } from '../src/lib/backup/exportEngineV2.ts';
import { withDependencies } from '../src/lib/backup/domainRegistry.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'exp-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) { db.exec('BEGIN'); try { const r = await fn({ execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null }); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } },
  };
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };

async function main() {
  console.log('Export engine v2');

  // Dependency resolution: products pulls in categories + suppliers, in dependency order.
  const deps = withDependencies(['products']);
  assert(deps.includes('categories') && deps.includes('suppliers') && deps.includes('products'), 'products auto-includes categories + suppliers');
  assert(deps.indexOf('categories') < deps.indexOf('products'), 'dependencies ordered before dependents');

  // Seed a DB with products + a staff user (sensitive) and export.
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT, active INTEGER);
    CREATE TABLE suppliers (id TEXT PRIMARY KEY, name TEXT, balance REAL, active INTEGER);
    CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT, image_hash TEXT, active INTEGER);
    CREATE TABLE product_variants (id TEXT PRIMARY KEY, product_id TEXT);
    CREATE TABLE product_images (id TEXT PRIMARY KEY, product_id TEXT, image_hash TEXT);
    CREATE TABLE staff_users (id TEXT PRIMARY KEY, username TEXT, password_hash TEXT, role TEXT, permissions TEXT);
    CREATE TABLE roles (id TEXT PRIMARY KEY, code TEXT);
  `);
  db.prepare(`INSERT INTO categories VALUES ('c1','Clothes',1)`).run();
  db.prepare(`INSERT INTO suppliers VALUES ('s1','ALI',0,1)`).run();
  db.prepare(`INSERT INTO products VALUES ('p1','jeans','abc',1)`).run();
  db.prepare(`INSERT INTO staff_users VALUES ('u1','admin','SALT:HASH:FB','admin','{}')`).run();
  setLocalDbForTesting(makeDriver(db));

  const res = await buildExport(['products', 'users'], { appVersion: '1.0.0' });
  assert(res.files['manifest.json'], 'manifest.json produced');
  assert(res.files['data/products.json'], 'products table exported');
  assert(res.files['data/categories.json'], 'dependency categories exported');
  const products = JSON.parse(res.files['data/products.json']);
  assert(products.length === 1 && products[0].name === 'jeans', 'product row exported');

  // Sensitive: password_hash stripped by default.
  const staff = JSON.parse(res.files['data/staff_users.json']);
  assert(staff.length === 1 && staff[0].password_hash === undefined, 'password_hash stripped from plain export');
  assert(staff[0].username === 'admin', 'non-sensitive staff fields kept');

  // With includeSensitive -> hash retained.
  const res2 = await buildExport(['users'], { includeSensitive: true });
  const staff2 = JSON.parse(res2.files['data/staff_users.json']);
  assert(staff2[0].password_hash === 'SALT:HASH:FB', 'password_hash retained only when includeSensitive');

  // Manifest integrity: row counts + checksum present.
  const m = JSON.parse(res.files['manifest.json']);
  const pf = m.files.find((f) => f.table === 'products');
  assert(pf && pf.rowCount === 1 && /^[0-9a-f]{64}$/.test(pf.sha256), 'manifest has row count + sha256 per file');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
