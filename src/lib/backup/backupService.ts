/**
 * Backup Service — the single facade the UI calls. Ties together the domain registry, export
 * engine v2, .zpos encryption, and the bundle-based import engine. No whole-DB replace.
 */

import { ALL_DOMAIN_KEYS } from './domainRegistry';
import { buildExport, exportToZipBlob, exportToExcelBlob, parseSpreadsheet, type ExportOptions } from './exportEngineV2';
import { encryptArchive, decryptArchive, isZposEnvelope } from './zposArchive';
import { buildImportPreview, applyImport, previewRows, applyRows, type ImportPreview, type ImportPreviewRow, type ImportReport, type ConflictMode } from './importEngine';

function appVersion(): string {
  try { return (import.meta as any).env?.VITE_APP_VERSION || '1.0.0'; } catch { return '1.0.0'; }
}

/** Export selected domains (default: all) as an encrypted .zpos string. */
export async function exportEncrypted(password: string, domainKeys: string[] = ALL_DOMAIN_KEYS, opts: ExportOptions = {}): Promise<string> {
  const result = await buildExport(domainKeys, { ...opts, appVersion: appVersion() });
  return encryptArchive(result.files, password);
}

/** Export selected domains as a plain (unencrypted) ZIP blob — sensitive columns excluded. */
export async function exportZip(domainKeys: string[] = ALL_DOMAIN_KEYS, opts: ExportOptions = {}): Promise<Blob> {
  const result = await buildExport(domainKeys, { ...opts, includeSensitive: false, appVersion: appVersion() });
  return exportToZipBlob(result);
}

/** Parse an uploaded backup (encrypted .zpos text or a plain files-map JSON) into a files map. */
export async function readBackupFile(text: string, password?: string): Promise<Record<string, string>> {
  if (isZposEnvelope(text)) {
    if (!password) throw new Error('This backup is encrypted — enter its password.');
    return decryptArchive(text, password);
  }
  // Plain JSON files-map (e.g. an unencrypted export saved as JSON).
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === 'object' && parsed['manifest.json']) return parsed as Record<string, string>;
  throw new Error('Unrecognized backup file.');
}

export async function previewBackup(files: Record<string, string>): Promise<ImportPreview> {
  return buildImportPreview(files);
}

export async function importBackup(files: Record<string, string>, conflictMode: ConflictMode = 'update'): Promise<ImportReport[]> {
  return applyImport(files, { conflictMode });
}

/** Export selected domains as a human-readable Excel workbook (one sheet per table). */
export async function exportExcel(domainKeys: string[] = ALL_DOMAIN_KEYS, opts: ExportOptions = {}): Promise<Blob> {
  const result = await buildExport(domainKeys, { ...opts, includeSensitive: false, appVersion: appVersion() });
  return exportToExcelBlob(result);
}

/** Preview a human-edited spreadsheet (.xlsx/.csv) import (no manifest/checksum). */
export async function previewSpreadsheet(buffer: ArrayBuffer): Promise<ImportPreviewRow[]> {
  return previewRows(await parseSpreadsheet(buffer));
}

/** Import a human-edited spreadsheet via the same bundle pipeline as archives. */
export async function importSpreadsheet(buffer: ArrayBuffer, conflictMode: ConflictMode = 'update'): Promise<ImportReport[]> {
  const rowsByTable = await parseSpreadsheet(buffer);
  const importId = await (async () => {
    const text = JSON.stringify(Object.keys(rowsByTable).sort()) + Date.now();
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  })();
  return applyRows(rowsByTable, { conflictMode, importId });
}

export { ALL_DOMAIN_KEYS };
export { DOMAIN_REGISTRY } from './domainRegistry';
