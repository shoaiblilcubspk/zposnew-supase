import { SalesTab } from '../../types';
import { localDb, generateId } from '../localDb';

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

export const salesTabsService = {
  async getByUserId(userId: string): Promise<SalesTab[]> {
    return await localDb.salesTabs.where('userId').equals(userId).toArray();
  },

  async create(userId: string, tab: Omit<SalesTab, 'id' | 'createdAt'>): Promise<SalesTab> {
    const id = generateId();
    const now = new Date();
    const newTab = { ...tab, id, userId, createdAt: now } as SalesTab;
    await localDb.salesTabs.add(newTab);
    return newTab;
  },

  async update(id: string, updates: Partial<SalesTab>): Promise<void> {
    const existing = await localDb.salesTabs.get(id);
    const updated = { ...(existing || {}), ...updates, id } as SalesTab;
    await localDb.salesTabs.put(updated);
  },

  async delete(id: string): Promise<void> {
    await localDb.salesTabs.delete(id);
  },
};
