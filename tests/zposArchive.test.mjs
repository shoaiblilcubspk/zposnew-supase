/**
 * .zpos encryption roundtrip: encrypt an export files-map, decrypt it back, and prove a wrong
 * password / tampered ciphertext fails cleanly.
 *
 * Run: npx tsx tests/zposArchive.test.mjs   (or: npm test)
 */

import { encryptArchive, decryptArchive, isZposEnvelope } from '../src/lib/backup/zposArchive.ts';

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };
async function expectThrow(fn, m) { let t = false; try { await fn(); } catch { t = true; } assert(t, m); }

async function main() {
  console.log('.zpos archive encryption');
  const files = {
    'manifest.json': JSON.stringify({ formatVersion: 2, domains: ['products'], files: [] }),
    'data/products.json': JSON.stringify([{ id: 'p1', name: 'jeans' }]),
  };

  const env = await encryptArchive(files, 'secret123');
  assert(isZposEnvelope(env), 'produces a ZPOS_V2 envelope');
  assert(!env.includes('jeans'), 'plaintext is NOT present in the encrypted envelope');

  const back = await decryptArchive(env, 'secret123');
  assert(JSON.parse(back['data/products.json'])[0].name === 'jeans', 'decrypts back to the original files with correct password');

  await expectThrow(() => decryptArchive(env, 'wrongpass'), 'wrong password fails cleanly');

  const tampered = JSON.parse(env);
  tampered.ciphertext = tampered.ciphertext.slice(0, -4) + 'AAAA';
  await expectThrow(() => decryptArchive(JSON.stringify(tampered), 'secret123'), 'tampered ciphertext fails cleanly');

  await expectThrow(() => encryptArchive(files, '1'), 'rejects a too-short password');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
