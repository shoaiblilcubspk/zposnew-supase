/**
 * Cloud Sync settings tab (P2P removed). Shows the local sync queue health and — per
 * AGENTS.md §1.5.4 — surfaces any bundles that PERMANENTLY failed to push so the user can
 * retry them after the cause is fixed. A failed bundle left NO partial cloud rows (the whole
 * server transaction rolled back), so retrying is safe and idempotent (same operation_id).
 */
import React from 'react';
import {
  countPending, countFailed, getFailed, retryFailed, flushQueue, type SyncQueueRow,
} from '../../../data';

export function DeviceMeshTab() {
  const [pending, setPending] = React.useState(0);
  const [failed, setFailed] = React.useState<SyncQueueRow[]>([]);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [p, f] = await Promise.all([countPending(), getFailed()]);
    setPending(p);
    setFailed(f);
  }, []);

  React.useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const syncNow = async () => {
    setBusy(true);
    try {
      await flushQueue();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const retry = async (operationId: string) => {
    await retryFailed(operationId);
    await flushQueue();
    await refresh();
  };

  return (
    <div className="p-4 text-neutral-300">
      <h3 className="text-[15px] font-semibold tracking-tight">Cloud Sync</h3>
      <p className="mt-2 max-w-prose text-[13px] text-neutral-400">
        This POS syncs through the cloud (Supabase). Every terminal signed in with a staff
        account shares the same live data. Offline changes are queued locally and pushed as
        atomic bundles when the connection returns.
      </p>

      <div className="mt-4 flex items-center gap-3 text-[13px]">
        <span className="text-neutral-400">
          Pending: <span className="text-neutral-200">{pending}</span>
        </span>
        <span className="text-neutral-400">
          Failed: <span className={failed.length ? 'text-red-400' : 'text-neutral-200'}>{failed.length}</span>
        </span>
        <button
          type="button"
          onClick={syncNow}
          disabled={busy}
          className="rounded border border-white/[0.08] px-2.5 py-1 text-[12px] text-neutral-200 hover:bg-white/[0.04] disabled:opacity-50"
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {failed.length > 0 && (
        <div className="mt-4">
          <div className="text-[13px] font-medium text-neutral-200">Failed bundles</div>
          <p className="mt-1 max-w-prose text-[12px] text-neutral-500">
            These actions did not save to the cloud (nothing was half-written). Fix the cause,
            then retry.
          </p>
          <ul className="mt-2 divide-y divide-white/[0.06] rounded border border-white/[0.08]">
            {failed.map((b) => {
              let action = b.table_name;
              try {
                action = (JSON.parse(b.payload) as { action?: string }).action ?? b.table_name;
              } catch {
                /* keep fallback */
              }
              return (
                <li key={b.operation_id} className="flex items-start justify-between gap-3 p-2.5">
                  <div className="min-w-0">
                    <div className="text-[12px] text-neutral-200">{action}</div>
                    <div className="truncate text-[11px] text-red-400" title={b.last_error ?? ''}>
                      {b.last_error ?? 'Unknown error'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void retry(b.operation_id)}
                    className="shrink-0 rounded border border-white/[0.08] px-2 py-0.5 text-[11px] text-neutral-200 hover:bg-white/[0.04]"
                  >
                    Retry
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
