import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, Monitor, QrCode, RefreshCw, Crown } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { getPairedDevices, revokeDevice, unrevokeDevice, deletePairedDevice, promoteToPrimaryTerminal, PairedDeviceRecord } from '../../../lib/mesh/pairingManager';
import { getDeviceProfile, DeviceProfile } from '../../../lib/mesh/deviceIdentity';
import { useUsersStore } from '../../../stores';
import { PairDeviceModal } from '../PairDeviceModal';
import { DeviceMeshList } from './DeviceMeshList';
import { sonner } from '../../../lib/sonner';

export function DeviceMeshTab() {
  const currentUser = useUsersStore(s => s.currentUser);
  const [currentDevice, setCurrentDevice] = useState<DeviceProfile | null>(null);
  const [devices, setDevices] = useState<PairedDeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadMesh = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getDeviceProfile();
      setCurrentDevice(profile);
      const list = await getPairedDevices();
      setDevices(list);
    } catch (err: any) {
      sonner.error(err.message || 'Failed loading mesh devices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMesh();
  }, [loadMesh]);

  const handlePromoteToPrimary = async () => {
    if (!window.confirm("Promote this device to Primary Terminal? This device will become the authoritative hub for pairing and shop administration. Use this if your previous Primary PC is broken or replaced.")) {
      return;
    }
    setPromoting(true);
    try {
      await promoteToPrimaryTerminal();
      sonner.success('This device is now the Primary Terminal!');
      await loadMesh();
    } catch (err: any) {
      sonner.error(err.message || 'Failed to promote device.');
    } finally {
      setPromoting(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (!window.confirm(`Revoke device ${deviceId}? It will immediately lose sync access.`)) {
      return;
    }
    setRevokingId(deviceId);
    try {
      await revokeDevice(deviceId);
      sonner.success(`Device ${deviceId} revoked.`);
      await loadMesh();
    } catch (err: any) {
      sonner.error(err.message || 'Failed revoking device.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleUnrevoke = async (deviceId: string) => {
    try {
      await unrevokeDevice(deviceId);
      sonner.success(`Device ${deviceId} restored to active.`);
      await loadMesh();
    } catch (err: any) {
      sonner.error(err.message || 'Failed restoring device.');
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!window.confirm(`Permanently remove ${deviceId} from paired devices?`)) {
      return;
    }
    try {
      await deletePairedDevice(deviceId);
      sonner.success(`Device ${deviceId} removed.`);
      await loadMesh();
    } catch (err: any) {
      sonner.error(err.message || 'Failed deleting device.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Device Header Card */}
      <div className="p-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 border border-primary/20 rounded text-primary">
            {currentDevice?.role === 'primary' ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">{currentDevice?.name || 'Local Terminal'}</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 uppercase">
                {currentDevice?.role}
              </span>
            </div>
            <p className="text-[12px] font-mono text-neutral-600 dark:text-neutral-400 mt-0.5">
              ID: <span className="text-neutral-900 dark:text-neutral-200 font-semibold">{currentDevice?.deviceId}</span> • Key: <span className="text-neutral-600 dark:text-neutral-400">{currentDevice?.publicKey?.slice(0, 16)}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button type="button" variant="secondary" size="sm" onClick={loadMesh} icon={RefreshCw} loading={loading}>
            Refresh
          </Button>
          {currentDevice?.role !== 'primary' && currentUser?.role === 'admin' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={promoting}
              onClick={handlePromoteToPrimary}
              className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              icon={Crown}
            >
              Promote to Primary
            </Button>
          )}
          {currentDevice?.role === 'primary' && (
            <Button type="button" variant="primary" size="sm" onClick={() => setPairModalOpen(true)} icon={QrCode} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Pair New Terminal
            </Button>
          )}
        </div>
      </div>

      {/* Paired Mesh Devices Table / Mobile Cards */}
      <DeviceMeshList
        devices={devices}
        currentDevice={currentDevice}
        revokingId={revokingId}
        handleRevoke={handleRevoke}
        handleUnrevoke={handleUnrevoke}
        handleDelete={handleDelete}
      />

      <PairDeviceModal open={pairModalOpen} onClose={() => { setPairModalOpen(false); loadMesh(); }} />
    </div>
  );
}
