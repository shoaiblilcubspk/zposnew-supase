/**
 * Export Engine v2 — reads the LIVE cloud-mirror (src/data local SQLite) and exports selected
 * domains, driven by the domain registry. Produces one JSON per table + a manifest (app/schema
 * version, created_at, per-file row counts + SHA-256 checksums). Sensitive columns (e.g. staff
 * password hashes) are stripped unless `includeSensitive` is explicitly set (encrypted .zpos only).
 *
 * NOTE: this replaces the old whole-DB binary backup which operated on the legacy DB. Import
 * (Phase 3) will write these rows back through the bundle system — never a DB replace.
 */

import { localQuery } from '../../data';
import { getImageBytesForExport, isImageHash } from '../media/localImageStore';
import { DOMAIN_REGISTRY, getDomain, withDependencies, type DomainDef } from './domainRegistry';

export const EXPORT_FORMAT_VERSION = 2;

export interface ExportManifestFile {
  domain: string;
  table: string;
  file: string;
  rowCount: number;
  sha256: string;
  appendOnly: boolean;
}

export interface ExportManifest {
  formatVersion: number;
  appVersion: string;
  createdAt: string;
  domains: string[];
  includeSensitive: boolean;
  files: ExportManifestFile[];
  totalRows: number;
}

export interface ExportResult {
  manifest: ExportManifest;
  /** filename -> JSON string (manifest.json + one file per table). */
  files: Record<string, string>;
}

export interface ExportOptions {
  includeSensitive?: boolean;
  autoIncludeDeps?: boolean;
  appVersion?: string;
  /** Bundle the actual image files into the archive (images/{hash}.webp, base64). */
  includeImages?: boolean;
}

function u8ToB64(b: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(b).toString('base64');
  let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s);
}

/** Collect content-addressed image hashes referenced by the exported rows. */
function collectImageHashes(files: Record<string, string>): Set<string> {
  const hashes = new Set<string>();
  const scan = (table: string, cols: string[]) => {
    const raw = files[`data/${table}.json`];
    if (!raw) return;
    try {
      for (const row of JSON.parse(raw) as Record<string, any>[]) {
        for (const c of cols) {
          const v = row[c];
          if (typeof v === 'string' && isImageHash(v)) hashes.add(v);
        }
      }
    } catch { /* ignore */ }
  };
  scan('products', ['image_hash']);
  scan('product_images', ['image_hash']);
  scan('bundles', ['image']);
  return hashes;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Non-crypto fallback (never used in the browser/node-with-webcrypto path).
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function stripSensitive(rows: Record<string, any>[], cols: string[] | undefined, includeSensitive: boolean): Record<string, any>[] {
  if (includeSensitive || !cols || cols.length === 0) return rows;
  return rows.map((r) => {
    const copy = { ...r };
    for (const c of cols) delete copy[c];
    return copy;
  });
}

/** Build an in-memory export (manifest + JSON files) for the selected domains. */
export async function buildExport(domainKeys: string[], opts: ExportOptions = {}): Promise<ExportResult> {
  const includeSensitive = Boolean(opts.includeSensitive);
  const keys = opts.autoIncludeDeps === false ? domainKeys : withDependencies(domainKeys);
  const defs: DomainDef[] = keys.map(getDomain).filter(Boolean) as DomainDef[];

  const files: Record<string, string> = {};
  const manifestFiles: ExportManifestFile[] = [];
  let totalRows = 0;

  for (const def of defs) {
    for (const t of def.tables) {
      // Only export live rows (respect soft-delete tombstones / active flag when present).
      let rows: Record<string, any>[] = [];
      try {
        rows = await localQuery<Record<string, any>>(`SELECT * FROM ${t.name};`);
      } catch {
        continue; // table not present locally — skip gracefully
      }
      const clean = stripSensitive(rows, t.sensitiveColumns, includeSensitive);
      const json = JSON.stringify(clean);
      const file = `data/${t.name}.json`;
      files[file] = json;
      manifestFiles.push({
        domain: def.key, table: t.name, file,
        rowCount: clean.length, sha256: await sha256Hex(json), appendOnly: Boolean(t.appendOnly),
      });
      totalRows += clean.length;
    }
  }

  const manifest: ExportManifest = {
    formatVersion: EXPORT_FORMAT_VERSION,
    appVersion: opts.appVersion ?? 'unknown',
    createdAt: new Date().toISOString(),
    domains: keys,
    includeSensitive,
    files: manifestFiles,
    totalRows,
  };

  // Optionally bundle the actual image files (content-addressed) so a cross-project import can
  // re-upload them to the new bucket. Missing images are recorded, not fatal.
  const images: string[] = [];
  const missingImages: string[] = [];
  if (opts.includeImages) {
    for (const hash of collectImageHashes(files)) {
      const got = await getImageBytesForExport(hash);
      if (got) { files[`images/${hash}.webp`] = u8ToB64(got.data); images.push(hash); }
      else missingImages.push(hash);
    }
    (manifest as any).images = images;
    (manifest as any).missingImages = missingImages;
  }

  files['manifest.json'] = JSON.stringify(manifest, null, 2);

  return { manifest, files };
}

/** Package an ExportResult into a downloadable ZIP Blob (browser). */
export async function exportToZipBlob(result: ExportResult): Promise<Blob> {
  const JSZipMod = await import('jszip');
  const JSZip = (JSZipMod as any).default ?? JSZipMod;
  const zip = new JSZip();
  for (const [name, content] of Object.entries(result.files)) zip.file(name, content);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Package an ExportResult into a human-readable Excel workbook (one sheet per table). */
export async function exportToExcelBlob(result: ExportResult): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const [name, content] of Object.entries(result.files)) {
    const m = /^data\/(.+)\.json$/.exec(name);
    if (!m) continue;
    const rows = JSON.parse(content) as Record<string, any>[];
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, sheet, m[1].slice(0, 31)); // Excel sheet name <= 31 chars
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Parse an uploaded .xlsx/.csv into a table->rows map (sheet name = table name). */
export async function parseSpreadsheet(buffer: ArrayBuffer): Promise<Record<string, any[]>> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const out: Record<string, any[]> = {};
  for (const sheetName of wb.SheetNames) {
    out[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null }) as any[];
  }
  return out;
}

export { DOMAIN_REGISTRY };
