/**
 * Store Email validation (BUG 2): the Store Email field must only ever hold an email or be
 * empty, so junk like "adminkey" (an API key pasted into the wrong field) can never be saved.
 *
 * Run: npx tsx tests/storeEmailValidation.test.mjs   (or: npm test)
 */

import { isValidStoreEmail } from '../src/lib/validation.ts';

let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ok - ${msg}`); }
  else { console.error(`  FAIL - ${msg}`); failed++; }
}

console.log('Store Email validation');

// Valid: empty (optional field) or a real email
assert(isValidStoreEmail('') === true, 'empty is allowed (optional field)');
assert(isValidStoreEmail(null) === true, 'null is allowed');
assert(isValidStoreEmail(undefined) === true, 'undefined is allowed');
assert(isValidStoreEmail('  ') === true, 'whitespace-only treated as empty');
assert(isValidStoreEmail('contact@mystore.com') === true, 'a normal email is valid');
assert(isValidStoreEmail('  zaynahspos@gmail.com  ') === true, 'trims surrounding spaces');

// Invalid: the exact bug value + other non-emails
assert(isValidStoreEmail('adminkey') === false, 'REJECTS "adminkey" (the reported bad value)');
assert(isValidStoreEmail('not an email') === false, 'rejects free text');
assert(isValidStoreEmail('foo@bar') === false, 'rejects missing TLD');
assert(isValidStoreEmail('@bar.com') === false, 'rejects missing local part');
assert(isValidStoreEmail('foo@@bar.com') === false, 'rejects double @');

if (failed) { throw new Error(`ASSERT FAILED: ${failed} assertion(s) failed`); }
console.log(`\nAll ${11} assertions passed.`);
