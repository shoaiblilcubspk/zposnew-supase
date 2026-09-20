import { AppSettings } from '../../types';
import { localDb, SETTINGS_ID } from '../localDb';
import { isDefaultPlaceholderSettings } from './settings/settingsHelper';

export const settingsService = {
  async get(): Promise<AppSettings | null> {
    let sqliteSettings: any = null;
    let sqliteTime = 0;
    try {
      const { getDatabase } = await import('../db');
      const db = await getDatabase();
      const row = await db.queryOne<{ value: string; updated_at: number }>(
        `SELECT value, updated_at FROM settings WHERE key = 'app_settings';`
      );
      if (row?.value) {
        sqliteSettings = JSON.parse(row.value);
        sqliteTime = Number(row.updated_at) || 0;
      }
    } catch {}

    const local = await localDb.appSettings.get(SETTINGS_ID);

    // Self-healing bridge: If Dexie has real settings but SQLite is missing or placeholder
    if (local && !isDefaultPlaceholderSettings(local) && (!sqliteSettings || isDefaultPlaceholderSettings(sqliteSettings))) {
      const now = local.updatedAt ? new Date(local.updatedAt).getTime() : Date.now();
      try {
        const { getDatabase } = await import('../db');
        const db = await getDatabase();
        await db.execute(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
          ['app_settings', JSON.stringify(local), now]
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
            local.storeName || null,
            local.currency || null,
            local.taxRate !== undefined ? Number(local.taxRate) : null,
            local.storeLogo !== undefined ? (local.storeLogo || '') : null,
            local.storeLogo !== undefined ? (local.storeLogo || '') : null,
            local.storeAddress || null,
            local.storePhone || null,
            now,
          ]
        );
        sqliteSettings = local;
        sqliteTime = now;

        // Push durable outbox event to peer mesh
        const { commitLocalTransaction } = await import('../events');
        const { getDeviceId } = await import('../mesh/deviceIdentity');
        const deviceId = await getDeviceId();
        await commitLocalTransaction({
          entityType: 'SETTINGS',
          entityId: 'app_settings',
          operation: 'UPDATE',
          eventType: 'SETTINGS_UPDATED',
          deviceId,
          userId: 'admin',
          payload: local,
          execute: async () => {},
        }).catch(() => {});
      } catch (err) {
        console.warn('[settingsService] Bridge commit error:', err);
      }
    }

    let localPrefs: any = {};
    try {
      if (typeof localStorage !== 'undefined') {
        localPrefs = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
        const directTheme = localStorage.getItem('theme');
        if (directTheme === 'light' || directTheme === 'dark') localPrefs.theme = directTheme;
        const directCols = localStorage.getItem('pos_grid_columns');
        if (directCols !== null) {
          const parsed = parseInt(directCols, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 8) localPrefs.posGridColumns = parsed;
        }
        const directIcon = localStorage.getItem('pos_icon_style');
        if (directIcon === '3d' || directIcon === 'system') localPrefs.iconStyle = directIcon;
      }
    } catch {}

    if (!sqliteSettings && !local && Object.keys(localPrefs).length === 0) return null;

    // SQLite is the authoritative local source of truth (always wins over Dexie cache).
    // Layer: Dexie (fallback/cache) ← SQLite (authoritative) ← localStorage (device-local only).
    // DEVICE_LOCAL_SETTINGS_KEYS always come from localStorage — they must never be overwritten by P2P sync.
    const { DEVICE_LOCAL_SETTINGS_KEYS } = await import('./settings/settingsHelper');
    const merged: any = { ...(local || {}), ...(sqliteSettings || {}) };
    for (const key of DEVICE_LOCAL_SETTINGS_KEYS) {
      if (localPrefs[key] !== undefined) merged[key] = localPrefs[key];
    }
    return merged as AppSettings;
  },

  async fetchRemote(): Promise<AppSettings | null> {
    return this.get();
  },

  async update(updates: Partial<AppSettings>): Promise<void> {
    const existing = await this.get();
    const now = new Date();
    const updated = {
      ...(existing || {}),
      ...updates,
      id: SETTINGS_ID,
      updatedAt: now,
    } as AppSettings;

    if (!updated.createdAt) updated.createdAt = now;

    // 1. Dexie update
    await localDb.appSettings.put(updated);

    // 2. localStorage preferences
    if (typeof localStorage !== 'undefined') {
      try {
        const localPrefs = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
        const nextPrefs = { ...localPrefs, ...updates };
        localStorage.setItem('pos_local_prefs', JSON.stringify(nextPrefs));
        if (updates.theme) localStorage.setItem('theme', updates.theme);
        if (typeof updates.posGridColumns === 'number') {
          localStorage.setItem('pos_grid_columns', String(updates.posGridColumns));
        }
        if (updates.iconStyle) localStorage.setItem('pos_icon_style', updates.iconStyle);
      } catch {}
    }

    // 3. Commit into SQLite & emit P2P outbox event
    try {
      const { commitLocalTransaction } = await import('../events');
      const { getDeviceId } = await import('../mesh/deviceIdentity');
      const deviceId = await getDeviceId();

      await commitLocalTransaction({
        entityType: 'SETTINGS',
        entityId: 'app_settings',
        operation: 'UPDATE',
        eventType: 'SETTINGS_UPDATED',
        deviceId,
        userId: 'admin',
        payload: updated,
        execute: async (tx) => {
          await tx.execute(
            `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
            ['app_settings', JSON.stringify(updated), now.getTime()]
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
              updated.storeName || null,
              updated.currency || null,
              updated.taxRate !== undefined ? Number(updated.taxRate) : null,
              updated.storeLogo !== undefined ? (updated.storeLogo || '') : null,
              updated.storeLogo !== undefined ? (updated.storeLogo || '') : null,
              updated.storeAddress || null,
              updated.storePhone || null,
              now.getTime(),
            ]
          );
        },
      });
    } catch (e) {
      console.error('[settingsService] Failed to commit settings to SQLite/outbox:', e);
    }

    // 4. 0ms instant UI reflection via Zustand & Event
    try {
      const { useSettingsStore } = await import('../../stores/settingsStore');
      useSettingsStore.getState().setSettings(updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: updated }));
      }
    } catch {}
  },
};

export { mapSettings, toRemoteSettings } from './settingsMappers';
