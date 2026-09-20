import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { sonner } from '../../lib/sonner';
import { Button } from '../../shared/ui';

export function PasswordChange() {
  const { updatePassword, user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const passwordRequirements = [
    { label: 'Minimum 6 characters', met: newPassword.length >= 6 },
    { label: 'Passwords match', met: newPassword === confirmPassword && newPassword.length > 0 },
  ];

  const handleUpdate = async () => {
    if (!oldPassword) {
      sonner.error('Validation Error: Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      sonner.error('Password too short: Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      sonner.error('Mismatch: Passwords do not match.');
      return;
    }

    setIsUpdating(true);
    try {
      if (!user?.email) throw new Error("User email not found.");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (verifyError) {
        throw new Error("Incorrect current password.");
      }

      await updatePassword(newPassword);
      sonner.success('Security Updated: Your password has been changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      sonner.error(`Update Failed: ${error.message || 'Failed to update password.'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 p-4 sm:p-6 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none">
      <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
        <Shield className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        <div>
          <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">Change Password</h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Keep your account secure with a strong password</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Current Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-8 px-2.5 pr-8 text-[12px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary transition-colors font-mono"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-8 px-2.5 pr-8 text-[12px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary transition-colors font-mono"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-8 px-2.5 text-[12px] bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary transition-colors font-mono"
            placeholder="••••••••"
          />
        </div>

        <div className="bg-neutral-50 dark:bg-white/[0.02] rounded border border-neutral-200 dark:border-white/[0.06] p-2.5 space-y-1.5">
          {passwordRequirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {req.met ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span className={`text-[11px] font-medium ${req.met ? 'text-primary dark:text-emerald-400' : 'text-neutral-500'}`}>
                {req.label}
              </span>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="primary"
          disabled={isUpdating || !oldPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
          onClick={handleUpdate}
          loading={isUpdating}
          icon={<Lock className="w-3.5 h-3.5" />}
          className="w-full mt-2"
        >
          <span>Update Password</span>
        </Button>
      </div>
    </div>
  );
}
