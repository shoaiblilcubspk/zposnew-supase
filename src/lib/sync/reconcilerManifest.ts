/**
 * Entity Reconciler Manifest Builder
 * Collects lightweight local manifests for fast peer diffing.
 */

import { getDatabase, TABLES } from '../db';

export interface EntityManifest {
  deviceId: string;
  timestamp: number;
  sales: Array<{ id: string; invoiceNumber: string; status: string; total: number; updatedAt: number }>;
  inventoryTxIds: string[];
  productIds: string[];
  userIds?: string[];
  discountIds?: string[];
  customerIds?: string[];
  expenseIds?: string[];
  paymentModeIds?: string[];
  settingsUpdatedAt?: number;
  hasRealSettings?: boolean;
}

export async function buildLocalManifest(deviceId: string): Promise<EntityManifest> {
  const db = await getDatabase();
  const { localDb, SETTINGS_ID } = await import('../localDb');
  const { isDefaultPlaceholderSettings } = await import('../services/settings/settingsHelper');
  const [sales, invTxs, prods, users, discountRows, settingsRow, dexieSettings, customers, expenses, paymentModes] = await Promise.all([
    db.query<any>(`SELECT id, invoice_number, status, total_amount, updated_at FROM ${TABLES.SALES};`).catch(() => []),
    db.query<any>(`SELECT id FROM ${TABLES.INVENTORY_TRANSACTIONS}`).catch(() => []),
    db.query<any>(`SELECT id FROM ${TABLES.PRODUCTS} WHERE active = 1;`).catch(() => []),
    db.query<any>(`SELECT id FROM ${TABLES.USERS} WHERE active = 1;`).catch(() => []),
    db.query<any>(`SELECT id FROM ${TABLES.DISCOUNTS} WHERE active = 1;`).catch(() => []),
    db.queryOne<{ value: string; updated_at: number }>(`SELECT value, updated_at FROM ${TABLES.SETTINGS} WHERE key = 'app_settings';`).catch(() => null),
    localDb.appSettings.get(SETTINGS_ID).catch(() => null),
    db.query<any>(`SELECT id FROM ${TABLES.CUSTOMERS} WHERE active = 1;`).catch(() => []),
    db.query<any>(`SELECT id FROM ${TABLES.EXPENSES};`).catch(() => []),
    db.query<any>(`SELECT id FROM ${TABLES.PAYMENT_MODES} WHERE is_active = 1;`).catch(() => []),
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
    customerIds: (customers || []).map((c: any) => c.id),
    expenseIds: (expenses || []).map((e: any) => e.id),
    paymentModeIds: (paymentModes || []).map((pm: any) => pm.id),
    settingsUpdatedAt: settingsTime,
    hasRealSettings: hasReal,
  };
}
