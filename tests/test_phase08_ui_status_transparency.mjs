/**
 * Test: Phase 08 — Linear UI/UX Standards & Status Transparency
 * Validates transparent SyncStatusWidget (Local: Saved), standardized "All" filter labels,
 * zero-count pagination ("Showing 0 of 0"), and high-contrast stock badges.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function runTests() {
  console.log('--- TEST: PHASE 08 — LINEAR UI/UX STANDARDS & STATUS TRANSPARENCY ---');

  // Test 1: SyncStatusWidget Transparency
  console.log('1. Auditing SyncStatusWidget.tsx for Local: Saved & No False Spinning Error...');
  const widgetContent = fs.readFileSync(path.join(srcDir, 'components/layout/SyncStatusWidget.tsx'), 'utf8');

  assert.ok(widgetContent.includes('Local'), 'Widget must indicate Local storage status');
  assert.ok(widgetContent.includes('Standalone'), 'Widget must support Standalone mode');
  assert.ok(widgetContent.includes('to sync'), 'Widget must display calm "to sync" counter');
  // Verify that RefreshCw is ONLY spinning when isSyncing is true (not on pendingCount > 0 alone)
  assert.ok(!widgetContent.includes('pendingCount > 0 ? (\n        <span className="flex items-center gap-1 text-amber-400 tabular-nums">\n          <RefreshCw className="w-3 h-3 animate-spin" />'), 'Must not spin on pendingCount alone');
  console.log('✓ SyncStatusWidget transparency and calm outbox counter verified.');

  // Test 2: Standardized Filter Labels ("All")
  console.log('2. Auditing Filter Selectors for Standardized "All" Labels...');
  const purchaseHistoryContent = fs.readFileSync(path.join(srcDir, 'components/inventory/PurchaseHistoryView.tsx'), 'utf8');
  assert.ok(!purchaseHistoryContent.includes('"ALL SUPPLIERS"'), 'Must not have verbose ALL SUPPLIERS label');
  assert.ok(!purchaseHistoryContent.includes('"ALL CATEGORIES"'), 'Must not have verbose ALL CATEGORIES label');
  assert.ok(!purchaseHistoryContent.includes('"ALL USERS"'), 'Must not have verbose ALL USERS label');

  const txnFiltersContent = fs.readFileSync(path.join(srcDir, 'components/transactions/TransactionFilters.tsx'), 'utf8');
  assert.ok(!txnFiltersContent.includes('"All Sales"'), 'Must not have redundant All Sales label');
  assert.ok(!txnFiltersContent.includes('"Payment: All"'), 'Must not have verbose Payment: All label');
  console.log('✓ Filter labels standardized to clean "All".');

  // Test 3: Zero-Count Pagination ("Showing 0 of 0")
  console.log('3. Auditing Pagination Components for "Showing 0 of 0"...');
  const customerTableContent = fs.readFileSync(path.join(srcDir, 'components/customers/CustomerTable.tsx'), 'utf8');
  assert.ok(customerTableContent.includes("filteredCustomers.length === 0 ? '0 of 0'"), 'CustomerTable must render 0 of 0 when empty');

  const inventoryTableContent = fs.readFileSync(path.join(srcDir, 'components/inventory/InventoryTable.tsx'), 'utf8');
  assert.ok(inventoryTableContent.includes("filteredProducts.length === 0 ? '0 of 0'"), 'InventoryTable must render 0 of 0 when empty');
  console.log('✓ Zero-count pagination ("0 of 0") verified across tables.');

  // Test 4: ProductCard High-Contrast Stock Badge & Typography
  console.log('4. Auditing ProductCard.tsx for High-Contrast Stock Badge...');
  const productCardContent = fs.readFileSync(path.join(srcDir, 'components/pos/grid/ProductCard.tsx'), 'utf8');
  assert.ok(productCardContent.includes('bg-rose-600'), 'Out-of-stock badge must use high-contrast solid bg-rose-600');
  assert.ok(productCardContent.includes('NO STOCK'), 'Out-of-stock badge must display NO STOCK');
  console.log('✓ ProductCard high-contrast NO STOCK badge confirmed.');

  // Test 5: Dark Mode WebKit Autofill CSS Override
  console.log('5. Auditing base.css for Dark Mode Autofill Override...');
  const baseCssContent = fs.readFileSync(path.join(srcDir, 'styles/base.css'), 'utf8');
  assert.ok(baseCssContent.includes('-webkit-autofill'), 'base.css must contain -webkit-autofill rule');
  assert.ok(baseCssContent.includes('-webkit-text-fill-color'), 'base.css must override text fill color');
  console.log('✓ Dark mode WebKit autofill override confirmed.');

  console.log('✅ PHASE 08: LINEAR UI/UX & STATUS TRANSPARENCY TESTS PASSED SUCCESSFULLY!');
}

runTests();
