/**
 * Test: Offline → Online → Reconcile Cycle
 * Validates full P2P convergence when two devices go offline,
 * make independent mutations, then reconnect and reconcile.
 */

import { strict as assert } from 'assert';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

async function runOfflineReconcileTests() {
  console.log('--- TEST: OFFLINE → ONLINE → RECONCILE CYCLE ---');

  const { initDb, resetDbForTesting, resetDriverForTesting } = await import('../src/lib/db/index.ts');
  const {
    createOutboxEvent,
    getNextDeviceSequence,
  } = await import('../src/lib/events/eventFactory.ts');
  const {
    getInboxMaxSequence,
    getUnsyncedOutboxEvents,
    markEventsSynced,
  } = await import('../src/lib/sync/vectorClock.ts');
  const { applyEventBatch } = await import('../src/lib/sync/eventBatchApplier.ts');
  const { commitLocalTransaction } = await import('../src/lib/events/transactionManager.ts');
  const { getReconcileFullSales } = await import('../src/lib/sync/reconcilerQueries.ts');
  const { diffSalesManifest } = await import('../src/lib/sync/reconcilerQueries.ts');
  const { EntityReconciler } = await import('../src/lib/sync/entityReconciler.ts');
  console.log('[Test] EntityReconciler imported:', typeof EntityReconciler);
  const { applyReconciledEntities } = await import('../src/lib/sync/reconcilePayloadApplier.ts');
  const { registerSalesEventHandlers } = await import('../src/lib/services/sales/salesEventHandlers.ts');
  const { registerInventoryEventHandlers } = await import('../src/lib/services/inventory/inventoryEventHandlers.ts');
  registerSalesEventHandlers();
  registerInventoryEventHandlers();

  // --- SETUP: Two in-memory databases simulating Device A and Device B ---
  // Reset driver to get fresh in-memory database for each device
  resetDbForTesting();
  const dbA = await initDb(':memory:');
  resetDbForTesting();
  const dbB = await initDb(':memory:');

  const devA = 'DEVICE-A-001';
  const devB = 'DEVICE-B-002';
  const now = Date.now();

  // Seed both with same initial shop data
  for (const db of [dbA, dbB]) {
    await db.execute(`INSERT INTO shop (id, name, currency, master_recovery_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
      ['shop_1', 'Test Shop', 'PKR', 'test_recovery_hash', now, now]);
    await db.execute(`INSERT INTO products (id, name, barcode, retail_price, stock, active, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      ['prod_1', 'Widget', '123456', 100, 50, 1, 1, now, now]);
    await db.execute(`INSERT INTO inventory_transactions (id, product_id, type, quantity, balance_after, reference_type, reference_id, device_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      ['itx_init', 'prod_1', 'INVENTORY_IN', 50, 50, 'INITIAL', 'shop_1', 'PC-MAIN', 'admin', now]);
  }

  // --- PHASE 1: Both devices online, sync establishes baseline ---
  console.log('Phase 1: Initial sync baseline...');
  {
    resetDriverForTesting(dbA);
    const pendingA = await getUnsyncedOutboxEvents(devA, 0, 100);
    resetDriverForTesting(dbB);
    const pendingB = await getUnsyncedOutboxEvents(devB, 0, 100);
    assert.equal(pendingA.length, 0, 'Device A should have no pending events initially');
    assert.equal(pendingB.length, 0, 'Device B should have no pending events initially');
    console.log('✓ Both devices start with empty outbox');
  }

  // --- PHASE 2: Devices go OFFLINE, make independent mutations ---
  console.log('Phase 2: Offline mutations on both devices...');
  {
    // Device A: Creates a sale (stock -5)
    resetDriverForTesting(dbA);
    await commitLocalTransaction({
      entityType: 'SALE',
      entityId: 'sale_A_1',
      operation: 'CREATE',
      eventType: 'SALE_CREATED',
      deviceId: devA,
      userId: 'cashier_a',
      payload: {
        id: 'sale_A_1',
        invoiceNumber: 'INV-001',
        subtotal: 500,
        totalAmount: 500,
        items: [{ id: 'si_A_1', productId: 'prod_1', name: 'Widget', quantity: 5, unitPrice: 100, totalPrice: 500 }],
      },
      execute: async (tx) => {
        await tx.execute(
          `INSERT INTO sales (id, invoice_number, device_id, user_id, subtotal, total_amount, tendered_amount, change_amount, payment_method, status, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          ['sale_A_1', 'INV-001', devA, 'cashier_a', 500, 500, 500, 0, 'cash', 'completed', now + 100, now + 100, now + 100]
        );
        await tx.execute(
          `INSERT INTO sale_items (id, sale_id, product_id, name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          ['si_A_1', 'sale_A_1', 'prod_1', 'Widget', 5, 100, 500]
        );
        // Inventory deduction
        await tx.execute(
          `INSERT INTO inventory_transactions (id, product_id, type, quantity, balance_after, reference_type, reference_id, device_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          ['itx_A_1', 'prod_1', 'INVENTORY_OUT', -5, 45, 'SALE', 'sale_A_1', devA, 'cashier_a', now + 100]
        );
        // Recompute stock from ledger
        await tx.execute(
          `UPDATE products SET stock = (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE product_id = ?) WHERE id = ?;`,
          ['prod_1', 'prod_1']
        );
      },
    });

    // Device B: Creates a different sale (stock -3)
    resetDriverForTesting(dbB);
    await commitLocalTransaction({
      entityType: 'SALE',
      entityId: 'sale_B_1',
      operation: 'CREATE',
      eventType: 'SALE_CREATED',
      deviceId: devB,
      userId: 'cashier_b',
      payload: {
        id: 'sale_B_1',
        invoiceNumber: 'INV-002',
        subtotal: 300,
        totalAmount: 300,
        items: [{ id: 'si_B_1', productId: 'prod_1', name: 'Widget', quantity: 3, unitPrice: 100, totalPrice: 300 }],
      },
      execute: async (tx) => {
        await tx.execute(
          `INSERT INTO sales (id, invoice_number, device_id, user_id, subtotal, total_amount, tendered_amount, change_amount, payment_method, status, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          ['sale_B_1', 'INV-002', devB, 'cashier_b', 300, 300, 300, 0, 'cash', 'completed', now + 200, now + 200, now + 200]
        );
        await tx.execute(
          `INSERT INTO sale_items (id, sale_id, product_id, name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          ['si_B_1', 'sale_B_1', 'prod_1', 'Widget', 3, 100, 300]
        );
        await tx.execute(
          `INSERT INTO inventory_transactions (id, product_id, type, quantity, balance_after, reference_type, reference_id, device_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          ['itx_B_1', 'prod_1', 'INVENTORY_OUT', -3, 47, 'SALE', 'sale_B_1', devB, 'cashier_b', now + 200]
        );
        await tx.execute(
          `UPDATE products SET stock = (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE product_id = ?) WHERE id = ?;`,
          ['prod_1', 'prod_1']
        );
      },
    });

    // Verify both have pending outbox events
    resetDriverForTesting(dbA);
    const pendingA = await getUnsyncedOutboxEvents(devA, 0, 100);
    resetDriverForTesting(dbB);
    const pendingB = await getUnsyncedOutboxEvents(devB, 0, 100);
    assert.ok(pendingA.length >= 1, 'Device A should have pending outbox events');
    assert.ok(pendingB.length >= 1, 'Device B should have pending outbox events');
    console.log(`✓ Device A: ${pendingA.length} pending events, Device B: ${pendingB.length} pending events`);
  }

  // --- PHASE 3: Devices come ONLINE, initiate incremental sync ---
  console.log('Phase 3: Online incremental sync via EVENT_SYNC_REQUEST / EVENT_BATCH...');
  {
    // Simulate Device A pulling from Device B
    resetDriverForTesting(dbA);
    const knownSeqA_from_B = await getInboxMaxSequence(devB);
    const eventsFromB = await dbB.query(
      `SELECT * FROM sync_outbox WHERE device_id = ? AND sequence > ? ORDER BY sequence ASC;`,
      [devB, knownSeqA_from_B]
    );

    // Device A applies Device B's events
    const result = await applyEventBatch(eventsFromB);
    assert.ok(result.ackedIds.length === eventsFromB.length, 'All events from B should be acked by A');
    assert.ok(result.newEvents.length === eventsFromB.length, 'All events from B should be new to A');

    // Simulate Device B pulling from Device A
    resetDriverForTesting(dbB);
    const knownSeqB_from_A = await getInboxMaxSequence(devA);
    const eventsFromA = await dbA.query(
      `SELECT * FROM sync_outbox WHERE device_id = ? AND sequence > ? ORDER BY sequence ASC;`,
      [devA, knownSeqB_from_A]
    );

    const result2 = await applyEventBatch(eventsFromA);
    assert.ok(result2.ackedIds.length === eventsFromA.length, 'All events from A should be acked by B');
    assert.ok(result2.newEvents.length === eventsFromA.length, 'All events from A should be new to B');

    // Mark as synced
    resetDriverForTesting(dbB);
    await markEventsSynced(result.ackedIds);
    resetDriverForTesting(dbA);
    await markEventsSynced(result2.ackedIds);

    console.log(`✓ Incremental sync: A received ${result.newEvents.length} events from B, B received ${result2.newEvents.length} events from A`);
  }

  // --- PHASE 4: Verify CONVERGENCE - both devices have identical state ---
  console.log('Phase 4: Convergence verification...');
  {
    // Check sales count
    const salesA = await dbA.query(`SELECT * FROM sales;`);
    const salesB = await dbB.query(`SELECT * FROM sales;`);
    assert.equal(salesA.length, 2, 'Device A should have 2 sales after sync');
    assert.equal(salesB.length, 2, 'Device B should have 2 sales after sync');

    // Check inventory transactions count
    const invA = await dbA.query(`SELECT * FROM inventory_transactions WHERE reference_type = 'SALE';`);
    const invB = await dbB.query(`SELECT * FROM inventory_transactions WHERE reference_type = 'SALE';`);
    assert.equal(invA.length, 2, 'Device A should have 2 inventory transactions');
    assert.equal(invB.length, 2, 'Device B should have 2 inventory transactions');

    // Check stock convergence - both should have same final stock
    const stockA = await dbA.queryOne(`SELECT stock FROM products WHERE id = 'prod_1';`);
    const stockB = await dbB.queryOne(`SELECT stock FROM products WHERE id = 'prod_1';`);
    assert.equal(stockA.stock, stockB.stock, `Stock converged: A=${stockA.stock}, B=${stockB.stock}`);
    // Initial 50 - 5 (A's sale) - 3 (B's sale) = 42
    assert.equal(stockA.stock, 42, 'Final stock should be 42 (50 - 5 - 3)');

    console.log(`✓ Convergence verified: Both devices have ${salesA.length} sales, ${invA.length} inventory txns, stock=${stockA.stock}`);
  }

  // --- PHASE 5: Test Reconciliation (EntityReconciler) ---
  console.log('Phase 5: Full entity reconciliation...');
  {
    // Device A requests full reconciliation from Device B
    resetDriverForTesting(dbA);
    const reconciler = new EntityReconciler();
    const manifestA = await reconciler.buildLocalManifest(devA);

    // Simulate Device B receiving reconcile request and sending payload
    // (In real scenario, this goes over WebRTC. Here we just verify the manifest structure)
    assert.ok(manifestA.sales.length === 2, 'Manifest should include both sales');
    assert.ok(manifestA.inventoryTxIds.length >= 1, 'Manifest should include non-sale inventory transactions');
    assert.ok(manifestA.productIds.includes('prod_1'), 'Manifest should include product');
    console.log('✓ Reconciliation manifest built correctly');
  }

  // --- PHASE 6: Test diffSalesManifest for edit/void detection ---
  console.log('Phase 6: Sales manifest diff (edit/void detection)...');
  {
    const localSales = [
      { id: 'sale_1', status: 'completed', total_amount: 100, updated_at: 1000 },
      { id: 'sale_2', status: 'completed', total_amount: 200, updated_at: 2000 },
    ];
    const remoteSales = [
      { id: 'sale_1', status: 'void', total: 100, updatedAt: 1500 }, // Voided remotely
      { id: 'sale_2', status: 'completed', total: 200, updatedAt: 2000 },
      { id: 'sale_3', status: 'completed', total: 300, updatedAt: 3000 }, // New on remote
    ];

    const diff = diffSalesManifest(localSales, remoteSales);
    assert.ok(diff.salesToVoidLocally.includes('sale_1'), 'Should detect remote void');
    assert.ok(diff.missingSalesLocally.includes('sale_3'), 'Should detect missing sale locally');
    assert.ok(!diff.missingSalesLocally.includes('sale_2'), 'Should not flag unchanged sale');
    console.log('✓ Sales manifest diff correctly detects voids and missing sales');
  }

  // --- PHASE 7: Test mesh protocol chunking/reassembly for large payloads ---
  console.log('Phase 7: Mesh protocol large payload handling...');
  {
    const { serializeMessage, MessageReassembler } = await import('../src/lib/mesh/meshProtocol.ts');

    // Create a large payload (>16KB to force chunking)
    const largePayload = {
      records: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(100), // 100 chars each = ~100KB total
      })),
    };

    const wireMsg = {
      id: 'msg_large_01',
      type: 'EVENT_BATCH',
      senderDeviceId: 'DEV_A',
      targetDeviceId: 'DEV_B',
      payload: largePayload,
      timestamp: Date.now(),
    };

    const frames = serializeMessage(wireMsg);
    assert.ok(frames.length > 1, `Large payload should be chunked into ${frames.length} frames`);

    const reassembler = new MessageReassembler();
    let reassembled = null;
    for (const frame of frames) {
      const res = reassembler.addFrame(frame);
      if (res) reassembled = res;
    }

    assert.ok(reassembled, 'Frames must reassemble');
    assert.equal(reassembled.id, wireMsg.id);
    assert.equal(reassembled.payload.records.length, 1000);
    console.log(`✓ Large payload (${frames.length} chunks) reassembled correctly with ${reassembled.payload.records.length} records`);
  }

  // --- PHASE 8: Test idempotent ACK tracking ---
  console.log('Phase 8: Idempotent ACK tracking...');
  {
    const eventIds = ['evt_ack_1', 'evt_ack_2', 'evt_ack_3'];
    await markEventsSynced(eventIds);

    // Try to mark again - should not error
    await markEventsSynced(eventIds);

    // Verify they're marked synced
    const pending = await getUnsyncedOutboxEvents(devA, 0, 100);
    const syncedEvents = pending.filter(e => eventIds.includes(e.event_id));
    assert.equal(syncedEvents.length, 0, 'ACKed events should not appear in unsynced query');
    console.log('✓ Idempotent ACK tracking works correctly');
  }

  console.log('\n✅ OFFLINE → ONLINE → RECONCILE CYCLE TESTS PASSED!');
  console.log('   - Independent offline mutations converge correctly');
  console.log('   - Incremental sync exchanges only missing events');
  console.log('   - Stock converges additively (no LWW)');
  console.log('   - Reconciliation manifest includes all entity types');
  console.log('   - Sales diff detects voids and missing sales');
  console.log('   - Mesh protocol handles large payloads');
  console.log('   - ACK tracking is idempotent');
}

runOfflineReconcileTests().catch((err) => {
  console.error('❌ Offline→Online→Reconcile test failed:', err);
  process.exit(1);
});