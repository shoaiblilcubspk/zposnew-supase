/**
 * Zero-Refresh Instant Store Synchronizer
 * Re-queries authoritative local SQLite & IndexedDB and hydrates all Zustand stores (0ms UI reactivity).
 */

import { productsService } from '../services/productsService';
import { customersService } from '../services/customersService';
import { suppliersService } from '../services/suppliersService';
import { categoriesService, discountsService } from '../services/categoriesService';
import { paymentModesService, getAllStandalonePayments } from '../services/paymentsService';
import { usersService } from '../services/usersService';
import { settingsService } from '../services/settingsService';
import { salesService } from '../services/salesService';
import { expensesService } from '../services/expensesService';
import { bundlesService } from '../services/bundlesService';
import { localDb } from '../localDb';

import { useProductsStore } from '../../stores/productsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUsersStore } from '../../stores/usersStore';
import { useAppStore } from '../../stores/appStore';
import { useSalesStore } from '../../stores/salesStore';
import { useExpensesStore } from '../../stores/expensesStore';
import { usePaymentsStore } from '../../stores/paymentsStore';

export async function refreshAllStoresFromLocalDb(): Promise<void> {
  try {
    const [
      products,
      customers,
      suppliers,
      categories,
      paymentModes,
      users,
      settings,
      salesmen,
      discounts,
      sales,
      expenses,
      standalonePayments,
      bundles,
    ] = await Promise.all([
      productsService.getAll().catch(() => []),
      customersService.getAll().catch(() => []),
      suppliersService.getAll().catch(() => []),
      categoriesService.getAll().catch(() => []),
      paymentModesService.getAll().catch(() => []),
      usersService.getAll().catch(() => []),
      settingsService.get().catch(() => null),
      localDb.salesmen.toArray().catch(() => []),
      discountsService.getAll().catch(() => []),
      salesService.getAll().catch(() => []),
      expensesService.getAll().catch(() => []),
      // Customer credit repayments (sale_id IS NULL) — needed for Financial report
      getAllStandalonePayments().catch(() => []),
      bundlesService.getAll().catch(() => []),
    ]);

    useProductsStore.getState().setProducts(products);
    useCustomersStore.getState().setCustomers(customers);
    useInventoryStore.getState().setSuppliers(suppliers);
    useInventoryStore.getState().setCategories(categories);
    useSettingsStore.getState().setPaymentModes(paymentModes);
    useUsersStore.getState().setUsers(users);
    useUsersStore.getState().setSalesmen(salesmen);
    useAppStore.getState().setDiscounts(discounts);
    useAppStore.getState().setBundles(bundles);
    if (settings) useSettingsStore.getState().setSettings(settings);
    useSalesStore.getState().setSales(sales);
    useExpensesStore.getState().setExpenses(expenses);
    // Populate payments store with customer credit repayments for Financial report
    usePaymentsStore.getState().setPayments(standalonePayments);
  } catch (err) {
    console.error('[StoreSync] Failed to refresh stores from local DB:', err);
  }
}
