/**
 * Cloud Sync settings tab — the live sync queue viewer (AGENTS.md §1.5.4).
 * Shows EVERY not-yet-synced action by name with its real status (queued / retrying / failed),
 * time, and error. Failed bundles get a Retry button. Data comes straight from the local
 * sync_queue — never faked. Successful pushes leave the queue (pruned), so a short/empty list
 * means everything is synced.
 */
import React from 'react';
import {
  countPending, countFailed, getActiveQueue, retryFailed, flushQueue, type SyncQueueRow,
} from '../../../data';

const ACTION_LABELS: Record<string, string> = {
  create_sale: 'Sale created',
  void_sale: 'Sale voided',
  refund_sale: 'Sale refunded',
  edit_sale: 'Sale edited',
  add_payment: 'Customer payment',
  customer_refund: 'Customer refund',
  create_product: 'Product created',
  update_product: 'Product updated',
  stock_adjust: 'Stock adjusted',
  create_bundle_deal: 'Deal created',
  update_bundle_deal: 'Deal updated',
  supplier_bill: 'Supplier bill',
  supplier_payment: 'Supplier payment',
  delete_purchase_record: 'Purchase deleted',
  delete_expense: 'Expense deleted',
};

function labelFor(row: SyncQueueRow): string {
  let action = row.table_name;
  try {
    const p = JSON.parse(row.payload) as { action?: string };
    if (p.action) action = p.action;
  } catch { /* keep fallback */ }
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Generic single-op fallbacks: insert_categories -> "Categories added", etc.
  const m = /^(insert|update|soft_delete)_(.+)$/.exec(action);
  if (m) {
    const verb = m[1] === 'insert' ? 'added' : m[1] === 'update' ? 'updated' : 'removed';
    return `${m[2].replace(/_/g, ' ')} ${verb}`;
  }
  return action;
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Queued', cls: 'text-amber-600 dark:text-amber-400' },
  error: { label: 'Retrying', cls: 'text-amber-600 dark:text-amber-400' },
  failed: { label: 'Failed', cls: 'text-red-600 dark:text-red-400' },
};

export function DeviceMeshTab() {
  const [pending, setPending] = React.useState(0);
  const [failed, setFailed] = React.useState(0);
  const [items, setItems] = React.useState<SyncQueueRow[]>([]);
  const [online, setOnline] = React.useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [p, f, list] = await Promise.all([countPending(), countFailed(), getActiveQueue()]);
    setPending(p); setFailed(f); setItems(list);
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
  }, []);

  React.useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 3000);
    const on = () => void refresh();
    if (typeof window !== 'undefined') { window.addEventListener('online', on); window.addEventListener('offline', on); }
    return () => {
      clearInterval(id);
      if (typeof window !== 'undefined') { window.removeEventListener('online', on); window.removeEventListener('offline', on); }
    };
  }, [refresh]);

  const syncNow = async () => {
    setBusy(true);
    try { await flushQueue(); await refresh(); } finally { setBusy(false); }
  };
  const retry = async (operationId: string) => {
    await retryFailed(operationId); await flushQueue(); await refresh();
  };

  return (
    <div className="p-4 text-neutral-800 dark:text-neutral-200">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-tight">Cloud Sync</h3>
        <button
          type="button"
          onClick={syncNow}
          disabled={busy}
          className="rounded border border-white/[0.08] px-2.5 py-1 text-[12px] hover:bg-white/[0.04] disabled:opacity-50"
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[12px] text-neutral-500 dark:text-neutral-400">
        <span className={`inline-flex items-center gap-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
          {online ? 'Online — auto-syncing' : 'Offline — queued, will auto-sync when back online'}
        </span>
        <span>Queued: <span className="text-neutral-700 dark:text-neutral-200">{pending}</span></span>
        <span>Failed: <span className={failed ? 'text-red-500' : 'text-neutral-700 dark:text-neutral-200'}>{failed}</span></span>
      </div>

      <p className="mt-2 max-w-prose text-[12px] text-neutral-500">
        Every change is queued locally and pushed to Supabase automatically when online. This list
        shows actions not yet synced; a synced action leaves the queue. Nothing is faked.
      </p>

      <div className="mt-3 rounded border border-white/[0.08] divide-y divide-white/[0.06]">
        {items.length === 0 ? (
          <div className="p-4 text-[13px] text-neutral-500">All changes synced — the queue is empty.</div>
        ) : (
          items.map((row) => {
            const s = STATUS_UI[row.status] ?? { label: row.status, cls: 'text-neutral-500' };
            return (
              <div key={row.operation_id} className="flex items-start justify-between gap-3 p-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] text-neutral-800 dark:text-neutral-100">{labelFor(row)}</div>
                  <div className="text-[11px] text-neutral-500">
                    <span className={s.cls}>{s.label}</span>
                    {row.retry_count > 0 && <span> · {row.retry_count} tr{row.retry_count === 1 ? 'y' : 'ies'}</span>}
                    <span> · {timeAgo(row.created_at)}</span>
                  </div>
                  {row.status === 'failed' && row.last_error && (
                    <div className="truncate text-[11px] text-red-500" title={row.last_error}>{row.last_error}</div>
                  )}
                </div>
                {row.status === 'failed' && (
                  <button
                    type="button"
                    onClick={() => void retry(row.operation_id)}
                    className="shrink-0 rounded border border-white/[0.08] px-2 py-0.5 text-[11px] hover:bg-white/[0.04]"
                  >
                    Retry
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
