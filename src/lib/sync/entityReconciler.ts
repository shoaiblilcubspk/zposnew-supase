/**
 * Continuous Bidirectional Entity Reconciler
 * Full P2P state convergence across sales, products, categories, suppliers, settings, and ledger.
 */

import { getDatabase, TABLES, flushDb } from '../db';
import { getP2PMesh } from '../mesh/p2pMesh';
import { refreshAllStoresFromLocalDb } from './storeSync';
import { executeReconciledSaleVoid, recomputeStockFromLedger } from './reconcilerOps';
import {
  getReconcileUsers,
  getReconcileProducts,
  getReconcileInventoryTxs,
  getReconcileFullSales,
  diffSalesManifest,
} from './reconcilerQueries';
import { applyReconciledEntities } from './reconcilePayloadApplier';

import { buildLocalManifest, EntityManifest } from './reconcilerManifest';
import { processReconcilePayload } from './reconcilerPayloadHandler';

export type { EntityManifest };

export class EntityReconciler {
  private isReconciling = false;

  async buildLocalManifest(deviceId: string): Promise<EntityManifest> {
    return buildLocalManifest(deviceId);
  }

  async reconcileWithPeer(peerId: string, localDeviceId: string): Promise<void> {
    if (this.isReconciling) return;
    try {
      this.isReconciling = true;
      const manifest = await this.buildLocalManifest(localDeviceId);
      getP2PMesh().sendToPeer(peerId, 'RECONCILE_REQUEST', manifest);
    } catch (err) {
      console.warn(`[Reconciler] Reconcile error with ${peerId}:`, err);
    } finally {
      this.isReconciling = false;
    }
  }

