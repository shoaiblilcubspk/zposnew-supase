import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import { createCategory } from '../src/lib/services/catalog/categoryRepository.ts';
import { createProduct, getProductById } from '../src/lib/services/catalog/productRepository.ts';
import { commitLocalSale } from '../src/lib/services/sales/localSaleCommit.ts';
import { getSaleById } from '../src/lib/services/sales/salesRepository.ts';
import { handleRemoteSaleEvent } from '../src/lib/services/sales/salesEventHandlers.ts';

console.log('--- TEST PHASE 11: POS Sales & Checkout Services (Atomic Commit Engine) ---');

async function run() {
  const db = await initDatabase();

  // 1. Setup category & product with stock 20
  const cat = await createCategory({ name: 'Accessories' });
  const prod = await createProduct({
    name: 'Leather Belt Brown',
    barcode: '5544332211009',
    price: 1200,
    cost: 500,
    stock: 20,
    category: cat.id,
    minStock: 2,
    description: 'Genuine leather',
    taxable: true,
    active: true,
    trackInventory: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const initialProd = await getProductById(prod.id);
  assert.strictEqual(initialProd?.stock, 20);
  console.log('✓ Initial product created with stock 20');

  // 2. Ring up a sale of 3 belts
  const sale = await commitLocalSale({
    invoiceNumber: 'INV-TEST-000001',
    cashier: 'cashier_ali',
    subtotal: 3600,
    discountAmount: 100,
    taxAmount: 0,
    total: 3500,
    receivedAmount: 4000,
    changeAmount: 500,
    paymentMethod: 'cash',
    status: 'completed',
    timestamp: new Date(),
    receiptNumber: 'INV-TEST-000001',
    items: [
      {
        product: prod,
        quantity: 3,
        discount: 100,
        discountType: 'fixed',
        subtotal: 3500,
      },
    ],
  });

  assert.ok(sale.id);
  assert.strictEqual(sale.total, 3500);

  // 3. Verify SQLite sales, sale_items, payments records
  const fetchedSale = await getSaleById(sale.id);
  assert.ok(fetchedSale);
  assert.strictEqual(fetchedSale.invoiceNumber, 'INV-TEST-000001');
  assert.strictEqual(fetchedSale.total, 3500);
  assert.strictEqual(fetchedSale.items.length, 1);
  assert.strictEqual(fetchedSale.items[0].quantity, 3);
  console.log('✓ Sale and line items verified in SQLite database');

  // 4. Verify stock decrement: 20 - 3 = 17
  const prodAfterSale = await getProductById(prod.id);
  assert.strictEqual(prodAfterSale?.stock, 17, 'Stock must decrement to 17');
  console.log(`✓ Product stock decremented to ${prodAfterSale?.stock}`);

  // 5. Verify inventory_transactions ledger entry
  const invTx = await db.queryOne(
    `SELECT * FROM inventory_transactions WHERE reference_id = ? AND type = 'INVENTORY_OUT'`,
    [sale.id]
  );
  assert.ok(invTx, 'Inventory OUT ledger row must exist');
  assert.strictEqual(Number(invTx.quantity), -3);
  assert.strictEqual(Number(invTx.balance_after), 17);
  console.log('✓ Append-only inventory OUT ledger entry verified');

  // 6. Verify sync_outbox contains SALE_CREATED event
  const outboxEvt = await db.queryOne(
    `SELECT * FROM sync_outbox WHERE entity_id = ? AND entity_type = 'SALE'`,
    [sale.id]
  );
  assert.ok(outboxEvt, 'Outbox event must exist for SALE_CREATED');
  assert.strictEqual(outboxEvt.operation, 'CREATE');
  console.log('✓ Outbox event verified for P2P replication');

  // 7. Overselling policy test: Sell 20 items when stock is 17 -> stock becomes -3
  await commitLocalSale({
    invoiceNumber: 'INV-TEST-000002',
    cashier: 'cashier_ali',
    subtotal: 24000,
    discountAmount: 0,
    taxAmount: 0,
    total: 24000,
    receivedAmount: 24000,
    changeAmount: 0,
    paymentMethod: 'cash',
    status: 'completed',
    timestamp: new Date(),
    receiptNumber: 'INV-TEST-000002',
    items: [
      {
        product: prod,
        quantity: 20,
        discount: 0,
        discountType: 'fixed',
        subtotal: 24000,
      },
    ],
  });

  const prodAfterOversell = await getProductById(prod.id);
  assert.strictEqual(prodAfterOversell?.stock, -3, 'Oversold stock must become -3 without dropping the bill');
  console.log('✓ Overselling policy verified (stock = -3, zero bills dropped)');

  // 8. Remote peer replication simulation
  const remoteSaleEvt = {
    event_id: 'evt_remote_sale_001',
    device_id: 'terminal_charlie',
    sequence: 12,
    entity_type: 'SALE',
    entity_id: 'sale_remote_999',
    operation: 'CREATE',
    payload: JSON.stringify({
      id: 'sale_remote_999',
      invoiceNumber: 'INV-CHARLIE-00042',
      userId: 'cashier_charlie',
      totalAmount: 1200,
      subtotal: 1200,
      paymentMethod: 'card',
      status: 'completed',
      items: [
        {
          id: 'item_rem_1',
          productId: prod.id,
          name: prod.name,
          quantity: 2,
          unitPrice: 1200,
          totalPrice: 1200,
        },
      ],
    }),
    created_at: Date.now(),
    is_synced: 1,
  };

  await db.transaction(async (tx) => {
    await handleRemoteSaleEvent(remoteSaleEvt, tx);
  });

  const replicatedSale = await getSaleById('sale_remote_999');
  assert.ok(replicatedSale);
  assert.strictEqual(replicatedSale.invoiceNumber, 'INV-CHARLIE-00042');

  const prodAfterRemoteSale = await getProductById(prod.id);
  assert.strictEqual(prodAfterRemoteSale?.stock, -5, 'Remote sale must deduct 2 additional items: -3 - 2 = -5');
  console.log('✓ Remote peer sale replicated and stock deducted additively (-5)');

  console.log('ALL PHASE 11 POS SALES & CHECKOUT TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test Phase 11 failed:', err);
  process.exit(1);
});
