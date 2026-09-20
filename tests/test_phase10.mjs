import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import { createProduct, getProductById } from '../src/lib/services/catalog/productRepository.ts';
import { commitStockMovement } from '../src/lib/services/inventory/stockMovementCommit.ts';
import { getProductStockHistory } from '../src/lib/services/inventory/inventoryLedgerRepository.ts';
import { handleRemoteInventoryEvent } from '../src/lib/services/inventory/inventoryEventHandlers.ts';

import { createCategory } from '../src/lib/services/catalog/categoryRepository.ts';

console.log('--- TEST PHASE 10: Inventory Restock & Stock Ledger Services ---');

async function run() {
  const db = await initDatabase();

  const cat = await createCategory({ name: 'Apparel' });

  // 1. Create a product with initial stock 10
  const prod = await createProduct({
    name: 'Cotton Polo Shirt',
    barcode: '7766554433221',
    price: 1800,
    cost: 800,
    stock: 10,
    category: cat.id,
    minStock: 5,
    description: '100% cotton',
    taxable: true,
    active: true,
    trackInventory: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const initialProd = await getProductById(prod.id);
  assert.strictEqual(initialProd?.stock, 10);
  console.log('✓ Initial product created with stock 10');

  // 2. Restock 25 units via commitStockMovement
  const restockRecord = await commitStockMovement({
    productId: prod.id,
    productName: prod.name,
    quantity: 25,
    costPrice: 850,
    type: 'Stock IN',
    supplier: 'Polo Supplier Ltd',
    userId: 'manager_01',
    notes: 'Restock batch #440',
  });

  assert.ok(restockRecord.id);
  const prodAfterRestock = await getProductById(prod.id);
  assert.strictEqual(prodAfterRestock?.stock, 35, 'Stock must be 10 + 25 = 35');
  console.log(`✓ Product stock incremented to ${prodAfterRestock?.stock}`);

  // 3. Verify append-only inventory_transactions ledger
  const history = await getProductStockHistory(prod.id);
  assert.ok(history.length >= 1, 'History must contain restock transaction');
  const latestTx = history[0];
  assert.strictEqual(latestTx.quantity, 25);
  assert.strictEqual(latestTx.balanceAfter, 35);
  assert.strictEqual(latestTx.type, 'INVENTORY_IN');
  assert.strictEqual(latestTx.userId, 'manager_01');
  console.log('✓ Append-only inventory transaction verified with correct balanceAfter: 35');

  // 4. Adjust stock downwards (Damage: -3 units)
  await commitStockMovement({
    productId: prod.id,
    productName: prod.name,
    quantity: -3,
    type: 'Adjustment',
    userId: 'manager_01',
    notes: 'Damaged in transit',
  });

  const prodAfterDamage = await getProductById(prod.id);
  assert.strictEqual(prodAfterDamage?.stock, 32, 'Stock must be 35 - 3 = 32');
  console.log(`✓ Stock adjusted to ${prodAfterDamage?.stock}`);

  // 5. Verify Outbox event generated for P2P replication
  const outboxRecords = await db.query(
    `SELECT * FROM sync_outbox WHERE entity_id = ? AND entity_type = 'INVENTORY'`,
    [prod.id]
  );
  assert.ok(outboxRecords.length >= 2, 'Outbox must contain both stock movements');
  console.log(`✓ Outbox generated ${outboxRecords.length} inventory sync events`);

  // 6. Simulate remote peer receiving INVENTORY event (+15 units from Terminal B)
  const remoteEvt = {
    event_id: 'evt_remote_inv_001',
    device_id: 'terminal_beta',
    sequence: 5,
    entity_type: 'INVENTORY',
    entity_id: prod.id,
    operation: 'UPDATE',
    payload: JSON.stringify({
      productId: prod.id,
      quantity: 15,
      type: 'INVENTORY_IN',
      notes: 'Peer terminal restock',
    }),
    created_at: Date.now(),
    is_synced: 1,
  };

  await db.transaction(async (tx) => {
    await handleRemoteInventoryEvent(remoteEvt, tx);
  });

  const prodAfterRemote = await getProductById(prod.id);
  assert.strictEqual(prodAfterRemote?.stock, 47, 'Stock must be 32 + 15 = 47 after remote delta');
  console.log('✓ Remote peer delta applied additively (32 + 15 = 47)');

  console.log('ALL PHASE 10 INVENTORY TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test Phase 10 failed:', err);
  process.exit(1);
});
