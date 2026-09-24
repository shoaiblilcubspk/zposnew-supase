/**
 * Backup Service — the single facade the UI calls. Ties together the domain registry, export
 * engine v2, .zpos encryption, and the bundle-based import engine. No whole-DB replace.
 */

import { ALL_DOMAIN_KEYS } from './domainRegistry';
import { buildExport, exportToZipBlob, type ExportOptions } from './exportEngineV2';
import { encryptArchive, decryptArchive, isZposEnvelope } from './zposArchive';
import { buildImportPreview, applyImport, type ImportPreview, type ImportReport, type ConflictMode } from './importEngine';

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

export { ALL_DOMAIN_KEYS };
export { DOMAIN_REGISTRY } from './domainRegistry';
