/**
 * Integration Settings Service — third-party API keys (Pexels), stored in the synced
 * `integration_settings` singleton and written through the bundle system so a key saved on one
 * device reaches the cloud + all devices. The key is only ever sent in the Authorization header
 * by callers; it is never logged. Single-shop model (anon trust boundary) — documented tradeoff.
 */

import { localQueryOne, insertRow, updateRow } from '../../data';

const PEXELS_KEY_NAME = 'pexels_api_key';
// Deterministic row id for the Pexels key so create/update converge to one row across devices.
const PEXELS_ROW_ID = '00000000-0000-4000-8000-000000000010';

export interface IntegrationSettings {
  pexelsApiKey: string | null;
}

export async function getPexelsKey(): Promise<string | null> {
  const row = await localQueryOne<{ key_value: string | null }>(
    `SELECT key_value FROM integration_settings WHERE key_name = ?;`, [PEXELS_KEY_NAME]
  ).catch(() => null);
  return row?.key_value ?? null;
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  return { pexelsApiKey: await getPexelsKey() };
}

/** Save (or clear) the Pexels key as ONE atomic bundle (upsert the key_name row). */
export async function savePexelsKey(key: string | null, updatedBy = 'admin'): Promise<void> {
  const value = key && key.trim() ? key.trim() : null;
  const existing = await localQueryOne<{ id: string }>(
    `SELECT id FROM integration_settings WHERE key_name = ?;`, [PEXELS_KEY_NAME]
  );
  if (existing) {
    await updateRow('integration_settings', existing.id, { key_value: value, updated_by: updatedBy });
  } else {
    await insertRow('integration_settings', { id: PEXELS_ROW_ID, key_name: PEXELS_KEY_NAME, key_value: value, updated_by: updatedBy });
  }
}

/** Mask a key for display: keep only the last 4 characters. */
export function maskKey(key: string | null | undefined): string {
  if (!key) return '';
  return key.length <= 4 ? '••••' : `••••••••${key.slice(-4)}`;
}

/** Validate a key against the Pexels API (curated?per_page=1). Returns rate-limit headers on 2xx. */
export async function testPexelsKey(key: string): Promise<{ ok: boolean; status: number; remaining?: string | null; reset?: string | null; message: string }> {
  try {
    const res = await fetch('https://api.pexels.com/v1/curated?per_page=1', { headers: { Authorization: key } });
    if (res.ok) {
      return {
        ok: true, status: res.status,
        remaining: res.headers.get('X-Ratelimit-Remaining'),
        reset: res.headers.get('X-Ratelimit-Reset'),
        message: 'Key is valid.',
      };
    }
    if (res.status === 429) return { ok: false, status: 429, message: 'Rate limit reached — try again later.' };
    if (res.status === 401) return { ok: false, status: 401, message: 'Invalid API key.' };
    return { ok: false, status: res.status, message: `Pexels returned ${res.status}.` };
  } catch {
    return { ok: false, status: 0, message: 'Network error — check your connection.' };
  }
}
