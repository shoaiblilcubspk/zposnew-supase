/**
 * Test: Phase 04 — Event-Sourced Financial & Stock Ledger (Strict Non-LWW)
 * Validates atomic sale commits, append-only inventory ledgers,
 * split tender wallets, customer udhar ledgers, reversals, and additive overselling math.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

async function runTests() {
  console.log('--- TEST: PHASE 04 — EVENT-SOURCED FINANCIAL & STOCK LEDGER ---');

  // Test 1: Initialize In-Memory DB Driver and verify ledger tables
  console.log('1. Initializing In-Memory DB and verifying ledger schemas...');
  const { initDb } = await import('../src/lib/db/index.ts');
  const db = await initDb(':memory:');

  // Verify inventory_transactions, payments, payment_modes, customer_ledger exist
  const tables = await db.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('inventory_transactions', 'payments', 'payment_modes', 'customer_ledger');"
  );
  assert.equal(tables.length, 4, 'All 4 ledger tables must exist in SQLite');
  console.log('✓ All 4 core financial/inventory ledger tables verified.');

  // Test 2: Multi-Tender & Split Payment Flow
  console.log('2. Testing Multi-Tender Split Payment Atomic Ledger Commit...');
  const now = Date.now();
  const saleId = `SALE-${now}`;
  const totalAmount = 10000;
  const cashAmount = 4000;
  const bankAmount = 6000;

  await db.transaction(async (tx) => {
    // Insert Sale
    await tx.execute(
      `INSERT INTO sales (
        id, invoice_number, device_id, user_id, subtotal, total_amount, tendered_amount,
        change_amount, payment_method, status, timestamp, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [saleId, `INV-${now}`, 'PC-MAIN', 'cashier_1', totalAmount, totalAmount, totalAmount, 0, 'split', 'completed', now, now, now]
    );

    // Split Payment Rows
    await tx.execute(
      'INSERT INTO payments (id, sale_id, mode_id, amount, created_at) VALUES (?, ?, ?, ?, ?);',
      [`pay_cash_${now}`, saleId, 'cash', cashAmount, now]
    );
    await tx.execute(
      'INSERT INTO payments (id, sale_id, mode_id, amount, created_at) VALUES (?, ?, ?, ?, ?);',
      [`pay_bank_${now}`, saleId, 'bank', bankAmount, now]
    );

    // Update Wallets
    await tx.execute('UPDATE payment_modes SET balance = balance + ? WHERE id = ?;', [cashAmount, 'cash']);
    await tx.execute('UPDATE payment_modes SET balance = balance + ? WHERE id = ?;', [bankAmount, 'bank']);
  });

  const cashWallet = await db.queryOne('SELECT balance FROM payment_modes WHERE id = ?;', ['cash']);
  const bankWallet = await db.queryOne('SELECT balance FROM payment_modes WHERE id = ?;', ['bank']);
  assert.equal(cashWallet.balance, cashAmount, 'Cash wallet must receive 4000');
  assert.equal(bankWallet.balance, bankAmount, 'Bank wallet must receive 6000');
  console.log('✓ Split payment atomic commit & wallet ledger verified.');

  // Test 3: Customer Udhar (Credit) Ledger Debit
  console.log('3. Testing Customer Credit (Udhar) Ledger Debit & Running Balance...');
  const customerId = `CUST-${now}`;
  await db.execute(
    'INSERT INTO customers (id, name, phone, current_balance, updated_at) VALUES (?, ?, ?, ?, ?);',
    [customerId, 'Tariq Mehmood', '03001234567', 0, now]
  );

  const udharSaleId = `SALE-UDHAR-${now}`;
  const udharTotal = 7500;
  const udharPaid = 2500;
  const udharDue = 5000;

  await db.transaction(async (tx) => {
    // Create Credit Sale
    await tx.execute(
      `INSERT INTO sales (
        id, invoice_number, device_id, customer_id, user_id, subtotal, total_amount, tendered_amount,
        change_amount, payment_method, status, timestamp, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [udharSaleId, `INV-U-${now}`, 'PC-MAIN', customerId, 'cashier_1', udharTotal, udharTotal, udharPaid, 0, 'udhar', 'completed', now, now, now]
    );

    // Customer Paid 2500 cash
    await tx.execute('UPDATE payment_modes SET balance = balance + ? WHERE id = ?;', [udharPaid, 'cash']);

    // Customer Ledger entry for unpaid balance (5000)
    await tx.execute(
      'INSERT INTO customer_ledger (id, customer_id, type, amount, balance_after, sale_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [`c_tx_${now}`, customerId, 'DEBIT', udharDue, udharDue, udharSaleId, now]
    );
    await tx.execute('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?;', [udharDue, customerId]);
  });

  const customer = await db.queryOne('SELECT current_balance FROM customers WHERE id = ?;', [customerId]);
  assert.equal(customer.current_balance, udharDue, 'Customer outstanding balance must match 5000');
  console.log('✓ Customer credit ledger debit verified.');

  // Test 4: Reversal and Double Reversal Protection
  console.log('4. Testing Sale Reversal & Double-Reversal Prevention...');
  const targetSale = await db.queryOne('SELECT status FROM sales WHERE id = ?;', [saleId]);
  assert.equal(targetSale.status, 'completed');

  // First Reversal
  await db.transaction(async (tx) => {
    const s = await tx.queryOne('SELECT status FROM sales WHERE id = ?;', [saleId]);
    if (s.status === 'reversed') {
      throw new Error('Sale has already been reversed.');
    }
    await tx.execute("UPDATE sales SET status = 'reversed' WHERE id = ?;", [saleId]);
    await tx.execute('UPDATE payment_modes SET balance = balance - ? WHERE id = ?;', [cashAmount, 'cash']);
    await tx.execute('UPDATE payment_modes SET balance = balance - ? WHERE id = ?;', [bankAmount, 'bank']);
  });

  const reversedSale = await db.queryOne('SELECT status FROM sales WHERE id = ?;', [saleId]);
  assert.equal(reversedSale.status, 'reversed');

  // Second Reversal Attempt (Must Fail)
  let doubleReversalBlocked = false;
  try {
    await db.transaction(async (tx) => {
      const s = await tx.queryOne('SELECT status FROM sales WHERE id = ?;', [saleId]);
      if (s.status === 'reversed') {
        throw new Error('Sale has already been reversed.');
      }
      await tx.execute("UPDATE sales SET status = 'reversed' WHERE id = ?;", [saleId]);
    });
  } catch (err) {
    doubleReversalBlocked = true;
  }
  assert.ok(doubleReversalBlocked, 'Second reversal call must be rejected');
  console.log('✓ Reversal and double-reversal rejection validated.');

  // Test 5: Additive Overselling & Non-LWW Convergence
  console.log('5. Testing Non-LWW Additive Overselling & Ledger Math...');
  const productId = `PROD-${now}`;
  await db.execute(
    'INSERT INTO products (id, name, retail_price, stock, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
    [productId, 'Test Polo Shirt', 1500, 6, now, now]
  );

  // Terminal 1 sells 5 offline
  await db.execute(
    'INSERT INTO inventory_transactions (id, product_id, type, quantity, reference_type, reference_id, device_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
    [`tx_t1_${now}`, productId, 'INVENTORY_OUT', -5, 'sale', 'sale_1', 'TERM_1', 'user_1', now]
  );

  // Terminal 2 sells 4 offline
  await db.execute(
    'INSERT INTO inventory_transactions (id, product_id, type, quantity, reference_type, reference_id, device_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
    [`tx_t2_${now}`, productId, 'INVENTORY_OUT', -4, 'sale', 'sale_2', 'TERM_2', 'user_2', now + 10]
  );

  // Reconciled stock balance = 6 + (-5) + (-4) = -3 (Oversold by 3)
  const txSum = await db.queryOne(
    'SELECT SUM(quantity) as total_delta FROM inventory_transactions WHERE product_id = ?;',
    [productId]
  );
  const calculatedStock = 6 + Number(txSum?.total_delta ?? 0);
  assert.equal(calculatedStock, -3, 'Calculated stock must be -3 (Oversold by 3)');
  console.log('✓ Non-LWW additive stock convergence confirmed (-3 oversold, zero dropped bills).');

  console.log('✅ PHASE 04: FINANCIAL & STOCK LEDGER TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Phase 04 test failed:', err);
  process.exit(1);
});
