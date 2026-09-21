/**
 * Reconciler Payload Handler
 * Applies incoming peer reconciliation payloads and responds to requested entities.
 */

import { getDatabase, TABLES, flushDb } from '../db';
import { getP2PMesh } from '../mesh/p2pMesh';
import { refreshAllStoresFromLocalDb } from './storeSync';
import { recomputeStockFromLedger } from './reconcilerOps';
import {
  getReconcileUsers,
  getReconcileProducts,
  getReconcileInventoryTxs,
  getReconcileFullSales,
} from './reconcilerQueries';
import { applyReconciledEntities } from './reconcilePayloadApplier';

export async function processReconcilePayload(senderId: string, payload: any): Promise<void> {
  if (!payload) return;
  const db = await getDatabase();
  const now = Date.now();
  const mesh = getP2PMesh();

  await db.transaction(async (tx) => {
    await applyReconciledEntities(payload, tx, now);
  });

  if (payload.newSettings) {
    try {
      const { localDb, SETTINGS_ID } = await import('../localDb');
      const { useSettingsStore } = await import('../../stores/settingsStore');
      const { mergeRemoteSettingsIntoLocal } = await import('../services/settings/settingsHelper');
      const currentLocal = await localDb.appSettings.get(SETTINGS_ID);
      const merged = mergeRemoteSettingsIntoLocal(currentLocal, payload.newSettings);
      merged.id = SETTINGS_ID;
      merged.updatedAt = new Date(now);

      await localDb.appSettings.put(merged);
      await db.execute(
        `INSERT INTO ${TABLES.SETTINGS} (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['app_settings', JSON.stringify(merged), now]
      );
      await db.execute(
        `UPDATE shop SET
          name = COALESCE(?, name),
          currency = COALESCE(?, currency),
          tax_rate = COALESCE(?, tax_rate),
          logo_url = CASE WHEN ? IS NOT NULL THEN ? ELSE logo_url END,
          address = COALESCE(?, address),
          phone = COALESCE(?, phone),
          updated_at = ?;`,
        [
          merged.storeName || null,
          merged.currency || null,
          merged.taxRate !== undefined ? Number(merged.taxRate) : null,
          merged.storeLogo !== undefined ? (merged.storeLogo || '') : null,
          merged.storeLogo !== undefined ? (merged.storeLogo || '') : null,
          merged.storeAddress || null,
          merged.storePhone || null,
          now,
        ]
      );
      useSettingsStore.getState().setSettings(merged);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: merged }));
      }
    } catch (err) {
      console.warn('[Reconciler] Settings merge warning:', err);
    }
  }

  if (payload.requestSettings) {
    const { localDb, SETTINGS_ID } = await import('../localDb');
    const { isDefaultPlaceholderSettings } = await import('../services/settings/settingsHelper');
    let toSend: any = null;
    const row = await db.queryOne<{ value: string }>(
      `SELECT value FROM ${TABLES.SETTINGS} WHERE key = 'app_settings';`
    ).catch(() => null);
    if (row?.value) { try { toSend = JSON.parse(row.value); } catch {} }
    if (!toSend || isDefaultPlaceholderSettings(toSend)) {
      const dex = await localDb.appSettings.get(SETTINGS_ID).catch(() => null);
      if (dex && !isDefaultPlaceholderSettings(dex)) toSend = dex;
    }
    if (toSend && !isDefaultPlaceholderSettings(toSend)) {
      mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newSettings: toSend });
    }
  }
  if (payload.requestUserIds?.length > 0) {
    const users = await getReconcileUsers(payload.requestUserIds);
    if (users.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newUsers: users });
  }
  if (payload.requestProductIds?.length > 0) {
    const prods = await getReconcileProducts(payload.requestProductIds);
    const cats = await db.query(`SELECT * FROM ${TABLES.CATEGORIES};`);
    const sups = await db.query(`SELECT * FROM ${TABLES.SUPPLIERS};`);
    if (prods.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newProducts: prods, newCategories: cats, newSuppliers: sups });
  }
  if (payload.requestSaleIds?.length > 0) {
    const sales = await getReconcileFullSales(payload.requestSaleIds);
    if (sales.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newSales: sales });
  }
  if (payload.requestDiscountIds?.length > 0) {
    const discounts = await db.query<any>(
      `SELECT * FROM ${TABLES.DISCOUNTS} WHERE id IN (${payload.requestDiscountIds.map(() => '?').join(',')});`,
      payload.requestDiscountIds
    ).catch(() => []);
    if (discounts.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newDiscounts: discounts });
  }
  if (payload.requestInvIds?.length > 0) {
    const txs = await getReconcileInventoryTxs(payload.requestInvIds);
    if (txs.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newInvTxs: txs });
  }
  if (payload.requestCustomerIds?.length > 0) {
    const customers = await db.query<any>(
      `SELECT * FROM ${TABLES.CUSTOMERS} WHERE id IN (${payload.requestCustomerIds.map(() => '?').join(',')});`,
      payload.requestCustomerIds
    ).catch(() => []);
    if (customers.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newCustomers: customers });
  }
  if (payload.requestExpenseIds?.length > 0) {
    const expenses = await db.query<any>(
      `SELECT * FROM ${TABLES.EXPENSES} WHERE id IN (${payload.requestExpenseIds.map(() => '?').join(',')});`,
      payload.requestExpenseIds
    ).catch(() => []);
    if (expenses.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newExpenses: expenses });
  }
  if (payload.requestPaymentModeIds?.length > 0) {
    const paymentModes = await db.query<any>(
      `SELECT * FROM ${TABLES.PAYMENT_MODES} WHERE id IN (${payload.requestPaymentModeIds.map(() => '?').join(',')});`,
      payload.requestPaymentModeIds
    ).catch(() => []);
    if (paymentModes.length > 0) mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', { newPaymentModes: paymentModes });
  }

  await recomputeStockFromLedger();
  await flushDb();
  await refreshAllStoresFromLocalDb();
}
