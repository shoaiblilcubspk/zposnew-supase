import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import {
  createCategory,
  getAllCategories,
} from '../src/lib/services/catalog/categoryRepository.ts';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../src/lib/services/catalog/productRepository.ts';
import {
  handleRemoteProductEvent,
  handleRemoteCategoryEvent,
} from '../src/lib/services/catalog/catalogEventHandlers.ts';

console.log('--- TEST PHASE 09: Catalog & Master Data Services (SQLite + Outbox) ---');

async function run() {
  const db = await initDatabase();

  // 1. Create category
  const cat = await createCategory({ name: 'Denim Jeans', description: 'Premium Denim' }, 'admin_user');
  assert.ok(cat.id);
  assert.strictEqual(cat.name, 'Denim Jeans');

  const categories = await getAllCategories();
  assert.ok(categories.some((c) => c.name === 'Denim Jeans'), 'Category should exist in SQLite');
  console.log('✓ Category created in SQLite and retrieved');

  // 2. Create product
  const prod = await createProduct(
    {
      name: 'Slim Fit Blue Jean',
      barcode: '8901234567890',
      price: 2500,
      cost: 1200,
      stock: 45,
      category: cat.id,
      minStock: 5,
      description: 'Stretch denim',
      taxable: true,
      active: true,
      trackInventory: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'admin_user'
  );

  assert.ok(prod.id);
  assert.strictEqual(prod.name, 'Slim Fit Blue Jean');

  // Verify product in SQLite
  const fetched = await getProductById(prod.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.price, 2500);
  assert.strictEqual(fetched.stock, 45);
  console.log('✓ Product created locally and queried with correct price and stock');

  // Verify outbox event was generated
  const outboxEvt = await db.queryOne(
    `SELECT * FROM sync_outbox WHERE entity_id = ? AND entity_type = 'PRODUCT'`,
    [prod.id]
  );
  assert.ok(outboxEvt, 'Outbox event must be generated for product creation');
  assert.strictEqual(outboxEvt.operation, 'CREATE');
  console.log('✓ Outbox event verified for PRODUCT_CREATED');

  // 3. Update product
  const updated = await updateProduct(prod.id, { price: 2800, stock: 50 }, 'admin_user');
  assert.strictEqual(updated.price, 2800);
  assert.strictEqual(updated.stock, 50);

  const updatedRow = await getProductById(prod.id);
  assert.strictEqual(updatedRow?.price, 2800);
  console.log('✓ Product updated with price 2800');

  // 4. Remote event replication test
  const remoteEvt = {
    event_id: 'evt_remote_prod_001',
    device_id: 'peer_terminal_02',
    sequence: 1,
    entity_type: 'PRODUCT',
    entity_id: 'prod_remote_999',
    operation: 'CREATE',
    payload: JSON.stringify({
      id: 'prod_remote_999',
      name: 'Graphic T-Shirt',
      barcode: '9988776655443',
      retailPrice: 950,
      costPrice: 400,
      stock: 100,
      version: 1,
      active: 1,
    }),
    created_at: Date.now(),
    is_synced: 1,
  };

  await db.transaction(async (tx) => {
    await handleRemoteProductEvent(remoteEvt, tx);
  });

  const replicatedProd = await getProductById('prod_remote_999');
  assert.ok(replicatedProd, 'Replicated product must exist in local SQLite');
  assert.strictEqual(replicatedProd.name, 'Graphic T-Shirt');
  assert.strictEqual(replicatedProd.price, 950);
  console.log('✓ Remote product replication and transaction apply passed');

  // 5. Soft-delete product & tombstone check
  await deleteProduct(prod.id, 'admin_user');
  const deletedCheck = await getProductById(prod.id);
  assert.strictEqual(deletedCheck?.active, false, 'Deleted product active flag must be false');

  const activeProducts = await getAllProducts();
  assert.ok(!activeProducts.some((p) => p.id === prod.id), 'Deleted product must not appear in active product list');

  const tombstone = await db.queryOne(
    `SELECT * FROM tombstones WHERE entity_id = ? AND entity_type = 'PRODUCT'`,
    [prod.id]
  );
  assert.ok(tombstone, 'Tombstone record must be created for deleted product');
  console.log('✓ Soft delete and tombstone recording verified');

  console.log('ALL PHASE 09 CATALOG TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test Phase 09 failed:', err);
  process.exit(1);
});
