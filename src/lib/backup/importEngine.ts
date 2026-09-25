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

/** Dry-run preview: how many rows are new vs already present, per table. No writes. */
export async function buildImportPreview(files: Record<string, string>): Promise<ImportPreview> {
  const manifest = await verifyArchive(files);
  const rows: ImportPreviewRow[] = [];
  for (const f of manifest.files) {
    const data = JSON.parse(files[f.file] || '[]') as Record<string, any>[];
    let existing = 0;
    if (data.length) {
      const ids = data.map((r) => r.id).filter(Boolean);
      const present = new Set(
        (await localQuery<{ id: string }>(
          `SELECT id FROM ${f.table} WHERE id IN (${ids.map(() => '?').join(',')});`, ids
        ).catch(() => [])).map((r) => r.id)
      );
      existing = data.filter((r) => present.has(r.id)).length;
    }
    rows.push({ table: f.table, total: data.length, newRows: data.length - existing, existing, appendOnly: f.appendOnly });
  }
  return { manifest, rows };
}

function stableOpId(importId: string, table: string, chunk: number): string {
  return `import-${importId.slice(0, 12)}-${table}-${chunk}`;
}

/** Apply the archive via bundles. Idempotent + chunked; returns a per-table report. */
export async function applyImport(files: Record<string, string>, opts: { conflictMode?: ConflictMode } = {}): Promise<ImportReport[]> {
  const manifest = await verifyArchive(files);
  const conflictMode: ConflictMode = opts.conflictMode ?? 'update';
  const importId = await sha256Hex(files['manifest.json']);
  const report: ImportReport[] = [];

  // Apply domains in registry (dependency) order so parents land before children.
  const orderedTables: Array<{ table: string; appendOnly: boolean }> = [];
  for (const def of DOMAIN_REGISTRY) {
    if (!manifest.domains.includes(def.key)) continue;
    for (const t of def.tables) {
      const mf = manifest.files.find((f) => f.table === t.name);
      if (mf) orderedTables.push({ table: t.name, appendOnly: mf.appendOnly });
    }
  }

  for (const { table, appendOnly } of orderedTables) {
    const mf = manifest.files.find((f) => f.table === table)!;
    const data = JSON.parse(files[mf.file] || '[]') as Record<string, any>[];
    let inserted = 0, updated = 0, skipped = 0;

    // Partition into new vs existing (single lookup).
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

    // Chunk the ops into idempotent bundles.
    for (let i = 0; i < ops.length; i += CHUNK) {
      const chunk = ops.slice(i, i + CHUNK);
      await atomicWrite(chunk, { operation_id: stableOpId(importId, table, i / CHUNK), action: `import_${table}` });
    }
    report.push({ table, inserted, updated, skipped });
  }

  // Upload any bundled image files into THIS project's bucket (content-addressed; no old-project
  // URL is ever stored — rows reference the hash, resolved against the current bucket).
  const b64ToU8 = (s: string): Uint8Array => {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
    const bin = atob(s); const o = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
    return o;
  };
  for (const [name, content] of Object.entries(files)) {
    const m = /^images\/([0-9a-f]{64})\.webp$/.exec(name);
    if (!m) continue;
    try { await saveImportedImage(m[1], b64ToU8(content), 'image/webp'); } catch { /* image best-effort */ }
  }

  return report;
}

export { DOMAIN_REGISTRY, getDomain };
