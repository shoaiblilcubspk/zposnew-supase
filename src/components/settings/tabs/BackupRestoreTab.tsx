import React, { useState } from 'react';
import { Download, Upload, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { CapsLockIndicator } from '../../../shared/ui/CapsLockIndicator';
import { createEncryptedBackup } from '../../../lib/backup/backupEngine';
import { restoreFromBackup } from '../../../lib/backup/restoreEngine';
import { sonner } from '../../../lib/sonner';

export function BackupRestoreTab() {
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const handleCreateBackup = async () => {
    if (!backupPassword || backupPassword.length < 4) {
      sonner.error('Please enter a password with at least 4 characters');
      return;
    }

    setIsBackingUp(true);
    try {
      sonner.loading('Creating encrypted backup...');
      const result = await createEncryptedBackup(backupPassword);

      // Trigger browser download
      const blob = new Blob([result.jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      sonner.dismissAll();
      sonner.success(`Backup saved: ${(result.archive.sizeBytes / 1024).toFixed(1)} KB`);
      setBackupPassword('');
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      sonner.error('Please select a backup file first');
      return;
    }
    if (!restorePassword) {
      sonner.error('Please enter the backup password');
      return;
    }

    const confirmed = await sonner.confirm(
      'Restore Database?',
      'Warning: This will replace the local database with the backup archive.',
      'YES, RESTORE'
    );
    if (!confirmed.isConfirmed) return;

    setIsRestoring(true);
    try {
      sonner.loading('Verifying and restoring database...');
      const content = await restoreFile.text();
      await restoreFromBackup(content, restorePassword);

      sonner.dismissAll();
      sonner.success('Database restored successfully! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 text-[13px] tracking-[-0.01em]">
      {/* Create Backup Card */}
      <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px]">Create Encrypted Backup</h3>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          Generates an atomic snapshot of your local SQLite database, encrypted with AES-256-GCM.
          Store this archive safely on a USB drive or cloud folder for disaster recovery.
        </p>

        <div className="max-w-md space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
                Backup Encryption Password
              </label>
              <CapsLockIndicator variant="inline" />
            </div>
            <input
              type="password"
              placeholder="Enter strong password..."
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              className="w-full h-8 px-3 rounded bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          <Button
            size="md"
            variant="primary"
            disabled={isBackingUp || !backupPassword}
            onClick={handleCreateBackup}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            {isBackingUp ? 'Encrypting...' : 'Export Encrypted Backup (.zpos)'}
          </Button>
        </div>
      </Card>

      {/* Restore Backup Card */}
      <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px]">Restore from Backup</h3>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          Restore an existing <span className="font-mono text-[12px]">.zpos</span> backup file onto this terminal.
          The database will be verified for cryptographic integrity before replacement.
        </p>

        <div className="max-w-md space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Select Backup Archive (.zpos)
            </label>
            <input
              type="file"
              accept=".zpos,.json"
              onChange={handleFileChange}
              className="block w-full text-[12px] text-neutral-500 dark:text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[12px] file:bg-neutral-100 dark:file:bg-white/[0.08] file:text-neutral-900 dark:file:text-white"
            />
          </div>

          {restoreFile && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
                  Backup Password
                </label>
                <CapsLockIndicator variant="inline" />
              </div>
              <input
                type="password"
                placeholder="Enter password used during backup..."
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                className="w-full h-8 px-3 rounded bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <Button
            size="md"
            variant="danger"
            disabled={isRestoring || !restoreFile || !restorePassword}
            onClick={handleRestoreBackup}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isRestoring ? 'Restoring...' : 'Restore Database'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
