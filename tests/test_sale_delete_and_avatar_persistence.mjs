import { initDb } from '../src/lib/db/index.ts';
import { bootstrapAdmin } from '../src/lib/auth/localAuthService.ts';
import { updateUser, getUserById } from '../src/lib/services/users/userRepository.ts';
import { createSale } from '../src/lib/services/saleCreate.ts';
import { deleteSale } from '../src/lib/services/saleDelete.ts';
import { getAllSales, searchSales } from '../src/lib/services/saleQueries.ts';
import { getRecentSales } from '../src/lib/services/sales/salesRepository.ts';

console.log('--- TEST: SALE DELETE & AVATAR PERSISTENCE ---');

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

    // 1. Setup Admin
    const { user: admin } = await bootstrapAdmin({
      shopName: 'Persistence Test Shop',
      currency: 'PKR',
      adminName: 'Shoaib Admin',
      adminUsername: 'shoaib',
      adminPin: '1234',
    });

    // 2. Test User Avatar & Email Persistence in SQLite
    console.log('\n[1/2] Testing User Avatar & Email Persistence in SQLite...');
    const testAvatar = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
    const testEmail = 'shoaib@pos.local';

    await updateUser(admin.id, {
      avatar: testAvatar,
      email: testEmail,
    });

    const reloadedUser = await getUserById(admin.id);
    assert(reloadedUser !== null, 'User found in database');
    assert(reloadedUser?.avatar === testAvatar, 'User avatar persisted in local SQLite');
    assert(reloadedUser?.email === testEmail, 'User email persisted in local SQLite');

    // 3. Test Sale Creation and Deletion
    console.log('\n[2/2] Testing Sale Deletion (Must NEVER reappear on reload)...');
    const createdSale = await createSale({
      invoiceNumber: 'INV-TEST-001',
      total: 1500,
      subtotal: 1500,
      paymentMethod: 'cash',
      items: [],
    });

    assert(createdSale.id, 'Sale created successfully');

    let allBefore = await getAllSales();
    assert(allBefore.some(s => s.id === createdSale.id), 'Sale visible before deletion');

    // Delete sale
    await deleteSale(createdSale.id, 'Shoaib Admin');

    // Verify sale is gone from all queries
    const allAfter = await getAllSales();
    assert(!allAfter.some(s => s.id === createdSale.id), 'Deleted sale excluded from getAllSales()');

    const searchAfter = await searchSales({});
    assert(!searchAfter.some(s => s.id === createdSale.id), 'Deleted sale excluded from searchSales()');

    const recentAfter = await getRecentSales(50);
    assert(!recentAfter.some(s => s.id === createdSale.id), 'Deleted sale excluded from getRecentSales()');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

run();
