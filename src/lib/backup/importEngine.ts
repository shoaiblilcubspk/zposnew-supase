/**
 * Import Engine v2 — restores/imports a backup archive (produced by exportEngineV2) by writing
 * rows back through the BUNDLE system (atomicWrite → apply_bundle → sync), NEVER by replacing
 * the local DB. So an import reaches Supabase and every device like any normal action.
 *
 * - Preview first: per table new / update / skip counts (no writes).
 * - Apply: per table, rows are partitioned (new vs existing) and written in chunks; each chunk
 *   is ONE atomic bundle with a DETERMINISTIC operation_id (import id + table + chunk), so
 *   re-running the same import is idempotent (apply_bundle dedupes) and a failed chunk rolls
 *   back completely and can be retried.
 * - Append-only tables (Rule 7): existing rows are skipped, never updated/deleted.
 * - Conflict mode for non-additive tables: 'update' (server/import wins) or 'skip'.
 *
 * NOTE: this is the id-preserving path (restore into the same or a fresh project). Cross-project
 * ID remapping + image bucket migration are layered on in a later phase.
 */

import { localQuery, atomicWrite, type AtomicOp } from '../../data';
import { saveImportedImage } from '../media/localImageStore';
import { DOMAIN_REGISTRY, getDomain } from './domainRegistry';

const CHUNK = 200;

export type ConflictMode = 'update' | 'skip';

export interface ImportManifest {
  formatVersion: number;
  appVersion: string;
  createdAt: string;
  domains: string[];
  includeSensitive: boolean;
  files: Array<{ domain: string; table: string; file: string; rowCount: number; sha256: string; appendOnly: boolean }>;
  totalRows: number;
}

export interface ImportPreviewRow { table: string; total: number; newRows: number; existing: number; appendOnly: boolean; }
export interface ImportPreview { manifest: ImportManifest; rows: ImportPreviewRow[]; }
export interface ImportReport { table: string; inserted: number; updated: number; skipped: number; }

function readManifest(files: Record<string, string>): ImportManifest {
  const raw = files['manifest.json'];
  if (!raw) throw new Error('Invalid archive: manifest.json missing');
  const m = JSON.parse(raw) as ImportManifest;
  if (!m.formatVersion || !Array.isArray(m.files)) throw new Error('Invalid archive: bad manifest');
  return m;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Validate the archive's per-file checksums against the manifest. Throws on tampering. */
export async function verifyArchive(files: Record<string, string>): Promise<ImportManifest> {
  const m = readManifest(files);
  for (const f of m.files) {
    const content = files[f.file];
    if (content === undefined) throw new Error(`Archive incomplete: ${f.file} missing`);
    if (await sha256Hex(content) !== f.sha256) throw new Error(`Integrity check failed for ${f.file} (tampered or corrupt)`);
  }
  return m;
}

function stableOpId(importId: string, table: string, chunk: number): string {
  return `import-${importId.slice(0, 12)}-${table}-${chunk}`;
}

/** Order the tables present in `rowsByTable` by registry (dependency) order + append-only flag. */
function orderTables(rowsByTable: Record<string, any[]>): Array<{ table: string; appendOnly: boolean }> {
  const out: Array<{ table: string; appendOnly: boolean }> = [];
  for (const def of DOMAIN_REGISTRY) {
    for (const t of def.tables) {
      if (rowsByTable[t.name] && !out.some((o) => o.table === t.name)) {
        out.push({ table: t.name, appendOnly: Boolean(t.appendOnly) });
      }
    }
  }
  return out;
}

/** Preview (no writes) from a table->rows map. Works for archives AND spreadsheet/JSON imports. */
export async function previewRows(rowsByTable: Record<string, any[]>): Promise<ImportPreviewRow[]> {
  const rows: ImportPreviewRow[] = [];
  for (const { table, appendOnly } of orderTables(rowsByTable)) {
    const data = rowsByTable[table] || [];
    let existing = 0;
    const ids = data.map((r) => r.id).filter(Boolean);
    if (ids.length) {
      const present = new Set(
        (await localQuery<{ id: string }>(
          `SELECT id FROM ${table} WHERE id IN (${ids.map(() => '?').join(',')});`, ids
        ).catch(() => [])).map((r) => r.id)
      );
      existing = data.filter((r) => r.id && present.has(r.id)).length;
    }
    rows.push({ table, total: data.length, newRows: data.length - existing, existing, appendOnly });
  }
  return rows;
}

/** Core apply: partition new/existing, chunk into idempotent bundles, per registry order. */
export async function applyRows(rowsByTable: Record<string, any[]>, opts: { conflictMode?: ConflictMode; importId: string }): Promise<ImportReport[]> {
  const conflictMode: ConflictMode = opts.conflictMode ?? 'update';
  const report: ImportReport[] = [];

  for (const { table, appendOnly } of orderTables(rowsByTable)) {
    const data = rowsByTable[table] || [];
    let inserted = 0, updated = 0, skipped = 0;

    const ids = data.map((r) => r.id).filter(Boolean);
    const present = new Set<string>();
    for (let i = 0; i < ids.length; i += 500) {
      const slice = ids.slice(i, i + 500);
      const rows = await localQuery<{ id: string }>(
        `SELECT id FROM ${table} WHERE id IN (${slice.map(() => '?').join(',')});`, slice
      ).catch(() => []);
      rows.forEach((r) => present.add(r.id));
    }

    const ops: AtomicOp[] = [];
    for (const row of data) {
      const exists = row.id && present.has(row.id);
      if (!exists) { ops.push({ table: table as any, op: 'insert', row }); inserted++; }
      else if (appendOnly) { skipped++; }
      else if (conflictMode === 'update') {
        const { id, ...patch } = row;
        ops.push({ table: table as any, op: 'update', id, patch }); updated++;
      } else { skipped++; }
    }

    for (let i = 0; i < ops.length; i += CHUNK) {
      await atomicWrite(ops.slice(i, i + CHUNK), { operation_id: stableOpId(opts.importId, table, i / CHUNK), action: `import_${table}` });
    }
    report.push({ table, inserted, updated, skipped });
  }
  return report;
}

/** Parse a verified archive's data files into a table->rows map. */
function archiveToRows(manifest: ImportManifest, files: Record<string, string>): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  for (const f of manifest.files) out[f.table] = JSON.parse(files[f.file] || '[]');
  return out;
}

/** Dry-run preview for a verified archive. */
export async function buildImportPreview(files: Record<string, string>): Promise<ImportPreview> {
  const manifest = await verifyArchive(files);
  return { manifest, rows: await previewRows(archiveToRows(manifest, files)) };
}

/** Apply a verified archive via bundles (idempotent), then upload any bundled image files. */
export async function applyImport(files: Record<string, string>, opts: { conflictMode?: ConflictMode } = {}): Promise<ImportReport[]> {
  const manifest = await verifyArchive(files);
  const importId = await sha256Hex(files['manifest.json']);
  const report = await applyRows(archiveToRows(manifest, files), { conflictMode: opts.conflictMode, importId });

  // Upload bundled image files into THIS project's bucket (content-addressed; no old URL stored).
  const b64ToU8 = (s: string): Uint8Array => {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
    const bin = atob(s); const o = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
    return o;
  };
  for (const [name, content] of Object.entries(files)) {
    const m = /^images\/([0-9a-f]{64})\.webp$/.exec(name);
    if (!m) continue;
    try { await saveImportedImage(m[1], b64ToU8(content), 'image/webp'); } catch { /* best-effort */ }
  }
  return report;
}

export { DOMAIN_REGISTRY, getDomain };
