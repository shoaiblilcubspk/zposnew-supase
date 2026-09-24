/**
 * WRITE GUARD — enforces AGENTS.md §1.5.12 (Bundle + Sync for Every Change).
 *
 * Scans the source tree and FAILS the build if any file OUTSIDE the approved data-sync layer
 * performs a raw write that bypasses the Atomic Action Bundle system:
 *   (A) raw `supabase.from('<synced table>').insert|update|upsert|delete(...)`
 *   (B) raw `enqueue({ ... operation_type: 'insert'|'update'|'delete' ... })` of a table op
 *   (C) raw SQL `INSERT/UPDATE/DELETE` into a synced table via localExecute / db.execute / tx.execute
 *
 * The ONLY approved write entry points are `atomicWrite` and its single-op wrappers
 * (`insertRow` / `updateRow` / `softDeleteRow`), which repositories may call freely. Those are
 * defined in the data layer, which is allowlisted below (it legitimately owns the low-level
 * queue + cloud push).
 *
 * Run: npx tsx tests/writeGuard.test.mjs   (or: npm test)
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src');

// Files that ARE the write/sync layer — allowed to touch the queue + push to the cloud.
const ALLOWLIST = new Set([
  'src/data/writeThrough.ts',
  'src/data/syncQueue.ts',
  'src/data/syncWorker.ts',
  'src/data/pullSync.ts',
  'src/data/localDb.ts',
  'src/data/dataLayer.ts',
  'src/data/index.ts',
]);

// Business tables that must only be written through the bundle/sync path (SYNCED_TABLES).
const SYNCED = [
  'store_settings', 'receipt_settings', 'categories', 'suppliers', 'products',
  'product_variants', 'product_images', 'discounts', 'bundles', 'bundle_items',
  'inventory_ledger', 'sales', 'sale_items', 'sale_voids', 'sale_refunds',
  'payment_modes', 'payments', 'customers', 'customer_ledger',
  'expense_categories', 'expenses', 'purchase_records', 'roles', 'staff_users', 'audit_logs',
  'stock_history', 'variant_stock_history', 'price_history', 'sale_audit_log',
  'toppings', 'product_addons', 'salesmen', 'purchase_orders', 'purchase_order_items',
];
const TBL = SYNCED.join('|');

const RULES = [
  {
    name: 'raw supabase.from(<synced>).insert/update/upsert/delete',
    re: new RegExp(`\\.from\\(\\s*['"\`](?:${TBL})['"\`]\\s*\\)\\s*\\.\\s*(?:insert|update|upsert|delete)\\b`),
  },
  {
    name: "manual enqueue() of a table op (operation_type: insert/update/delete)",
    re: /enqueue\s*\(\s*\{[^}]*operation_type\s*:\s*['"`](?:insert|update|delete)['"`]/s,
  },
  {
    name: 'raw SQL INSERT/UPDATE/DELETE into a synced table via the data-layer localExecute',
    re: new RegExp(`localExecute\\(\\s*[\`'"]\\s*(?:INSERT\\s+(?:OR\\s+\\w+\\s+)?INTO|UPDATE|DELETE\\s+FROM)\\s+(?:${TBL})\\b`, 'i'),
  },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function stripComments(src) {
  // Remove block and line comments so commented-out examples never trip the guard.
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const violations = [];
for (const file of walk(ROOT)) {
  const rel = path.relative(process.cwd(), file);
  if (ALLOWLIST.has(rel)) continue;
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  for (const rule of RULES) {
    if (rule.re.test(src)) violations.push({ rel, rule: rule.name });
  }
}

console.log('WRITE GUARD — §1.5.12 (no raw writes outside the bundle/sync layer)');
if (violations.length === 0) {
  console.log(`  ok - scanned ${walk(ROOT).length} files, zero raw-write bypasses.`);
  console.log('\nAll write-guard checks passed.');
} else {
  console.error(`\n${violations.length} write-guard violation(s):`);
  for (const v of violations) console.error(`  - ${v.rel}\n      ${v.rule}`);
  console.error('\nFix: route the write through atomicWrite / insertRow / updateRow / softDeleteRow');
  console.error('and let syncWorker + apply_bundle handle the cloud push (AGENTS.md §1.5.12).');
  process.exit(1);
}
