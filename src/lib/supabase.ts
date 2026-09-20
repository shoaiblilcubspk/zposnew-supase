import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://mock.supabase.co'
    const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'mock-key'
    supabaseInstance = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'zaynah-pos-auth',
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        },
      }
    )
  }
  return supabaseInstance
}

export const supabase = getSupabase()

/**
 * Server-side admin user operations are handled by the `admin-users` Edge Function
 * (supabase/functions/admin-users). The service-role key lives ONLY on the server
 * (Deno.env) and is NEVER shipped to the browser bundle. Client code must call this
 * helper — never instantiate an admin client with VITE_SUPABASE_SERVICE_ROLE_KEY.
 */
export async function adminUserAction(action: string, payload: any): Promise<any> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, payload },
  })
  if (error) {
    // FunctionsHttpError: on a non-2xx the real reason is in the response body
    // ({ error: "..." }), NOT error.message (which is the generic status text).
    let detail = error.message || 'Admin user action failed';
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) detail = body.error;
    } catch { /* body not JSON — keep generic message */ }
    throw new Error(detail);
  }
  // The edge fn response may omit `Content-Type: application/json`, in which case
  // supabase-js hands us the body as a raw STRING instead of a parsed object.
  // Parse it back before unwrapping, otherwise every field lookup is undefined.
  let body: any = data;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* not JSON — leave as-is */ }
  }
  // Deployed fn versions differ: some wrap the result in { data }, some don't.
  // Return the unwrapped payload if present, else the raw body.
  return body?.data ?? body
}

// ── Refresh token management (prevents retry storm on DNS failure) ─────────
const AUTH_KEY = 'sb-zaynah-pos-auth-auth-token';
const AUTH_BACKUP_KEY = 'sb-zaynah-pos-auth-auth-token-backup';

export function restoreRefreshToken() {
  const backup = localStorage.getItem(AUTH_BACKUP_KEY);
  if (backup) {
    localStorage.setItem(AUTH_KEY, backup);
    localStorage.removeItem(AUTH_BACKUP_KEY);
    console.log('[Auth] Restored refresh token from backup');
    return true;
  }
  return false;
}

export function isRefreshTokenBackedUp(): boolean {
  return !!localStorage.getItem(AUTH_BACKUP_KEY);
}

/** Re-enables full Supabase auth initialization (undoes the retry-storm guard). */
export function enableFullAuthInit() {
  delete (supabase.auth as any)._initCalled;
  restoreRefreshToken();
  supabase.auth.getSession().catch(() => {});
  supabase.auth.startAutoRefresh?.().catch(() => {});
}


