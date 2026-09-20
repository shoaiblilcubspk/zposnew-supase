import React, { useState } from 'react';
import { HardDrive, CheckCircle2, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Card, Button } from '../../../shared/ui';
import {
  getLocalBackupConfig,
  saveLocalBackupConfig,
  runLocalDocumentsBackup,
  LocalBackupConfig,
  LocalBackupFrequency
} from '../../../lib/backup/localBackupService';
import { sonner } from '../../../lib/sonner';
import { formatAppDateTime } from '../../../lib/dateUtils';

export function LocalBackupCard() {
  const [config, setConfig] = useState<LocalBackupConfig>(getLocalBackupConfig());
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleToggleEnabled = (enabled: boolean) => {
    const updated = saveLocalBackupConfig({ enabled });
    setConfig(updated);
    if (enabled) {
      sonner.success('Local documents auto-backup enabled');
    } else {
      sonner.info('Local documents auto-backup disabled');
    }
  };

  const handleFrequencyChange = (frequency: LocalBackupFrequency) => {
    const updated = saveLocalBackupConfig({ frequency });
    setConfig(updated);
    sonner.success(`Local backup frequency set to ${frequency}`);
  };

  const handleToggleAutoDelete = (autoDeleteOld: boolean) => {
    const updated = saveLocalBackupConfig({ autoDeleteOld });
    setConfig(updated);
    if (autoDeleteOld) {
      sonner.success('Auto-delete enabled: only last 3 backups will be kept');
    } else {
      sonner.info('Auto-delete disabled: all backup files will be preserved');
    }
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    sonner.loading('Creating local encrypted backup in Documents/ZaynahsPOS/backups/...');
    try {
      const res = await runLocalDocumentsBackup();
      const nextConfig = getLocalBackupConfig();
      setConfig(nextConfig);
      sonner.dismissAll();

      if (res.success) {
        sonner.success(`Local backup saved: ${res.filename} (${((res.sizeBytes || 0) / 1024).toFixed(1)} KB)`);
      } else {
        sonner.error(res.error || 'Failed to save local backup');
      }
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md space-y-4 text-[13px] tracking-[-0.01em]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px] leading-tight">
              Automated Local Documents Backup
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono mt-0.5">
              Saves to Documents/ZaynahsPOS/backups/ • Optional Auto-Purge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">
            {config.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-[12px]">
        Automatically saves an encrypted snapshot of your SQLite database into your computer's native <code className="font-mono text-[11px] bg-neutral-100 dark:bg-white/[0.06] px-1 py-0.5 rounded">Documents/ZaynahsPOS/backups/</code> folder according to your selected period.
      </p>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Backup Frequency
          </label>
          <div className="flex items-center gap-1.5">
            {(['daily', 'weekly', 'monthly'] as LocalBackupFrequency[]).map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => handleFrequencyChange(freq)}
                className={`h-8 px-3 rounded-md text-[12px] capitalize transition-colors border ${
                  config.frequency === freq
                    ? 'bg-emerald-500/10 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Last Local Snapshot
          </label>
          <div className="flex items-center gap-2">
            {config.lastBackupStatus === 'success' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-medium font-mono">
                <CheckCircle2 className="w-3 h-3" />
                Saved ({((config.lastBackupSize || 0) / 1024).toFixed(1)} KB)
              </span>
            )}
            {config.lastBackupStatus === 'failed' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 rounded text-[11px] font-medium font-mono">
                <AlertTriangle className="w-3 h-3" />
                Failed
              </span>
            )}
            {config.lastBackupStatus === 'idle' && (
              <span className="text-[12px] text-neutral-400 font-mono">No backup taken yet</span>
            )}
            {config.lastBackupAt && (
              <span className="text-[11px] text-neutral-500 font-mono">
                {formatAppDateTime(new Date(config.lastBackupAt))}
              </span>
            )}
          </div>
          {config.lastBackupFilename && (
            <p className="text-[11px] text-neutral-500 mt-1 font-mono truncate">
              {config.lastBackupFilename}
            </p>
          )}
        </div>
      </div>

      {/* Auto-delete old backups retention toggle */}
      <div className="p-3 bg-neutral-50/80 dark:bg-white/[0.02] rounded-md border border-neutral-200 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-neutral-500 shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">
              Auto-Delete Old Backups
            </p>
            <p className="text-[11px] text-neutral-500">
              Retains the last 3 snapshots and automatically deletes older backup files to save disk space.
            </p>
          </div>
        </div>

        <input
          type="checkbox"
          checked={config.autoDeleteOld}
          onChange={(e) => handleToggleAutoDelete(e.target.checked)}
          className="rounded border-neutral-300 text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-200 dark:border-white/[0.08]">
        <p className="text-[11px] text-neutral-500 font-mono break-all">
          Path: Documents/ZaynahsPOS/backups/
        </p>

        <Button
          size="sm"
          variant="primary"
          disabled={isBackingUp}
          onClick={handleBackupNow}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0"
          icon={isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
        >
          {isBackingUp ? 'Saving...' : 'Backup to Documents Now'}
        </Button>
      </div>
    </Card>
  );
}
