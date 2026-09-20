/**
 * safeTimestamp — 0-Risk Timestamp Conversion Utility
 *
 * PROBLEM: JavaScript `Number(dateValue)` returns NaN when `dateValue` is an ISO string
 * (e.g. "2026-09-18T14:30:00.000Z"). This silently breaks all timestamp comparisons,
 * making Last-Save-Wins conflict resolution unreliable.
 *
 * RULE: NEVER use Number(x) for dates. ALWAYS use safeTs(x).
 *
 * Handles all real-world formats this codebase produces:
 *   - Unix milliseconds (INTEGER from SQLite): 1726678200000
 *   - ISO 8601 string (JSON-serialized Date): "2026-09-18T14:30:00.000Z"
 *   - Date object (in-memory): new Date()
 *   - null / undefined → fallback (default 0)
 */

/**
 * Converts any timestamp format to Unix milliseconds (number).
 * Returns `fallback` (default 0) for null/undefined/invalid.
 */
export function safeTs(val: unknown, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (val instanceof Date) return isNaN(val.getTime()) ? fallback : val.getTime();
  if (typeof val === 'string' && val.trim() !== '') {
    const t = new Date(val).getTime();
    return isNaN(t) ? fallback : t;
  }
  return fallback;
}

/**
 * Returns current time as Unix ms. Use instead of Date.now() when
 * the result will be stored in SQLite INTEGER column or compared via safeTs().
 */
export const nowMs = (): number => Date.now();

/**
 * Converts a value to a Date object safely.
 * Returns new Date(fallbackMs) if val is invalid.
 */
export function safeDate(val: unknown, fallbackMs = Date.now()): Date {
  const ms = safeTs(val, fallbackMs);
  return new Date(ms);
}
