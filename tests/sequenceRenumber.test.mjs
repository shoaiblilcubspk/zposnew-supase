/**
 * CROSS-DEVICE SEQUENCE RENUMBER (AGENTS.md §1.7) — client-side apply + guard.
 *
 * The server (apply_bundle, migration 0025) re-allocates a colliding sequence number
 * (e.g. invoice INV-1016 → INV-1017) and returns it as `renumbered` in the RPC result.
 * These tests verify the CLIENT half:
 *   1. A bundle push whose result carries `renumbered` patches the local row (silent renumber,
 *      no error, no data loss) and still marks the bundle synced.
 *   2. A normal push with no renumber leaves rows untouched.
 *   3. GUARD: the apply_bundle migration keeps the server-side sequence mechanism
 *      (sequence_registry + unique_violation renumber loop) — so it can't be silently dropped.
 *
 * Run: npx tsx tests/sequenceRenumber.test.mjs   (or: npm test)
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { setSupabaseForTesting } from '../src/data/supabaseClient.ts';
import { enqueue } from '../src/data/syncQueue.ts';
import { flushQueue } from '../src/data/syncWorker.ts';

function setOnline(v) {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: v }, configurable: true });
}

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  const tx = { execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null };
  return {
    name: 'seq-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) {
      db.exec('BEGIN');
      try { const r = await fn(tx); db.exec('COMMIT'); return r; }
      catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
    },
  };
}

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT,
    payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);`);
  db.exec(`CREATE TABLE sales (id TEXT PRIMARY KEY, invoice_number TEXT, total_amount REAL);`);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

function fakeSupabase(rpcImpl) {
  return {
    rpc: async (_fn, _args) => rpcImpl(),
    from: () => ({ upsert: async () => ({ error: null }), delete: () => ({ eq: async () => ({ error: null }) }) }),
  };
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };

async function testRenumberApplied() {
  console.log('\n[1] result.renumbered -> local invoice_number patched, bundle synced');
  const db = freshDb(); setOnline(true);
  db.prepare('INSERT INTO sales (id, invoice_number, total_amount) VALUES (?,?,?)').run('B1', 'INV-1016', 500);
  setSupabaseForTesting(fakeSupabase(() => ({
    data: { ok: true, action: 'create_sale', rows_applied: 1,
      renumbered: [{ table: 'sales', id: 'B1', column: 'invoice_number', old: 'INV-1016', new: 'INV-1017' }] },
    error: null,
  })));
  await enqueue({ operation_id: 'op-renum', table_name: 'bundle', operation_type: 'bundle', payload: { action: 'create_sale', rows: [] } });
  const r = await flushQueue();
  assert(r.synced === 1, 'bundle marked synced (no error surfaced for a collision)');
  const row = db.prepare('SELECT invoice_number FROM sales WHERE id = ?').get('B1');
  assert(row.invoice_number === 'INV-1017', 'local sale renumbered to server-assigned INV-1017 (no data loss)');
}

async function testNoRenumberNoChange() {
  console.log('\n[2] no renumber -> row untouched');
  const db = freshDb(); setOnline(true);
  db.prepare('INSERT INTO sales (id, invoice_number, total_amount) VALUES (?,?,?)').run('A1', 'INV-2000', 100);
  setSupabaseForTesting(fakeSupabase(() => ({ data: { ok: true, rows_applied: 1, renumbered: [] }, error: null })));
  await enqueue({ operation_id: 'op-plain', table_name: 'bundle', operation_type: 'bundle', payload: { action: 'create_sale', rows: [] } });
  await flushQueue();
  const row = db.prepare('SELECT invoice_number FROM sales WHERE id = ?').get('A1');
  assert(row.invoice_number === 'INV-2000', 'untouched when server assigned no new number');
}

function testMigrationGuard() {
  console.log('\n[3] GUARD: apply_bundle keeps the server-side sequence mechanism');
  const dir = path.resolve(process.cwd(), 'supabase/migrations');
  const files = fs.readdirSync(dir).filter(f => /apply_bundle_sequence_renumber\.sql$/.test(f));
  assert(files.length >= 1, 'a sequence-renumber apply_bundle migration exists');
  const sql = fs.readFileSync(path.join(dir, files[0]), 'utf8');
  assert(/sequence_registry/.test(sql), 'sequence_registry table present (generic per-domain registry)');
  assert(/when unique_violation then/.test(sql), 'unique_violation renumber branch present');
  assert(/'sales',\s*'invoice_number'/.test(sql), 'sales.invoice_number registered as a sequence');
  const master = fs.readFileSync(path.resolve(process.cwd(), 'supabase/MASTER_SCHEMA.sql'), 'utf8');
  assert(/sequence_registry/.test(master) && /when unique_violation then/.test(master), 'MASTER_SCHEMA carries the same mechanism (clone-ready)');
}

async function main() {
  console.log('CROSS-DEVICE SEQUENCE RENUMBER — client apply + guard');
  await testRenumberApplied();
  await testNoRenumberNoChange();
  testMigrationGuard();
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
