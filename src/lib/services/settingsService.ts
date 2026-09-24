/**
 * Settings Service — Supabase-only cloud-direct (Phase 10L).
 * `AppSettings` is split across two single-row tables in the mirror: `store_settings`
 * (identity + finance + business rules) and `receipt_settings` (receipt + barcode layout).
 * Device-local keys (theme, grid, printer, etc. — Rule 12) live in localStorage only and are
 * NEVER written to Supabase. No P2P, no Dexie.
 */

import { AppSettings } from '../../types';
import { localQueryOne, insertRow, updateRow } from '../../data';
import { mapSettings, toRemoteSettings } from './settingsMappers';
import { DEVICE_LOCAL_SETTINGS_KEYS } from './settings/settingsHelper';

const STORE_ROW_ID = '00000000-0000-4000-8000-000000000001';
const RECEIPT_ROW_ID = '00000000-0000-4000-8000-000000000002';

// Column whitelists — decide which snake_case field belongs to which table.
const STORE_COLS = new Set([
  'store_name', 'store_address', 'store_phone', 'store_email', 'store_website', 'store_logo',
  'tax_rate', 'tax_id', 'currency', 'country', 'language', 'business_type',
  'invoice_prefix', 'invoice_counter', 'invoice_pad_digits', 'custom_receipt_number',
  'po_prefix', 'po_counter', 'retail_enabled', 'wholesale_enabled', 'default_sale_type',
  'sound_enabled', 'allow_negative_stock', 'refund_approval_threshold', 'enable_credit_sales',
  'cashier_can_credit', 'allow_credit_over_limit', 'enable_split_payment', 'enable_extra_charges',
  'enable_purchase_orders',
]);
const RECEIPT_COLS = new Set([
  'receipt_paper_size', 'receipt_density', 'receipt_template', 'receipt_font_scale',
  'receipt_font_bold', 'receipt_font_weight', 'receipt_padding_top', 'receipt_padding_bottom',
  'receipt_padding_left', 'receipt_padding_right', 'receipt_offset_x', 'receipt_header_offset_x',
  'receipt_footer_offset_x', 'receipt_header', 'receipt_footer', 'receipt_show_footer',
  'receipt_show_logo', 'receipt_show_tax', 'receipt_show_discount', 'receipt_show_store_name',
  'receipt_show_store_address', 'receipt_show_store_phone', 'receipt_show_store_email',
  'receipt_show_customer_name', 'receipt_show_customer_phone', 'receipt_show_notes',
  'receipt_show_barcode', 'receipt_show_delivery_address', 'receipt_show_qr_code',
  'barcode_paper_size', 'barcode_a4_columns', 'barcode_a4_rows', 'barcode_show_price',
  'barcode_show_name', 'barcode_show_sku', 'barcode_show_category', 'barcode_show_barcode',
  'barcode_show_qr', 'barcode_scale', 'barcode_height', 'barcode_padding', 'barcode_border',
  'barcode_qr_size', 'barcode_name_lines', 'barcode_font_size', 'barcode_content_scale',
  'barcode_margin_x', 'barcode_margin_y', 'barcode_gap_x', 'barcode_gap_y', 'barcode_bar_width',
]);

/** Booleans -> 0/1 and numeric strings -> numbers so integer columns accept the value. */
function coerce(v: any): any {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string' && v !== '' && !isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function splitRemote(remote: Record<string, any>): { store: Record<string, any>; receipt: Record<string, any> } {
  const store: Record<string, any> = {};
  const receipt: Record<string, any> = {};
  for (const [k, v] of Object.entries(remote)) {
    if (STORE_COLS.has(k)) store[k] = coerce(v);
    else if (RECEIPT_COLS.has(k)) receipt[k] = coerce(v);
    // else: device-local / non-persisted column — ignored (localStorage handles it).
  }
  return { store, receipt };
}

function readLocalPrefs(): Record<string, any> {
  const prefs: Record<string, any> = {};
  try {
    if (typeof localStorage === 'undefined') return prefs;
    Object.assign(prefs, JSON.parse(localStorage.getItem('pos_local_prefs') || '{}'));
    const theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') prefs.theme = theme;
    const cols = localStorage.getItem('pos_grid_columns');
    if (cols !== null) { const n = parseInt(cols, 10); if (!isNaN(n) && n >= 0 && n <= 8) prefs.posGridColumns = n; }
    const icon = localStorage.getItem('pos_icon_style');
    if (icon === '3d' || icon === 'system') prefs.iconStyle = icon;
  } catch {}
  return prefs;
}

async function upsertSingleton(table: 'store_settings' | 'receipt_settings', id: string, cols: Record<string, any>): Promise<void> {
  if (Object.keys(cols).length === 0) return;
  const existing = await localQueryOne<{ id: string }>(`SELECT id FROM ${table} WHERE id = ?;`, [id]);
  if (existing) {
    await updateRow(table, id, cols);
  } else {
    await insertRow(table, { id, ...cols });
  }
}

export const settingsService = {
  async get(): Promise<AppSettings | null> {
    const storeRow = await localQueryOne<any>(`SELECT * FROM store_settings LIMIT 1;`);
    const receiptRow = await localQueryOne<any>(`SELECT * FROM receipt_settings LIMIT 1;`);
    const prefs = readLocalPrefs();

    if (!storeRow && !receiptRow && Object.keys(prefs).length === 0) return null;

    const merged = mapSettings({ ...(storeRow || {}), ...(receiptRow || {}) });
    for (const key of DEVICE_LOCAL_SETTINGS_KEYS) {
      if (prefs[key as keyof typeof prefs] !== undefined) (merged as any)[key] = prefs[key];
    }
    return merged;
  },

  async fetchRemote(): Promise<AppSettings | null> {
    return this.get();
  },

  async update(updates: Partial<AppSettings>): Promise<void> {
    // 1. Device-local keys -> localStorage only (Rule 12).
    if (typeof localStorage !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
        const next = { ...prefs, ...updates };
        localStorage.setItem('pos_local_prefs', JSON.stringify(next));
        if (updates.theme) localStorage.setItem('theme', updates.theme);
        if (typeof updates.posGridColumns === 'number') localStorage.setItem('pos_grid_columns', String(updates.posGridColumns));
        if (updates.iconStyle) localStorage.setItem('pos_icon_style', updates.iconStyle);
      } catch {}
    }

    // 2. Shared keys -> store_settings / receipt_settings singleton rows (synced).
    const remote = toRemoteSettings(updates);
    delete remote.updated_at; // server trigger owns updated_at
    const { store, receipt } = splitRemote(remote);
    await upsertSingleton('store_settings', STORE_ROW_ID, store);
    await upsertSingleton('receipt_settings', RECEIPT_ROW_ID, receipt);

    // 3. 0ms UI reflection.
    try {
      const merged = await this.get();
      const { useSettingsStore } = await import('../../stores/settingsStore');
      if (merged) useSettingsStore.getState().setSettings(merged);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: merged }));
      }
    } catch {}
  },
};

export { mapSettings, toRemoteSettings } from './settingsMappers';
