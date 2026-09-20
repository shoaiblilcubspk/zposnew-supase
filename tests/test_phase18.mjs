import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import { createEncryptedBackup } from '../src/lib/backup/backupEngine.ts';
import { restoreFromBackup } from '../src/lib/backup/restoreEngine.ts';

console.log('--- TEST PHASE 18: Automated Encrypted Backup & Restore Engine ---');

async function run() {
  const db = await initDatabase();
  const now = Date.now();

  // 1. Insert test records
  await db.execute(
    `INSERT OR REPLACE INTO products (
      id, name, sku, cost_price, retail_price, stock, active, created_at, updated_at
    ) VALUES ('prod_bk_1', 'Backup Test Product', 'SKU-BK-1', 500, 1000, 25, 1, ?, ?);`,
    [now, now]
  );
  await db.execute(
    `INSERT OR REPLACE INTO customers (
      id, name, phone, credit_limit, current_balance, active, updated_at
    ) VALUES ('cust_bk_1', 'Backup VIP Customer', '03009998877', 50000, 1200, 1, ?);`,
    [now]
  );
  console.log('✓ Seeded test records into SQLite database');

  // 2. Create Encrypted Backup
  const backupPassword = 'super-secure-store-pass-2026';
  const { archive, jsonString, filename } = await createEncryptedBackup(backupPassword);

  assert.strictEqual(archive.format, 'ZPOS_BACKUP_V1');
  assert.ok(archive.checksum);
  assert.ok(archive.salt);
  assert.ok(archive.iv);
  assert.ok(archive.ciphertext);
  assert.ok(archive.sizeBytes > 0);
  assert.ok(filename.endsWith('.zpos'));
  console.log(`✓ Backup archive generated: ${filename} (${archive.sizeBytes} bytes unencrypted)`);

  // 3. Test Restore with INCORRECT password (Must fail securely)
  let failedAsExpected = false;
  try {
    await restoreFromBackup(jsonString, 'wrong-password-xyz');
  } catch (err) {
    failedAsExpected = true;
    console.log('✓ Decryption rejected incorrect password safely');
  }
  assert.strictEqual(failedAsExpected, true);

  // 4. Simulate catastrophic data loss (Delete all test products and customers)
  await db.execute(`DELETE FROM products WHERE id = 'prod_bk_1';`);
  await db.execute(`DELETE FROM customers WHERE id = 'cust_bk_1';`);

  const deletedProd = await db.queryOne(`SELECT * FROM products WHERE id = 'prod_bk_1';`);
  assert.strictEqual(deletedProd, null);
  console.log('✓ Simulated local data loss: records deleted from SQLite');

  // 5. Restore from Encrypted Backup with CORRECT password
  const restoreResult = await restoreFromBackup(jsonString, backupPassword);
  assert.strictEqual(restoreResult.success, true);
  assert.strictEqual(restoreResult.sizeBytes, archive.sizeBytes);
  console.log('✓ Restore operation completed successfully');

  // 6. Verify restored data in SQLite
  const restoredProd = await db.queryOne(
    `SELECT * FROM products WHERE id = 'prod_bk_1';`
  );
  assert.ok(restoredProd);
  assert.strictEqual(restoredProd.name, 'Backup Test Product');
  assert.strictEqual(Number(restoredProd.stock), 25);

  const restoredCust = await db.queryOne(
    `SELECT * FROM customers WHERE id = 'cust_bk_1';`
  );
  assert.ok(restoredCust);
  assert.strictEqual(restoredCust.name, 'Backup VIP Customer');
  assert.strictEqual(Number(restoredCust.current_balance), 1200);

  // 7. Verify SQLite integrity
  const integrity = await db.queryOne(`PRAGMA integrity_check;`);
  assert.ok(integrity);
  assert.strictEqual(integrity.integrity_check, 'ok');
  console.log('✓ Restored database passed PRAGMA integrity_check = ok');

  console.log('--- ALL PHASE 18 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 18 Test Failed:', err);
  process.exit(1);
});
