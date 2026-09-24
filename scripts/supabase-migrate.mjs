/**
 * Supabase migration runner (cloud-direct architecture).
 * Applies every supabase/migrations/*.sql file, in numeric order, via the Management API
 * database/query endpoint. A public._migrations ledger prevents re-running an applied file.
 *
 * Usage:
 *   node scripts/supabase-migrate.mjs          # apply pending migrations
 *   node scripts/supabase-migrate.mjs --status # list applied/pending
 *
 * Requires .env.local: SUPABASE_MGMT_API_KEY, SUPABASE_REF.
 */

import fs from 'fs';
import path from 'path';

const ENV_FILE = path.resolve(process.cwd(), '.env.local');
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const API = 'https://api.supabase.com/v1';

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

async function runSql(ref, key, query) {
  const res = await fetch(`${API}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function ensureLedger(ref, key) {
  await runSql(ref, key, `
    create table if not exists public._migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );`);
}

async function appliedSet(ref, key) {
  const rows = await runSql(ref, key, `select name from public._migrations order by name;`);
  return new Set((Array.isArray(rows) ? rows : []).map((r) => r.name));
}

function migrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
}

async function main() {
  const env = loadEnv();
  const key = env.SUPABASE_MGMT_API_KEY;
  const ref = env.SUPABASE_REF;
  if (!key || !ref) {
    console.error('ERROR: SUPABASE_MGMT_API_KEY and SUPABASE_REF required in .env.local');
    process.exit(1);
  }

  await ensureLedger(ref, key);
  const applied = await appliedSet(ref, key);
  const files = migrationFiles();

  if (process.argv.includes('--status')) {
    for (const f of files) console.log(`${applied.has(f) ? '[x]' : '[ ]'} ${f}`);
    return;
  }

  let count = 0;
  for (const f of files) {
    if (applied.has(f)) { console.log(`skip  ${f} (already applied)`); continue; }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    process.stdout.write(`apply ${f} ... `);
    await runSql(ref, key, sql);
    await runSql(ref, key, `insert into public._migrations(name) values ('${f}') on conflict do nothing;`);
    console.log('ok');
    count++;
  }
  console.log(count ? `\n✅ Applied ${count} migration(s).` : '\n✅ Up to date, nothing to apply.');
}

main().catch((e) => { console.error('\nMigration failed:', e.message); process.exit(1); });
