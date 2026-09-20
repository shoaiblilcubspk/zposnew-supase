/**
 * Expiry Utility Helpers
 * Centralized calculation of product expiry status, days remaining, presets and human formatting.
 */

export type ExpiryStatus = 'none' | 'expired' | 'expiring_soon' | 'good';

export interface ExpiryEvaluation {
  status: ExpiryStatus;
  daysRemaining: number | null;
  formattedDate: string;
  label: string;
}

export function parseExpiryDate(dateVal?: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  const str = String(dateVal).trim();
  if (!str) return null;

  // Handle YYYY-MM-DD explicitly to prevent timezone shifting
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function getExpiryStatus(
  expiryDate?: string | Date | null,
  alertDays: number = 90
): ExpiryEvaluation {
  const parsed = parseExpiryDate(expiryDate);
  if (!parsed) {
    return {
      status: 'none',
      daysRemaining: null,
      formattedDate: '',
      label: 'No Expiry Set',
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return {
      status: 'expired',
      daysRemaining,
      formattedDate,
      label: overdue === 0 ? 'Expired Today' : `Expired ${overdue}d ago`,
    };
  }

  if (daysRemaining <= alertDays) {
    return {
      status: 'expiring_soon',
      daysRemaining,
      formattedDate,
      label: daysRemaining === 0 ? 'Expires Today' : `Exp. in ${daysRemaining}d`,
    };
  }

  return {
    status: 'good',
    daysRemaining,
    formattedDate,
    label: `Exp: ${formattedDate}`,
  };
}

/**
 * Calculates a date N months from now and formats as YYYY-MM-DD
 */
export function addMonthsToDateString(months: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + months);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
