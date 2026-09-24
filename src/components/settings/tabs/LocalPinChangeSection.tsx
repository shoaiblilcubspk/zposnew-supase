import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Camera, ShieldCheck, UserCheck } from 'lucide-react';
import { Button, Avatar, CapsLockIndicator } from '../../../shared/ui';
import { changeUserPin } from '../../../lib/auth/recoveryService';
import { useUsersStore } from '../../../stores';
import { sonner } from '../../../lib/sonner';
import { MediaLibrary } from '../../../shared/MediaLibrary';
import { updateUser } from '../../../lib/services/users/userRepository';
import { resolveImageRecord } from '../../../lib/media/localImageStore';

export function LocalPinChangeSection() {
  const currentUser = useUsersStore((s) => s.currentUser);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMedia, setShowMedia] = useState(false);

  const handleSelectAvatar = async (url: string) => {
    if (!currentUser?.id) return;
    try {
      // Content-address the image (base64 -> upload -> hash) so the avatar is light, synced,
      // and reusable — exactly like product images. Hash/URL values pass through unchanged.
      const img = await resolveImageRecord(url);
      const updated = await updateUser(currentUser.id, { avatar: img.value ?? url });
      useUsersStore.getState().setCurrentUser(updated);
      sonner.success('Profile avatar updated successfully!');
    } catch (err: any) {
      sonner.error(err.message || 'Failed to update avatar');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      sonner.error('No logged-in user found.');
      return;
    }
    if (newPin.length < 4) {
      sonner.warning('New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      sonner.warning('New PIN and Confirm PIN do not match.');
      return;
    }

    setLoading(true);
    try {
      await changeUserPin(currentUser.id, currentPin, newPin);
      sonner.success('PIN changed successfully in local SQLite!');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      sonner.error(err.message || 'Failed to update PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md space-y-4">
      <div className="flex items-start gap-3 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="p-2 rounded bg-primary/10 border border-primary/20 text-primary mt-0.5">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">
            Security & Profile
          </h3>
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
            Active operator details and local SQLite login PIN.
          </p>
        </div>
      </div>

      {/* Logged-In User Profile Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-md bg-neutral-50 dark:bg-black/25 border border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="relative group shrink-0">
            <Avatar
              src={currentUser?.avatar || undefined}
              name={currentUser?.name || 'Operator'}
              size="lg"
              shape="square"
              className="!h-13 !w-13 rounded-md border border-neutral-200 dark:border-white/[0.08]"
            />
            <button
              type="button"
              onClick={() => setShowMedia(true)}
              title="Change profile image"
              className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-zinc-800 rounded border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-300 hover:text-primary shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">
                {currentUser?.name || 'Logged-in Operator'}
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/10 text-primary border border-primary/20 font-medium">
                {currentUser?.role || 'user'}
              </span>
            </div>
            <p className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
              @{currentUser?.username || 'user'} {currentUser?.email ? `• ${currentUser.email}` : ''}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Active Operator • Local SQLite Database</span>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMedia(true)}
          className="h-8 text-[12px] px-2.5"
        >
          <Camera className="w-3.5 h-3.5 mr-1.5 text-neutral-500" />
          Change Photo
        </Button>
      </div>

      <div className="space-y-3 max-w-md">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Current PIN
            </label>
            <CapsLockIndicator variant="inline" />
          </div>
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={12}
            required
            placeholder="••••"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            className="w-full h-8 px-2.5 font-mono text-[13px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              New PIN (4–12 digits)
            </label>
            <CapsLockIndicator variant="inline" />
          </div>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={12}
              required
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="w-full h-8 px-2.5 pr-8 font-mono text-[13px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Confirm New PIN
            </label>
            <CapsLockIndicator variant="inline" />
          </div>
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={12}
            required
            placeholder="••••"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="w-full h-8 px-2.5 font-mono text-[13px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary"
          />
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          variant="primary"
          size="sm"
          loading={loading}
          icon={<Lock className="w-3.5 h-3.5" />}
        >
          Update PIN
        </Button>
      </div>

      {showMedia && (
        <MediaLibrary
          isOpen={showMedia}
          onClose={() => setShowMedia(false)}
          onSelect={(url) => {
            handleSelectAvatar(url);
            setShowMedia(false);
          }}
          allowDirectUpload={true}
        />
      )}
    </div>
  );
}
