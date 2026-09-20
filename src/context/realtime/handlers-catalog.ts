import { localDb, isPendingDelete } from '../../lib/localDb';
import {
  useAppStore,
  useInventoryStore,
} from '../../stores';
import {
  mapDiscount,
  mapPurchaseRecord,
} from '../../lib/services';
import { RealtimeCtx } from './types';

export function attachCatalogHandlers(channel: any, _ctx: RealtimeCtx) {
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async (payload: any) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('categories', payload.new.id)) return;
        await localDb.categories.put(payload.new);
        const all = await localDb.categories.toArray();
        useInventoryStore.getState().setCategories(all);
      } else if (payload.eventType === 'DELETE') {
        await localDb.categories.delete(payload.old.id);
        const all = await localDb.categories.toArray();
        useInventoryStore.getState().setCategories(all);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, async (payload: any) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('suppliers', payload.new.id)) return;
        await localDb.suppliers.put(payload.new);
        const all = await localDb.suppliers.toArray();
        useInventoryStore.getState().setSuppliers(all);
      } else if (payload.eventType === 'DELETE') {
        await localDb.suppliers.delete(payload.old.id);
        const all = await localDb.suppliers.toArray();
        useInventoryStore.getState().setSuppliers(all);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'discounts' }, async (payload: any) => {
      if (payload.eventType === 'INSERT') {
        if (await isPendingDelete('discounts', payload.new.id)) return;
        const mapped = mapDiscount(payload.new);
        await localDb.discounts.put(mapped);
        useAppStore.getState().addDiscount(mapped);
      } else if (payload.eventType === 'UPDATE') {
        if (await isPendingDelete('discounts', payload.new.id)) return;
        const mapped = mapDiscount(payload.new);
        await localDb.discounts.put(mapped);
        useAppStore.getState().updateDiscount(mapped);
      } else if (payload.eventType === 'DELETE') {
        await localDb.discounts.delete(payload.old.id);
        useAppStore.getState().deleteDiscount(payload.old.id);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_records' }, async (payload: any) => {
      if (payload.eventType === 'INSERT') {
        if (await isPendingDelete('purchase_records', payload.new.id)) return;
        const mapped = mapPurchaseRecord(payload.new);
        await localDb.purchaseRecords.put(mapped);
        useInventoryStore.getState().addPurchaseRecord(mapped);
      } else if (payload.eventType === 'UPDATE') {
        if (await isPendingDelete('purchase_records', payload.new.id)) return;
        const mapped = mapPurchaseRecord(payload.new);
        await localDb.purchaseRecords.put(mapped);
        useInventoryStore.getState().updatePurchaseRecord(mapped);
      } else if (payload.eventType === 'DELETE') {
        await localDb.purchaseRecords.delete(payload.old.id);
        useInventoryStore.getState().deletePurchaseRecord(payload.old.id);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, async (payload: any) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('purchase_orders', payload.new.id)) return;
        await localDb.purchaseOrders.put(payload.new);
        const all = await localDb.purchaseOrders.toArray();
        useInventoryStore.getState().setPurchaseOrders(all);
      } else if (payload.eventType === 'DELETE') {
        await localDb.purchaseOrders.delete(payload.old.id);
        const all = await localDb.purchaseOrders.toArray();
        useInventoryStore.getState().setPurchaseOrders(all);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_transactions' }, async (payload: any) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (await isPendingDelete('supplier_transactions', payload.new.id)) return;
        await localDb.supplierTransactions.put(payload.new);
        const all = await localDb.supplierTransactions.toArray();
        useInventoryStore.getState().setSupplierTransactions(all);
      } else if (payload.eventType === 'DELETE') {
        await localDb.supplierTransactions.delete(payload.old.id);
        const all = await localDb.supplierTransactions.toArray();
        useInventoryStore.getState().setSupplierTransactions(all);
      }
    });
}
