import React, { useState, useEffect, useRef } from 'react';
import { Lock, Delete, User, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLockoutRemainingSeconds } from '../../lib/auth/localAuthService';
import { Button } from '../../shared/ui';
import { sonner } from '../../lib/sonner';
import { EmergencyRecoveryModal } from './EmergencyRecoveryModal';
import { useCapsLock } from '../../hooks/useCapsLock';
import { CapsLockIndicator } from '../../shared/ui/CapsLockIndicator';
import { PinKeypad } from './PinKeypad';

export function PinLoginPage() {
  const { signInWithPin, loading: authLoading } = useAuth();
  const isCapsLock = useCapsLock();
  const [identifier, setIdentifier] = useState(() => {
    try {
      return localStorage.getItem('pos_last_username') || '';
    } catch {
      return '';
    }
  });
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Lockout timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getLockoutRemainingSeconds();
      setLockoutSecs(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDigit = (digit: string) => {
    if (lockoutSecs > 0 || isSubmitting || pin.length >= 12) return;
    setPin((prev) => (prev + digit).slice(0, 12));
  };

  const handleClear = () => {
    if (lockoutSecs > 0 || isSubmitting) return;
    setPin('');
  };

  const handleBackspace = () => {
    if (lockoutSecs > 0 || isSubmitting) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLoginSubmit = async (pinToSubmit = pin) => {
    if (lockoutSecs > 0) {
      sonner.error(`Terminal is locked. Please wait ${lockoutSecs}s.`);
      return;
    }
    if (!identifier.trim()) {
      sonner.warning('Please enter your username or email.');
      identifierInputRef.current?.focus();
      return;
    }
    if (!pinToSubmit || pinToSubmit.length < 4) {
      sonner.warning('PIN must be at least 4 digits (max 12).');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithPin(pinToSubmit, identifier.trim());
      try {
        localStorage.setItem('pos_last_username', identifier.trim());
      } catch {}
      sonner.success('Welcome back!');
    } catch (err: any) {
      sonner.error(err.message || 'Login failed.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Physical keyboard fallback support when inputs are not directly focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key || recoveryOpen) return;
      if (document.activeElement === identifierInputRef.current || document.activeElement === pinInputRef.current) return;
      if (/^[0-9]$/.test(e.key)) handleDigit(e.key);
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') handleClear();
      else if (e.key === 'Enter' && pin.length >= 4 && identifier.trim()) handleLoginSubmit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, identifier, lockoutSecs, isSubmitting, recoveryOpen]);

  return (
    <div className="fixed inset-0 w-full h-full bg-app flex flex-col items-center justify-center p-4 overflow-y-auto select-none">
      <div className="w-full max-w-sm bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none p-5 sm:p-6 flex flex-col items-center shrink-0 my-auto">
        {/* Header Branding */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white/10 border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
            <img
              src="/zaynahs-logo.svg"
              alt="Zaynahs POS"
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">Zaynahs POS</span>
        </div>

        {/* Form Container with Native Enter Support */}
        <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(); }} className="w-full">
          {/* Username / Staff ID Input */}
          <div className="w-full mb-3">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <label className="block text-[11px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-semibold whitespace-nowrap">
                Username or Email
              </label>
              {isCapsLock && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Caps Lock ON
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                <User className="w-4 h-4" />
              </div>
              <input
                ref={identifierInputRef}
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (identifier.trim()) {
                      pinInputRef.current?.focus();
                      if (pin.length >= 4) {
                        handleLoginSubmit();
                      }
                    }
                  }
                }}
                placeholder="e.g. admin"
                className="w-full h-10 pl-9 pr-3 text-[13px] bg-white dark:bg-black/30 border border-neutral-300 dark:border-white/[0.12] rounded-md text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* PIN / Password Input */}
          <div className="w-full mb-3">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <label className="text-[11px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-semibold whitespace-nowrap">
                Security PIN
              </label>
              <div className="flex items-center gap-2 whitespace-nowrap">
                {isCapsLock && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Caps Lock ON
                  </span>
                )}
                <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                  {pin.length}/12 digits
                </span>
              </div>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={pinInputRef}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={12}
                value={pin}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setPin(clean);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (pin.length >= 4 && identifier.trim()) {
                      handleLoginSubmit();
                    } else if (!identifier.trim()) {
                      identifierInputRef.current?.focus();
                    }
                  }
                }}
                placeholder="Enter 4–12 digit PIN"
                className={`w-full h-10 pl-9 pr-10 text-[14px] font-mono ${
                  showPin ? 'tracking-wider' : 'tracking-[0.25em]'
                } bg-white dark:bg-black/30 border border-neutral-300 dark:border-white/[0.12] rounded-md text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer rounded transition-colors"
                tabIndex={-1}
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lockout Banner */}
          {lockoutSecs > 0 && (
            <div className="text-[12px] text-danger font-medium my-2 text-center">
              Terminal locked. Try again in {lockoutSecs}s.
            </div>
          )}

          {/* Touch Keypad */}
          <PinKeypad
            onDigit={handleDigit}
            onClear={handleClear}
            onBackspace={handleBackspace}
            disabled={lockoutSecs > 0 || isSubmitting}
            clearDisabled={pin.length === 0}
          />

          {/* Submit Action */}
          <div className="w-full mt-3.5">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={isSubmitting || authLoading}
              disabled={pin.length < 4 || lockoutSecs > 0 || !identifier.trim()}
              icon={<Lock className="w-3.5 h-3.5" />}
            >
              Sign In <kbd className="ml-2 text-[10px] text-white/60 font-mono">↵ Enter</kbd>
            </Button>
          </div>
        </form>

        {/* Emergency Admin Recovery Link */}
        <button
          type="button"
          onClick={() => setRecoveryOpen(true)}
          className="mt-3.5 text-[12px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5" /> Emergency Admin Recovery
        </button>
      </div>

      <EmergencyRecoveryModal
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onSuccess={() => setPin('')}
      />
    </div>
  );
}
