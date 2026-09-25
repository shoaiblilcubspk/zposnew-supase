/**
 * Backup image migration: an archive carrying image files (images/{hash}.webp) uploads them into
 * THIS project's bucket on import (content-addressed — no old-project URL is ever stored).
 *
 * Run: npx tsx tests/backupImages.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { setSupabaseForTesting } from '../src/data/supabaseClient.ts';
import { applyImport } from '../src/lib/backup/importEngine.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'bi-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) { db.exec('BEGIN'); try { const r = await fn({ execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null }); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } },
  };
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };

async function main() {
  console.log('Backup image migration on import');

  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE products (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, name TEXT, image_hash TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT, payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
  `);
  setLocalDbForTesting(makeDriver(db));

  const uploads = [];
  setSupabaseForTesting({
    storage: { from: () => ({ upload: async (path) => { uploads.push(path); return { error: null }; } }) },
  });

  const hash = 'a'.repeat(64);
  const productsJson = JSON.stringify([{ id: 'p1', operation_id: 'op1', name: 'jeans', image_hash: hash, created_at: '2020', updated_at: '2020' }]);
  const manifest = {
    formatVersion: 2, appVersion: '1.0.0', createdAt: '2020', domains: ['products'], includeSensitive: false,
    files: [{ domain: 'products', table: 'products', file: 'data/products.json', rowCount: 1, sha256: await sha256Hex(productsJson), appendOnly: false }],
    totalRows: 1, images: [hash],
  };
  const files = {
    'manifest.json': JSON.stringify(manifest),
    'data/products.json': productsJson,
    [`images/${hash}.webp`]: Buffer.from([1, 2, 3, 4]).toString('base64'),
  };

  const report = await applyImport(files, { conflictMode: 'update' });
  assert(db.prepare(`SELECT COUNT(*) AS n FROM products`).get().n === 1, 'product row imported');
  assert(report.find((r) => r.table === 'products').inserted === 1, 'report: product inserted');
  assert(uploads.includes(`${hash}.webp`), 'image file uploaded to THIS project bucket (hash-based, no old URL)');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
