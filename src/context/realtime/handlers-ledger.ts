import { localDb, isPendingDelete } from '../../lib/localDb';
import { setStockReconcileSuspended } from '../../lib/PosDB';
import {
  usePaymentsStore,
  useCartStore,
  useUsersStore,
} from '../../stores';
import {
  mapPayment,
  mapStockHistory,
} from '../../lib/services';
import { RealtimeCtx } from './types';

export function attachLedgerHandlers(channel: any, ctx: RealtimeCtx) {
  const { user } = ctx;

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, async (payload: any) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('payments', payload.new.id)) return;
        await localDb.payments.put(mapPayment(payload.new));
        const all = (await localDb.payments.toArray()).map(mapPayment);
        usePaymentsStore.getState().setPayments(all);
      } else if (payload.eventType === 'DELETE') {
        await localDb.payments.delete(payload.old.id);
        const all = (await localDb.payments.toArray()).map(mapPayment);
        usePaymentsStore.getState().setPayments(all);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_history' }, async (payload: any) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('stock_history', payload.new.id)) return;
        setStockReconcileSuspended(true);
        try { await localDb.stockHistory.put(mapStockHistory(payload.new)); }
        finally { setStockReconcileSuspended(false); }
      } else if (payload.eventType === 'DELETE') {
        await localDb.stockHistory.delete(payload.old.id);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async (payload: any) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('users', payload.new.id)) return;
        await localDb.users.put(payload.new);
        const all = await localDb.users.toArray();
        useUsersStore.getState().setUsers(all);
      } else if (payload.eventType === 'DELETE') {
        await localDb.users.delete(payload.old.id);
        const all = await localDb.users.toArray();
        useUsersStore.getState().setUsers(all);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_tabs' }, async (payload: any) => {
      const currentUserId = user?.id;
      if (!currentUserId) return;
      const affectedUserId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
      if (affectedUserId !== currentUserId) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('sales_tabs', payload.new.id)) return;
        const row = payload.new as any;
        const mapped = {
          ...row,
          userId: row.user_id,
          editingSaleId: row.editing_sale_id ?? null,
        };
        await localDb.salesTabs.put(mapped);
        const allTabs = await localDb.salesTabs.where('userId').equals(currentUserId).toArray();
        useCartStore.getState().setSalesTabs(allTabs.slice(0, 3));
      } else if (payload.eventType === 'DELETE') {
        await localDb.salesTabs.delete(payload.old.id);
        const allTabs = await localDb.salesTabs.where('userId').equals(currentUserId).toArray();
        useCartStore.getState().setSalesTabs(allTabs.slice(0, 3));
      }
    });
}
