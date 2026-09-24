/**
 * Dexie-free id helpers. Split out of the legacy `localDb` module so importing an id
 * generator or the settings singleton id no longer pulls in the Dexie/PosDB bundle.
 */

export const SETTINGS_ID = '00000000-0000-4000-8000-000000000001';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
