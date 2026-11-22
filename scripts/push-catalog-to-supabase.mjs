/**
 * Direct Catalog Seeder to Supabase (Pooshak raza bhai)
 * Reads Total_Stock_21-11-2026_Catalog.json and inserts all 30 products,
 * categories, suppliers, and initial inventory ledger entries directly into Supabase.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const CATALOG_JSON = '/Users/shoaib/Downloads/Total_Stock_21-11-2026_Catalog.json';
const ENV_FILE = path.resolve(process.cwd(), 'env backups/Pooshak-raza-bhai.env');

function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_FILE)) return env;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase credentials in Pooshak-raza-bhai.env');
    process.exit(1);
  }

  console.log(`Connecting to Supabase: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  // Test connection
  try {
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase query error (project might be paused):', error.message);
      process.exit(1);
    }
    console.log('Connection successful! Current products count:', data);
  } catch (err) {
    console.error('Connection failed (project is paused or unreachable):', err.message);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, 'utf8'));
  const products = catalog.products || [];
  console.log(`Found ${products.length} products to push.`);

  // 1. Collect Categories
  const categoryNames = [...new Set(products.map(p => p.category).filter(Boolean))];
  const catMap = new Map();
  for (const catName of categoryNames) {
    const { data: existing } = await supabase.from('categories').select('id, name').eq('name', catName).maybeSingle();
    if (existing) {
      catMap.set(catName, existing.id);
    } else {
      const catId = crypto.randomUUID();
      await supabase.from('categories').insert({
        id: catId,
        operation_id: crypto.randomUUID(),
        name: catName,
        active: 1
      });
      catMap.set(catName, catId);
    }
  }

  // 2. Collect Suppliers
  const supplierNames = [...new Set(products.map(p => p.supplier).filter(Boolean))];
  const supMap = new Map();
  for (const supName of supplierNames) {
    const { data: existing } = await supabase.from('suppliers').select('id, name').eq('name', supName).maybeSingle();
    if (existing) {
      supMap.set(supName, existing.id);
    } else {
      const supId = crypto.randomUUID();
      await supabase.from('suppliers').insert({
        id: supId,
        operation_id: crypto.randomUUID(),
        name: supName,
        active: 1
      });
      supMap.set(supName, supId);
    }
  }

  // 3. Upsert Products + Ledger
  let count = 0;
  for (const p of products) {
    const { data: existing } = await supabase.from('products').select('id').eq('name', p.name).maybeSingle();
    const prodId = existing?.id || crypto.randomUUID();
    const catId = catMap.get(p.category) || null;
    const supId = supMap.get(p.supplier) || null;

    if (!existing) {
      const opId = crypto.randomUUID();
      const { error: pErr } = await supabase.from('products').insert({
        id: prodId,
        operation_id: opId,
        name: p.name,
        category_id: catId,
        supplier_id: supId,
        cost_price: p.cost || 0,
        retail_price: p.price || 0,
        stock: p.stock || 0,
        min_stock_alert: p.minStock || 5,
        barcode: p.barcode || null,
        sku: p.sku || null,
        product_type: p.productType || 'simple',
        track_inventory: 1,
        active: 1
      });
      if (pErr) {
        console.error(`Error inserting product ${p.name}:`, pErr.message);
        continue;
      }

      // Initial inventory ledger movement
      if (p.stock > 0) {
        await supabase.from('inventory_ledger').insert({
          id: crypto.randomUUID(),
          operation_id: crypto.randomUUID(),
          product_id: prodId,
          type: 'IN',
          quantity: p.stock,
          reference_type: 'initial',
          notes: 'Initial stock import from Excel'
        });
      }
      count++;
    } else {
      console.log(`Product already exists: ${p.name}`);
    }
  }

  console.log(`Successfully imported ${count} new products into Supabase!`);
}

main().catch(console.error);
