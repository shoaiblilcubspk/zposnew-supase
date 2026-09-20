import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import {
  createSupplier,
  getSupplierById,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
} from '../src/lib/services/suppliers/supplierRepository.ts';
import {
  recordSupplierBill,
  recordSupplierPayment,
  getSupplierBalance,
} from '../src/lib/services/suppliers/supplierLedgerCoordinator.ts';
import {
  handleRemoteSupplierEvent,
  handleRemotePurchaseRecordEvent,
} from '../src/lib/services/suppliers/supplierEventHandlers.ts';

console.log('--- TEST PHASE 14: Supplier Directory & Accounts Payable Ledger ---');

async function run() {
  const db = await initDatabase();

  // 1. Create a Supplier
  const supplier = await createSupplier(
    {
      name: 'Al-Madina Fabrics',
      email: 'info@almadina.pk',
      phone: '03211234567',
      address: 'Azam Market, Lahore',
      openingBalance: 5000,
      updatedAt: new Date(),
    },
    'admin_user'
  );

  assert.ok(supplier.id);
  assert.strictEqual(supplier.name, 'Al-Madina Fabrics');
  assert.strictEqual(supplier.openingBalance, 5000);
  console.log('✓ Supplier created locally with initial payable = 5000');

  // 2. Verify in DB
  const fetched = await getSupplierById(supplier.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.openingBalance, 5000);
  console.log('✓ Supplier verified via getSupplierById');

  // 3. Record a new Purchase Bill (+15,000 payable)
  const billId = await recordSupplierBill({
    supplierId: supplier.id,
    amount: 15000,
    note: 'Winter stock bulk delivery',
    userId: 'manager_01',
  });

  assert.ok(billId);
  const balanceAfterBill = await getSupplierBalance(supplier.id);
  assert.strictEqual(balanceAfterBill, 20000);
  console.log(`✓ Supplier balance after 15,000 bill: ${balanceAfterBill} (Expected: 20000)`);

  // Verify purchase_records entry
  const purchaseRecord = await db.queryOne(
    `SELECT * FROM purchase_records WHERE id = ?;`,
    [billId]
  );
  assert.ok(purchaseRecord);
  assert.strictEqual(Number(purchaseRecord.total_amount), 15000);
  console.log('✓ Purchase record created in SQLite');

  // 4. Record a Supplier Payment (-8,000 payment voucher)
  const paymentId = await recordSupplierPayment({
    supplierId: supplier.id,
    amount: 8000,
    paymentMode: 'cash',
    note: 'Partial cash payment against invoice',
    userId: 'admin_user',
  });

  assert.ok(paymentId);
  const balanceAfterPayment = await getSupplierBalance(supplier.id);
  assert.strictEqual(balanceAfterPayment, 12000);
  console.log(`✓ Supplier balance after 8,000 payment: ${balanceAfterPayment} (Expected: 12000)`);

  // Verify payments table record (cash outflow recorded as -8000)
  const paymentRow = await db.queryOne(
    `SELECT * FROM payments WHERE id = ?;`,
    [paymentId]
  );
  assert.ok(paymentRow);
  assert.strictEqual(Number(paymentRow.amount), -8000);
  console.log('✓ Cash outflow voucher recorded in payments table');

  // 5. Verify Outbox Events
  const supplierEvents = await db.query(
    `SELECT * FROM sync_outbox WHERE entity_type IN ('SUPPLIER', 'PURCHASE_RECORD', 'PAYMENT_MODE') ORDER BY created_at ASC;`
  );
  assert.ok(supplierEvents.length >= 3);
  console.log(`✓ Outbox events logged for supplier operations: ${supplierEvents.length} events found`);

  // 6. Test Remote Supplier Event Handler (Peer Sync)
  const remoteSupplierId = 'sup_remote_999';
  await db.transaction(async (tx) => {
    await handleRemoteSupplierEvent(
      {
        id: 'evt_rem_sup_1',
        device_id: 'peer_terminal_2',
        entity_type: 'SUPPLIER',
        entity_id: remoteSupplierId,
        operation: 'CREATE',
        payload: JSON.stringify({
          id: remoteSupplierId,
          name: 'Peer Mills Ltd',
          phone: '03450001122',
          email: 'peer@mills.pk',
          address: 'Faisalabad Industrial Area',
          balance: 25000,
          active: 1,
        }),
        timestamp: Date.now(),
        sequence: 1,
      },
      tx
    );
  });

  const remoteSupplier = await getSupplierById(remoteSupplierId);
  assert.ok(remoteSupplier);
  assert.strictEqual(remoteSupplier.name, 'Peer Mills Ltd');
  assert.strictEqual(remoteSupplier.openingBalance, 25000);
  console.log('✓ Remote SUPPLIER event handled and committed to local SQLite');

  // 7. Test Remote Purchase Record Event (Additive Payable)
  const remoteBillId = 'bill_remote_888';
  await db.transaction(async (tx) => {
    await handleRemotePurchaseRecordEvent(
      {
        id: 'evt_rem_pur_1',
        device_id: 'peer_terminal_2',
        entity_type: 'PURCHASE_RECORD',
        entity_id: remoteBillId,
        operation: 'CREATE',
        payload: JSON.stringify({
          id: remoteBillId,
          supplierId: remoteSupplierId,
          amount: 5000,
        }),
        timestamp: Date.now(),
        sequence: 2,
      },
      tx
    );
  });

  const remoteBalanceAfter = await getSupplierBalance(remoteSupplierId);
  assert.strictEqual(remoteBalanceAfter, 30000);
  console.log(`✓ Remote PURCHASE_RECORD handled, balance incremented additively to: ${remoteBalanceAfter}`);

  console.log('--- ALL PHASE 14 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 14 Test Failed:', err);
  process.exit(1);
});
