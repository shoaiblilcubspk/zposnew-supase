import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button, CapsLockIndicator } from '../../../shared/ui';
import { rotateRecoveryCode } from '../../../lib/auth/recoveryService';
import { sonner } from '../../../lib/sonner';

export function RecoveryCodeResetSection() {
  const [adminPin, setAdminPin] = useState('');
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin || adminPin.length < 4) {
      sonner.warning('Please enter your 4-12 digit Admin PIN to authorize rotation.');
      return;
    }

    setLoading(true);
    try {
      const generatedCode = await rotateRecoveryCode(adminPin);
      setNewCode(generatedCode);
      setAdminPin('');
      setShowConfirm(false);
      sonner.success('New 24-character Recovery Code generated! Old code is now permanently invalid.');
    } catch (err: any) {
      sonner.error(err.message || 'Failed to rotate recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!newCode) return;
    navigator.clipboard.writeText(newCode);
    setCopied(true);
    sonner.info('New Recovery Code copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md space-y-4">
      <div className="flex items-start gap-3 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">
            Master Emergency Recovery Code
          </h3>
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
            Used offline by Root Admin if PIN is forgotten. If your code is leaked or compromised, you can rotate it here.
          </p>
        </div>
      </div>

      {newCode ? (
        <div className="p-3.5 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-[12px] font-medium">
            <Check className="w-4 h-4" />
            <span>Old Code Invalidated! Your new 24-character code is:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={newCode}
              className="flex-1 h-9 px-3 font-mono text-[13px] font-semibold tracking-wider bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-600/40 rounded text-emerald-900 dark:text-emerald-300 select-all"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Save this code offline securely. Anyone with this code can reset your Admin PIN.
          </p>
        </div>
      ) : showConfirm ? (
        <div className="space-y-3 max-w-md">
          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[12px]">
            ⚠️ Rotating will <strong>immediately cancel the old recovery code</strong>. Enter your Admin PIN to confirm:
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Admin PIN (4–12 digits)
              </label>
              <CapsLockIndicator variant="inline" />
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={12}
              required
              autoFocus
              placeholder="••••"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
              className="w-full h-8 px-2.5 font-mono text-[13px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleRotate}
              variant="primary"
              size="sm"
              loading={loading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Confirm & Generate New Code
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowConfirm(false);
                setAdminPin('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400">
            Status: <span className="font-medium text-emerald-600 dark:text-emerald-400">Active & Protected in SQLite</span>
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowConfirm(true)}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Reset / Rotate Recovery Code
          </Button>
        </div>
      )}
    </div>
  );
}
