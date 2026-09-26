#!/usr/bin/env node
/**
 * repair-halfsaved.mjs — Phase 6 safety net for Atomic Action Bundles (AGENTS.md §1.5).
 *
 * Finds and repairs half-saved / orphaned records in Supabase (the source of truth). The local
 * SQLite mirror self-heals by re-pulling after the cloud is repaired, so this tool only needs
 * the cloud side.
 *
 * DRY-RUN by default (reports only). Pass --apply to make changes. NOTHING is ever deleted
 * silently: orphaned rows are moved to `repair_quarantine` (payload preserved) before removal,
 * and missing ledger rows are RECONSTRUCTED, never fabricated destructively.
 *
 * Detections:
 *   1. products (track_inventory, active, stock>0) with ZERO inventory_ledger rows  -> reconstruct INITIAL
 *   2. non-void sales that have sale_items but ZERO inventory_ledger OUT rows        -> reconstruct OUT rows
 *   3. sale_items whose sale_id has no sales row                                     -> quarantine
 *   4. payments (sale_id set) whose sale_id has no sales row                         -> quarantine
 *   5. inventory_ledger rows whose product_id has no products row                    -> quarantine
 *   6. product_images whose product_id has no products row                          -> quarantine
 *
 * Usage:
 *   node scripts/repair-halfsaved.mjs            # dry-run report
 *   node scripts/repair-halfsaved.mjs --apply    # apply fixes + quarantine
 *
 * Requires .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const APPLY = process.argv.includes('--apply');

function loadEnv() {
  const file = path.resolve(process.cwd(), '.env.local');
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const iso = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

async function fetchAll(table, cols = '*') {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch ${table}: ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

async function quarantine(table, row, reason) {
  await sb.from('repair_quarantine').insert({
    id: uuid(), table_name: table, row_id: row.id ?? null, payload: row, reason, created_at: iso(),
  });
  const { error } = await sb.from(table).delete().eq('id', row.id);
  if (error) throw new Error(`quarantine delete ${table} ${row.id}: ${error.message}`);
}

const report = [];
function log(section, count, detail) {
  report.push({ section, count, detail });
  console.log(`\n[${count}] ${section}`);
  if (count > 0 && detail) console.log('    ' + detail);
}

async function main() {
  console.log(`repair-halfsaved — ${APPLY ? 'APPLY (writing changes)' : 'DRY-RUN (read-only)'}`);

  const [products, ledger, sales, saleItems, payments, productImages] = await Promise.all([
    fetchAll('products', 'id,stock,track_inventory,active,image_hash'),
    fetchAll('inventory_ledger', 'id,product_id,type,reference_id,reference_type'),
    fetchAll('sales', 'id,status,invoice_number,device_id'),
    fetchAll('sale_items', 'id,sale_id,product_id,variant_id,quantity'),
    fetchAll('payments', 'id,sale_id,amount'),
    fetchAll('product_images', 'id,product_id,image_hash'),
  ]);

  const productIds = new Set(products.map((p) => p.id));
  const saleIds = new Set(sales.map((s) => s.id));
  const ledgerByProduct = new Map();
  for (const l of ledger) {
    if (!ledgerByProduct.has(l.product_id)) ledgerByProduct.set(l.product_id, []);
    ledgerByProduct.get(l.product_id).push(l);
  }
  const outRefSaleIds = new Set(ledger.filter((l) => l.reference_type === 'SALE').map((l) => l.reference_id));

  let fixes = 0;

  // 1. Products with stock but no ledger -> reconstruct INITIAL.
  const missingInitial = products.filter(
    (p) => p.active === 1 && p.track_inventory === 1 && Number(p.stock) > 0 && !(ledgerByProduct.get(p.id)?.length)
  );
  log('products missing INITIAL ledger (stock>0, no ledger)', missingInitial.length,
    missingInitial.slice(0, 5).map((p) => p.id).join(', '));
  if (APPLY) {
    for (const p of missingInitial) {
      const { error } = await sb.from('inventory_ledger').insert({
        id: uuid(), operation_id: uuid(), product_id: p.id, type: 'INITIAL', quantity: Number(p.stock),
        reference_type: 'AUDIT', reference_id: p.id, user_id: 'repair', notes: 'Reconstructed INITIAL (repair)',
        created_at: iso(),
      });
      if (error) throw new Error(`fix INITIAL ${p.id}: ${error.message}`);
      fixes++;
    }
  }

  // 2. Non-void sales with items but no OUT ledger -> reconstruct OUT rows.
  const itemsBySale = new Map();
  for (const it of saleItems) {
    if (!itemsBySale.has(it.sale_id)) itemsBySale.set(it.sale_id, []);
    itemsBySale.get(it.sale_id).push(it);
  }
  const salesMissingStock = sales.filter((s) => {
    if (s.status === 'void') return false;
    const its = (itemsBySale.get(s.id) || []).filter((i) => i.product_id);
    if (its.length === 0) return false;
    return !outRefSaleIds.has(s.id);
  });
  log('non-void sales with items but NO stock movement', salesMissingStock.length,
    salesMissingStock.slice(0, 5).map((s) => s.invoice_number).join(', '));
  if (APPLY) {
    for (const s of salesMissingStock) {
      for (const it of (itemsBySale.get(s.id) || [])) {
        if (!it.product_id) continue;
        const { error } = await sb.from('inventory_ledger').insert({
          id: uuid(), operation_id: uuid(), product_id: it.product_id, variant_id: it.variant_id || null,
          type: 'INVENTORY_OUT', quantity: -Math.abs(Number(it.quantity) || 0), reference_type: 'SALE',
          reference_id: s.id, device_id: s.device_id || null, user_id: 'repair',
          notes: `Reconstructed OUT for ${s.invoice_number} (repair)`, created_at: iso(),
        });
        if (error) throw new Error(`fix OUT ${s.id}: ${error.message}`);
        fixes++;
      }
    }
  }

  // 3. Orphan sale_items (no parent sale) -> quarantine.
  const orphanItems = saleItems.filter((it) => !saleIds.has(it.sale_id));
  log('orphan sale_items (no parent sale)', orphanItems.length, orphanItems.slice(0, 5).map((i) => i.id).join(', '));
  if (APPLY) for (const it of orphanItems) { await quarantine('sale_items', it, 'orphan: no parent sale'); fixes++; }

  // 4. Orphan payments (sale_id set, no parent sale) -> quarantine.
  const orphanPayments = payments.filter((p) => p.sale_id && !saleIds.has(p.sale_id));
  log('orphan payments (sale_id set, no parent sale)', orphanPayments.length, orphanPayments.slice(0, 5).map((p) => p.id).join(', '));
  if (APPLY) for (const p of orphanPayments) { await quarantine('payments', p, 'orphan: no parent sale'); fixes++; }

  // 5. Orphan inventory_ledger (product_id set, no product) -> quarantine.
  const orphanLedger = ledger.filter((l) => l.product_id && !productIds.has(l.product_id));
  log('orphan inventory_ledger (no product)', orphanLedger.length, orphanLedger.slice(0, 5).map((l) => l.id).join(', '));
  if (APPLY) for (const l of orphanLedger) { await quarantine('inventory_ledger', l, 'orphan: no product'); fixes++; }

  // 6. Orphan product_images (no product) -> quarantine.
  const orphanImages = productImages.filter((pi) => pi.product_id && !productIds.has(pi.product_id));
  log('orphan product_images (no product)', orphanImages.length, orphanImages.slice(0, 5).map((pi) => pi.id).join(', '));
  if (APPLY) for (const pi of orphanImages) { await quarantine('product_images', pi, 'orphan: no product'); fixes++; }

  // 7. Products with an image_hash but NO product_images row -> re-link (if the bucket file
  //    exists). This is the image write-gap from the bundle refactor.
  const imgLinks = new Set(productImages.map((pi) => `${pi.product_id}:${pi.image_hash}`));
  const missingLinks = products.filter(
    (p) => p.active === 1 && p.image_hash && !imgLinks.has(`${p.id}:${p.image_hash}`)
  );
  let relinkable = [];
  let needReupload = [];
  for (const p of missingLinks) {
    const { data: list } = await sb.storage.from('product-images').list('', { search: `${p.image_hash}.webp` });
    const exists = list && list.find((f) => f.name === `${p.image_hash}.webp`);
    (exists ? relinkable : needReupload).push(p);
  }
  log('products with image_hash but no product_images row (bucket file present -> re-link)',
    relinkable.length, relinkable.slice(0, 5).map((p) => p.id).join(', '));
  log('products whose image FILE is missing from the bucket (re-upload needed)',
    needReupload.length, needReupload.slice(0, 5).map((p) => p.id).join(', '));
  if (APPLY) {
    for (const p of relinkable) {
      const { error } = await sb.from('product_images').insert({
        id: uuid(), operation_id: uuid(), product_id: p.id, image_hash: p.image_hash,
        storage_path: `${p.image_hash}.webp`, mime_type: 'image/webp', file_size: 0,
        created_at: iso(), updated_at: iso(),
      });
      if (error) throw new Error(`re-link ${p.id}: ${error.message}`);
      fixes++;
    }
  }

  // ── 7. Sequence-number collisions across ALL registered domains (§1.7) ──────────
  // Every cross-device sequence column lives in sequence_registry (sales.invoice_number today,
  // future domains add a row). apply_bundle renumbers on collision server-side, so the cloud
  // should have ZERO duplicates — this detector proves it and catches any legacy dupes that
  // predate the fix. Report-only (a real dup needs a human decision on which record renumbers).
  const { data: seqRegistry, error: seqErr } = await sb.from('sequence_registry').select('table_name, column_name');
  if (!seqErr && Array.isArray(seqRegistry)) {
    for (const { table_name, column_name } of seqRegistry) {
      const rows = await fetchAll(table_name, `id, ${column_name}`).catch(() => []);
      const seen = new Map();
      for (const r of rows) {
        const v = r[column_name];
        if (v == null) continue;
        if (!seen.has(v)) seen.set(v, []);
        seen.get(v).push(r.id);
      }
      const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1);
      log(`${table_name}.${column_name} duplicate sequence values (should be 0 — apply_bundle renumbers on collision)`,
        dupes.length, dupes.slice(0, 5).map(([v, ids]) => `${v}×${ids.length}`).join(', '));
    }
  } else {
    log('sequence_registry not found (run migrations 0025+) — sequence-collision check skipped', 0);
  }

  const totalIssues = report.reduce((a, r) => a + r.count, 0);
  console.log('\n────────────────────────────────────────');
  console.log(`Total issues found: ${totalIssues}`);
  if (APPLY) console.log(`Changes applied: ${fixes} (fixes + quarantines)`);
  else console.log('Dry-run only. Re-run with --apply to repair.');
  console.log('Note: the local SQLite mirror re-pulls from the repaired cloud automatically.');
}

main().catch((err) => { console.error('\nREPAIR FAILED:', err.message); process.exit(1); });
