import { useState, useEffect } from 'react';
import Dexie from 'dexie';
import { RealIcon } from '../../../shared/icons';
import { formatCurrency } from '../../../lib/currencies';
import { localDb } from '../../../lib/localDb';
import { getStartOfDayInTimezone, getEndOfDayInTimezone } from '../../../lib/dateUtils';
import { getAmountByMethod } from '../../../lib/services';
import { useSettingsStore } from '../../../stores';

export function WalletStrip({ currency, timezone }: { currency: string, timezone?: string }) {
  const appSettings = useSettingsStore(s => s.settings);
  const [modes, setModes] = useState<any[]>([]);
  const [creditReceived, setCreditReceived] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      Dexie.ignoreTransaction(async () => {
        // 1. Get mode structures
      const m = await localDb.paymentModes.toArray();
      const order = ['cash', 'card', 'online'];
      m.sort((a: any, b: any) => order.indexOf(a.id) - order.indexOf(b.id));

      // 2. Fetch today's sales
      const tz = timezone || 'Asia/Karachi';
      const start = getStartOfDayInTimezone(new Date(), tz);
      const end = getEndOfDayInTimezone(new Date(), tz);
      const todaySales = await localDb.sales
        .where('timestamp')
        .between(start, end)
        .toArray();

      // 3. Compute totals
      const totals = { cash: 0, card: 0, online: 0 };
      let creditGivenTotal = 0;
      let creditReceivedTotal = 0;
      todaySales.forEach(t => {
        const addToWallet = (method: 'cash' | 'card' | 'online', amt: number) => {
          totals[method] = Math.round((totals[method] + amt) * 100) / 100;
        };

        if (t.status !== 'pending') {
          addToWallet('cash', getAmountByMethod(t, 'cash'));
          addToWallet('card', getAmountByMethod(t, 'card'));
          addToWallet('online', getAmountByMethod(t, 'online'));
          if (t.status !== 'refunded') {
            creditGivenTotal = Math.round((creditGivenTotal + getAmountByMethod(t, 'credit')) * 100) / 100;
          }
        }

        if (t.status === 'refunded') {
          addToWallet('cash', -getAmountByMethod(t, 'cash'));
          addToWallet('card', -getAmountByMethod(t, 'card'));
          addToWallet('online', -getAmountByMethod(t, 'online'));
        } else if (t.status === 'partially_refunded') {
          const refundedAmt = t.refundedAmount || 0;
          addToWallet('cash', -(t.paymentMethod === 'split'
            ? refundedAmt * (getAmountByMethod(t, 'cash') / (t.total || 1))
            : (t.paymentMethod === 'cash' || !t.paymentMethod ? refundedAmt : 0)));
          addToWallet('card', -(t.paymentMethod === 'split'
            ? refundedAmt * (getAmountByMethod(t, 'card') / (t.total || 1))
            : (t.paymentMethod === 'card' ? refundedAmt : 0)));
          addToWallet('online', -(t.paymentMethod === 'split'
            ? refundedAmt * (getAmountByMethod(t, 'online') / (t.total || 1))
            : (t.paymentMethod === 'online' ? refundedAmt : 0)));
        }
      });

      // 4. Fetch today's payments & expenses
      const todayPayments = await localDb.payments
        .filter((p: any) => {
          const t = new Date(p.createdAt || p.created_at || p.timestamp).getTime();
          return t >= start.getTime() && t <= end.getTime();
        })
        .toArray();
        
      const todayExpenses = await localDb.expenses
        .filter((e: any) => {
          const t = new Date(e.createdAt || e.created_at || e.timestamp).getTime();
          return t >= start.getTime() && t <= end.getTime();
        })
        .toArray();

      todayPayments.forEach(p => {
        const amt = Number(p.amount);
        const method = (p.paymentMethod || p.paymentType || p.method || 'cash') as 'cash' | 'card' | 'online';
        if (p.direction === 'in') {
          totals[method] = Math.round((totals[method] + amt) * 100) / 100;
          creditReceivedTotal = Math.round((creditReceivedTotal + amt) * 100) / 100;
        } else if (p.direction === 'out') {
          totals[method] = Math.round((totals[method] - amt) * 100) / 100;
        }
      });

      todayExpenses.forEach(e => {
        const amt = Number(e.amount);
        const method = (e.paymentMethod || 'cash') as 'cash' | 'card' | 'online';
        totals[method] = Math.round((totals[method] - amt) * 100) / 100;
      });

      // 5. Merge
      const finalModes = m.map(mode => ({
        ...mode,
        balance: totals[mode.id as 'cash' | 'card' | 'online'] || 0
      }));

      if (appSettings?.enableCreditSales || appSettings?.enable_credit_sales) {
        finalModes.push({
          id: 'credit',
          name: 'Credit',
          icon: 'wallet',
          color: '#f59e0b',
          balance: creditGivenTotal - creditReceivedTotal,
          creditGiven: creditGivenTotal,
          creditRecovered: creditReceivedTotal
        });
      }

      if (alive) {
        setModes(finalModes);
        setCreditReceived(creditReceivedTotal);
      }
      });
    };
    load();
    const subs: any[] = [];
    try {
      subs.push(localDb.sales.hook('creating').subscribe(() => load()));
      subs.push(localDb.sales.hook('updating').subscribe(() => load()));
      subs.push(localDb.sales.hook('deleting').subscribe(() => load()));
      subs.push(localDb.payments.hook('creating').subscribe(() => load()));
      subs.push(localDb.payments.hook('updating').subscribe(() => load()));
      subs.push(localDb.payments.hook('deleting').subscribe(() => load()));
    } catch { /* hooks unsupported */ }
    return () => { alive = false; subs.forEach(s => s?.unsubscribe?.()); };
  }, [timezone, appSettings]);

  if (!modes.length) return null;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
          {"Today's Drawer"}
        </p>
      </div>
      <div className={`grid gap-2 pt-2.5 ${modes.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {modes.map((mode: any) => {
          const displayName = mode.id === 'credit'
            ? 'Credit Wallet'
            : mode.name?.toLowerCase().includes('wallet')
              ? mode.name
              : `${mode.name} Wallet`;
          const iconName = mode.id === 'cash'
            ? 'cashWallet'
            : mode.id === 'card'
              ? 'cardWallet'
              : mode.id === 'online'
                ? 'bankWallet'
                : 'expenses';

          return (
            <div
              key={mode.id}
              className="relative bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-xl h-16 sm:h-[68px] px-2 pt-2 pb-1 flex flex-col items-center justify-center text-center shadow-none hover:border-neutral-300 dark:hover:border-white/20 transition-all overflow-visible"
            >
              <div className="-mt-5 mb-0.5 shrink-0 flex items-center justify-center drop-shadow-md">
                <RealIcon name={iconName} size="xl" />
              </div>
              <span className="text-[13.5px] sm:text-[14px] font-mono font-bold tabular-nums text-neutral-900 dark:text-white leading-none">
                {mode.id === 'credit' ? `${formatCurrency(mode.creditGiven || 0, currency)}` : formatCurrency(mode.balance, currency)}
              </span>
              <span className="text-[10px] sm:text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-tight mt-0.5 leading-none">
                {displayName}
              </span>
              {mode.id === 'credit' && (
                <span className="text-[8.5px] font-mono text-neutral-400 mt-0.5 leading-none">
                  Rec: {formatCurrency(mode.creditRecovered || 0, currency)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
