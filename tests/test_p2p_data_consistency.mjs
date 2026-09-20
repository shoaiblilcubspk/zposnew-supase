import { initDb, getDatabase, TABLES } from '../src/lib/db/index.ts';
import { handleRemoteProductEvent } from '../src/lib/services/catalog/catalogEventHandlers.ts';
import { handleRemoteSaleEvent } from '../src/lib/services/sales/salesEventHandlers.ts';
import { handleRemoteSaleVoidEvent } from '../src/lib/services/sales/reversalEventHandlers.ts';
import { getNextInvoiceNumber, generateNextInvoiceNumber } from '../src/lib/services/utils.ts';
import { applyEventBatch } from '../src/lib/sync/eventBatchApplier.ts';

console.log('--- TEST: P2P DATA CONSISTENCY & INVENTORY LEDGER INVARIANTS ---');

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
    const db = await getDatabase();

    // ----------------------------------------------------
    // TEST 1: Product Initial Stock in Ledger
    // ----------------------------------------------------
    console.log('\n[1/5] Testing Remote Product Initial Stock in Ledger...');
    const productId = 'prod_jeans_101';
    await db.transaction(async (tx) => {
      await handleRemoteProductEvent(
        {
          event_id: 'evt_prod_101',
          device_id: 'TERM-A',
          sequence: 1,
          entity_type: 'PRODUCT',
          entity_id: productId,
          operation: 'CREATE',
          payload: JSON.stringify({
            id: productId,
            name: 'Denim Slim Jeans',
            stock: 100,
            initialStock: 100,
            retailPrice: 2500,
            costPrice: 1500,
            trackInventory: true,
          }),
          created_at: Date.now(),
          is_synced: 1,
        },
        tx
      );
    });

    const prod1 = await db.queryOne(
      `SELECT stock FROM ${TABLES.PRODUCTS} WHERE id = ?;`,
      [productId]
    );
    assert(Number(prod1?.stock) === 100, 'Product stock is 100 in SQLite');

    const itxList = await db.query(
      `SELECT * FROM ${TABLES.INVENTORY_TRANSACTIONS} WHERE product_id = ?;`,
      [productId]
    );
    assert(itxList.length === 1, 'Initial inventory transaction created');
    assert(itxList[0].type === 'INITIAL', 'Transaction type is INITIAL');
    assert(Number(itxList[0].quantity) === 100, 'Initial transaction quantity is 100');

    // ----------------------------------------------------
    // TEST 2: Remote Sale Deducts Stock via Ledger
    // ----------------------------------------------------
    console.log('\n[2/5] Testing Remote Sale Ledger Deduction...');
    const saleEvent = {
      event_id: 'evt_sale_101',
      device_id: 'TERM-B',
      sequence: 2,
      entity_type: 'SALE',
      entity_id: 'sale_101',
      operation: 'CREATE',
      payload: JSON.stringify({
        id: 'sale_101',
        invoiceNumber: 'INV-TB01-000001',
        totalAmount: 12500,
        paymentMethod: 'cash',
        status: 'completed',
        items: [
          {
            id: 'item_101',
            productId,
            name: 'Denim Slim Jeans',
            quantity: 5,
            unitPrice: 2500,
            totalPrice: 12500,
          },
        ],
      }),
      created_at: Date.now(),
      is_synced: 1,
    };

    await db.transaction(async (tx) => {
      await handleRemoteSaleEvent(saleEvent, tx);
    });

    let prod2 = await db.queryOne(
      `SELECT stock FROM ${TABLES.PRODUCTS} WHERE id = ?;`,
      [productId]
    );
    assert(Number(prod2?.stock) === 95, 'Product stock reduced from 100 to 95');

    // ----------------------------------------------------
    // TEST 3: Idempotent Sale Re-Arrival
    // ----------------------------------------------------
    console.log('\n[3/5] Testing Idempotency on Duplicate Event Arrival...');
    await db.transaction(async (tx) => {
      await handleRemoteSaleEvent(saleEvent, tx);
    });

    let prod3 = await db.queryOne(
      `SELECT stock FROM ${TABLES.PRODUCTS} WHERE id = ?;`,
      [productId]
    );
    assert(Number(prod3?.stock) === 95, 'Duplicate sale event ignored, stock remains 95 (no double decrement)');

    // ----------------------------------------------------
    // TEST 4: Sale Voiding & Stock Restoration
    // ----------------------------------------------------
    console.log('\n[4/5] Testing Sale Voiding & Symmetric Stock Restoration...');
    await db.transaction(async (tx) => {
      await handleRemoteSaleVoidEvent(
        {
          event_id: 'evt_void_101',
          device_id: 'TERM-B',
          sequence: 3,
          entity_type: 'SALE',
          entity_id: 'sale_101',
          operation: 'UPDATE',
          payload: JSON.stringify({
            saleId: 'sale_101',
            eventType: 'SALE_VOIDED',
            status: 'void',
          }),
          created_at: Date.now(),
          is_synced: 1,
        },
        tx
      );
    });

    let prod4 = await db.queryOne(
      `SELECT stock FROM ${TABLES.PRODUCTS} WHERE id = ?;`,
      [productId]
    );
    assert(Number(prod4?.stock) === 100, 'Sale void restored stock back to exact original 100');

    const voidedSale = await db.queryOne(
      `SELECT status FROM ${TABLES.SALES} WHERE id = ?;`,
      ['sale_101']
    );
    assert(voidedSale?.status === 'void', 'Sale status is void in SQLite');

    // ----------------------------------------------------
    // TEST 5: Collision-Free Invoice Numbering
    // ----------------------------------------------------
    console.log('\n[5/5] Testing Collision-Free Distributed Invoicing...');
    const settings = { invoicePrefix: 'INV', invoiceCounter: 12 };
    const invNumber = getNextInvoiceNumber(settings);
    const genResult = generateNextInvoiceNumber(settings);

    assert(/^INV-[A-Z0-9]+-000013$/.test(invNumber), `Invoice number matches pattern: ${invNumber}`);
    assert(genResult.newCounter === 13, 'Invoice counter incremented correctly');
    assert(/^INV-[A-Z0-9]+-000013$/.test(genResult.invoiceNumber), `Generated invoice: ${genResult.invoiceNumber}`);

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

run();
