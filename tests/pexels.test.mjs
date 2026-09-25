/**
 * Pexels + media service tests (no real network/key): key gating, in-memory cache, rate-limit
 * handling, and mediaService dedup by pexels_id. Global fetch is mocked.
 *
 * Run: npx tsx tests/pexels.test.mjs   (or: npm test)
 */

import Database from 'better-sqlite3';
import { setLocalDbForTesting } from '../src/data/localDb.ts';
import { searchPhotos, PexelsError } from '../src/lib/services/pexelsService.ts';
import { savePexelsKey } from '../src/lib/services/integrationSettingsService.ts';
import { saveFromPexels } from '../src/lib/services/mediaService.ts';

function makeDriver(db) {
  const run = (sql, p = []) => { const i = db.prepare(sql).run(...(p ?? [])); return { rows: [], rowsAffected: i.changes }; };
  return {
    name: 'px-test', platform: 'wasm', isOpen: true,
    async open() {}, async close() {},
    async execute(sql, p = []) { return run(sql, p); },
    async query(sql, p = []) { return db.prepare(sql).all(...(p ?? [])); },
    async queryOne(sql, p = []) { return db.prepare(sql).get(...(p ?? [])) ?? null; },
    async transaction(fn) { db.exec('BEGIN'); try { const r = await fn({ execute: async (s, p = []) => run(s, p), query: async (s, p = []) => db.prepare(s).all(...(p ?? [])), queryOne: async (s, p = []) => db.prepare(s).get(...(p ?? [])) ?? null }); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; } },
  };
}

function freshDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE integration_settings (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, key_name TEXT UNIQUE, key_value TEXT, metadata TEXT, updated_by TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE media_assets (id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, source TEXT, image_hash TEXT, pexels_id TEXT, photographer TEXT, photographer_url TEXT, page_url TEXT, alt TEXT, avg_color TEXT, width INTEGER, height INTEGER, src_original TEXT, src_large2x TEXT, src_large TEXT, src_medium TEXT, src_portrait TEXT, src_tiny TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT);
    CREATE TABLE sync_queue (operation_id TEXT PRIMARY KEY, table_name TEXT, operation_type TEXT, payload TEXT, status TEXT, retry_count INTEGER, last_error TEXT, created_at TEXT, updated_at TEXT);
  `);
  setLocalDbForTesting(makeDriver(db));
  return db;
}

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };
async function expectThrowCode(fn, code, m) { try { await fn(); assert(false, m); } catch (e) { assert(e instanceof PexelsError && e.code === code, m); } }

Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });

async function main() {
  console.log('Pexels + media service');
  freshDb();

  // No key -> gated.
  await expectThrowCode(() => searchPhotos('jeans'), 'no_key', 'search without a key throws no_key');

  // Save a key, then mock fetch for a successful search.
  await savePexelsKey('TESTKEY');
  let calls = 0;
  const photo = { id: 123, width: 100, height: 100, url: 'https://pexels.com/p/123', photographer: 'Jane', photographer_url: 'https://pexels.com/@jane', avg_color: '#ccc', alt: 'jeans', src: { original: 'o', large2x: 'l2', large: 'l', medium: 'm', small: 's', portrait: 'p', landscape: 'ls', tiny: 't' } };
  globalThis.fetch = async () => { calls++; return { ok: true, status: 200, headers: { get: (h) => (h === 'X-Ratelimit-Remaining' ? '199' : null) }, json: async () => ({ photos: [photo], page: 1, per_page: 30, total_results: 1, next_page: 'https://n' }) }; };

  const r1 = await searchPhotos('jeans', 1);
  assert(r1.photos.length === 1 && r1.photos[0].id === 123, 'search returns photos with a valid key');
  assert(r1.rateRemaining === '199', 'rate-limit remaining parsed from 2xx header');
  const r2 = await searchPhotos('jeans', 1);
  assert(calls === 1 && r2.photos.length === 1, 'identical search served from cache (no second request)');

  // Rate limit -> friendly error.
  globalThis.fetch = async () => ({ ok: false, status: 429, headers: { get: () => null }, json: async () => ({}) });
  await expectThrowCode(() => searchPhotos('coffee', 1), 'rate_limited', '429 -> rate_limited error');

  // mediaService dedup: an existing pexels_id returns the existing asset with NO download.
  const db = freshDb();
  db.prepare(`INSERT INTO media_assets (id, operation_id, source, image_hash, pexels_id, created_at, updated_at) VALUES ('m1','op1','pexels','hash123','123','2020','2020')`).run();
  let dlCalls = 0;
  globalThis.fetch = async () => { dlCalls++; return { ok: true, blob: async () => ({ arrayBuffer: async () => new Uint8Array([1]).buffer, type: 'image/jpeg' }) }; };
  const asset = await saveFromPexels(photo);
  assert(asset.imageHash === 'hash123' && dlCalls === 0, 'saveFromPexels dedups by pexels_id (no re-download)');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
