import { PosDB } from './PosDB';

export const localDb = new PosDB();
export const SETTINGS_ID = '00000000-0000-4000-8000-000000000001';

// Cloud-direct: there is NO offline pending-ops queue anymore. This guard now
// always returns false so realtime handlers never skip a cloud update.
export async function isPendingDelete(_entity: any, _entityId: string): Promise<boolean> {
  return false;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function purgeLocalData() {
  const tables = localDb.tables;
  for (const table of tables) {
    if (table.name !== 'appSettings') {
      await table.clear();
    }
  }
  await localDb.delete();
  window.location.reload();
}
