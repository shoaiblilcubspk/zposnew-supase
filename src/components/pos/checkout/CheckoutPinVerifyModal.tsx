import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { Lock, Delete, AlertCircle, ShieldCheck } from 'lucide-react';
import { verifyUserPin } from '../../../lib/auth/localAuthService';
import { CapsLockIndicator } from '../../../shared/ui/CapsLockIndicator';

interface CheckoutPinVerifyModalProps {
  isOpen: boolean;
  userId: string;
  userName?: string;
  onAuthorized: () => void;
  onCancel: () => void;
}

export function CheckoutPinVerifyModal({
  isOpen,
  userId,
  userName,
  onAuthorized,
  onCancel,
}: CheckoutPinVerifyModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleVerify = useCallback(async (currentPin: string) => {
    if (!currentPin || currentPin.length < 4) {
      setError('Enter at least 4 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyUserPin(userId, currentPin);
      if (isValid) {
        onAuthorized();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch {
      setError('PIN verification failed');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [userId, onAuthorized]);

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 12 || isVerifying) return;
    setError(null);
    setPin(prev => prev + d);
  }, [pin.length, isVerifying]);

  const handleBackspace = useCallback(() => {
    if (isVerifying) return;
    setError(null);
    setPin(prev => prev.slice(0, -1));
  }, [isVerifying]);

  const handleClear = useCallback(() => {
    if (isVerifying) return;
    setError(null);
    setPin('');
  }, [isVerifying]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          handleVerify(pin);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, handleDigit, handleBackspace, handleVerify, onCancel]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const footer = (
    <div className="flex items-center justify-between w-full gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onCancel}
        disabled={isVerifying}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => handleVerify(pin)}
        disabled={pin.length < 4 || isVerifying}
        loading={isVerifying}
        icon={<ShieldCheck className="w-3.5 h-3.5" />}
      >
        Authorize Bill
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Security PIN Verification"
      subtitle={`Operator: ${userName || 'Cashier'}`}
      maxWidth="sm"
      footer={footer}
    >
      <div className="flex flex-col items-center py-2 select-none">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
          <Lock className="w-5 h-5" />
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center mb-1 max-w-[280px]">
          Enter your security PIN to finalize and save this sale.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <CapsLockIndicator variant="inline" />
          <span className="text-[11px] font-mono text-neutral-500">
            {pin.length} / 12 digits (min 4)
          </span>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-2 mb-4 h-9 flex-wrap max-w-[280px]">
          {Array.from({ length: Math.max(pin.length, 6) }).map((_, idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                  isFilled
                    ? 'bg-primary border-primary scale-110 shadow-sm shadow-primary/30'
                    : 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-white/20'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 text-xs font-medium mb-3 bg-rose-500/10 px-3 py-1.5 rounded-md border border-rose-500/20 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleDigit(k)}
              disabled={isVerifying}
              className="h-12 rounded-lg bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/[0.12] border border-neutral-200 dark:border-white/[0.08] active:scale-95 text-[17px] font-mono font-semibold text-neutral-900 dark:text-white transition-all flex items-center justify-center shadow-none cursor-pointer"
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            disabled={isVerifying || pin.length === 0}
            className="h-12 rounded-lg bg-neutral-100/70 dark:bg-white/[0.04] hover:bg-neutral-200 dark:hover:bg-white/[0.1] border border-neutral-200 dark:border-white/[0.08] active:scale-95 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className="h-12 rounded-lg bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/[0.12] border border-neutral-200 dark:border-white/[0.08] active:scale-95 text-[17px] font-mono font-semibold text-neutral-900 dark:text-white transition-all flex items-center justify-center shadow-none cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleBackspace}
            disabled={isVerifying || pin.length === 0}
            className="h-12 rounded-lg bg-neutral-100/70 dark:bg-white/[0.04] hover:bg-neutral-200 dark:hover:bg-white/[0.1] border border-neutral-200 dark:border-white/[0.08] active:scale-95 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
