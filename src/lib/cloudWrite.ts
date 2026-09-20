/**
 * cloudWrite (Deprecated - Phase 22 Local-First Decoupling)
 * All writes are now authoritative in local SQLite / Dexie and replicated via P2P.
 * Direct Supabase DB writes and remote RPCs are completely disabled.
 */

export async function cloudWrite(
  _entity: string,
  _opType: 'create' | 'update' | 'upsert' | 'delete',
  _entityId: string,
  _payload: any,
  _options?: any
): Promise<void> {
  // Safe local no-op
  return Promise.resolve();
}
