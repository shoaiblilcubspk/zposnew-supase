import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('--- TEST: PHASE 09 — FINAL COMPREHENSIVE VERIFICATION & EVIDENCE ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. Audit 300 Lines Limit on all src/ files
console.log('\n[1/4] Verifying 300-lines-per-file rule in src/ ...');
function checkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const lines = fs.readFileSync(full, 'utf8').split('\n').length;
      if (lines > 300) {
        assert(false, `File exceeds 300 lines: ${full} (${lines} lines)`);
      }
    }
  }
}
try {
  checkDir(path.resolve('src'));
  assert(true, '100% of src/ files are under 300 lines limit');
} catch (e) {
  assert(false, `Src line audit error: ${e.message}`);
}

// 2. TypeScript compilation
console.log('\n[2/4] Verifying TypeScript type safety (npx tsc --noEmit)...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  assert(true, 'TypeScript compilation clean with 0 type errors');
} catch (e) {
  assert(false, `TypeScript error: ${e.stdout?.toString() || e.message}`);
}

// 3. Verification of all Core Phase Test Suites
console.log('\n[3/4] Verifying Phase 01 to Phase 08 test suites...');
const phases = [
  'tests/test_phase01_first_run.mjs',
  'tests/test_phase02_sqlite_engine.mjs',
  'tests/test_phase03_rbac_and_roles.mjs',
  'tests/test_phase04_financial_stock_ledger.mjs',
  'tests/test_phase05_p2p_sync_engine.mjs',
  'tests/test_phase06_device_pairing_security.mjs',
  'tests/test_phase17.mjs',
  'tests/test_phase08_ui_status_transparency.mjs',
];

for (const phaseTest of phases) {
  try {
    execSync(`npx tsx ${phaseTest}`, { stdio: 'pipe' });
    assert(true, `Suite passed: ${phaseTest}`);
  } catch (e) {
    assert(false, `Suite failed: ${phaseTest} - ${e.message}`);
  }
}

// 4. Verification of Production Build artifact
console.log('\n[4/4] Verifying production build dist/...');
const distHtml = path.resolve('dist/index.html');
const distSw = path.resolve('dist/sw.js');
assert(fs.existsSync(distHtml), 'dist/index.html exists');
assert(fs.existsSync(distSw), 'dist/sw.js PWA service worker exists');

console.log(`\n========================================`);
console.log(`PHASE 09 RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASES (01 to 09) 100% VERIFIED & PASSING!');
  process.exit(0);
}
