/**
 * Remote Settings Event Handlers
 * Receives and applies SETTINGS_UPDATED mutations over P2P mesh network.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { localDb, SETTINGS_ID } from '../../localDb';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { useSettingsStore } from '../../../stores/settingsStore';
import { safeTs, nowMs } from '../../utils/safeTimestamp';

export async function handleRemoteSettingsEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  let p: any = null;
  try {
    p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  } catch (e) {
    console.error('[SettingsEventHandler] Failed to parse payload:', e);
    return;
  }
  if (!p) return;

  // safeTs handles: ISO string, Unix ms, Date object, null — never NaN
  const now = safeTs(p.updatedAt, nowMs());

  // 1. Merge remote shareable settings while strictly preserving local device preferences
  const { mergeRemoteSettingsIntoLocal } = await import('./settingsHelper');
  let currentLocal: any = null;
  try {
    currentLocal = await localDb.appSettings.get(SETTINGS_ID);
  } catch {}
  const mergedSettings = mergeRemoteSettingsIntoLocal(currentLocal, p);
  mergedSettings.id = SETTINGS_ID;
  mergedSettings.updatedAt = new Date(now);

  // 2. Authoritative SQLite persistence with clean merged values
  await tx.execute(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
    ['app_settings', JSON.stringify(mergedSettings), now]
  );

  await tx.execute(
    `UPDATE shop SET
      name = COALESCE(?, name),
      currency = COALESCE(?, currency),
      tax_rate = COALESCE(?, tax_rate),
      logo_url = CASE WHEN ? IS NOT NULL THEN ? ELSE logo_url END,
      address = COALESCE(?, address),
      phone = COALESCE(?, phone),
      updated_at = ?;`,
    [
      mergedSettings.storeName || null,
      mergedSettings.currency || null,
      mergedSettings.taxRate !== undefined ? Number(mergedSettings.taxRate) : null,
      mergedSettings.storeLogo !== undefined ? (mergedSettings.storeLogo || '') : null,
      mergedSettings.storeLogo !== undefined ? (mergedSettings.storeLogo || '') : null,
      mergedSettings.storeAddress || null,
      mergedSettings.storePhone || null,
      now,
    ]
  );

  // 3. 0ms instant UI reflection via Dexie & Zustand
  try {
    await localDb.appSettings.put(mergedSettings);
    useSettingsStore.getState().setSettings(mergedSettings);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: mergedSettings }));
    }
  } catch (err) {
    console.warn('[SettingsEventHandler] Store hydration warning:', err);
  }
}

registerSettingsEventHandlers();

export function registerSettingsEventHandlers(): void {
  registerEventHandler('SETTINGS', handleRemoteSettingsEvent);
  registerEventHandler('SETTINGS_UPDATED', handleRemoteSettingsEvent);
  registerEventHandler('SETTINGS:UPDATE', handleRemoteSettingsEvent);
}
