import { initDb } from '../src/lib/db/index.ts';
import { bootstrapAdmin, getActiveStaffUsers, mapDbRowToUser } from '../src/lib/auth/localAuthService.ts';
import { updateUser, getUserById } from '../src/lib/services/users/userRepository.ts';
import { createProduct, updateProduct, getAllProducts, getProductById } from '../src/lib/services/catalog/productRepository.ts';
import { getProductStockHistory } from '../src/lib/services/inventory/inventoryLedgerRepository.ts';

console.log('--- TEST: PRODUCT STOCK PERSISTENCE & OPERATOR AVATAR ---');

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
      shopName: 'Zaynahs POS',
      currency: 'PKR',
      adminName: 'Shoaib',
      adminUsername: 'shoaib',
      adminPin: '1234',
    });

    console.log('\n[1/3] Testing Product Stock Persistence on Create & Refresh...');
    const created = await createProduct({
      name: 'Denim Jeans Slim',
      sku: 'JEA-101',
      price: 2500,
      cost: 1500,
      stock: 50,
      trackInventory: true,
      category: 'Pants',
      taxable: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, admin.id);

    assert(created.stock === 50, 'Created product has stock 50 in memory');

    // Simulate page refresh: reload from SQLite
    const reloadedProducts = await getAllProducts();
    const foundProduct = reloadedProducts.find(p => p.id === created.id);
    assert(foundProduct !== undefined, 'Product found in SQLite after refresh');
    assert(foundProduct?.stock === 50, `Reloaded product stock in SQLite is 50 (Got: ${foundProduct?.stock})`);

    // Verify inventory transactions ledger
    const history = await getProductStockHistory(created.id);
    assert(history.length >= 1, 'Initial inventory ledger transaction exists');
    assert(history[0].type === 'INITIAL', `Ledger transaction type is INITIAL (Got: ${history[0].type})`);
    assert(history[0].quantity === 50, `Ledger transaction quantity is 50 (Got: ${history[0].quantity})`);

    console.log('\n[2/3] Testing Product Stock Update & Ledger Entry...');
    const updated = await updateProduct(created.id, {
      stock: 75,
    }, admin.id);

    assert(updated.stock === 75, 'Updated product returns stock 75');

    // Simulate page refresh: reload from SQLite
    const reloadedAfterUpdate = await getProductById(created.id);
    assert(reloadedAfterUpdate?.stock === 75, `Reloaded product stock in SQLite is 75 after update (Got: ${reloadedAfterUpdate?.stock})`);

    const historyAfterUpdate = await getProductStockHistory(created.id);
    assert(historyAfterUpdate.length >= 2, 'Two inventory transactions recorded');
    assert(historyAfterUpdate[0].type === 'RESTOCK', `Latest ledger transaction is RESTOCK (Got: ${historyAfterUpdate[0].type})`);
    assert(historyAfterUpdate[0].quantity === 25, `Restock quantity is 25 (Got: ${historyAfterUpdate[0].quantity})`);

    console.log('\n[3/3] Testing Operator Avatar Retrieval in SQLite & Staff List...');
    const testAvatarUrl = 'https://pos.local/avatars/shoaib.png';
    await updateUser(admin.id, {
      avatar: testAvatarUrl,
    });

    const staffList = await getActiveStaffUsers();
    const adminStaff = staffList.find(u => u.id === admin.id);
    assert(adminStaff !== undefined, 'Admin found in getActiveStaffUsers');
    assert(adminStaff?.avatar === testAvatarUrl, `Operator avatar retrieved for FastLockModal (Got: ${adminStaff?.avatar})`);

    const reloadedUser = await getUserById(admin.id);
    assert(reloadedUser?.avatar === testAvatarUrl, 'Operator avatar persisted in getUserById');

    const mapped = mapDbRowToUser({
      id: admin.id,
      username: 'shoaib',
      name: 'Shoaib',
      role: 'admin',
      avatar: testAvatarUrl,
      active: 1,
    });
    assert(mapped.avatar === testAvatarUrl, 'mapDbRowToUser maps avatar correctly');

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

run();
