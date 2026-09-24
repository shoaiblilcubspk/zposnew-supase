/**
 * Pull sync — server → local mirror (the read side of cloud-direct sync).
 *
 * - Bootstrap: on a fresh device, pull ALL rows for every synced table into local SQLite.
 * - Incremental: thereafter pull only rows whose server `updated_at` (or `created_at` for
 *   append-only tables) is newer than the last cursor we stored per table.
 * - Conflict rule (Rule 8): server row wins; we mirror it verbatim (server clock authoritative).
 *   Append-only tables (Rule 7) are insert-or-ignore — history is never rewritten.
 *
 * Cursors live in a local-only `sync_pull_cursor` table. No Realtime subscriptions (Rule 2.10 §3).
 */

import { getSupabase } from './supabaseClient';
import { getLocalDb, localExecute, localQueryOne } from './localDb';
import { SYNCED_TABLES, APPEND_ONLY_TABLES, type SyncedTable } from './localSchema';

const PAGE = 1000;

async function ensureCursorTable(): Promise<void> {
  await localExecute(`CREATE TABLE IF NOT EXISTS sync_pull_cursor (
    table_name TEXT PRIMARY KEY,
    last_synced_at TEXT NOT NULL
  );`);
}

async function getCursor(table: string): Promise<string | null> {
  const row = await localQueryOne<{ last_synced_at: string }>(
    `SELECT last_synced_at FROM sync_pull_cursor WHERE table_name = ?`, [table]
  );
  return row?.last_synced_at ?? null;
}

async function setCursor(table: string, ts: string): Promise<void> {
  await localExecute(
    `INSERT INTO sync_pull_cursor (table_name, last_synced_at) VALUES (?, ?)
     ON CONFLICT(table_name) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
    [table, ts]
  );
}

/** Column used for incremental watermark: append-only uses created_at, others updated_at. */
function cursorColumn(table: SyncedTable): 'created_at' | 'updated_at' {
  return APPEND_ONLY_TABLES.includes(table) ? 'created_at' : 'updated_at';
}

/** Convert a Supabase row (JS values) into a positional param list + upsert SQL for a table. */
function buildUpsert(table: SyncedTable, row: Record<string, any>, appendOnly: boolean): { sql: string; params: any[] } {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const params = cols.map((c) => normalizeValue(row[c]));

  if (appendOnly) {
    // Never rewrite history: insert or ignore on primary key.
    return {
      sql: `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
      params,
    };
  }
  // Server wins: replace the whole row (id is PK). operation_id UNIQUE stays consistent.
  return {
    sql: `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
    params,
  };
}

/** Coerce JS/JSON values to SQLite-storable primitives (booleans->0/1, objects->JSON text). */
function normalizeValue(v: any): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function pullTable(table: SyncedTable): Promise<number> {
  const supabase = getSupabase();
  const col = cursorColumn(table);
  const appendOnly = APPEND_ONLY_TABLES.includes(table);
  const cursor = await getCursor(table);

  let pulled = 0;
  let from = 0;
  let maxTs = cursor;

  for (;;) {
    let q = supabase.from(table).select('*').order(col, { ascending: true }).range(from, from + PAGE - 1);
    if (cursor) q = q.gt(col, cursor);

    const { data, error } = await q;
    if (error) throw new Error(`pull ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    const db = await getLocalDb();
    await db.transaction(async (tx) => {
      for (const row of data) {
        const { sql, params } = buildUpsert(table, row as Record<string, any>, appendOnly);
        await tx.execute(sql, params);
        const rowTs = (row as any)[col];
        if (rowTs && (!maxTs || new Date(rowTs).getTime() > new Date(maxTs).getTime())) {
          maxTs = rowTs;
        }
      }
    });

    pulled += data.length;
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (maxTs && maxTs !== cursor) await setCursor(table, maxTs);
  return pulled;
}

/** Pull every synced table once. Returns per-table counts. */
export async function pullAll(): Promise<Record<string, number>> {
  await ensureCursorTable();
  const result: Record<string, number> = {};
  for (const table of SYNCED_TABLES) {
    result[table] = await pullTable(table);
  }
  return result;
}

/** True when the local mirror has never been bootstrapped (no cursors yet). */
export async function needsBootstrap(): Promise<boolean> {
  await ensureCursorTable();
  const row = await localQueryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM sync_pull_cursor`);
  return (row?.n ?? 0) === 0;
}
