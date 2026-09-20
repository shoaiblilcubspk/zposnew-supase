import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { detectPlatform } from '../src/lib/db/driverFactory.ts';
import { TauriSqliteDriver } from '../src/lib/db/drivers/tauriDriver.ts';

console.log('--- TEST PHASE 20: Tauri Desktop Packaging (Rust + Native SQLite) ---');

async function run() {
  const root = process.cwd();

  // 1. Verify Tauri configuration and Rust source files exist
  const requiredFiles = [
    'src-tauri/Cargo.toml',
    'src-tauri/tauri.conf.json',
    'src-tauri/src/main.rs',
    'src-tauri/src/lib.rs',
    'src-tauri/build.rs',
    'src-tauri/capabilities/default.json',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(root, relPath);
    assert.ok(fs.existsSync(fullPath), `Missing required Tauri file: ${relPath}`);
  }
  console.log('✓ All 6 core Tauri v2 project files verified on filesystem');

  // 2. Validate tauri.conf.json content
  const tauriConfRaw = fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf-8');
  const tauriConf = JSON.parse(tauriConfRaw);

  assert.strictEqual(tauriConf.identifier, 'com.zaynahs.pos');
  assert.strictEqual(tauriConf.productName, 'Zaynahs POS');
  assert.strictEqual(tauriConf.build.devUrl, 'http://localhost:5173');
  assert.strictEqual(tauriConf.build.frontendDist, '../dist');
  assert.ok(tauriConf.plugins.sql.preload.includes('sqlite:zaynahs_pos.db'));
  console.log('✓ tauri.conf.json valid: App ID, devUrl, and SQLite preload verified');

  // 3. Validate Cargo.toml content
  const cargoToml = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf-8');
  assert.ok(cargoToml.includes('tauri-plugin-sql'));
  assert.ok(cargoToml.includes('tauri-plugin-fs'));
  console.log('✓ Cargo.toml verified with tauri-plugin-sql and tauri-plugin-fs dependencies');

  // 4. Test platform detection logic
  const defaultPlatform = detectPlatform();
  assert.strictEqual(defaultPlatform, 'wasm'); // Node.js test environment defaults to wasm
  console.log(`✓ Platform detection in Node environment: ${defaultPlatform}`);

  // 5. Verify TauriSqliteDriver implementation
  const driver = new TauriSqliteDriver();
  assert.strictEqual(driver.name, 'TauriSqliteDriver');
  assert.strictEqual(driver.platform, 'tauri');
  assert.strictEqual(driver.isOpen, false);
  console.log('✓ TauriSqliteDriver instantiated and validated');

  console.log('--- ALL PHASE 20 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 20 Test Failed:', err);
  process.exit(1);
});
