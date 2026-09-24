/**
 * PHASE 7 (images) — orphan-image cleanup safety on a failed product bundle (AGENTS.md §1.5.5).
 *
 * The safety-critical contract when a product bundle FAILS after the image was uploaded:
 *   - a newly-uploaded, UNREFERENCED image may be cleaned up (best-effort);
 *   - an image STILL REFERENCED by an active product is NEVER deleted (content-addressed
 *     images can be shared) — no data loss;
 *   - a non-hash value is ignored.
 *
 * We assert the "never delete a referenced/invalid image" guard, which is the part that must
 * not lose data. Uses the injected local DB (products table) + a fake Supabase storage client.
 *
 * Run: npx tsx tests/imageOrphan.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { setSupabaseForTesting } from '../src/data/supabaseClient.ts';
import { deleteOrphanImage } from '../src/lib/media/localImageStore.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'img-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) { db.exec('BEGIN'); try { const r = await fn({ execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null }); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } },
  };
}

const HASH_A = 'a'.repeat(64); // referenced by an active product
const HASH_B = 'b'.repeat(64); // unreferenced (true orphan)

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE products (id TEXT PRIMARY KEY, image_hash TEXT, active INTEGER);`);
  db.prepare(`INSERT INTO products (id, image_hash, active) VALUES ('p1', ?, 1)`).run(HASH_A);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };

let removeCalls = [];
function installFakeStorage() {
  removeCalls = [];
  setSupabaseForTesting({
    storage: { from: () => ({ remove: async (paths) => { removeCalls.push(...paths); return { error: null }; } }) },
  });
}

async function testReferencedNotDeleted() {
  console.log('\n[1] referenced image is NEVER deleted (no data loss)');
  freshDb(); installFakeStorage();
  await deleteOrphanImage(HASH_A);
  assert(removeCalls.length === 0, 'storage.remove NOT called for a hash an active product references');
}

async function testInvalidHashIgnored() {
  console.log('\n[2] non-hash value is ignored');
  freshDb(); installFakeStorage();
  await deleteOrphanImage('data:image/png;base64,xxxx');
  await deleteOrphanImage('');
  assert(removeCalls.length === 0, 'storage.remove NOT called for non-hash values');
}

async function testUnreferencedOrphanRemovedFromBucket() {
  console.log('\n[3] unreferenced orphan is cleaned from the bucket');
  freshDb(); installFakeStorage();
  await deleteOrphanImage(HASH_B);
  assert(removeCalls.includes(`${HASH_B}.webp`), 'storage.remove called for the orphaned (unreferenced) hash');
}

async function main() {
  console.log('PHASE 7 — orphan-image cleanup safety');
  await testReferencedNotDeleted();
  await testInvalidHashIgnored();
  await testUnreferencedOrphanRemovedFromBucket();
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
