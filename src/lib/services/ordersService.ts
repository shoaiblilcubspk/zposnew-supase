import { SalesTab } from '../../types';
import { generateId } from '../ids';

/**
 * Sales tabs (open cart tabs) — DEVICE-LOCAL only (never synced). Stored in localStorage per
 * Rule 12 (per-device UI state). No Dexie, no cloud. Kept keyed by nothing special — a single
 * device holds its own open tabs.
 */

const KEY = 'pos_sales_tabs';

export const toRemoteSalesTab = (tab: Partial<SalesTab>) => {
  const remote: any = { ...tab };
  if ('userId' in tab) { remote.user_id = tab.userId; delete remote.userId; }
  if ('billDiscountValue' in tab) { remote.bill_discount_value = tab.billDiscountValue; delete remote.billDiscountValue; }
  if ('billDiscountType' in tab) { remote.bill_discount_type = tab.billDiscountType; delete remote.billDiscountType; }
  if ('createdAt' in tab) { remote.created_at = tab.createdAt; delete remote.createdAt; }
  if ('editingSaleId' in tab) { remote.editing_sale_id = tab.editingSaleId ?? null; delete remote.editingSaleId; }
  if (tab.selectedCustomer) {
    remote.selected_customer_id = tab.selectedCustomer.id;
  } else if ('selectedCustomer' in tab) {
    remote.selected_customer_id = null;
  }
  delete remote.selectedCustomer;
  return remote;
};

function readAll(): SalesTab[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem(KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(tabs: SalesTab[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(tabs));
  } catch {}
}

export const salesTabsService = {
  async getByUserId(userId: string): Promise<SalesTab[]> {
    return this.getAll(userId);
  },

  async getAll(userId?: string): Promise<SalesTab[]> {
    const all = readAll();
    if (userId) {
      const mine = all.filter((t) => !t.userId || t.userId === userId);
      return mine.length > 0 ? mine : all;
    }
    return all;
  },

  async create(userId: string, tab: Omit<SalesTab, 'id' | 'createdAt'>): Promise<SalesTab> {
    const newTab = { ...tab, id: generateId(), userId, createdAt: new Date() } as SalesTab;
    const all = readAll();
    all.push(newTab);
    writeAll(all);
    return newTab;
  },

  async update(id: string, updates: Partial<SalesTab>): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates, id } as SalesTab;
      writeAll(all);
    }
  },

  async delete(id: string): Promise<void> {
    writeAll(readAll().filter((t) => t.id !== id));
  },
};
