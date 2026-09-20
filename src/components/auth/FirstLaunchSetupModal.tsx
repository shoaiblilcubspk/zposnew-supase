import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ArrowRight, Store, KeyRound, QrCode, CheckCircle2 } from 'lucide-react';
import { Button, Modal } from '../../shared/ui';
import { bootstrapAdmin, SetupConfig } from '../../lib/auth/localAuthService';
import { JoinStorePanel } from './JoinStorePanel';
import { verifyLicenseKey } from '../../lib/licensing/licenseVerifier';
import { execute, TABLES } from '../../lib/db';
import { sonner } from '../../lib/sonner';
import { User } from '../../types';
import { useCapsLock } from '../../hooks/useCapsLock';
import { CapsLockIndicator } from '../../shared/ui/CapsLockIndicator';

interface Props {
  open: boolean;
  onComplete: (user: User) => void;
}

export function FirstLaunchSetupModal({ open, onComplete }: Props) {
  const isCapsLock = useCapsLock();
  const [mainTab, setMainTab] = useState<'join' | 'new'>('join');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedUser, setSavedUser] = useState<User | null>(null);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null);

  const [form, setForm] = useState<SetupConfig>({
    shopName: '',
    currency: 'PKR',
    adminName: '',
    adminUsername: 'admin',
    adminPin: '',
  });

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setLicenseKey(val);
    if (val.length >= 19) {
      const res = verifyLicenseKey(val);
      setLicenseValid(res.valid);
    } else {
      setLicenseValid(null);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const licenseCheck = verifyLicenseKey(licenseKey);
    if (!licenseCheck.valid) {
      sonner.error(licenseCheck.error || 'A valid ZPOS License Key is required to create a new store.');
      return;
    }

    if (!form.shopName.trim()) {
      sonner.warning('Please enter your store name.');
      return;
    }
    if (!form.adminName.trim()) {
      sonner.warning('Please enter the Admin full name.');
      return;
    }
    if (!form.adminPin || form.adminPin.length < 4) {
      sonner.warning('Admin PIN must be at least 4 digits.');
      return;
    }
    if (form.adminPin !== confirmPin) {
      sonner.error('PIN and Confirm PIN do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await bootstrapAdmin(form);
      // Save license key into settings table
      await execute(
        `INSERT OR REPLACE INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES ('license_key', ?, ?);`,
        [licenseKey.trim().toUpperCase(), Date.now()]
      );

      setSavedUser(res.user);
      setRecoveryCode(res.recoveryCode);
      setStep(2);
      sonner.success('Store initialized successfully! Save your recovery code.');
    } catch (err: any) {
      sonner.error(err.message || 'Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      sonner.success('Emergency recovery code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      sonner.error('Failed to copy to clipboard.');
    }
  };

  const handleFinish = () => {
    if (!acknowledged) {
      sonner.warning('Please confirm that you have securely backed up the recovery code.');
      return;
    }
    if (savedUser) {
      onComplete(savedUser);
    }
  };

  return (
    <Modal isOpen={open} open={open} onClose={() => {}} title="First-Time Setup" maxWidth="md" showClose={false}>
      <div className="p-5 text-neutral-900 dark:text-neutral-100">
        {step === 1 ? (
          <div>
            {/* Top Side-by-Side Tabs (Like Login & Sign Up) */}
            <div className="grid grid-cols-2 p-1 rounded-lg bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] mb-4.5">
              <button
                type="button"
                onClick={() => setMainTab('join')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${mainTab === 'join' ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-sm border border-neutral-200/80 dark:border-white/10' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
              >
                <QrCode className="w-4 h-4 text-emerald-500" />
                <span>Join Existing Store</span>
              </button>
              <button
                type="button"
                onClick={() => setMainTab('new')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${mainTab === 'new' ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-sm border border-neutral-200/80 dark:border-white/10' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
              >
                <Store className="w-4 h-4 text-primary" />
                <span>Create New Store</span>
              </button>
            </div>

            {mainTab === 'join' ? (
              <JoinStorePanel
                onSuccess={async () => {
                  try {
                    const { flushDb, queryOne, TABLES } = await import('../../lib/db');
                    const { mapDbRowToUser } = await import('../../lib/auth/localAuthService');
                    await flushDb();
                    const adminRow = await queryOne<any>(
                      `SELECT * FROM ${TABLES.USERS} WHERE role = 'admin' AND active = 1 LIMIT 1;`
                    );
                    if (adminRow) {
                      onComplete(mapDbRowToUser(adminRow));
                      return;
                    }
                  } catch (err) {
                    console.warn('Auto-login after join error:', err);
                  }
                  window.location.reload();
                }}
              />
            ) : (
              <form onSubmit={handleStep1Submit} className="space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">Software License Key *</label>
                  <div className="relative">
                    <input type="text" required placeholder="ZPOS-XXXX-XXXX-XXXX-XXXX" value={licenseKey} onChange={handleLicenseChange} className="w-full h-8 px-3 font-mono text-[12.5px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary uppercase" />
                    {licenseValid === true && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-2.5 top-2" />}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">Enter genuine license key provided by software vendor.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">Store Name *</label>
                    <input type="text" required placeholder="e.g. Zaynahs Boutique" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className="w-full h-8 px-3 text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">Currency</label>
                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full h-8 px-3 text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-primary">
                      <option value="PKR">PKR (₨)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="SAR">SAR (﷼)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">Admin Full Name *</label>
                    <input type="text" required placeholder="e.g. Store Owner" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="w-full h-8 px-3 text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">Admin Username</label>
                    <input type="text" required value={form.adminUsername} onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} className="w-full h-8 px-3 text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Admin PIN (4-12 digits) *</label>
                      {isCapsLock && <CapsLockIndicator variant="inline" />}
                    </div>
                    <input type="password" inputMode="numeric" maxLength={12} required placeholder="••••" value={form.adminPin} onChange={(e) => setForm({ ...form, adminPin: e.target.value.replace(/\D/g, '') })} className="w-full h-8 px-3 text-center tracking-[0.3em] font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Confirm PIN *</label>
                      {isCapsLock && <CapsLockIndicator variant="inline" />}
                    </div>
                    <input type="password" inputMode="numeric" maxLength={12} required placeholder="••••" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} className="w-full h-8 px-3 text-center tracking-[0.3em] font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div className="flex justify-end pt-3 border-t border-neutral-200 dark:border-white/[0.08]">
                  <Button type="submit" variant="primary" size="sm" loading={loading} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                    Initialize Store & Key
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">Emergency Master Recovery Code</h2>
                <p className="text-[13px] text-neutral-600 dark:text-neutral-400">Keep this offline. It is the ONLY way to reset a lost Admin PIN.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-neutral-900 border border-amber-200 dark:border-white/[0.12] rounded font-mono text-center text-sm font-semibold tracking-wider text-amber-900 dark:text-amber-300 select-all">
              {recoveryCode}
            </div>

            <div className="flex justify-center">
              <Button type="button" variant="secondary" size="sm" onClick={handleCopyCode} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
                {copied ? 'Copied' : 'Copy Recovery Code'}
              </Button>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/[0.06] cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-neutral-300 text-primary focus:ring-0"
              />
              <span className="text-[12px] text-neutral-700 dark:text-neutral-300 leading-snug">
                I have written down or safely backed up this 24-character master code. I understand that without it, a lost Admin PIN cannot be recovered.
              </span>
            </label>

            <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
              <Button type="button" variant="primary" size="sm" onClick={handleFinish} disabled={!acknowledged} icon={<ShieldCheck className="w-4 h-4" />}>
                Launch POS Terminal
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

