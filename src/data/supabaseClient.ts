/**
 * Supabase client — singleton (Rule 2.10 §1: never create per-call/render).
 * CLIENT-SIDE ONLY: anon key + authenticated user session. The service-role key is
 * NEVER imported here (server/sync-worker only, Rule 6).
 *
 * Realtime postgres_changes are intentionally NOT subscribed on data tables — the app
 * reads local SQLite and syncs via the sync queue (server-authoritative, cloud-direct).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;

function readEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

export function getSupabase(): SupabaseClient {
  if (clientInstance) return clientInstance;

  const url = readEnv('VITE_SUPABASE_URL');
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    // Fail loud in dev: a misconfigured client silently 401s every request.
    console.error('[data/supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }

  clientInstance = createClient(url ?? 'https://missing.supabase.co', anonKey ?? 'missing-anon-key', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'zaynahs-pos-auth',
    },
    // Keep realtime config minimal; we do not subscribe to table changes (signaling-free).
    realtime: { params: { eventsPerSecond: 2 } },
  });

  return clientInstance;
}

/** For tests: drop the cached client so a fresh one is built with new env. */
export function resetSupabaseForTesting(): void {
  clientInstance = null;
}

/** For tests: inject a fake Supabase client so the sync worker can be exercised offline. */
export function setSupabaseForTesting(client: unknown): void {
  clientInstance = client as SupabaseClient;
}
