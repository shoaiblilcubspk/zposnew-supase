import React from 'react';
import { Smartphone, Monitor, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { PairedDeviceRecord } from '../../../lib/mesh/pairingManager';
import { DeviceProfile } from '../../../lib/mesh/deviceIdentity';
import { formatAppDateTime } from '../../../lib/dateUtils';

interface DeviceMeshListProps {
  devices: PairedDeviceRecord[];
  currentDevice: DeviceProfile | null;
  revokingId: string | null;
  handleRevoke: (deviceId: string) => void;
  handleUnrevoke: (deviceId: string) => void;
  handleDelete: (deviceId: string) => void;
}

export function DeviceMeshList({
  devices,
  currentDevice,
  revokingId,
  handleRevoke,
  handleUnrevoke,
  handleDelete,
}: DeviceMeshListProps) {
  return (
    <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-none overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-semibold text-neutral-900 dark:text-white">Mesh Network Terminals</h4>
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400">All authorized terminals replicating peer-to-peer</p>
        </div>
        <span className="text-[12px] font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
          {devices.length} {devices.length === 1 ? 'Terminal' : 'Terminals'}
        </span>
      </div>

      {/* Mobile View: Clean Native Cards */}
      <div className="md:hidden divide-y divide-neutral-100 dark:divide-white/[0.04]">
        {devices.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-[13px]">
            No paired terminals found.
          </div>
        ) : (
          devices.map((dev) => {
            const isCurrent = dev.deviceId === currentDevice?.deviceId;
            return (
              <div key={dev.deviceId} className={`p-3.5 space-y-2 ${isCurrent ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {dev.role === 'primary' ? (
                      <Monitor className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                    <span className="font-semibold text-neutral-900 dark:text-white text-[13px] truncate">
                      {dev.name}
                    </span>
                    {isCurrent && <span className="text-[10px] text-primary font-medium shrink-0">(This Device)</span>}
                  </div>
                  {dev.isRevoked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-danger font-medium shrink-0">
                      <XCircle className="w-3 h-3" /> Revoked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-mono gap-1">
                  <span>ID: {dev.deviceId}</span>
                  <span className="capitalize">{dev.role}</span>
                  <span>{dev.pairedAt ? formatAppDateTime(dev.pairedAt) : '—'}</span>
                </div>
                {!isCurrent && currentDevice?.role === 'primary' && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {!dev.isRevoked ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        loading={revokingId === dev.deviceId}
                        onClick={() => handleRevoke(dev.deviceId)}
                        className="w-full"
                      >
                        Revoke
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20"
                          onClick={() => handleUnrevoke(dev.deviceId)}
                        >
                          Restore
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDelete(dev.deviceId)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View: Full 6-Column Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 font-medium text-[12px]">
              <th className="py-2.5 px-4">Terminal Name</th>
              <th className="py-2.5 px-4 font-mono">Device ID</th>
              <th className="py-2.5 px-4">Role</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Paired Date</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-neutral-500 text-[13px]">
                  No paired terminals found.
                </td>
              </tr>
            ) : (
              devices.map((dev) => {
                const isCurrent = dev.deviceId === currentDevice?.deviceId;
                return (
                  <tr
                    key={dev.deviceId}
                    className={`h-8 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors ${
                      isCurrent ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-2 px-4 font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                      {dev.role === 'primary' ? <Monitor className="w-3.5 h-3.5 text-primary" /> : <Smartphone className="w-3.5 h-3.5 text-neutral-400" />}
                      {dev.name}
                      {isCurrent && <span className="text-[10px] text-primary font-sans font-normal">(This Device)</span>}
                    </td>
                    <td className="py-2 px-4 font-mono text-[12px] text-neutral-700 dark:text-neutral-300">{dev.deviceId}</td>
                    <td className="py-2 px-4 capitalize text-neutral-700 dark:text-neutral-300">{dev.role}</td>
                    <td className="py-2 px-4">
                      {dev.isRevoked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-danger font-medium">
                          <XCircle className="w-3 h-3" /> Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-700 dark:text-neutral-300 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-primary" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400 text-[12px] tabular-nums font-mono">
                      {dev.pairedAt ? formatAppDateTime(dev.pairedAt) : '—'}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {!isCurrent && !dev.isRevoked && currentDevice?.role === 'primary' && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          loading={revokingId === dev.deviceId}
                          onClick={() => handleRevoke(dev.deviceId)}
                        >
                          Revoke
                        </Button>
                      )}
                      {!isCurrent && dev.isRevoked && currentDevice?.role === 'primary' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20"
                            onClick={() => handleUnrevoke(dev.deviceId)}
                          >
                            Restore
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(dev.deviceId)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
