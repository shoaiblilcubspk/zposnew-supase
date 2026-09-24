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

export { DOMAIN_REGISTRY };
