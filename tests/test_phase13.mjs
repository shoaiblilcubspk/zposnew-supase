import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import {
  createCustomer,
  getCustomerById,
} from '../src/lib/services/customers/customerRepository.ts';
import {
  receiveCustomerPayment,
  getCustomerLedgerHistory,
} from '../src/lib/services/customers/customerLedgerRepository.ts';
import {
  handleRemoteCustomerEvent,
  handleRemoteCustomerLedgerEvent,
} from '../src/lib/services/customers/customerEventHandlers.ts';

console.log('--- TEST PHASE 13: Customer Directory & Customer Ledger Services ---');

async function run() {
  const db = await initDatabase();

  // 1. Create a customer with credit limit 10,000 and initial balance 0
  const cust = await createCustomer(
    {
      name: 'Muhammad Usman',
      phone: '03001234567',
      email: 'usman@example.com',
      address: 'Shop 42, Liberty Market',
      priceTier: 'retail',
      totalPurchases: 0,
      balance: 0,
      creditLimit: 10000,
      creditUsed: 0,
      allowCredit: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'admin_user'
  );

  assert.ok(cust.id);
  assert.strictEqual(cust.name, 'Muhammad Usman');
  assert.strictEqual(cust.balance, 0);
  console.log('✓ Customer created locally with balance = 0');

  // 2. Simulate Udhar / Credit sale (+3500 debit)
  await db.execute(
    `UPDATE customers SET current_balance = current_balance + 3500, updated_at = ? WHERE id = ?;`,
    [Date.now(), cust.id]
  );
  await db.execute(
    `INSERT INTO customer_ledger (
      id, customer_id, type, amount, balance_after, sale_id, payment_mode, notes, created_at
    ) VALUES (?, ?, 'sale', 3500, 3500, 'sale_test_01', 'credit', 'Sale on credit', ?);`,
    ['leg_01', cust.id, Date.now()]
  );

  const custAfterCredit = await getCustomerById(cust.id);
  assert.strictEqual(custAfterCredit?.balance, 3500);
  console.log(`✓ Customer balance after credit sale: ${custAfterCredit?.balance}`);

  // 3. Receive repayment of 2000 via receiveCustomerPayment
  const paymentResult = await receiveCustomerPayment({
    customerId: cust.id,
    amount: 2000,
    paymentMode: 'cash',
    reference: 'REC-00123',
    note: 'Partial cash payment',
    createdBy: 'cashier_01',
  });

  assert.strictEqual(paymentResult.balanceBefore, 3500);
  assert.strictEqual(paymentResult.balanceAfter, 1500);

  const custAfterPayment = await getCustomerById(cust.id);
  assert.strictEqual(custAfterPayment?.balance, 1500);
  console.log(`✓ Repayment applied, balance decreased to: ${custAfterPayment?.balance}`);

  // 4. Verify customer ledger entries
  const ledgerEntries = await getCustomerLedgerHistory(cust.id);
  assert.strictEqual(ledgerEntries.length, 2);
  assert.strictEqual(ledgerEntries[0].debit, 3500);
  assert.strictEqual(ledgerEntries[1].credit, 2000);
  assert.strictEqual(ledgerEntries[1].balanceAfter, 1500);
  console.log('✓ Customer ledger history verified with 2 chronological entries');

  // 5. Verify payments table recorded cash inflow
  const paymentInflow = await db.queryOne(
    `SELECT * FROM payments WHERE amount = 2000`
  );
  assert.ok(paymentInflow, 'Payments table must record customer cash inflow');
  console.log('✓ Cash inflow recorded in payments table');

  // 6. Verify sync_outbox contains CUSTOMER_PAYMENT event
  const outboxEvt = await db.queryOne(
    `SELECT * FROM sync_outbox WHERE entity_id = ? AND entity_type = 'CUSTOMER_LEDGER'`,
    [paymentResult.ledgerId]
  );
  assert.ok(outboxEvt, 'Outbox event must exist for CUSTOMER_PAYMENT');
  console.log('✓ Outbox event verified for customer payment');

  // 7. Simulate remote peer payment replication (+500 repayment from Terminal B)
  const remotePaymentEvt = {
    event_id: 'evt_remote_pay_001',
    device_id: 'terminal_beta',
    sequence: 31,
    entity_type: 'CUSTOMER_LEDGER',
    entity_id: 'ledger_remote_888',
    operation: 'CREATE',
    payload: JSON.stringify({
      id: 'ledger_remote_888',
      customerId: cust.id,
      amount: 500,
      paymentMode: 'card',
      note: 'Payment on Terminal B',
      timestamp: Date.now(),
    }),
    created_at: Date.now(),
    is_synced: 1,
  };

  await db.transaction(async (tx) => {
    await handleRemoteCustomerLedgerEvent(remotePaymentEvt, tx);
  });

  const custAfterRemote = await getCustomerById(cust.id);
  assert.strictEqual(custAfterRemote?.balance, 1000, 'Balance must decrease to 1500 - 500 = 1000');
  console.log('✓ Remote peer payment replicated additively, balance now = 1000');

  console.log('ALL PHASE 13 CUSTOMER & LEDGER TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test Phase 13 failed:', err);
  process.exit(1);
});
