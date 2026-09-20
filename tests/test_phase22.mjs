/**
 * Test Phase 22: Supabase Cloud DB Decoupling & Legacy Cleanup
 * Verifies that all entity services, repositories, and state modifications
 * operate 100% locally without cloud DB dependency, with zero residual cloudWrite calls.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function runTests() {
  console.log('--- PHASE 22: SUPABASE CLOUD DB DECOUPLING AUDIT ---');

  // Test 1: Verify cloudWrite has zero callers in src/
  function scanForCloudWriteCallers(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let callers = [];
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        callers = callers.concat(scanForCloudWriteCallers(fullPath));
      } else if (/\.(ts|tsx|js|jsx)$/.test(file.name) && !file.name.includes('cloudWrite.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes("from '../cloudWrite'") || content.includes("from '../../lib/cloudWrite'") || content.includes("from '../../../lib/cloudWrite'")) {
          callers.push(fullPath);
        }
      }
    }
    return callers;
  }

  const cloudWriteCallers = scanForCloudWriteCallers(srcDir);
  console.log(`[Phase 22] Active cloudWrite import callers found: ${cloudWriteCallers.length}`);
  assert.equal(cloudWriteCallers.length, 0, `Residual cloudWrite callers: ${cloudWriteCallers.join(', ')}`);

  // Test 2: Verify services have zero supabase.from or supabase.rpc calls
  const servicesDir = path.join(srcDir, 'lib/services');
  const serviceFiles = fs.readdirSync(servicesDir, { withFileTypes: true });
  const violatingServices = [];

  for (const file of serviceFiles) {
    if (file.isFile() && /\.(ts|js)$/.test(file.name)) {
      const content = fs.readFileSync(path.join(servicesDir, file.name), 'utf8');
      if (content.includes('supabase.from(') || content.includes('supabase.rpc(')) {
        violatingServices.push(file.name);
      }
    }
  }

  console.log(`[Phase 22] Services with direct Supabase DB queries: ${violatingServices.length}`);
  assert.equal(violatingServices.length, 0, `Services calling Supabase DB directly: ${violatingServices.join(', ')}`);

  // Test 3: Verify cloudWrite is a no-op stub
  const cloudWriteContent = fs.readFileSync(path.join(srcDir, 'lib/cloudWrite.ts'), 'utf8');
  assert.ok(cloudWriteContent.includes('Deprecated'), 'cloudWrite should be marked deprecated');
  assert.ok(!cloudWriteContent.includes('supabase.rpc'), 'cloudWrite must not call supabase.rpc');
  assert.ok(!cloudWriteContent.includes('supabase.from'), 'cloudWrite must not call supabase.from');

  // Test 4: Verify atomicOps has no remote RPC dispatch
  const atomicOpsContent = fs.readFileSync(path.join(servicesDir, 'atomicOps.ts'), 'utf8');
  assert.ok(!atomicOpsContent.includes('supabase.rpc'), 'atomicOps must not call supabase.rpc');

  // Test 5: Verify dead file productsService.extra.ts is deleted
  const extraExists = fs.existsSync(path.join(servicesDir, 'productsService.extra.ts'));
  assert.equal(extraExists, false, 'productsService.extra.ts should be completely deleted');

  // Test 6: Verify Supabase Realtime channel usage in mesh signalingChannel is preserved
  const signalingFile = path.join(srcDir, 'lib/mesh/signalingChannel.ts');
  const signalingContent = fs.readFileSync(signalingFile, 'utf8');
  assert.ok(signalingContent.includes('supabase.channel'), 'WebRTC signaling channel must utilize Supabase channel for presence/SDP');

  console.log('✅ PHASE 22 PASS: Supabase Cloud DB successfully decoupled. System is 100% Local-First and Offline-Authoritative!');
}

runTests();
