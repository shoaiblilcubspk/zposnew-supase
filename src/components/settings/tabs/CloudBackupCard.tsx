import React, { useState, useEffect } from 'react';
import { Cloud, Upload, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card, Button, Badge } from '../../../shared/ui';
import { useUsersStore } from '../../../stores';
import {
  getCloudBackupConfig,
  saveCloudBackupConfig,
  uploadDatabaseToCloud,
  CloudBackupConfig,
  CloudBackupFrequency
} from '../../../lib/backup/cloudBackupService';
import { sonner } from '../../../lib/sonner';
import { formatAppDateTime } from '../../../lib/dateUtils';

export function CloudBackupCard() {
  const currentUser = useUsersStore(s => s.currentUser);
  const [config, setConfig] = useState<CloudBackupConfig>(getCloudBackupConfig());
  const [isUploading, setIsUploading] = useState(false);

  // Strictly visible to Root Admin only
  if (currentUser?.role !== 'admin') {
    return null;
  }

  const handleToggleEnabled = (enabled: boolean) => {
    const updated = saveCloudBackupConfig({ enabled });
    setConfig(updated);
    if (enabled) {
      sonner.success('Cloud auto-backup enabled');
    } else {
      sonner.info('Cloud auto-backup disabled');
    }
  };

  const handleToggleIncludeImages = (includeImages: boolean) => {
    const updated = saveCloudBackupConfig({ includeImages });
    setConfig(updated);
    if (includeImages) {
      sonner.info('Product images will be bundled into cloud backup ZIP');
    } else {
      sonner.info('Cloud backup set to database only (zero media)');
    }
  };

  const handleFrequencyChange = (frequency: CloudBackupFrequency) => {
    const updated = saveCloudBackupConfig({ frequency });
    setConfig(updated);
    sonner.success(`Backup frequency set to ${frequency}`);
  };

  const handleBackupNow = async () => {
    setIsUploading(true);
    sonner.loading('Generating encrypted database snapshot and uploading to Supabase bucket...');
    try {
      const res = await uploadDatabaseToCloud();
      const nextConfig = getCloudBackupConfig();
      setConfig(nextConfig);
      sonner.dismissAll();

      if (res.success) {
        sonner.success(`Cloud backup uploaded! (${((res.sizeBytes || 0) / 1024).toFixed(1)} KB)`);
      } else {
        sonner.error(res.error || 'Failed to upload backup');
      }
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md space-y-4 text-[13px] tracking-[-0.01em]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <Cloud className="w-5 h-5 text-cyan-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px] leading-tight">
              Automated Cloud Backup (Supabase)
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono mt-0.5">
              Root Admin Only • Encrypted DB Snapshot • {config.includeImages ? 'With Photos (ZIP)' : 'Zero Images'}
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
        Automatically uploads an encrypted snapshot of your local SQLite database to your private Supabase bucket (<code className="font-mono text-[11px] bg-neutral-100 dark:bg-white/[0.06] px-1 py-0.5 rounded">pos-backups</code>). Keeps business data and ledger rows secure across device reinstalls.
      </p>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Backup Frequency
          </label>
          <div className="flex items-center gap-1.5">
            {(['daily', 'weekly', 'monthly'] as CloudBackupFrequency[]).map((freq) => (
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
            Last Backup Status
          </label>
          <div className="flex items-center gap-2">
            {config.lastBackupStatus === 'success' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-medium font-mono">
                <CheckCircle2 className="w-3 h-3" />
                Success ({((config.lastBackupSize || 0) / 1024).toFixed(1)} KB)
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
          {config.lastBackupError && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-mono leading-tight">
              {config.lastBackupError}
            </p>
          )}
        </div>
      </div>

      {/* Include Product Images Toggle */}
      <div className="flex items-center justify-between p-3 rounded-md bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06]">
        <div>
          <span className="font-medium text-neutral-800 dark:text-neutral-200 text-[12px] block">
            Include Product Photos in Cloud Backup
          </span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
            Bundles product images into a ZIP archive alongside SQLite data. Recommended for single-terminal setups to enable full photo restoration.
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
          <input
            type="checkbox"
            checked={config.includeImages}
            onChange={(e) => handleToggleIncludeImages(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-200 dark:border-white/[0.08]">
        <p className="text-[11px] text-neutral-400 font-mono">
          Target Bucket: <code className="text-neutral-600 dark:text-neutral-300">pos-backups</code>
        </p>

        <Button
          size="sm"
          variant="primary"
          disabled={isUploading}
          onClick={handleBackupNow}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0"
          icon={isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        >
          {isUploading ? 'Uploading...' : 'Backup to Cloud Now'}
        </Button>
      </div>
    </Card>
  );
}
