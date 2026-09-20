/**
 * Test: Phase 03 — 4 Roles RBAC & Authorization Service
 * Validates 4 canonical roles, central can() engine, fail-closed security,
 * soft-delete user lifecycle, and salesman attribution.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

async function runTests() {
  console.log('--- TEST: PHASE 03 — 4 ROLES RBAC & AUTHORIZATION SERVICE ---');

  // Test 1: Canonical 4 Roles Verification
  console.log('1. Verifying 4 Canonical Roles in permissions.ts...');
  const { ROLES, can } = await import('../src/lib/permissions.ts');

  assert.equal(ROLES.length, 4, 'Exactly 4 canonical roles must exist');
  assert.deepEqual(ROLES, ['admin', 'manager', 'cashier', 'salesman'], 'Roles must match authoritative spec');
  console.log('✓ 4 canonical roles verified: admin, manager, cashier, salesman.');

  // Test 2: Central can() Engine & Fail-Closed Authorization
  console.log('2. Testing Central can() Engine & Fail-Closed Authorization...');
  // Admin permissions
  assert.equal(can('admin', 'view_pos'), true);
  assert.equal(can('admin', 'manage_users'), true);
  assert.equal(can('admin', 'manage_settings'), true);
  assert.equal(can('admin', 'export_database'), true);

  // Manager permissions
  assert.equal(can('manager', 'view_pos'), true);
  assert.equal(can('manager', 'manage_products'), true);
  assert.equal(can('manager', 'manage_stock'), true);
  assert.equal(can('manager', 'manage_users'), false, 'Manager must NOT manage users');
  assert.equal(can('manager', 'manage_settings'), false, 'Manager must NOT manage system settings');

  // Cashier permissions
  assert.equal(can('cashier', 'view_pos'), true);
  assert.equal(can('cashier', 'receive_payment'), true);
  assert.equal(can('cashier', 'manage_products'), false, 'Cashier must NOT manage products');
  assert.equal(can('cashier', 'view_profit'), false, 'Cashier must NOT view profits');
  assert.equal(can('cashier', 'manage_users'), false, 'Cashier must NOT manage users');

  // Salesman permissions
  assert.equal(can('salesman', 'view_pos'), true);
  assert.equal(can('salesman', 'view_customers'), true);
  assert.equal(can('salesman', 'manage_stock'), false, 'Salesman must NOT manage stock');
  assert.equal(can('salesman', 'view_profit'), false, 'Salesman must NOT view profit');
  assert.equal(can('salesman', 'view_reports'), false, 'Salesman must NOT view reports');

  // Unknown role must fail closed (UNKNOWN = DENY)
  assert.equal(can(undefined, 'view_pos'), false, 'Undefined role must DENY');
  assert.equal(can(null, 'view_pos'), false, 'Null role must DENY');
  assert.equal(can('superman', 'view_pos'), false, 'Arbitrary unknown role must DENY');
  console.log('✓ Central can() engine verified with fail-closed security.');

  // Test 3: User Soft Delete & Status Change Architecture
  console.log('3. Auditing User Soft Delete & P2P Event Lifecycle...');
  const userRepoContent = fs.readFileSync(path.join(srcDir, 'lib/services/users/userRepository.ts'), 'utf8');
  assert.ok(userRepoContent.includes('USER_STATUS_CHANGED'), 'Must emit USER_STATUS_CHANGED event');
  assert.ok(userRepoContent.includes('USER_PIN_RESET'), 'Must emit USER_PIN_RESET event');
  assert.ok(userRepoContent.includes('USER_ROLE_UPDATED'), 'Must emit USER_ROLE_UPDATED event');
  assert.ok(userRepoContent.includes('active: active ? 1 : 0'), 'Must soft-delete users via active flag');
  console.log('✓ Soft-delete user lifecycle and outbox events verified.');

  // Test 4: Salesman Attribution & Cashier Collection in Sale Commit
  console.log('4. Auditing Salesman Attribution & Cashier Collection in localSaleCommit.ts...');
  const saleCommitContent = fs.readFileSync(
    path.join(srcDir, 'lib/services/sales/localSaleCommit.ts'),
    'utf8'
  );
  assert.ok(saleCommitContent.includes('salesman_id'), 'Sales table schema must capture salesman_id');
  assert.ok(saleCommitContent.includes('user_id'), 'Sales table schema must capture user_id (cashier)');
  assert.ok(saleCommitContent.includes('device_id'), 'Sales table schema must capture device_id');
  console.log('✓ Dual attribution (salesman_id + cashier user_id + device_id) verified.');

  console.log('✅ PHASE 03: 4 ROLES RBAC & AUTHORIZATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Phase 03 test failed:', err);
  process.exit(1);
});
