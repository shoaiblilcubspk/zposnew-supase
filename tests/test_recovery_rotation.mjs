import { initDb } from '../src/lib/db/index.ts';
import { bootstrapAdmin, resetAdminPinWithRecoveryCode } from '../src/lib/auth/localAuthService.ts';
import { rotateRecoveryCode } from '../src/lib/auth/recoveryService.ts';

console.log('--- TEST: RECOVERY CODE ROTATION & LEAK PROTECTION ---');

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

async function run() {
  try {
    await initDb(':memory:');

    // 1. Setup shop and root admin
    const { recoveryCode: initialRecoveryCode } = await bootstrapAdmin({
      shopName: 'Test Shop Rotation',
      currency: 'PKR',
      adminName: 'Owner',
      adminUsername: 'owner',
      adminPin: '1234',
    });

    assert(initialRecoveryCode.replace(/-/g, '').length === 24, 'Initial recovery code has 24 alphanumeric characters');

    // 2. Rotate recovery code using correct Admin PIN
    const newRecoveryCode = await rotateRecoveryCode('1234');
    assert(newRecoveryCode.replace(/-/g, '').length === 24, 'New rotated recovery code has 24 alphanumeric characters');
    assert(newRecoveryCode !== initialRecoveryCode, 'Rotated code is completely different from old leaked code');

    // 3. Test that the OLD leaked code is now DEAD / REJECTED
    let oldCodeFailed = false;
    try {
      await resetAdminPinWithRecoveryCode(initialRecoveryCode, '9999');
    } catch (err) {
      oldCodeFailed = true;
    }
    assert(oldCodeFailed, 'OLD leaked recovery code was REJECTED (cannot reset PIN)');

    // 4. Test that the NEW recovery code WORKS
    const resetSuccess = await resetAdminPinWithRecoveryCode(newRecoveryCode, '5678');
    assert(resetSuccess === true, 'NEW recovery code successfully resets Admin PIN');

    // 5. Test wrong Admin PIN cannot rotate recovery code
    let wrongPinRejected = false;
    try {
      await rotateRecoveryCode('0000');
    } catch (err) {
      wrongPinRejected = true;
    }
    assert(wrongPinRejected, 'Wrong Admin PIN cannot rotate recovery code');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

run();
