/**
 * Test: Phase 01 — First-Run Onboarding & Shop Initialization
 * Validates offline shop initialization, root device registration,
 * PBKDF2 admin PIN hashing, emergency recovery code, and genesis outbox events.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

async function runTests() {
  console.log('--- TEST: PHASE 01 — FIRST-RUN & SHOP INITIALIZATION ---');

  // Test 1: PIN Crypto hashing & verification
  console.log('1. Testing PBKDF2 Admin PIN Cryptography & Salt...');
  const { hashPin, verifyPin, generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } =
    await import('../src/lib/auth/pinCrypto.ts');

  const adminPin = '5831';
  const { fullHash, salt, hash } = await hashPin(adminPin);

  assert.ok(fullHash.includes(':'), 'Full hash must be formatted as salt:hash');
  assert.equal(salt.length, 32, 'Salt should be 16 bytes hex (32 characters)');
  assert.equal(hash.length, 64, 'SHA-256 hash should be 32 bytes hex (64 characters)');

  // Correct PIN verification
  const isValid = await verifyPin(adminPin, fullHash);
  assert.equal(isValid, true, 'Valid Admin PIN should verify successfully');

  // Incorrect PIN verification
  const isInvalid = await verifyPin('0000', fullHash);
  assert.equal(isInvalid, false, 'Invalid PIN must fail verification');
  console.log('✓ Admin PIN cryptography validated.');

  // Test 2: Master Emergency Recovery Code
  console.log('2. Testing 24-character Offline Master Recovery Code...');
  const recoveryCode = generateRecoveryCode();
  assert.match(
    recoveryCode,
    /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/,
    'Recovery code must be 6 groups of 4 alphanumeric chars'
  );

  const recHash = await hashRecoveryCode(recoveryCode);
  assert.ok(recHash.includes(':'), 'Recovery hash must contain salt and hash');

  const recValid = await verifyRecoveryCode(recoveryCode, recHash);
  assert.equal(recValid, true, 'Valid recovery code must verify');

  const recWrong = await verifyRecoveryCode('AAAA-BBBB-CCCC-DDDD-EEEE-FFFF', recHash);
  assert.equal(recWrong, false, 'Wrong recovery code must fail');
  console.log('✓ Master recovery code generation and verification validated.');

  // Test 3: Device Keypair Generation
  console.log('3. Testing Root Device ECDSA Keypair Generation...');
  const { getOrCreateDeviceKeypair } = await import('../src/lib/crypto/deviceKeypair.ts');
  const keypair = await getOrCreateDeviceKeypair();
  assert.ok(keypair.publicKeyHex, 'Root device must have a public key hex');
  assert.ok(keypair.privateKey, 'Root device must have an ECDSA private key');
  assert.ok(keypair.publicKey, 'Root device must have an ECDSA public key');
  console.log('✓ Root device ECDSA keypair validated.');

  // Test 4: Auditing FirstLaunchSetupModal adherence to Linear UI
  console.log('4. Auditing FirstLaunchSetupModal UI against Linear Anti-AI Standards...');
  const modalPath = path.join(srcDir, 'components/auth/FirstLaunchSetupModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'FirstLaunchSetupModal.tsx must exist');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  assert.ok(modalContent.includes('First-Time Setup'), 'Must display first-time setup title');
  assert.ok(modalContent.includes('Emergency Master Recovery Code'), 'Must display recovery code step');
  assert.ok(modalContent.includes('h-8'), 'Inputs must use standard 32px height');
  assert.ok(!modalContent.includes('rounded-2xl'), 'Must not use puffy rounded-2xl');
  assert.ok(!modalContent.includes('bg-gradient-to-'), 'Must not use gradients');
  assert.ok(modalContent.split('\n').length <= 300, 'FirstLaunchSetupModal must be <= 300 lines');
  console.log('✓ FirstLaunchSetupModal UI adheres strictly to Linear Anti-AI standards.');

  // Test 5: Auditing localAuthService for Zero-Cloud Dependency & Outbox Genesis Events
  console.log('5. Auditing localAuthService for genesis events and zero cloud dependency...');
  const authServicePath = path.join(srcDir, 'lib/auth/localAuthService.ts');
  const authContent = fs.readFileSync(authServicePath, 'utf8');

  assert.ok(!authContent.includes('supabase.auth'), 'Must not depend on Supabase Auth');
  assert.ok(authContent.includes('SHOP_CREATED'), 'Must emit SHOP_CREATED genesis outbox event');
  assert.ok(authContent.includes('DEVICE_REGISTERED'), 'Must emit DEVICE_REGISTERED genesis outbox event');
  assert.ok(authContent.includes('USER_CREATED'), 'Must emit USER_CREATED genesis outbox event');
  assert.ok(authContent.split('\n').length <= 300, `localAuthService.ts must be <= 300 lines (current: ${authContent.split('\n').length})`);
  console.log('✓ localAuthService genesis events and zero-cloud dependency verified.');

  console.log('✅ PHASE 01: FIRST-RUN & SHOP INITIALIZATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Phase 01 test failed:', err);
  process.exit(1);
});
