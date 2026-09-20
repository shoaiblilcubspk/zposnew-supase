/**
 * Test: Phase 02 — Local SQLite Storage Engine Hardening
 * Validates 21 core tables, migration execution, driver detection,
 * atomic transaction rollback, <10ms write latency, and zero cloud DB queries.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

async function runTests() {
  console.log('--- TEST: PHASE 02 — LOCAL SQLITE STORAGE ENGINE HARDENING ---');

  // Test 1: Verify all 21 core tables defined in Migration 001
  console.log('1. Auditing 21 Core SQLite Tables in Migration 001...');
  const { MIGRATION_001_STATEMENTS, MIGRATION_001_VERSION } = await import(
    '../src/lib/db/migrations/001_initial_schema.ts'
  );

  assert.equal(MIGRATION_001_VERSION, 1, 'Initial migration version must be 1');

  const requiredTables = [
    'shop',
    'devices',
    'users',
    'categories',
    'products',
    'product_variants',
    'product_images',
    'sales',
    'sale_items',
    'payment_modes',
    'payments',
    'inventory_transactions',
    'customers',
    'customer_ledger',
    'suppliers',
    'purchase_records',
    'expenses',
    'sync_outbox',
    'sync_inbox',
    'tombstones',
    'settings',
  ];

  const schemaDdl = MIGRATION_001_STATEMENTS.join('\n');
  for (const table of requiredTables) {
    assert.ok(
      schemaDdl.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
      `Migration 001 must define table "${table}"`
    );
  }
  console.log(`✓ All ${requiredTables.length} core SQLite tables confirmed in schema.`);

  // Test 2: Platform Detection & Driver Factory
  console.log('2. Testing Platform Detection & Driver Factory...');
  const { detectPlatform, getDriver } = await import('../src/lib/db/driverFactory.ts');
  const { initDb } = await import('../src/lib/db/index.ts');

  const platform = detectPlatform();
  assert.ok(['wasm', 'tauri', 'capacitor'].includes(platform), `Platform should be valid: ${platform}`);

  const driver = await initDb(':memory:');
  assert.ok(driver.isOpen, 'Driver must be open after initDb()');
  assert.ok(typeof driver.execute === 'function', 'Driver must implement execute()');
  assert.ok(typeof driver.query === 'function', 'Driver must implement query()');
  assert.ok(typeof driver.transaction === 'function', 'Driver must implement transaction()');
  console.log(`✓ Driver initialized and opened successfully for platform: ${platform}.`);

  // Test 3: Migration Runner Architecture Audit
  console.log('3. Auditing Migration Runner...');
  const { ALL_MIGRATIONS, getCurrentSchemaVersion } = await import(
    '../src/lib/db/migrationRunner.ts'
  );
  assert.ok(ALL_MIGRATIONS.length >= 1, 'Must have at least 1 migration registered');
  const schemaVer = await getCurrentSchemaVersion(driver);
  assert.ok(schemaVer >= 1, `Current schema version must be >= 1 (got: ${schemaVer})`);
  console.log(`✓ Migration runner contract verified. Active schema version: ${schemaVer}`);

  // Test 4: Atomicity & Transaction Performance Benchmark (< 10ms)
  console.log('4. Benchmarking In-Memory SQLite Transaction Speed (< 10ms target)...');
  await driver.execute('CREATE TABLE IF NOT EXISTS _perf_test (id TEXT PRIMARY KEY, val INTEGER);');

  const iterations = 50;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await driver.transaction(async (tx) => {
      await tx.execute('INSERT OR REPLACE INTO _perf_test (id, val) VALUES (?, ?);', [`perf_${i}`, i]);
    });
  }
  const totalMs = performance.now() - start;
  const avgMsPerTx = totalMs / iterations;

  console.log(`  Executed ${iterations} atomic transactions in ${totalMs.toFixed(2)}ms (Avg: ${avgMsPerTx.toFixed(3)}ms per tx)`);
  assert.ok(avgMsPerTx < 10, `Average transaction time must be < 10ms (achieved: ${avgMsPerTx.toFixed(3)}ms)`);
  console.log('✓ <10ms transaction commit benchmark achieved!');

  // Test 5: Atomic Rollback on Failure
  console.log('5. Testing Atomic Transaction Rollback on Failure...');
  await driver.execute('CREATE TABLE IF NOT EXISTS _rollback_test (id TEXT PRIMARY KEY);');
  await driver.execute('DELETE FROM _rollback_test;');

  let caughtError = false;
  try {
    await driver.transaction(async (tx) => {
      await tx.execute('INSERT INTO _rollback_test (id) VALUES (?);', ['committed_test_id']);
      throw new Error('Simulated transactional failure');
    });
  } catch (err) {
    caughtError = true;
  }

  assert.ok(caughtError, 'Transaction must throw on forced error');
  const checkRows = await driver.query('SELECT * FROM _rollback_test;');
  assert.equal(checkRows.length, 0, 'Rolled-back transaction must leave 0 residual rows in database');
  console.log('✓ Transaction rollback leaves 0 rows verified.');

  // Test 6: Zero Cloud DB Queries Audit across Services
  console.log('6. Auditing src/lib/services/ for Zero Direct Supabase DB Queries...');
  const servicesDir = path.join(srcDir, 'lib/services');
  const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

  for (const file of serviceFiles) {
    const filePath = path.join(servicesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('supabase.from('),
      `Service ${file} must NOT contain direct supabase.from() database queries`
    );
  }
  console.log('✓ Zero direct Supabase DB queries across all services verified.');

  console.log('✅ PHASE 02: LOCAL SQLITE STORAGE ENGINE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Phase 02 test failed:', err);
  process.exit(1);
});
