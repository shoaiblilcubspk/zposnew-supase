/**
 * Write-through helpers — the ONE pattern every repository uses to mutate data.
 *
 * ATOMIC ACTION BUNDLES (AGENTS.md §1.5): a single user action either fully saves
 * (local + cloud) or fully does not. Every write goes through `atomicWrite`, which performs,
 * in a SINGLE local SQLite transaction:
 *   (a) all row writes for the action, and
 *   (b) exactly ONE `sync_queue` bundle entry (same action `operation_id`).
 * Any error rolls back everything — zero rows, zero queue entries (§1.5.3).
 *
 * `insertRow` / `updateRow` / `softDeleteRow` are thin SINGLE-op wrappers over `atomicWrite`,
 * so there is exactly one write path. Multi-table actions (sale, product, purchase) build a
 * multi-op bundle and call `atomicWrite` directly.
 *
 * The background worker later pushes each bundle to Supabase as ONE unit (Phase 2 → RPC).
 * snake_case rows in, snake_case rows out (Rule 3). No camelCase conversion layer.
 */

import { getLocalDb } from './localDb';
import { enqueueInTx, type BundleRow } from './syncQueue';
import { APPEND_ONLY_TABLES, type SyncedTable } from './localSchema';
import type { ISqliteTransaction } from '../lib/db/types';
import { safeRandomUUID } from '../lib/crypto/uuid';

function nowIso(): string {
  return new Date().toISOString();
}

/** One `operation_id` per user action (§1.5.2). Generate once, reuse on every retry. */
export function newOperationId(): string {
  return safeRandomUUID();
}

