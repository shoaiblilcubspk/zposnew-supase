import React, { useState } from 'react';
import { useUsersStore } from '../../../stores';
import { runReconciliation } from '../../../lib/services/reconciliationService';
import { Activity, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../../../shared/ui';

export const LedgerHealth: React.FC = () => {
  const currentUser = useUsersStore(s => s.currentUser);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (currentUser?.role !== 'admin') return null;

  const run = async () => {
    setLoading(true);
    try {
      const r = await runReconciliation();
      setResult(r);
    } catch (e: any) {
      setResult({ error: e?.message || 'Failed to run reconciliation' });
    } finally {
      setLoading(false);
    }
  };

  const score = result?.healthScore ?? null;
  const badge = score == null
    ? 'bg-neutral-500'
    : score >= 100 ? 'bg-emerald-600'
    : score >= 80 ? 'bg-amber-600'
    : 'bg-rose-600';

  const sections = [
    { label: 'Stock Drift', rows: result?.stockDrift },
    { label: 'Wallet Drift', rows: result?.walletDrift },
    { label: 'Over-refunds', rows: result?.overRefunds },
    { label: 'Orphan Sales', rows: result?.orphanSales },
  ];

  return (
    <div className="bg-white dark:bg-surface rounded-md p-4 sm:p-5 border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4 text-[13px] tracking-[-0.01em]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <Activity size={18} className="text-emerald-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px] leading-tight">
              Ledger Integrity &amp; Reconciliation
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono mt-0.5">
              Audits append-only sales, inventory transactions, and payment wallet balances
            </p>
          </div>
        </div>
        <Button
          onClick={run}
          disabled={loading}
          variant="primary"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
        >
          {loading ? 'Verifying…' : 'Run Verification'}
        </Button>
      </div>

      {score != null && (
        <div className={`inline-flex items-center gap-2 text-white text-[12px] font-medium px-2.5 py-1 rounded ${badge}`}>
          {result?.isClean ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          Health Score: {score}/100
        </div>
      )}

      {result?.error && <p className="text-[12px] text-danger mt-3 font-mono">{result.error}</p>}

      {result && !result.error && (
        <div className="mt-4 space-y-3">
          {sections.map(sec => (
            <div key={sec.label}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 font-mono">
                {sec.label} — {(sec.rows || []).length} issue(s)
              </p>
              {(sec.rows || []).length > 0 && (
                <pre className="text-[11px] font-mono bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] rounded p-2 mt-1 overflow-auto max-h-40">
                  {JSON.stringify(sec.rows, null, 2)}
                </pre>
              )}
            </div>
          ))}
          <p className="text-[11px] text-neutral-500 font-mono pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
            Local SQLite Ledger Verification:
            <br />SELECT * FROM stock_drift; SELECT * FROM wallet_drift; SELECT * FROM over_refunds; SELECT * FROM orphan_sales;
          </p>
        </div>
      )}
    </div>
  );
};
