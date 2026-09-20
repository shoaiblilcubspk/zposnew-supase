import React, { useState } from 'react';
import { QrCode, ArrowRight, Camera, Hash, KeyRound, Loader2 } from 'lucide-react';
import { Button, Modal } from '../../shared/ui';
import { CameraScanner } from '../../shared/ui/CameraScanner';
import { verifyPairingToken, registerPairedDevice } from '../../lib/mesh/pairingManager';
import { resolvePairingPin } from '../../lib/mesh/pairingPinService';
import { getOrCreateDeviceKeypair } from '../../lib/crypto/deviceKeypair';
import { execute, TABLES, flushDb } from '../../lib/db';
import { localDb } from '../../lib/localDb';
import { sonner } from '../../lib/sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinShopModal({ open, onClose, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<'pin' | 'scan' | 'manual'>('pin');
  const [pinInput, setPinInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [terminalName, setTerminalName] = useState('Counter 2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (
    tokenStr: string,
    initialUsers?: any[],
    shopProfile?: { name: string; currency: string }
  ) => {
    if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.trim()) {
      sonner.warning('Please enter or scan the pairing code.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify token cryptographic signature and expiry
      const payload = await verifyPairingToken(tokenStr.trim());

      // 2. Obtain local device keypair
      const { publicKeyHex } = await getOrCreateDeviceKeypair();
      const localDeviceId = `TERM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = Date.now();

      // 3. Initialize local shop record with primary SHOP_ID
      const shopName = shopProfile?.name || 'Zaynahs POS';
      const currency = shopProfile?.currency || 'PKR';
      await execute(
        `INSERT OR REPLACE INTO ${TABLES.SHOP} (
          id, name, currency, master_recovery_hash, created_at, updated_at
        ) VALUES (?, ?, ?, 'SECONDARY_RECOVERY_LOCKED', ?, ?);`,
        [payload.shopId, shopName, currency, now, now]
      );

      // 4. Save local device ID in settings
      await execute(
        `INSERT OR REPLACE INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES ('device_id', ?, ?);`,
        [localDeviceId, now]
      );

      // 5. Register this secondary device
      await registerPairedDevice({
        deviceId: localDeviceId,
        name: terminalName.trim() || 'Secondary Terminal',
        role: 'terminal',
        publicKey: publicKeyHex,
      });

      // 6. Also register the Admin Primary Device
      await registerPairedDevice({
        deviceId: payload.adminDeviceId,
        name: 'Primary Terminal',
        role: 'primary',
        publicKey: payload.adminPublicKey,
      });

      // 7. Synchronize initial users so Cashier / Admin can log in immediately
      const usersToInsert = [...(initialUsers || [])];
      if (payload.adminUser && !usersToInsert.some((u: any) => u.id === payload.adminUser?.id)) {
        usersToInsert.push(payload.adminUser);
      }

      for (const u of usersToInsert) {
        const uId = u.id;
        const uName = u.name || 'Staff Operator';
        const uUsername = (u.username || u.name || '').toLowerCase();
        const uHash = u.pin_hash || u.pinHash || 'DEFAULT_LOCKED_PIN_HASH';
        const uRole = u.role || 'cashier';
        const uActive = u.active !== undefined ? (u.active ? 1 : 0) : 1;

        await execute(
          `INSERT OR REPLACE INTO ${TABLES.USERS} (
            id, name, username, pin_hash, role, active, email, avatar, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [uId, uName, uUsername, uHash, uRole, uActive, u.email || null, u.avatar || null, u.created_at || now, now]
        );
        try {
          await localDb.users.put({
            id: uId,
            name: uName,
            username: uUsername,
            email: u.email || '',
            role: uRole,
            active: Boolean(uActive),
            avatar: u.avatar,
            createdAt: new Date(u.created_at || now),
            updatedAt: new Date(now),
          });
        } catch {}
      }

      await flushDb();

      sonner.success('Successfully paired with primary store mesh!');
      onSuccess();
      onClose();
    } catch (err: any) {
      sonner.error(err.message || 'Failed joining shop mesh.');
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
      const session = await resolvePairingPin(cleanPin);
      sonner.dismissAll();
      await handleJoin(session.tokenString, session.initialUsers, session.shopProfile);
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Failed to connect using PIN.');
      setIsSubmitting(false);
    }
  };

  const handleScanSuccess = (code: string) => {
    setActiveTab('manual');
    setTokenInput(code);
    handleJoin(code);
  };

  return (
    <Modal isOpen={open} open={open} onClose={onClose} title="" maxWidth="sm">
      <div className="p-5 text-neutral-900 dark:text-neutral-100 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">Join Existing Store</h2>
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Connect this terminal to your Primary POS terminal</p>
          </div>
        </div>

        {/* Terminal Friendly Name */}
        <div>
          <label className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            This Terminal's Name
          </label>
          <input
            type="text"
            placeholder="e.g. Cashier Counter 2 / Mobile Order"
            value={terminalName}
            onChange={(e) => setTerminalName(e.target.value)}
            className="w-full h-8 px-3 text-[13px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Connection Tabs */}
        <div className="flex rounded-md p-0.5 bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`flex-1 py-1.5 text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'pin'
                ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> 6-Digit PIN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-1.5 text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Scan QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Paste Token
          </button>
        </div>

        {/* Tab 1: 6-Digit PIN */}
        {activeTab === 'pin' && (
          <div className="space-y-3">
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
              Enter the 6-digit PIN displayed on the Primary Terminal's Pair screen.
            </p>
            <input
              type="text"
              maxLength={7}
              placeholder="123-456"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full h-11 text-center text-2xl font-bold font-mono tracking-widest bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-emerald-600 dark:text-emerald-400 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              fullWidth
              loading={isSubmitting}
              onClick={handleJoinWithPin}
              disabled={pinInput.replace(/\D/g, '').length !== 6}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Connect & Pair
            </Button>
          </div>
        )}

        {/* Tab 2: Camera QR Scan */}
        {activeTab === 'scan' && (
          <div className="space-y-3">
            <div className="rounded overflow-hidden border border-neutral-200 dark:border-white/[0.08]">
              <CameraScanner onScan={handleScanSuccess} onClose={() => setActiveTab('pin')} />
            </div>
          </div>
        )}

        {/* Tab 3: Paste Token */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            <textarea
              rows={3}
              placeholder="Paste pairing token from primary terminal..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full p-2.5 text-[12px] font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              fullWidth
              loading={isSubmitting}
              onClick={() => handleJoin(tokenInput)}
              disabled={!tokenInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Join Mesh
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
