import React, { useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { Button, Modal, CapsLockIndicator } from '../../shared/ui';
import { resetAdminPinWithRecoveryCode } from '../../lib/auth/localAuthService';
import { sonner } from '../../lib/sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmergencyRecoveryModal({ open, onClose, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      sonner.warning('Please enter the 24-character master recovery code.');
      return;
    }
    if (newPin.length < 4) {
      sonner.warning('New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      sonner.warning('PINs do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetAdminPinWithRecoveryCode(code.trim(), newPin);
      sonner.success('Admin PIN successfully reset! Please login with your new PIN.');
      onSuccess();
      onClose();
    } catch (err: any) {
      sonner.error(err.message || 'Recovery failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} open={open} onClose={onClose} title="" maxWidth="sm">
      <div className="p-5 text-neutral-900 dark:text-neutral-100 space-y-4">
        <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">Admin Emergency Reset</h2>
            <p className="text-[13px] text-neutral-600 dark:text-neutral-400">Recover Admin access using the offline master code</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium text-neutral-900 dark:text-neutral-200 mb-1">Master Recovery Code</label>
            <input
              type="text"
              required
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full h-8 px-3 font-mono text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-amber-900 dark:text-amber-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[13px] font-medium text-neutral-900 dark:text-neutral-200">New Admin PIN (4–12 digits)</label>
              <CapsLockIndicator variant="inline" />
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={12}
              required
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="w-full h-8 px-3 font-mono text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[13px] font-medium text-neutral-900 dark:text-neutral-200">Confirm New PIN</label>
              <CapsLockIndicator variant="inline" />
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={12}
              required
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="w-full h-8 px-3 font-mono text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-white/[0.08]">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={loading} icon={<KeyRound className="w-4 h-4" />}>
              Reset PIN
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
