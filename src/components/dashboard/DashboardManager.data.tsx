import { useExpensesStore, useInventoryStore, useProductsStore, useSalesStore, useSettingsStore } from '../../stores';
import { useMemo, useEffect, useState } from 'react';
import { getTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone } from '../../lib/dateUtils';
import { getAmountByMethod } from '../../lib/services';

export function useDashboardData() {
  const appSettings = useSettingsStore(s => s.settings);
  const appSales = useSalesStore(s => s.sales);
  const appExpenses = useExpensesStore(s => s.expenses);
  const appSuppliers = useInventoryStore(s => s.suppliers);
  const appSupplierTransactions = useInventoryStore(s => s.supplierTransactions);
  const appProducts = useProductsStore(s => s.products);

  const timezone = getTimezone(appSettings.country);

  const [dashboardSales, setDashboardSales] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const now = new Date();
      const todayStart = getStartOfDayInTimezone(now, timezone).getTime();
      const todayEnd = getEndOfDayInTimezone(now, timezone).getTime();

      // Fetch today's sales from the local mirror.
      const { getSalesByDateRange, getRecentSales } = await import('../../lib/services/sales/salesRepository');
      const today = await getSalesByDateRange(todayStart, todayEnd).catch(() => []);
      setDashboardSales(today as any);

      // Fetch recent 5 sales.
      const recent = await getRecentSales(5).catch(() => []);
      setRecentSales(recent as any);
    };

    fetchDashboardData();
  }, [appSales, timezone]); // Re-run when appSales changes so it stays live

  const todaySalesStats = useMemo(() => {
    let revenue = 0, cash = 0, card = 0, online = 0;
    for (const s of dashboardSales) {
      if (s.status === 'refunded' || s.status === 'deleted') continue; // net 0
      const total = s.total || 0;
      const refunded = s.status === 'partially_refunded' ? (s.refundedAmount || 0) : 0;
      // X5: net of tax so Dashboard Revenue matches Reports (which subtract tax) — previously
      // tax was counted as revenue, overstating the figure.
      const tax = Number(s.taxAmount) || 0;
      const taxPortion = s.status === 'partially_refunded' && total > 0 ? tax * (refunded / total) : tax;
      revenue += total - refunded - taxPortion;
      const netFor = (method: string) => {
        const amt = getAmountByMethod(s, method);
        return total > 0 ? amt - refunded * (amt / total) : 0;
      };
      cash += netFor('cash');
      card += netFor('card');
      online += netFor('online');
    }
    return { revenue, cash, card, online };
  }, [dashboardSales]);

  const todayStats = useMemo(() => {
    return {
      sales: todaySalesStats.revenue,
      purchases: 0,
    };
  }, [todaySalesStats.revenue]);

  const todayExpenses = useMemo(() => {
    const now = new Date();
    const start = getStartOfDayInTimezone(now, timezone).getTime();
    const end = getEndOfDayInTimezone(now, timezone).getTime();
    return (appExpenses || []).reduce((sum, e) => {
      const ts = new Date(e.createdAt || e.date || 0).getTime();
      return ts >= start && ts <= end ? sum + (e.amount || 0) : sum;
    }, 0);
  }, [appExpenses, timezone]);

  const flowRatio = useMemo(() => {
    const total = todayStats.sales + todayExpenses;
    if (total <= 0) return 8;
    return Math.max(8, Math.min(100, (todayStats.sales / total) * 100));
  }, [todayStats.sales, todayExpenses]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      name: `${i.toString().padStart(2, '0')}:00`,
      value: 0
    }));

    dashboardSales.forEach(sale => {
      const date = new Date(sale.createdAt || sale.timestamp || new Date());
      const hour = date.getHours();
      let amount = 0;
      if (sale.status === 'completed') amount = (sale.total || 0);
      else if (sale.status === 'partially_refunded') amount = (sale.total || 0) - (sale.refundedAmount || 0);
      else amount = 0; // refunded -> net 0
      hours[hour].value += amount;
    });

    const currentHour = new Date().getHours();
    const startHour = Math.max(0, currentHour - 11);
    return hours.slice(startHour, currentHour + 1);
  }, [dashboardSales]);

  const recentActivity = useMemo(() => {
    return recentSales;
  }, [recentSales]);

  const payableStats = useMemo(() => {
    // X1: mapSupplier never populates Supplier.balance, so summing s.balance was always 0.
    // Compute each supplier's balance from the transaction ledger (mirrors suppliersService.getBalance).
    const balances = appSuppliers.map(s => {
      const txs = appSupplierTransactions.filter(t => t.supplierId === s.id);
      return txs.reduce((sum, tx) => {
        if (tx.type === 'payment' || tx.type === 'return') return sum - (tx.amount || 0);
        return sum + (tx.amount || 0);
      }, 0);
    });
    const toPay = balances.filter(b => b < 0).reduce((a, b) => a + Math.abs(b), 0);
    const advance = balances.filter(b => b > 0).reduce((a, b) => a + b, 0);
    return { toPay, advance };
  }, [appSuppliers, appSupplierTransactions]);

  const pendingPOsCount = 0;
  const lowStockCount = appProducts.filter(p => p.trackInventory && p.stock <= (p.minStock || 5)).length;

  return {
    currency: appSettings.currency,
    country: appSettings.country,
    dashboardSales,
    recentSales,
    todaySalesStats,
    todayStats,
    todayExpenses,
    flowRatio,
    hourlyData,
    recentActivity,
    payableStats,
    pendingPOsCount,
    lowStockCount,
  };
}