function toSqliteValue(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function assertWritable(table: SyncedTable, op: 'update' | 'delete'): void {
  if (APPEND_ONLY_TABLES.includes(table)) {
    throw new Error(`${op} blocked: ${table} is append-only (Rule 7)`);
  }
}

// ── Op definitions ────────────────────────────────────────────────────────────

export interface AtomicInsert {
  table: SyncedTable;
  op: 'insert';
  row: Record<string, any>;
}
export interface AtomicUpdate {
  table: SyncedTable;
  op: 'update';
  id: string;
  patch: Record<string, any>;
}
export interface AtomicDelete {
  table: SyncedTable;
  op: 'delete';
  id: string;
}
export type AtomicOp = AtomicInsert | AtomicUpdate | AtomicDelete;

export interface AtomicWriteOptions {
  /** One id per user action; reused on retry (§1.5.2). Auto-generated if omitted. */
  operation_id?: string;
  /** Human-readable action name for the Bundle Registry / diagnostics. */
  action: string;
}

export interface AtomicWriteResult {
  operation_id: string;
  action: string;
  /** Full rows as written, in op order (updates carry the merged row). */
  rows: BundleRow[];
}

// ── Per-op executors (run INSIDE the shared transaction) ────────────────────────

async function execInsert(tx: ISqliteTransaction, table: SyncedTable, row: Record<string, any>): Promise<BundleRow> {
  const id = row.id ?? safeRandomUUID();
  const operation_id = row.operation_id ?? safeRandomUUID();
  const created_at = row.created_at ?? nowIso();
  const appendOnly = APPEND_ONLY_TABLES.includes(table);
  const full: Record<string, any> = appendOnly
    ? { ...row, id, operation_id, created_at }
    : { ...row, id, operation_id, created_at, updated_at: row.updated_at ?? created_at };

  const cols = Object.keys(full);
  const placeholders = cols.map(() => '?').join(', ');
  const params = cols.map((c) => toSqliteValue(full[c]));
  await tx.execute(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, params);

  return { table, op: 'insert', payload: full };
}

async function execUpdate(
  tx: ISqliteTransaction,
  table: SyncedTable,
  id: string,
  patch: Record<string, any>
): Promise<BundleRow> {
  assertWritable(table, 'update');
  // Each edit carries a fresh row-level operation_id + server-orderable updated_at (Rule 8).
  const full: Record<string, any> = { ...patch, id, operation_id: safeRandomUUID(), updated_at: nowIso() };
  const setCols = Object.keys(full).filter((c) => c !== 'id');
  const assignments = setCols.map((c) => `${c} = ?`).join(', ');
  const params = [...setCols.map((c) => toSqliteValue(full[c])), id];
  await tx.execute(`UPDATE ${table} SET ${assignments} WHERE id = ?`, params);

  // Push the full merged row so the cloud write is complete + idempotent.
  const merged = await tx.queryOne<Record<string, any>>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return { table, op: 'update', payload: merged ?? full };
}

async function execDelete(tx: ISqliteTransaction, table: SyncedTable, id: string): Promise<BundleRow> {
  assertWritable(table, 'delete');
  await tx.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return { table, op: 'delete', payload: { id } };
}

// ── The one write path ──────────────────────────────────────────────────────────

/**
 * Execute all `ops` + ONE bundle queue entry in a single SQLite transaction (§1.5.3).
 * On ANY error the whole transaction rolls back: zero rows, zero queue entries.
 */
export async function atomicWrite(ops: AtomicOp[], opts: AtomicWriteOptions): Promise<AtomicWriteResult> {
  if (!ops.length) throw new Error('atomicWrite: at least one op is required');
  const operation_id = opts.operation_id ?? safeRandomUUID();
  const action = opts.action;

  const db = await getLocalDb();
  const rows: BundleRow[] = await db.transaction(async (tx) => {
    const written: BundleRow[] = [];
    for (const op of ops) {
      if (op.op === 'insert') written.push(await execInsert(tx, op.table, op.row));
      else if (op.op === 'update') written.push(await execUpdate(tx, op.table, op.id, op.patch));
      else written.push(await execDelete(tx, op.table, op.id));
    }
    // Exactly ONE bundle entry for the whole action (§1.5.3).
    await enqueueInTx(tx, {
      operation_id,
      table_name: 'bundle',
      operation_type: 'bundle',
      payload: { action, rows: written },
    });
    return written;
  });

  return { operation_id, action, rows };
}

// ── Single-op wrappers (§1.5.3 — one write path) ─────────────────────────────────

/**
 * INSERT a single row as its own one-op bundle. Fills id/operation_id/timestamps if absent.
 * Returns the full row written.
 */
export async function insertRow<T extends Record<string, any>>(
  table: SyncedTable,
  row: T
): Promise<T & { id: string; operation_id: string }> {
  const operation_id = row.operation_id ?? safeRandomUUID();
  const result = await atomicWrite([{ table, op: 'insert', row: { ...row, operation_id } }], {
    operation_id,
    action: `insert_${table}`,
  });
  return result.rows[0].payload as T & { id: string; operation_id: string };
}

/** UPDATE a non-additive row by id as its own one-op bundle. Rejects append-only tables (Rule 7). */
export async function updateRow<T extends Record<string, any>>(
  table: SyncedTable,
  id: string,
  patch: T
): Promise<void> {
  await atomicWrite([{ table, op: 'update', id, patch }], { action: `update_${table}` });
}

/** Soft-delete (active/is_active = 0). Append-only tables can never be deleted. */
export async function softDeleteRow(
  table: SyncedTable,
  id: string,
  activeColumn: 'active' | 'is_active' = 'active'
): Promise<void> {
  assertWritable(table, 'delete');
  await atomicWrite([{ table, op: 'update', id, patch: { [activeColumn]: 0 } }], {
    action: `soft_delete_${table}`,
  });
}

/** Enqueue an idempotent RPC call (e.g. create_sale_atomic) — no local table write here. */
export async function enqueueRpc(fn: string, args: Record<string, unknown>, operation_id?: string): Promise<string> {
  const opId = operation_id ?? safeRandomUUID();
  const db = await getLocalDb();
  await db.transaction(async (tx) => {
    await enqueueInTx(tx, { operation_id: opId, table_name: 'rpc', operation_type: 'rpc', payload: { fn, args } });
  });
  return opId;
}
