/**
 * PHASE 7 (cloud push) — failure-injection for the sync worker (AGENTS.md §1.5.4).
 *
 * Exercises the bundle → apply_bundle push under injected cloud failures, with a fake Supabase
 * client and a real in-memory sync_queue:
 *   1. RPC success            -> bundle marked 'synced'
 *   2. RPC permanent error    -> bundle marked 'failed' (parked; surfaced in Cloud Sync)
 *   3. RPC retryable error    -> bundle stays 'error' (retried later, same operation_id)
 *   4. Network drop (throw)   -> treated retryable, stays queued
 *   5. Offline                -> nothing pushed, bundle stays 'pending'
 *   6. Offline -> online      -> same bundle drains on reconnect (crash/replay durability)
 *   7. Double-submit          -> same operation_id => single queue bundle, one push
 *
 * Run: npx tsx tests/syncFailure.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { setSupabaseForTesting } from '../src/data/supabaseClient.ts';
import { enqueue } from '../src/data/syncQueue.ts';
import { flushQueue } from '../src/data/syncWorker.ts';

// ── navigator.onLine control (Node has navigator but no onLine) ─────────────────
function setOnline(v) {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: v }, configurable: true });
}

// ── better-sqlite3 driver (sync_queue only) ─────────────────────────────────────
function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'sf-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) {
      db.exec('BEGIN');
      try { const r = await fn({ execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null }); db.exec('COMMIT'); return r; }
      catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
    },
  };
}

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT,
    payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);`);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

// ── fake Supabase: rpc() behaviour is configurable per test ─────────────────────
function fakeSupabase(rpcImpl) {
  return {
    rpc: async (_fn, _args) => rpcImpl(),
    from: () => ({ upsert: async () => ({ error: null }), delete: () => ({ eq: async () => ({ error: null }) }) }),
  };
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };
const statusOf = (db, op) => db.prepare('SELECT status, retry_count FROM sync_queue WHERE operation_id = ?').get(op);

async function seedBundle(op) {
  await enqueue({ operation_id: op, table_name: 'bundle', operation_type: 'bundle', payload: { action: 'create_sale', rows: [] } });
}

async function testSuccess() {
  console.log('\n[1] RPC success -> synced');
  const db = freshDb(); setOnline(true);
  setSupabaseForTesting(fakeSupabase(() => ({ data: { ok: true }, error: null })));
  await seedBundle('op-ok');
  const r = await flushQueue();
  assert(r.synced === 1, 'flushQueue reports 1 synced');
  assert(statusOf(db, 'op-ok').status === 'synced', 'bundle marked synced');
}

async function testPermanent() {
  console.log('\n[2] RPC permanent error (non-recoverable constraint) -> failed');
  const db = freshDb(); setOnline(true);
  // A genuine permanent constraint (e.g. NOT NULL 23502) can never succeed on retry -> parked.
  setSupabaseForTesting(fakeSupabase(() => ({ data: null, error: { code: '23502', message: 'null value in column violates not-null constraint' } })));
  await seedBundle('op-perm');
  const r = await flushQueue();
  assert(r.permanent === 1, 'flushQueue reports 1 permanent');
  assert(statusOf(db, 'op-perm').status === 'failed', 'bundle parked as failed (shown in Cloud Sync)');
}

async function testDuplicateKeyRecoverable() {
  console.log('\n[2b] duplicate-key (23505 auto-number collision) -> retryable, NOT permanent');
  const db = freshDb(); setOnline(true);
  // §1.7.7: the server renumbers a registered sequence on the next push, so a duplicate-key
  // collision must be retried (same operation_id), never parked as permanent on first hit.
  setSupabaseForTesting(fakeSupabase(() => ({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "sales_invoice_number_key"' } })));
  await seedBundle('op-dupe-key');
  const r = await flushQueue();
  assert(r.permanent === 0, 'a duplicate-key collision is NOT reported permanent on first attempt');
  const row = statusOf(db, 'op-dupe-key');
  assert(row.status === 'error' && row.retry_count === 1, 'stays error/retryable so the server renumber can resolve it');
}

async function testRetryable() {
  console.log('\n[3] RPC retryable error (08006 connection) -> error, stays queued');
  const db = freshDb(); setOnline(true);
  setSupabaseForTesting(fakeSupabase(() => ({ data: null, error: { code: '08006', message: 'connection failure' } })));
  await seedBundle('op-retry');
  const r = await flushQueue();
  assert(r.failed === 1, 'flushQueue reports 1 (retryable) failure');
  const row = statusOf(db, 'op-retry');
  assert(row.status === 'error' && row.retry_count === 1, 'bundle stays error, retry_count incremented (same operation_id)');
}

async function testNetworkThrow() {
  console.log('\n[4] network drop (rpc throws) -> retryable error');
  const db = freshDb(); setOnline(true);
  setSupabaseForTesting(fakeSupabase(() => { throw new Error('Failed to fetch'); }));
  await seedBundle('op-net');
  await flushQueue();
  assert(statusOf(db, 'op-net').status === 'error', 'network failure treated as retryable (not failed)');
}

async function testOffline() {
  console.log('\n[5] offline -> nothing pushed, stays pending');
  const db = freshDb(); setOnline(false);
  let called = 0;
  setSupabaseForTesting(fakeSupabase(() => { called++; return { data: {}, error: null }; }));
  await seedBundle('op-off');
  const r = await flushQueue();
  assert(r.synced === 0 && called === 0, 'offline: no RPC attempted');
  assert(statusOf(db, 'op-off').status === 'pending', 'bundle still pending (durably queued)');
}

async function testOfflineThenOnlineReplay() {
  console.log('\n[6] offline -> online: same bundle drains on reconnect');
  const db = freshDb();
  setOnline(false);
  setSupabaseForTesting(fakeSupabase(() => ({ data: {}, error: null })));
  await seedBundle('op-replay');
  await flushQueue();
  assert(statusOf(db, 'op-replay').status === 'pending', 'stays pending while offline');
  setOnline(true);
  await flushQueue();
  assert(statusOf(db, 'op-replay').status === 'synced', 'drains to synced after reconnect (crash/replay-safe)');
}

async function testDoubleSubmit() {
  console.log('\n[7] double-submit same operation_id -> single bundle, one push');
  const db = freshDb(); setOnline(true);
  let called = 0;
  setSupabaseForTesting(fakeSupabase(() => { called++; return { data: {}, error: null }; }));
  await seedBundle('op-dupe');
  await seedBundle('op-dupe'); // re-submit (INSERT OR REPLACE) — no second row
  const n = db.prepare('SELECT COUNT(*) AS n FROM sync_queue WHERE operation_id = ?').get('op-dupe').n;
  assert(n === 1, 'only one queue bundle for the reused operation_id');
  await flushQueue();
  assert(called === 1, 'pushed exactly once');
}

async function main() {
  console.log('PHASE 7 — sync worker failure-injection');
  await testSuccess();
  await testPermanent();
  await testDuplicateKeyRecoverable();
  await testRetryable();
  await testNetworkThrow();
  await testOffline();
  await testOfflineThenOnlineReplay();
  await testDoubleSubmit();
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
