import { useMemo } from 'react';
import { getEffectiveTotal, netItemQty } from '../../../lib/reportsUtils';

export function usePeopleStats(filteredSales: any[], appCustomers: any[], appSalesmen: any[], appUsers: any[] = []) {
  const customerData = useMemo(() => {
    const customerStats: Record<string, any> = {};
    appCustomers.forEach(c => {
      customerStats[c.id] = {
        id: c.id, name: c.name, totalSpent: 0, periodSpent: 0,
        lifetimeSpent: c.totalPurchases || 0, totalTransactions: 0,
        totalItems: 0, avgTransactionValue: 0, lastPurchase: null
      };
    });
    filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').forEach(sale => {
      if (sale.customerId && customerStats[sale.customerId]) {
        const stats = customerStats[sale.customerId];
        const saleTotal = getEffectiveTotal(sale);
        stats.periodSpent += saleTotal;
        stats.totalSpent += saleTotal;
        stats.totalTransactions += 1;
        sale.items.forEach((item: any) => { stats.totalItems += netItemQty(item); });
        const saleDate = new Date(sale.date || sale.timestamp);
        if (!stats.lastPurchase || saleDate > stats.lastPurchase) stats.lastPurchase = saleDate;
      } else if (sale.customerName) {
        const id = `anon-${sale.customerName}`;
        if (!customerStats[id]) {
          customerStats[id] = { id, name: sale.customerName, totalSpent: 0, periodSpent: 0, lifetimeSpent: 0, totalTransactions: 0, totalItems: 0, avgTransactionValue: 0, lastPurchase: null };
        }
        const stats = customerStats[id];
        const saleTotal = getEffectiveTotal(sale);
        stats.periodSpent += saleTotal;
        stats.totalSpent += saleTotal;
        stats.totalTransactions += 1;
        sale.items.forEach((item: any) => { stats.totalItems += netItemQty(item); });
        const saleDate = new Date(sale.date || sale.timestamp);
        if (!stats.lastPurchase || saleDate > stats.lastPurchase) stats.lastPurchase = saleDate;
      }
    });
    Object.values(customerStats).forEach(c => { c.avgTransactionValue = c.totalTransactions > 0 ? c.periodSpent / c.totalTransactions : 0; });
    return Object.values(customerStats).filter(c => c.totalTransactions > 0).sort((a, b) => b.periodSpent - a.periodSpent);
  }, [filteredSales, appCustomers]);

  const salesmanData = useMemo(() => {
    const salesmanStats: Record<string, any> = {};
    appSalesmen.forEach(s => {
      if (!s.name) return;
      salesmanStats[s.name] = { id: s.id, name: s.name, totalSales: 0, totalTransactions: 0, totalItems: 0, commission: 0, avgTransactionValue: 0 };
    });
    (appUsers || []).filter(u => u.role === 'salesman').forEach(u => {
      if (!u.name || salesmanStats[u.name]) return;
      salesmanStats[u.name] = { id: u.id, name: u.name, totalSales: 0, totalTransactions: 0, totalItems: 0, commission: 0, avgTransactionValue: 0 };
    });

    const resolveSalesmanName = (sale: any): string | null => {
      if (sale.salesmanName && String(sale.salesmanName).trim()) return String(sale.salesmanName).trim();
      if (sale.salesmanId) {
        const sm = appSalesmen.find(s => s.id === sale.salesmanId);
        if (sm?.name) return sm.name;
        const usr = (appUsers || []).find(u => u.id === sale.salesmanId);
        if (usr?.name) return usr.name;
        return sale.salesmanId;
      }
      return null;
    };

    filteredSales.filter(s => s.status === 'completed' || s.status === 'partially_refunded').forEach(sale => {
      const sName = resolveSalesmanName(sale);
      if (!sName) return;
      if (!salesmanStats[sName]) {
        const foundId = appSalesmen.find(sm => sm.name === sName)?.id || (appUsers || []).find(u => u.name === sName)?.id || sName;
        salesmanStats[sName] = { id: foundId, name: sName, totalSales: 0, totalTransactions: 0, totalItems: 0, commission: 0, avgTransactionValue: 0 };
      }
      const stats = salesmanStats[sName];
      const saleTotal = getEffectiveTotal(sale);
      stats.totalSales += saleTotal;
      stats.totalTransactions += 1;
      (sale.items || []).forEach((item: any) => { stats.totalItems += netItemQty(item); });
      const salesmanConfig = appSalesmen.find(sm => sm.name === sName);
      if (salesmanConfig && salesmanConfig.commissionRate) {
        stats.commission += saleTotal * (salesmanConfig.commissionRate / 100);
      }
    });
    Object.values(salesmanStats).forEach(s => { s.avgTransactionValue = s.totalTransactions > 0 ? s.totalSales / s.totalTransactions : 0; });
    return Object.values(salesmanStats).filter(s => s.totalTransactions > 0).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSales, appSalesmen, appUsers]);

  return { customerData, salesmanData };
}