  async handleReconcileRequest(senderId: string, remote: EntityManifest, _localDeviceId: string): Promise<void> {
    if (!remote) return;
    const db = await getDatabase();
    const now = Date.now();
    const mesh = getP2PMesh();

    // 1. Sales Reconciliation (with edit & void detection)
    const localSales = await db.query<any>(`SELECT id, status, total_amount, updated_at FROM ${TABLES.SALES};`);
    const { salesToVoidLocally, salesToVoidRemotely, missingSalesLocally, missingSalesRemotely } = diffSalesManifest(
      localSales || [],
      remote.sales || []
    );

    if (salesToVoidLocally.length > 0) {
      await db.transaction(async (tx) => {
        for (const sid of salesToVoidLocally) await executeReconciledSaleVoid(sid, tx, now);
      });
    }

    // 2. Products Reconciliation
    const localProdIds = new Set((await db.query<any>(`SELECT id FROM ${TABLES.PRODUCTS};`)).map((p) => p.id));
    const remoteProdIds = new Set(remote.productIds || []);
    const missingProdsRemotely = [...localProdIds].filter((id) => !remoteProdIds.has(id));
    const missingProdsLocally = (remote.productIds || []).filter((id) => !localProdIds.has(id));

    const prodsToSend = missingProdsRemotely.length > 0 ? await getReconcileProducts(missingProdsRemotely) : [];
    const catsToSend = await db.query<any>(`SELECT * FROM ${TABLES.CATEGORIES};`);
    const supsToSend = await db.query<any>(`SELECT * FROM ${TABLES.SUPPLIERS};`);

    // 3. Users Reconciliation
    const localUserIds = new Set((await db.query<any>(`SELECT id FROM ${TABLES.USERS};`)).map((u) => u.id));
    const remoteUserIds = new Set(remote.userIds || []);
    const missingUsersRemotely = [...localUserIds].filter((id) => !remoteUserIds.has(id));
    const missingUsersLocally = (remote.userIds || []).filter((id) => !localUserIds.has(id));
    const usersToSend = missingUsersRemotely.length > 0 ? await getReconcileUsers(missingUsersRemotely) : [];

    // 4. Inventory Transactions Reconciliation
    const localInvSet = new Set((await db.query<any>(`SELECT id FROM ${TABLES.INVENTORY_TRANSACTIONS};`)).map((t) => t.id));
    const remoteInvSet = new Set(remote.inventoryTxIds || []);
    const missingInvRemotely = [...localInvSet].filter((id) => !remoteInvSet.has(id));
    const missingInvLocally = (remote.inventoryTxIds || []).filter((id) => !localInvSet.has(id));
    const invToSend = missingInvRemotely.length > 0 ? await getReconcileInventoryTxs(missingInvRemotely) : [];
    const salesToSend = missingSalesRemotely.length > 0 ? await getReconcileFullSales(missingSalesRemotely) : [];

    // 5. Discounts Reconciliation
    const localDiscountIds = new Set((await db.query<any>(`SELECT id FROM ${TABLES.DISCOUNTS} WHERE active = 1;`).catch(() => [])).map((d: any) => d.id));
    const remoteDiscountIds = new Set(remote.discountIds || []);
    const missingDiscountsRemotely = [...localDiscountIds].filter((id) => !remoteDiscountIds.has(id));
    const missingDiscountsLocally = (remote.discountIds || []).filter((id: string) => !localDiscountIds.has(id));
    const discountsToSend = missingDiscountsRemotely.length > 0
      ? await db.query<any>(`SELECT * FROM ${TABLES.DISCOUNTS} WHERE id IN (${missingDiscountsRemotely.map(() => '?').join(',')});`, missingDiscountsRemotely).catch(() => [])
      : [];

    // 6. Customers Reconciliation
    const localCustomerIds = new Set((await db.query<any>(`SELECT id FROM ${TABLES.CUSTOMERS};`)).map((c) => c.id));
    const remoteCustomerIds = new Set(remote.customerIds || []);
    const missingCustomersRemotely = [...localCustomerIds].filter((id) => !remoteCustomerIds.has(id));
    const missingCustomersLocally = (remote.customerIds || []).filter((id: string) => !localCustomerIds.has(id));
    const customersToSend = missingCustomersRemotely.length > 0
      ? await db.query<any>(`SELECT * FROM ${TABLES.CUSTOMERS} WHERE id IN (${missingCustomersRemotely.map(() => '?').join(',')});`, missingCustomersRemotely).catch(() => [])
      : [];

    // 7. Expenses Reconciliation
    const localExpenseIds = new Set((await db.query<any>(`SELECT id FROM ${TABLES.EXPENSES};`)).map((e) => e.id));
    const remoteExpenseIds = new Set(remote.expenseIds || []);
    const missingExpensesRemotely = [...localExpenseIds].filter((id) => !remoteExpenseIds.has(id));
    const missingExpensesLocally = (remote.expenseIds || []).filter((id: string) => !localExpenseIds.has(id));
    const expensesToSend = missingExpensesRemotely.length > 0
      ? await db.query<any>(`SELECT * FROM ${TABLES.EXPENSES} WHERE id IN (${missingExpensesRemotely.map(() => '?').join(',')});`, missingExpensesRemotely).catch(() => [])
      : [];

    // 8. Payment Modes Reconciliation
    const localPaymentModeIds = new Set((await db.query<any>(`SELECT id FROM ${TABLES.PAYMENT_MODES};`)).map((pm) => pm.id));
    const remotePaymentModeIds = new Set(remote.paymentModeIds || []);
    const missingPaymentModesRemotely = [...localPaymentModeIds].filter((id) => !remotePaymentModeIds.has(id));
    const missingPaymentModesLocally = (remote.paymentModeIds || []).filter((id: string) => !localPaymentModeIds.has(id));
    const paymentModesToSend = missingPaymentModesRemotely.length > 0
      ? await db.query<any>(`SELECT * FROM ${TABLES.PAYMENT_MODES} WHERE id IN (${missingPaymentModesRemotely.map(() => '?').join(',')});`, missingPaymentModesRemotely).catch(() => [])
      : [];

    // 9. Settings Reconciliation
    const { localDb, SETTINGS_ID } = await import('../localDb');
    const { isDefaultPlaceholderSettings } = await import('../services/settings/settingsHelper');
    const localSettingsRow = await db.queryOne<{ value: string; updated_at: number }>(
      `SELECT value, updated_at FROM ${TABLES.SETTINGS} WHERE key = 'app_settings';`
    ).catch(() => null);
    let localSettings: any = null;
    if (localSettingsRow?.value) {
      try { localSettings = JSON.parse(localSettingsRow.value); } catch {}
    }
    const dexieSettings = await localDb.appSettings.get(SETTINGS_ID).catch(() => null);
    if (!localSettings || isDefaultPlaceholderSettings(localSettings)) {
      if (dexieSettings && !isDefaultPlaceholderSettings(dexieSettings)) {
        localSettings = dexieSettings;
      }
    } else if (dexieSettings && !isDefaultPlaceholderSettings(dexieSettings)) {
      localSettings = { ...dexieSettings, ...localSettings };
    }

    const localSettingsTime = localSettings?.updatedAt
      ? new Date(localSettings.updatedAt).getTime()
      : (localSettingsRow?.updated_at || 0);
    const remoteSettingsTime = remote.settingsUpdatedAt || 0;
    const localIsReal = !isDefaultPlaceholderSettings(localSettings);
    const remoteIsReal = Boolean(remote.hasRealSettings);

    let settingsToSend: any = null;
    let requestSettings = false;

    if (localIsReal && !remoteIsReal) {
      // Local has real store identity (Ring, Phone, Address), remote is placeholder -> PUSH TO REMOTE!
      settingsToSend = localSettings;
    } else if (!localIsReal && remoteIsReal) {
      // Local is placeholder, remote has real store identity -> PULL FROM REMOTE!
      requestSettings = true;
    } else if (localSettingsTime > remoteSettingsTime && localSettings) {
      settingsToSend = localSettings;
    } else if (remoteSettingsTime > localSettingsTime) {
      requestSettings = true;
    }

    mesh.sendToPeer(senderId, 'RECONCILE_PAYLOAD', {
      voidSaleIds: salesToVoidRemotely,
      newSales: salesToSend,
      requestSaleIds: missingSalesLocally,
      newProducts: prodsToSend,
      newCategories: catsToSend,
      newSuppliers: supsToSend,
      requestProductIds: missingProdsLocally,
      newInvTxs: invToSend,
      requestInvIds: missingInvLocally,
      newUsers: usersToSend,
      requestUserIds: missingUsersLocally,
      newDiscounts: discountsToSend,
      requestDiscountIds: missingDiscountsLocally,
      newCustomers: customersToSend,
      requestCustomerIds: missingCustomersLocally,
      newExpenses: expensesToSend,
      requestExpenseIds: missingExpensesLocally,
      newPaymentModes: paymentModesToSend,
      requestPaymentModeIds: missingPaymentModesLocally,
      newSettings: settingsToSend,
      requestSettings,
    });

    await recomputeStockFromLedger();
    await flushDb();
    await refreshAllStoresFromLocalDb();
  }

  async handleReconcilePayload(senderId: string, payload: any): Promise<void> {
    return processReconcilePayload(senderId, payload);
  }
}

export const entityReconciler = new EntityReconciler();
