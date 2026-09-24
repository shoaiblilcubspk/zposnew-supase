import React, { useState } from 'react';
import { Download, Upload, Shield, CheckCircle2, ListChecks } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { CapsLockIndicator } from '../../../shared/ui/CapsLockIndicator';
import {
  exportEncrypted, readBackupFile, previewBackup, importBackup,
} from '../../../lib/backup/backupService';
import type { ImportPreview } from '../../../lib/backup/importEngine';
import { sonner } from '../../../lib/sonner';

export function BackupRestoreTab() {
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [files, setFiles] = useState<Record<string, string> | null>(null);

  const handleCreateBackup = async () => {
    if (!backupPassword || backupPassword.length < 4) {
      sonner.error('Please enter a password with at least 4 characters');
      return;
    }
    setIsBackingUp(true);
    try {
      sonner.loading('Creating encrypted backup...');
      const zpos = await exportEncrypted(backupPassword);
      const blob = new Blob([zpos], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zaynahs-backup-${new Date().toISOString().slice(0, 10)}.zpos`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sonner.dismissAll();
      sonner.success(`Backup saved: ${(blob.size / 1024).toFixed(1)} KB`);
      setBackupPassword('');
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreview(null);
    setFiles(null);
    setRestoreFile(e.target.files?.[0] || null);
  };

  const handlePreview = async () => {
    if (!restoreFile) { sonner.error('Please select a backup file first'); return; }
    setIsImporting(true);
    try {
      sonner.loading('Reading & verifying backup...');
      const text = await restoreFile.text();
      const parsed = await readBackupFile(text, restorePassword || undefined);
      const pv = await previewBackup(parsed);
      setFiles(parsed);
      setPreview(pv);
      sonner.dismissAll();
      sonner.success('Backup verified. Review the changes below, then Import.');
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Failed to read backup');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (!files) return;
    setIsImporting(true);
    try {
      sonner.loading('Importing (syncing to cloud & all devices)...');
      const report = await importBackup(files, 'update');
      const inserted = report.reduce((a, r) => a + r.inserted, 0);
      const updated = report.reduce((a, r) => a + r.updated, 0);
      sonner.dismissAll();
      sonner.success(`Import complete: ${inserted} added, ${updated} updated. Syncing to all devices.`);
      setPreview(null); setFiles(null); setRestoreFile(null); setRestorePassword('');
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Import failed — nothing was half-saved.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 text-[13px] tracking-[-0.01em]">
      {/* Create Backup */}
      <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px]">Create Encrypted Backup</h3>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          Exports your live data (all domains) as an encrypted <span className="font-mono text-[12px]">.zpos</span>{' '}
          file (AES-256-GCM). Staff password hashes are excluded. Your cloud (Supabase) remains the
          primary backup; this file is for offline/portable copies.
        </p>
        <div className="max-w-md space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Backup Encryption Password</label>
              <CapsLockIndicator variant="inline" />
            </div>
            <input
              type="password" placeholder="Enter strong password..." value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              className="w-full h-8 px-3 rounded bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
          <Button size="md" variant="primary" disabled={isBackingUp || !backupPassword} onClick={handleCreateBackup} className="flex items-center justify-center gap-2 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            {isBackingUp ? 'Encrypting...' : 'Export Encrypted Backup (.zpos)'}
          </Button>
        </div>
      </Card>

      {/* Import from Backup (safe — via bundles, no DB replace) */}
      <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px]">Import from Backup</h3>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          Imports a <span className="font-mono text-[12px]">.zpos</span> backup. Rows are written
          through the normal sync system (never a database replace), so the import reaches the cloud
          and every other device. Preview the changes before applying.
        </p>
        <div className="max-w-md space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">Select Backup (.zpos)</label>
            <input type="file" accept=".zpos,.json" onChange={handleFileChange}
              className="block w-full text-[12px] text-neutral-500 dark:text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[12px] file:bg-neutral-100 dark:file:bg-white/[0.08] file:text-neutral-900 dark:file:text-white" />
          </div>
          {restoreFile && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Backup Password</label>
                <CapsLockIndicator variant="inline" />
              </div>
              <input type="password" placeholder="Password used for this backup..." value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                className="w-full h-8 px-3 rounded bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary" />
            </div>
          )}

          {!preview ? (
            <Button size="md" variant="secondary" disabled={isImporting || !restoreFile} onClick={handlePreview} className="flex items-center justify-center gap-2 w-full sm:w-auto">
              <ListChecks className="w-4 h-4" />
              {isImporting ? 'Reading...' : 'Preview Changes'}
            </Button>
          ) : (
            <>
              <div className="rounded border border-neutral-200 dark:border-white/[0.08] divide-y divide-neutral-100 dark:divide-white/[0.06] max-h-56 overflow-auto">
                {preview.rows.filter((r) => r.total > 0).map((r) => (
                  <div key={r.table} className="flex items-center justify-between px-3 py-1.5 text-[12px]">
                    <span className="text-neutral-700 dark:text-neutral-200">{r.table}</span>
                    <span className="text-neutral-500">
                      <span className="text-emerald-600 dark:text-emerald-400">+{r.newRows} new</span>
                      {' · '}{r.appendOnly ? `${r.existing} kept` : `${r.existing} update`}
                    </span>
                  </div>
                ))}
              </div>
              <Button size="md" variant="primary" disabled={isImporting} onClick={handleImport} className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <CheckCircle2 className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Import (sync to all devices)'}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
