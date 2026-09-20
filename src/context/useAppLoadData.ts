import {
  useCartStore,
  useSettingsStore,
  useUsersStore,
  useProductsStore,
  useInventoryStore,
  useCustomersStore,
  useSalesStore,
  useExpensesStore,
  useAppStore,
} from '../stores';
import { localDb } from '../lib/localDb';
import { sonner } from '../lib/sonner';
import {
  productsService,
  customersService,
  suppliersService,
  salesService,
  expensesService,
  categoriesService,
  paymentModesService,
  usersService,
  settingsService,
  salesTabsService,
} from '../lib/services';
import { useAuth } from './AuthContext';

export function useAppLoadData(
  initialized: boolean,
  setInitialized: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { user } = useAuth();

  const searchSales = async (term: string) => {
    try {
      const q = term.trim().toLowerCase();
      if (!q) {
        const recent = await salesService.getAll();
        useSalesStore.getState().setSales(recent.slice(0, 200));
        return;
      }

      const allSales = await salesService.getAll();
      const filtered = allSales.filter(s =>
        (s.invoiceNumber || '').toLowerCase().includes(q) ||
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.customerPhone || '').includes(q) ||
        (s.notes || '').toLowerCase().includes(q)
      );
      useSalesStore.getState().setSales(filtered.slice(0, 100));
    } catch (e) {
      console.error('Failed to search sales:', e);
    }
  };

  const loadMoreSales = async (offset: number, limit = 200) => {
    try {
      const allSales = await salesService.getAll();
      const page = allSales.slice(offset, offset + limit);
      if (page.length > 0) {
        const currentSales = useSalesStore.getState().sales;
        const existingIds = new Set(currentSales.map(s => s.id));
        const newSales = page.filter(s => !existingIds.has(s.id));
        if (newSales.length > 0) {
          useSalesStore.getState().setSales([...currentSales, ...newSales]);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to load more sales:', error);
      return false;
    }
  };

  const loadData = async (silent = false, _skipCache = false) => {
    if (!silent) sonner.loading('Loading POS Data...', { id: 'load-data' } as any);

    try {
      // 1. Authoritative local SQLite queries (< 20ms)
      const [
        products,
        customers,
        suppliers,
        sales,
        expenses,
        categories,
        paymentModes,
        users,
        settings,
        salesmen,
        discounts,
        bundles,
        salesTabs,
      ] = await Promise.all([
        productsService.getAll().catch(() => []),
        customersService.getAll().catch(() => []),
        suppliersService.getAll().catch(() => []),
        salesService.getAll().catch(() => []),
        expensesService.getAll().catch(() => []),
        categoriesService.getAll().catch(() => []),
        paymentModesService.getAll().catch(() => []),
        usersService.getAll().catch(() => []),
        settingsService.get().catch(() => null),
        localDb.salesmen.toArray().catch(() => []),
        localDb.discounts.toArray().catch(() => []),
        localDb.bundles.toArray().catch(() => []),
        user ? salesTabsService.getByUserId(user.id).catch(() => []) : Promise.resolve([]),
      ]);

      // 2. Hydrate Zustand stores instantly
      if (settings) {
        try {
          const directTheme = localStorage.getItem('theme');
          if (directTheme === 'light' || directTheme === 'dark') {
            settings.theme = directTheme;
          }
          const localStr = localStorage.getItem('pos_local_prefs');
          if (localStr) {
            const local = JSON.parse(localStr);
            if (local.posGridColumns !== undefined) settings.posGridColumns = local.posGridColumns;
            if (local.theme !== undefined && !directTheme) settings.theme = local.theme;
            if (local.receiptPrinter !== undefined) settings.receiptPrinter = local.receiptPrinter;
            if (local.enableKotPrinter !== undefined) settings.enableKotPrinter = local.enableKotPrinter;
            if (local.autoSaveReceiptPng !== undefined) settings.autoSaveReceiptPng = local.autoSaveReceiptPng;
          }
        } catch {}
        useSettingsStore.getState().setSettings(settings);
      }

      useProductsStore.getState().setProducts(products);
      useCustomersStore.getState().setCustomers(customers);
      useInventoryStore.getState().setSuppliers(suppliers);
      useInventoryStore.getState().setCategories(categories);
      useSettingsStore.getState().setPaymentModes(paymentModes);
      useSalesStore.getState().setSales(sales);
      useExpensesStore.getState().setExpenses(expenses);
      useUsersStore.getState().setUsers(users);
      useUsersStore.getState().setSalesmen(salesmen);
      useAppStore.getState().setDiscounts(discounts);
      useAppStore.getState().setBundles(bundles);

      if (salesTabs.length > 0) {
        useCartStore.getState().setSalesTabs(salesTabs);
        const savedActiveTab = localStorage.getItem('pos_active_sales_tab');
        const activeTabId = (savedActiveTab && salesTabs.find((t: any) => t.id === savedActiveTab))
          ? savedActiveTab
          : salesTabs[0].id;
        useCartStore.getState().setActiveSalesTab(activeTabId);
      } else {
        const defaultTab = {
          id: 'tab_default_1',
          name: 'Sale 1',
          cart: [],
          selectedCustomer: null,
          createdAt: new Date(),
          userId: user?.id || 'local_user',
        };
        useCartStore.getState().setSalesTabs([defaultTab]);
        useCartStore.getState().setActiveSalesTab('tab_default_1');
        localDb.salesTabs.put(defaultTab).catch(() => {});
      }

      if (!initialized) setInitialized(true);
      if (!silent) sonner.success('POS data ready (Local-First)', { id: 'load-data' });
    } catch (error: any) {
      console.error('Failed to load local POS data:', error);
      if (!silent) sonner.error(error.message || 'Failed to load data', { id: 'load-data' });
    } finally {
      useSettingsStore.getState().setLoading(false);
      sonner.close();
    }
  };

  return { loadData, loadMoreSales, searchSales };
}
