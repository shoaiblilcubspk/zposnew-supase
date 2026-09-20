import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import {
  seedPaymentModes,
  getAllPaymentModes,
  getPaymentModeById,
  adjustPaymentBalances,
  transferWalletBalance,
} from '../src/lib/services/expenses/walletRepository.ts';
import {
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getAllExpenses,
} from '../src/lib/services/expenses/expenseRepository.ts';
import {
  handleRemoteExpenseEvent,
  handleRemoteWalletEvent,
} from '../src/lib/services/expenses/expenseEventHandlers.ts';

console.log('--- TEST PHASE 15: Expenses & Wallets Management Services ---');

async function run() {
  const db = await initDatabase();

  // 1. Seed and verify payment modes
  await seedPaymentModes();
  const modes = await getAllPaymentModes();
  assert.ok(modes.length >= 3);
  assert.ok(modes.some(m => m.id === 'cash'));
  assert.ok(modes.some(m => m.id === 'card'));
  assert.ok(modes.some(m => m.id === 'online'));
  console.log('✓ Payment modes initialized with cash, card, and online wallets');

  // 2. Fund cash wallet with 10,000
  await adjustPaymentBalances([
    { modeId: 'cash', delta: 10000, note: 'Initial cash float' }
  ]);
  const cashMode = await getPaymentModeById('cash');
  assert.strictEqual(cashMode?.balance, 10000);
  console.log(`✓ Cash wallet funded with 10,000. Current balance: ${cashMode?.balance}`);

  // 3. Record an expense of 1,200 for 'Tea & Refreshments'
  const exp = await createExpense(
    {
      description: 'Tea & Refreshments for staff',
      amount: 1200,
      category: 'Food',
      paymentMethod: 'cash',
      date: new Date(),
      notes: 'Evening tea with team',
      addedBy: 'cashier_01',
    },
    'cashier_01'
  );

  assert.ok(exp.id);
  assert.strictEqual(exp.amount, 1200);

  // Verify SQLite row
  const expRow = await getExpenseById(exp.id);
  assert.ok(expRow);
  assert.strictEqual(expRow.amount, 1200);
  assert.strictEqual(expRow.description, 'Tea & Refreshments for staff');
  console.log('✓ Expense inserted into SQLite expenses table');

  // Verify wallet balance decremented: 10000 - 1200 = 8800
  const cashAfterExp = await getPaymentModeById('cash');
  assert.strictEqual(cashAfterExp?.balance, 8800);
  console.log(`✓ Cash wallet balance atomically decremented to: ${cashAfterExp?.balance} (Expected: 8800)`);

  // Verify payments table recorded cash outflow of -1200
  const paymentVoucher = await db.queryOne(
    `SELECT * FROM payments WHERE mode_id = 'cash' AND amount = -1200;`
  );
  assert.ok(paymentVoucher, 'Cash outflow voucher must exist in payments table');
  console.log('✓ Cash outflow voucher verified in payments table');

  // Verify sync_outbox contains EXPENSE_CREATED event
  const outboxEvt = await db.queryOne(
    `SELECT * FROM sync_outbox WHERE entity_id = ? AND entity_type = 'EXPENSE'`,
    [exp.id]
  );
  assert.ok(outboxEvt, 'EXPENSE_CREATED event must exist in sync_outbox');
  console.log('✓ Outbox event verified for EXPENSE_CREATED');

  // 4. Update expense: increase amount from 1200 to 1500
  const updatedExp = await updateExpense(
    exp.id,
    {
      description: 'Tea & Refreshments & Biscuits',
      amount: 1500,
    },
    'admin_user'
  );
  assert.strictEqual(updatedExp.amount, 1500);

  // Cash balance should now be 8800 - 300 = 8500
  const cashAfterUpdate = await getPaymentModeById('cash');
  assert.strictEqual(cashAfterUpdate?.balance, 8500);
  console.log(`✓ Expense updated, cash wallet adjusted to: ${cashAfterUpdate?.balance} (Expected: 8500)`);

  // 5. Delete expense: restore money back into cash wallet
  await deleteExpense(exp.id, 'admin_user');
  const expAfterDelete = await getExpenseById(exp.id);
  assert.strictEqual(expAfterDelete, null);

  // Cash balance should be fully restored to 10,000
  const cashAfterDelete = await getPaymentModeById('cash');
  assert.strictEqual(cashAfterDelete?.balance, 10000);
  console.log(`✓ Expense deleted, cash wallet fully restored to: ${cashAfterDelete?.balance} (Expected: 10000)`);

  // 6. Test Wallet Transfer: Transfer 3,000 from cash to online
  await transferWalletBalance('cash', 'online', 3000, 'Bank deposit');
  const cashAfterTransfer = await getPaymentModeById('cash');
  const onlineAfterTransfer = await getPaymentModeById('online');
  assert.strictEqual(cashAfterTransfer?.balance, 7000);
  assert.strictEqual(onlineAfterTransfer?.balance, 3000);
  console.log(`✓ Wallet transfer completed: Cash = ${cashAfterTransfer?.balance}, Online = ${onlineAfterTransfer?.balance}`);

  // 7. Test Remote Expense Replication (Peer Terminal sync)
  const remoteExpId = 'rem_exp_777';
  await db.transaction(async (tx) => {
    await handleRemoteExpenseEvent(
      {
        id: 'evt_rem_exp_1',
        device_id: 'peer_terminal_3',
        entity_type: 'EXPENSE',
        entity_id: remoteExpId,
        operation: 'CREATE',
        payload: JSON.stringify({
          id: remoteExpId,
          title: 'Electricity Bill',
          category: 'Utilities',
          amount: 2500,
          payment_mode_id: 'cash',
          notes: 'Shop electricity bill',
          user_id: 'manager_peer',
          date: Date.now(),
          created_at: Date.now(),
        }),
        timestamp: Date.now(),
        sequence: 1,
      },
      tx
    );
  });

  const remoteExp = await getExpenseById(remoteExpId);
  assert.ok(remoteExp);
  assert.strictEqual(remoteExp.amount, 2500);

  const cashAfterRemote = await getPaymentModeById('cash');
  assert.strictEqual(cashAfterRemote?.balance, 4500); // 7000 - 2500 = 4500
  console.log(`✓ Remote EXPENSE handled additively, cash balance: ${cashAfterRemote?.balance} (Expected: 4500)`);

  console.log('--- ALL PHASE 15 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 15 Test Failed:', err);
  process.exit(1);
});
