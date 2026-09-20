import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import {
  getSalesSummary,
  getFinancialSummary,
  getPaymentMethodDistribution,
  getInventoryValuation,
  getDailySalesTrend,
  getSalesmanPerformance,
} from '../src/lib/reports/localReportingService.ts';
import {
  getReportSalesLocal,
} from '../src/lib/services/saleQueries.ts';

console.log('--- TEST PHASE 16: Local Reporting Engine (SQLite Analytics) ---');

async function run() {
  const db = await initDatabase();
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const twoHoursAgo = now - 7200000;
  const yesterday = now - 86400000;
  const tomorrow = now + 86400000;

  // 1. Insert sample products for inventory valuation
  const p1 = 'rep_prod_1';
  const p2 = 'rep_prod_2';
  await db.execute(
    `INSERT OR REPLACE INTO products (
      id, name, sku, barcode, cost_price, retail_price, stock, min_stock_alert, active, created_at, updated_at
    ) VALUES (?, 'Designer Shirt', 'SHIRT-01', 'ZP-10001', 1200, 2000, 50, 5, 1, ?, ?);`,
    [p1, now, now]
  );
  await db.execute(
    `INSERT OR REPLACE INTO products (
      id, name, sku, barcode, cost_price, retail_price, stock, min_stock_alert, active, created_at, updated_at
    ) VALUES (?, 'Cotton Trouser', 'TROUSER-01', 'ZP-10002', 800, 1500, 30, 5, 1, ?, ?);`,
    [p2, now, now]
  );
  console.log('✓ Sample products inserted for inventory valuation');

  // 2. Insert sample sales & items
  // Sale 1: 2 Shirts = 4000 (Cost = 2400)
  const s1 = 'rep_sale_1';
  await db.execute(
    `INSERT INTO sales (
      id, device_id, invoice_number, subtotal, total_amount, tendered_amount, change_amount, discount_amount, tax_amount, payment_method, status, user_id, timestamp, created_at, updated_at
    ) VALUES (?, 'dev_test_01', 'INV-REP-01', 4000, 4000, 4000, 0, 0, 0, 'cash', 'completed', 'cashier_01', ?, ?, ?);`,
    [s1, twoHoursAgo, twoHoursAgo, twoHoursAgo]
  );
  await db.execute(
    `INSERT INTO sale_items (
      id, sale_id, product_id, name, quantity, unit_price, unit_cost, total_price
    ) VALUES (?, ?, ?, 'Designer Shirt', 2, 2000, 1200, 4000);`,
    ['si_01', s1, p1]
  );
  await db.execute(
    `INSERT INTO payments (
      id, sale_id, mode_id, amount, reference, created_at
    ) VALUES (?, ?, 'cash', 4000, 'INV-REP-01', ?);`,
    ['pm_01', s1, twoHoursAgo]
  );

  // Sale 2: 1 Trouser = 1500 (Cost = 800) with 200 discount = 1300 net
  const s2 = 'rep_sale_2';
  await db.execute(
    `INSERT INTO sales (
      id, device_id, invoice_number, subtotal, total_amount, tendered_amount, change_amount, discount_amount, tax_amount, payment_method, status, user_id, salesman_id, timestamp, created_at, updated_at
    ) VALUES (?, 'dev_test_01', 'INV-REP-02', 1500, 1300, 1300, 0, 200, 0, 'card', 'completed', 'cashier_01', 'salesman_ali', ?, ?, ?);`,
    [s2, oneHourAgo, oneHourAgo, oneHourAgo]
  );
  await db.execute(
    `INSERT INTO sale_items (
      id, sale_id, product_id, name, quantity, unit_price, unit_cost, total_price
    ) VALUES (?, ?, ?, 'Cotton Trouser', 1, 1500, 800, 1500);`,
    ['si_02', s2, p2]
  );
  await db.execute(
    `INSERT INTO payments (
      id, sale_id, mode_id, amount, reference, created_at
    ) VALUES (?, ?, 'card', 1300, 'INV-REP-02', ?);`,
    ['pm_02', s2, oneHourAgo]
  );

  // 3. Insert sample operating expense: 500
  await db.execute(
    `INSERT INTO expenses (
      id, title, category, amount, payment_mode_id, user_id, date, created_at
    ) VALUES (?, 'Store Maintenance', 'Maintenance', 500, 'cash', 'cashier_01', ?, ?);`,
    ['exp_rep_01', oneHourAgo, oneHourAgo]
  );
  console.log('✓ Sales, items, payments, and expenses populated');

  // 4. Test Sales Summary
  const salesSummary = await getSalesSummary(yesterday, tomorrow);
  assert.strictEqual(salesSummary.totalRevenue, 5300); // 4000 + 1300
  assert.strictEqual(salesSummary.totalInvoices, 2);
  assert.strictEqual(salesSummary.totalDiscounts, 200);
  assert.strictEqual(salesSummary.averageInvoiceValue, 2650); // 5300 / 2
  console.log('✓ Sales summary aggregated directly in SQLite:', salesSummary);

  // 5. Test Financial Profit & Loss Summary
  const finSummary = await getFinancialSummary(yesterday, tomorrow);
  assert.strictEqual(finSummary.grossRevenue, 5300);
  assert.strictEqual(finSummary.netRevenue, 5300);
  assert.strictEqual(finSummary.totalCOGS, 3200); // 2400 + 800 = 3200
  assert.strictEqual(finSummary.grossProfit, 2100); // 5300 - 3200 = 2100
  assert.strictEqual(finSummary.totalExpenses, 500);
  assert.strictEqual(finSummary.netProfit, 1600); // 2100 - 500 = 1600
  console.log('✓ Financial P&L verified with exact formula match:', finSummary);

  // 6. Test Payment Method Distribution
  const payDist = await getPaymentMethodDistribution(yesterday, tomorrow);
  assert.ok(payDist.length >= 2);
  const cashPay = payDist.find(p => p.paymentMode === 'cash');
  const cardPay = payDist.find(p => p.paymentMode === 'card');
  assert.strictEqual(cashPay?.totalAmount, 4000);
  assert.strictEqual(cardPay?.totalAmount, 1300);
  console.log('✓ Payment method distribution verified in SQLite');

  // 7. Test Inventory Valuation
  const invVal = await getInventoryValuation();
  assert.ok(invVal.totalSkus >= 2);
  assert.ok(invVal.totalUnitsInStock >= 80); // 50 + 30
  // Cost: (50 * 1200) + (30 * 800) = 60,000 + 24,000 = 84,000
  assert.ok(invVal.costValuation >= 84000);
  // Retail: (50 * 2000) + (30 * 1500) = 100,000 + 45,000 = 145,000
  assert.ok(invVal.retailValuation >= 145000);
  console.log('✓ Inventory valuation aggregated directly in SQLite:', invVal);

  // 8. Test Salesman Performance
  const salesmen = await getSalesmanPerformance(yesterday, tomorrow);
  const ali = salesmen.find(s => s.salesmanId === 'salesman_ali');
  assert.ok(ali);
  assert.strictEqual(ali.totalRevenue, 1300);
  assert.strictEqual(ali.totalSalesCount, 1);
  console.log('✓ Salesman performance attribution verified');

  // 9. Test getReportSalesLocal
  const reportSales = await getReportSalesLocal(new Date(yesterday), new Date(tomorrow));
  const s1Loaded = reportSales.find(s => s.id === s1);
  assert.ok(s1Loaded);
  assert.ok(s1Loaded.items && s1Loaded.items.length > 0);
  assert.strictEqual(s1Loaded.items[0].cost, 1200);
  assert.strictEqual(s1Loaded.items[0].quantity, 2);
  console.log('✓ Raw report sales hydrated with items and item unit costs');

  console.log('--- ALL PHASE 16 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 16 Test Failed:', err);
  process.exit(1);
});
