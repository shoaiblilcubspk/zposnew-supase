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

export interface EntityManifest {
  deviceId: string;
  timestamp: number;
  sales: Array<{ id: string; invoiceNumber: string; status: string; total: number; updatedAt: number }>;
  inventoryTxIds: string[];
  productIds: string[];
  userIds?: string[];
  discountIds?: string[];
  settingsUpdatedAt?: number;
  hasRealSettings?: boolean;
}

export class EntityReconciler {
  private isReconciling = false;

  async buildLocalManifest(deviceId: string): Promise<EntityManifest> {
    const db = await getDatabase();
    const { localDb, SETTINGS_ID } = await import('../localDb');
    const { isDefaultPlaceholderSettings } = await import('../services/settings/settingsHelper');
    const [sales, invTxs, prods, users, discountRows, settingsRow, dexieSettings] = await Promise.all([
      db.query<any>(`SELECT id, invoice_number, status, total_amount, updated_at FROM ${TABLES.SALES};`).catch(() => []),
      db.query<any>(`SELECT id FROM ${TABLES.INVENTORY_TRANSACTIONS} WHERE reference_type != 'SALE';`).catch(() => []),
      db.query<any>(`SELECT id FROM ${TABLES.PRODUCTS} WHERE active = 1;`).catch(() => []),
      // Only include ACTIVE users — inactive = soft-deleted, must NOT be re-sent to peers
      db.query<any>(`SELECT id FROM ${TABLES.USERS} WHERE active = 1;`).catch(() => []),
      db.query<any>(`SELECT id FROM ${TABLES.DISCOUNTS} WHERE active = 1;`).catch(() => []),
      db.queryOne<{ value: string; updated_at: number }>(`SELECT value, updated_at FROM ${TABLES.SETTINGS} WHERE key = 'app_settings';`).catch(() => null),
      localDb.appSettings.get(SETTINGS_ID).catch(() => null),
    ]);

    let effectiveSettings = dexieSettings;
    if (settingsRow?.value) {
      try {
        const parsed = JSON.parse(settingsRow.value);
        if (!isDefaultPlaceholderSettings(parsed)) {
          effectiveSettings = parsed;
        }
      } catch {}
    }

    const hasReal = !isDefaultPlaceholderSettings(effectiveSettings);
    const settingsTime = effectiveSettings?.updatedAt
      ? new Date(effectiveSettings.updatedAt).getTime()
      : (settingsRow?.updated_at || 0);

    return {
      deviceId,
      timestamp: Date.now(),
      sales: (sales || []).map((s) => ({
        id: s.id, invoiceNumber: s.invoice_number, status: s.status || 'completed',
        total: Number(s.total_amount) || 0, updatedAt: Number(s.updated_at) || 0,
      })),
      inventoryTxIds: (invTxs || []).map((t) => t.id),
      productIds: (prods || []).map((p) => p.id),
      userIds: (users || []).map((u) => u.id),
      discountIds: (discountRows || []).map((d: any) => d.id),
      settingsUpdatedAt: settingsTime,
      hasRealSettings: hasReal,
    };
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

    // 5. Settings Reconciliation
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
      newSettings: settingsToSend,
      requestSettings,
    });

    await recomputeStockFromLedger();
    await flushDb();
    await refreshAllStoresFromLocalDb();
  }

  async handleReconcilePayload(senderId: string, payload: any): Promise<void> {
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

    await recomputeStockFromLedger();
    await flushDb();
    await refreshAllStoresFromLocalDb();
  }
}

export const entityReconciler = new EntityReconciler();
