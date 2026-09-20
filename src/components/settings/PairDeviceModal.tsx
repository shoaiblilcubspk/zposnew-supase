import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, RefreshCw, Copy, Check, Clock, Hash } from 'lucide-react';
import { Button, Modal } from '../../shared/ui';
import { generatePairingToken, registerPairedDevice } from '../../lib/mesh/pairingManager';
import { publishPairingPinSession } from '../../lib/mesh/pairingPinService';
import { sonner } from '../../lib/sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PairDeviceModal({ open, onClose }: Props) {
  const [tokenStr, setTokenStr] = useState<string>('');
  const [pin6, setPin6] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [remainingSecs, setRemainingSecs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const hasLoadedRef = useRef(false);

  const refreshToken = useCallback(async () => {
    setLoading(true);
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    try {
      const res = await generatePairingToken(120);
      setTokenStr(res.tokenString);
      setPin6(res.pin6);
      setExpiresAt(res.expiresAt);
      setRemainingSecs(120);

      // Ephemeral broadcast session for 6-digit pairing code with bootstrap metadata
      cleanupRef.current = publishPairingPinSession(
        res.pin6,
        res.tokenString,
        {
          shopProfile: res.shopProfile,
          initialUsers: res.initialUsers,
        },
        async (secondaryDevice) => {
          if (secondaryDevice && secondaryDevice.deviceId) {
            try {
              await registerPairedDevice({
                deviceId: secondaryDevice.deviceId,
                name: secondaryDevice.name || 'Secondary Terminal',
                role: secondaryDevice.role || 'terminal',
                publicKey: secondaryDevice.publicKey || '',
              });
            } catch (err: any) {
              console.warn('Could not register secondary device locally:', err);
            }
          }
          sonner.success(
            secondaryDevice?.name
              ? `Terminal "${secondaryDevice.name}" paired successfully!`
              : 'Secondary terminal paired successfully!'
          );
          onCloseRef.current();
        }
      );
    } catch (err: any) {
      sonner.error(err.message || 'Failed generating pairing token.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        refreshToken();
      }
    } else {
      hasLoadedRef.current = false;
      setTokenStr('');
      setPin6('');
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [open, refreshToken]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSecs(diff);
      if (diff === 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyPin = async () => {
    if (!pin6) return;
    try {
      await navigator.clipboard.writeText(pin6);
      setCopiedPin(true);
      sonner.success('6-digit PIN copied!');
      setTimeout(() => setCopiedPin(false), 2000);
    } catch {
      sonner.error('Failed copying PIN.');
    }
  };

  const handleCopyToken = async () => {
    if (!tokenStr) return;
    try {
      await navigator.clipboard.writeText(tokenStr);
      setCopiedToken(true);
      sonner.success('Full pairing token copied to clipboard!');
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      sonner.error('Failed to copy to clipboard.');
    }
  };

  return (
    <Modal isOpen={open} open={open} onClose={onClose} title="" maxWidth="sm">
      <div className="p-5 text-neutral-900 dark:text-neutral-100 flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2 w-full border-b border-neutral-200 dark:border-white/[0.08] pb-3">
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">Pair Terminal Device</h2>
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Scan QR code or type 6-digit PIN on secondary device</p>
          </div>
        </div>

        {/* 6-Digit PIN Banner */}
        <div className="w-full my-2.5 p-3 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06] rounded-md text-center">
          <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
            6-Digit Pairing PIN (Fastest for PC / Mac / Web)
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400 select-all">
              {pin6 ? `${pin6.slice(0, 3)} - ${pin6.slice(3)}` : '••••••'}
            </span>
            {pin6 && (
              <button
                type="button"
                onClick={handleCopyPin}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                title="Copy 6-Digit PIN"
              >
                {copiedPin ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* QR Display */}
        <div className="my-2 p-3 bg-white rounded-md border border-neutral-200 shadow-none flex items-center justify-center">
          {tokenStr ? (
            <QRCodeSVG
              value={tokenStr}
              size={170}
              level="M"
              includeMargin={false}
            />
          ) : (
            <div className="w-[170px] h-[170px] flex items-center justify-center text-neutral-400 text-xs">
              Generating secure token...
            </div>
          )}
        </div>

        {/* Expiry Timer */}
        <div className="flex items-center gap-2 text-[12px] font-mono text-neutral-600 dark:text-neutral-400 my-2">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {remainingSecs > 0 ? (
              <>Expires in <span className="text-neutral-900 dark:text-white font-semibold tabular-nums">{remainingSecs}s</span></>
            ) : (
              <span className="text-rose-600 font-medium">Code Expired</span>
            )}
          </span>
          <button
            type="button"
            onClick={refreshToken}
            disabled={loading}
            className="ml-2 text-emerald-600 hover:underline text-[12px] font-sans inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Instructions */}
        <div className="w-full p-2.5 rounded bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06] text-[12px] text-neutral-600 dark:text-neutral-400 space-y-1 mb-3">
          <p>1. Open Zaynahs POS on secondary device & click <strong className="text-neutral-900 dark:text-neutral-200">Join Shop</strong>.</p>
          <p>2. Either type the <strong className="text-neutral-900 dark:text-neutral-200">6-Digit PIN</strong> above or scan the QR code.</p>
        </div>

        {/* Actions */}
        <div className="flex justify-between w-full border-t border-neutral-200 dark:border-white/[0.08] pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopyToken}
            icon={copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copiedToken ? 'Copied' : 'Copy Full Token'}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
