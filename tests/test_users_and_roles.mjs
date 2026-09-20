/**
 * Test: Decentralized Users, Roles, Permissions & PIN Security
 * Validates local-first SQLite user repository, PBKDF2 PIN hashing,
 * P2P sync events, and Linear Anti-AI UI standard adherence.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

async function runTests() {
  console.log('--- TEST: DECENTRALIZED USERS, ROLES & PIN SECURITY ---');

  // Test 1: PIN Crypto hashing & verification
  console.log('1. Testing PBKDF2 PIN Cryptography...');
  const { hashPin, verifyPin, generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } =
    await import('../src/lib/auth/pinCrypto.ts');

  const testPin = '4829';
  const { fullHash, salt, hash } = await hashPin(testPin);

  assert.ok(fullHash.includes(':'), 'Full hash must be formatted as salt:hash');
  assert.equal(salt.length, 32, 'Salt should be 16 bytes hex (32 characters)');
  assert.equal(hash.length, 64, 'SHA-256 hash should be 32 bytes hex (64 characters)');

  // Correct PIN verification
  const isValid = await verifyPin(testPin, fullHash);
  assert.equal(isValid, true, 'Valid PIN should verify successfully');

  // Wrong PIN verification
  const isInvalid = await verifyPin('9999', fullHash);
  assert.equal(isInvalid, false, 'Invalid PIN should fail verification');

  // Recovery code generation and verification
  const recoveryCode = generateRecoveryCode();
  assert.match(recoveryCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const recHash = await hashRecoveryCode(recoveryCode);
  const recValid = await verifyRecoveryCode(recoveryCode, recHash);
  assert.equal(recValid, true, 'Recovery code should verify correctly');
  console.log('✓ PIN and Recovery Code cryptography verified.');

  // Test 2: File Size & Architecture Audit (< 300 lines limit)
  console.log('2. Auditing User module file sizes & architecture...');
  const userFiles = [
    'lib/services/users/userRepository.ts',
    'lib/services/users/userEventHandlers.ts',
    'lib/services/usersService.ts',
    'components/users/UserModal.tsx',
    'components/users/useUserModalData.ts',
    'components/users/UserManager.view.tsx',
    'components/users/useUserManagerLogic.ts',
  ];

  for (const relPath of userFiles) {
    const fullPath = path.join(srcDir, relPath);
    assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount <= 300, `File ${relPath} exceeds 300 lines (current: ${lineCount})`);
    console.log(`  ✓ ${relPath}: ${lineCount} lines (< 300 ceiling)`);
  }

  // Test 3: Verify Zero Plaintext PINs in repository and event payloads
  console.log('3. Auditing repository & P2P event payload security...');
  const userRepoContent = fs.readFileSync(path.join(srcDir, 'lib/services/users/userRepository.ts'), 'utf8');
  assert.ok(userRepoContent.includes('pin_hash: pinHash'), 'Outbox payload must store pin_hash');
  assert.ok(!userRepoContent.includes('pin: input.pin'), 'Plaintext PIN must never be stored in payload');
  assert.ok(userRepoContent.includes('commitLocalTransaction'), 'Must use commitLocalTransaction for P2P outbox');

  // Test 4: Verify Mesh Bootstrap registration
  console.log('4. Verifying User Event Handler registration in Mesh Bootstrap...');
  const meshBootstrapContent = fs.readFileSync(path.join(srcDir, 'lib/mesh/useMeshBootstrap.ts'), 'utf8');
  assert.ok(meshBootstrapContent.includes('registerUserEventHandlers'), 'Mesh bootstrap must register user event handlers');

  // Test 5: Verify UserModal adheres to Linear Anti-AI Standards
  console.log('5. Auditing UserModal UI against Anti-AI standards...');
  const userModalContent = fs.readFileSync(path.join(srcDir, 'components/users/UserModal.tsx'), 'utf8');
  assert.ok(!userModalContent.includes('adminUserAction'), 'UserModal must not call legacy cloud adminUserAction');
  assert.ok(!userModalContent.includes('rounded-[20px]'), 'UserModal must not have fluffy rounded-[20px]');
  assert.ok(!userModalContent.includes('rounded-[24px]'), 'UserModal must not have fluffy rounded-[24px]');
  assert.ok(userModalContent.includes('h-8'), 'UserModal inputs must adhere to standard 32px height');
  assert.ok(userModalContent.includes('pin'), 'UserModal must support security PIN');

  // Test 6: Verify UserManager.view.tsx adheres to Linear Metrics Strip
  console.log('6. Auditing UserManager.view.tsx against Anti-AI standards...');
  const userManagerContent = fs.readFileSync(path.join(srcDir, 'components/users/UserManager.view.tsx'), 'utf8');
  assert.ok(!userManagerContent.includes('bg-gradient-to-br'), 'UserManager must not use colorful gradients');
  assert.ok(userManagerContent.includes('tabular-nums'), 'Metrics must use tabular digits');
  assert.ok(userManagerContent.includes('text-[13px]'), 'Table must use 13px base text');

  console.log('✅ ALL USER MANAGEMENT, ROLE & PIN SECURITY TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
