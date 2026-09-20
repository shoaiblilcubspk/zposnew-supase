import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import { createCategory } from '../src/lib/services/catalog/categoryRepository.ts';
import { createProduct, getProductById } from '../src/lib/services/catalog/productRepository.ts';
import { commitLocalSale } from '../src/lib/services/sales/localSaleCommit.ts';
import { getSaleById } from '../src/lib/services/sales/salesRepository.ts';
import { processSaleRefund } from '../src/lib/services/sales/refundCoordinator.ts';
import { voidSale } from '../src/lib/services/sales/saleEditCoordinator.ts';
import {
  handleRemoteSaleRefundEvent,
  handleRemoteSaleVoidEvent,
} from '../src/lib/services/sales/reversalEventHandlers.ts';

console.log('--- TEST PHASE 12: Returns, Refunds, Void & Sale Edit Services ---');

async function run() {
  const db = await initDatabase();

  // 1. Setup category & product with stock 50
  const cat = await createCategory({ name: 'Footwear' });
  const prod = await createProduct({
    name: 'Running Shoes Black',
    barcode: '4433221100998',
    price: 3000,
    cost: 1500,
    stock: 50,
    category: cat.id,
    minStock: 5,
    description: 'Lightweight trainers',
    taxable: true,
    active: true,
    trackInventory: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 2. Ring up a sale of 5 pairs (50 -> 45)
  const sale = await commitLocalSale({
    invoiceNumber: 'INV-TEST-REFUND-01',
    cashier: 'cashier_01',
    subtotal: 15000,
    discountAmount: 0,
    taxAmount: 0,
    total: 15000,
    receivedAmount: 15000,
    changeAmount: 0,
    paymentMethod: 'cash',
    status: 'completed',
    timestamp: new Date(),
    receiptNumber: 'INV-TEST-REFUND-01',
    items: [
      {
        product: prod,
        quantity: 5,
        discount: 0,
        discountType: 'fixed',
        subtotal: 15000,
      },
    ],
  });

  const prodAfterSale = await getProductById(prod.id);
  assert.strictEqual(prodAfterSale?.stock, 45, 'Stock should be 45 after sale');
  console.log('✓ Sale created, product stock decremented to 45');

  // 3. Partial Refund of 2 pairs (45 -> 47)
  const refundSuccess = await processSaleRefund(
    sale.id,
    {
      type: 'partial',
      items: [{ index: 0, productId: prod.id, qty: 2, refundAmount: 6000 }],
      totalRefundAmount: 6000,
    },
    'supervisor_01'
  );
  assert.ok(refundSuccess);

  const saleAfterRefund = await getSaleById(sale.id);
  assert.strictEqual(saleAfterRefund?.refundedAmount, 6000);
  assert.strictEqual(saleAfterRefund?.status, 'partially_refunded');

  const prodAfterRefund = await getProductById(prod.id);
  assert.strictEqual(prodAfterRefund?.stock, 47, 'Stock must restore to 47 after 2 items returned');
  console.log('✓ Partial refund processed: refundedAmount = 6000, stock restored to 47');

  // 4. Verify inventory_transactions RETURN row
  const returnTx = await db.queryOne(
    `SELECT * FROM inventory_transactions WHERE reference_id = ? AND type = 'RETURN'`,
    [sale.id]
  );
  assert.ok(returnTx, 'Return transaction ledger row must exist');
  assert.strictEqual(Number(returnTx.quantity), 2);
  assert.strictEqual(Number(returnTx.balance_after), 47);
  console.log('✓ Append-only RETURN ledger entry verified with restored balance 47');

  // 5. Test Voiding a sale (Sell 2 items, then void sale)
  const sale2 = await commitLocalSale({
    invoiceNumber: 'INV-TEST-VOID-01',
    cashier: 'cashier_01',
    subtotal: 6000,
    discountAmount: 0,
    taxAmount: 0,
    total: 6000,
    paymentMethod: 'cash',
    status: 'completed',
    timestamp: new Date(),
    receiptNumber: 'INV-TEST-VOID-01',
    items: [
      {
        product: prod,
        quantity: 2,
        discount: 0,
        discountType: 'fixed',
        subtotal: 6000,
      },
    ],
  });

  const prodAfterSale2 = await getProductById(prod.id);
  assert.strictEqual(prodAfterSale2?.stock, 45, 'Stock should be 47 - 2 = 45');

  await voidSale(sale2.id, 'Wrong order entered', 'supervisor_01');
  const sale2Voided = await getSaleById(sale2.id);
  assert.strictEqual(sale2Voided?.status, 'void');

  const prodAfterVoid = await getProductById(prod.id);
  assert.strictEqual(prodAfterVoid?.stock, 47, 'Stock should restore back to 47 after void');
  console.log('✓ Void sale processed: status = void, stock restored back to 47');

  // 6. Remote event replication test for refund
  const remoteRefundEvt = {
    event_id: 'evt_remote_ref_001',
    device_id: 'terminal_charlie',
    sequence: 20,
    entity_type: 'SALE_REFUNDED',
    entity_id: sale.id,
    operation: 'UPDATE',
    payload: JSON.stringify({
      saleId: sale.id,
      newRefundedTotal: 15000,
      newStatus: 'refunded',
      returnItems: [{ productId: prod.id, qty: 3, refundPrice: 9000 }],
    }),
    created_at: Date.now(),
    is_synced: 1,
  };

  await db.transaction(async (tx) => {
    await handleRemoteSaleRefundEvent(remoteRefundEvt, tx);
  });

  const prodAfterRemoteRefund = await getProductById(prod.id);
  assert.strictEqual(prodAfterRemoteRefund?.stock, 50, 'Stock must restore 3 more items: 47 + 3 = 50');
  console.log('✓ Remote peer refund replicated and local stock restored back to 50');

  console.log('ALL PHASE 12 RETURNS & REFUNDS TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test Phase 12 failed:', err);
  process.exit(1);
});
