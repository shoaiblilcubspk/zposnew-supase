import { create } from 'zustand';
import { AppSettings } from '../types';

interface SettingsState {
  settings: AppSettings;
  paymentModes: any[];
  loading: boolean;
  error: string | null;
  syncProgress: {
    status: string;
    current: number;
    total: number;
    size?: string;
  } | null;
  setSettings: (s: Partial<AppSettings>) => void;
  setPaymentModes: (m: any[]) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  setSyncProgress: (p: SettingsState['syncProgress']) => void;
  incrementInvoiceCounter: (n: number) => void;
}

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';
  try {
    const direct = localStorage.getItem('theme');
    if (direct === 'light' || direct === 'dark') return direct;
    const localStr = localStorage.getItem('pos_local_prefs');
    if (localStr) {
      const parsed = JSON.parse(localStr);
      if (parsed.theme === 'light' || parsed.theme === 'dark') return parsed.theme;
    }
  } catch {}
  return 'light';
}

function getInitialIconStyle(): '3d' | 'system' {
  if (typeof window === 'undefined') return '3d';
  try {
    const saved = localStorage.getItem('pos_icon_style');
    if (saved === '3d' || saved === 'system') return saved;
  } catch {}
  return '3d';
}

function getInitialPosGridColumns(): number {
  if (typeof window === 'undefined') return 4;
  try {
    const direct = localStorage.getItem('pos_grid_columns');
    if (direct !== null) {
      const parsed = parseInt(direct, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 8) return parsed;
    }
    const localStr = localStorage.getItem('pos_local_prefs');
    if (localStr) {
      const parsed = JSON.parse(localStr);
      if (typeof parsed.posGridColumns === 'number' && parsed.posGridColumns >= 0 && parsed.posGridColumns <= 8) {
        return parsed.posGridColumns;
      }
    }
  } catch {}
  return 4;
}

function getInitialInvoiceCounter(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const direct = localStorage.getItem('pos_invoice_counter');
    if (direct !== null) {
      const parsed = parseInt(direct, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    const localStr = localStorage.getItem('pos_local_prefs');
    if (localStr) {
      const parsed = JSON.parse(localStr);
      if (typeof parsed.invoiceCounter === 'number' && parsed.invoiceCounter >= 1) {
        return parsed.invoiceCounter;
      }
    }
  } catch {}
  return 1;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    storeName: 'Zaynahs POS',
    currency: 'PKR',
    country: 'PK',
    theme: getInitialTheme(),
    iconStyle: getInitialIconStyle(),
    posGridColumns: getInitialPosGridColumns(),
    retailEnabled: true,
    wholesaleEnabled: false,
    invoiceCounter: getInitialInvoiceCounter(),
  } as AppSettings,
  paymentModes: [],
  loading: true,
  error: null,
  syncProgress: null,

  setSettings: (payload) => set((st) => {
    if (typeof localStorage !== 'undefined') {
      try {
        if (payload.iconStyle) {
          localStorage.setItem('pos_icon_style', payload.iconStyle);
        }
        if (payload.theme) {
          localStorage.setItem('theme', payload.theme);
        }
        if (payload.posGridColumns !== undefined) {
          localStorage.setItem('pos_grid_columns', String(payload.posGridColumns));
        }
        const existing = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
        const updatedLocal = { ...existing };
        if (payload.theme) updatedLocal.theme = payload.theme;
        if (payload.posGridColumns !== undefined) updatedLocal.posGridColumns = payload.posGridColumns;
        if (payload.iconStyle) updatedLocal.iconStyle = payload.iconStyle;
        if (payload.invoiceCounter !== undefined) {
          localStorage.setItem('pos_invoice_counter', String(payload.invoiceCounter));
          updatedLocal.invoiceCounter = payload.invoiceCounter;
        }
        localStorage.setItem('pos_local_prefs', JSON.stringify(updatedLocal));
      } catch {}
    }
    const directCols = typeof localStorage !== 'undefined' ? localStorage.getItem('pos_grid_columns') : null;
    const finalGridCols = payload.posGridColumns !== undefined
      ? payload.posGridColumns
      : (directCols !== null ? Number(directCols) : st.settings.posGridColumns);

    const newSettings = {
      ...st.settings,
      ...payload,
      posGridColumns: finalGridCols,
    } as AppSettings;
    if (newSettings.retailEnabled === false && newSettings.wholesaleEnabled === false) {
      newSettings.retailEnabled = true;
    }
    return { settings: newSettings };
  }),

  setPaymentModes: (paymentModes) => set({ paymentModes }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
  incrementInvoiceCounter: (n) => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('pos_invoice_counter', String(n));
        const existing = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
        existing.invoiceCounter = n;
        localStorage.setItem('pos_local_prefs', JSON.stringify(existing));
      } catch {}
    }
    set((st) => ({ settings: { ...st.settings, invoiceCounter: n } }));
  },
}));
