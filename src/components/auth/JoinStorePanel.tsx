import { useState } from 'react';
import { Camera, Hash } from 'lucide-react';
import { Button } from '../../shared/ui';
import { CameraScanner } from '../../shared/ui/CameraScanner';
import { verifyPairingToken, registerPairedDevice } from '../../lib/mesh/pairingManager';
import { resolvePairingPin } from '../../lib/mesh/pairingPinService';
import { setCachedDeviceId } from '../../lib/mesh/deviceIdentity';
import { getOrCreateDeviceKeypair } from '../../lib/crypto/deviceKeypair';
import { execute, TABLES, flushDb } from '../../lib/db';
import { sonner } from '../../lib/sonner';

interface JoinStorePanelProps {
  onSuccess: () => void;
}

export function JoinStorePanel({ onSuccess }: JoinStorePanelProps) {
  const [activeTab, setActiveTab] = useState<'pin' | 'scan' | 'manual'>('pin');
  const [pinInput, setPinInput] = useState('');
  const [terminalName, setTerminalName] = useState('Counter 2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (
    tokenStr: string,
    existingDeviceId?: string,
    existingPublicKey?: string,
    extraBootstrap?: { shopProfile?: { name: string; currency: string }; initialUsers?: any[] }
  ) => {
    if (!tokenStr.trim()) {
      sonner.warning('Please enter or scan the pairing code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await verifyPairingToken(tokenStr.trim());
      const publicKeyHex = existingPublicKey || (await getOrCreateDeviceKeypair()).publicKeyHex;
      const localDeviceId = existingDeviceId || `TERM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setCachedDeviceId(localDeviceId);
      const now = Date.now();

      const shopName = extraBootstrap?.shopProfile?.name || 'Zaynahs POS';
      const currency = extraBootstrap?.shopProfile?.currency || 'PKR';

      await execute(
        `INSERT OR REPLACE INTO ${TABLES.SHOP} (
          id, name, currency, master_recovery_hash, created_at, updated_at
        ) VALUES (?, ?, ?, 'SECONDARY_RECOVERY_LOCKED', ?, ?);`,
        [payload.shopId, shopName, currency, now, now]
      );

      await execute(
        `INSERT OR REPLACE INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES ('device_id', ?, ?);`,
        [localDeviceId, now]
      );

      await registerPairedDevice({
        deviceId: localDeviceId,
        name: terminalName.trim() || 'Secondary Terminal',
        role: 'terminal',
        publicKey: publicKeyHex,
      });

      await registerPairedDevice({
        deviceId: payload.adminDeviceId,
        name: 'Primary Terminal',
        role: 'primary',
        publicKey: payload.adminPublicKey,
      });

      // Synchronize all active users so cashier/admin can log in immediately
      const usersToInsert = [...(extraBootstrap?.initialUsers || [])];
      if (payload.adminUser && !usersToInsert.some((u: any) => u.id === payload.adminUser?.id)) {
        usersToInsert.push(payload.adminUser);
      }
      if (usersToInsert.length > 0) {
        for (const u of usersToInsert) {
          const uUsername = (u.username || u.name || '').toLowerCase();
          const uPinHash = u.pin_hash || u.pinHash || 'DEFAULT_LOCKED_PIN_HASH';
          await execute(
            `INSERT OR REPLACE INTO ${TABLES.USERS} (
              id, name, username, pin_hash, role, email, avatar, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              u.id,
              u.name || 'Staff Operator',
              uUsername,
              uPinHash,
              u.role || 'cashier',
              u.email || '',
              u.avatar || '',
              u.active ? 1 : 0,
              u.created_at || now,
              u.updated_at || now,
            ]
          );
        }
      }

      // Persist immediately into IndexedDB before notifying completion
      await flushDb();

      sonner.success('Successfully paired with primary store mesh!');
      onSuccess();
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : (err?.message || 'Failed joining shop mesh.');
      console.error('[JoinStorePanel] Failed joining shop mesh:', err);
      sonner.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWithPin = async () => {
    const cleanPin = pinInput.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      sonner.warning('Please enter a 6-digit pairing PIN (e.g. 123-456).');
      return;
    }

    setIsSubmitting(true);
    sonner.loading('Connecting to Primary Terminal...');
    try {
      const localDeviceId = `TERM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { publicKeyHex } = await getOrCreateDeviceKeypair();
      const deviceInfo = {
        deviceId: localDeviceId,
        name: terminalName.trim() || 'Secondary Terminal',
        role: 'terminal' as const,
        publicKey: publicKeyHex,
      };

      const res = await resolvePairingPin(cleanPin, 10000, deviceInfo);
      sonner.dismissAll();
      await handleJoin(res.tokenString, localDeviceId, publicKeyHex, {
        shopProfile: res.shopProfile,
        initialUsers: res.initialUsers,
      });
    } catch (err: any) {
      sonner.dismissAll();
      const msg = typeof err === 'string' ? err : (err?.message || 'Failed to connect using PIN.');
      console.error('[JoinStorePanel] PIN join error:', err);
      sonner.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-[12px] leading-relaxed">
        <p className="font-semibold">Connect Secondary Terminal / Counter</p>
        <p className="opacity-90 mt-0.5">
          Ask Main Admin to open <span className="font-mono font-bold">Settings ➔ Pair Device</span> on Primary PC to get the 6-digit code or QR.
        </p>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          This Terminal's Name
        </label>
        <input
          type="text"
          placeholder="e.g. Counter 2 / Mobile Tablet"
          value={terminalName}
          onChange={(e) => setTerminalName(e.target.value)}
          className="w-full h-8 px-3 text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600"
        />
      </div>

      <div className="flex rounded-md p-0.5 bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTab('pin')}
          className={`flex-1 py-1 text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'pin'
              ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-sm font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Hash className="w-3.5 h-3.5" /> 6-Digit PIN
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-1 text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'scan'
              ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-sm font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Scan QR
        </button>
      </div>

      {activeTab === 'pin' && (
        <div className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={7}
            placeholder="e.g. 123-456"
            value={pinInput}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
              if (digits.length > 3) {
                setPinInput(`${digits.slice(0, 3)}-${digits.slice(3)}`);
              } else {
                setPinInput(digits);
              }
            }}
            className="w-full h-11 text-center font-mono text-xl tracking-[0.25em] font-bold bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
          <Button
            type="button"
            variant="primary"
            onClick={handleJoinWithPin}
            disabled={pinInput.replace(/\D/g, '').length !== 6 || isSubmitting}
            loading={isSubmitting}
            className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isSubmitting ? 'Joining Mesh...' : 'Connect to Primary Store'}
          </Button>
        </div>
      )}

      {activeTab === 'scan' && (
        <div className="space-y-3">
          <div className="h-56 overflow-hidden rounded border border-neutral-200 dark:border-white/[0.08] relative">
            <CameraScanner
              onScan={(code) => {
                handleJoin(code);
              }}
              onClose={() => setActiveTab('pin')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
