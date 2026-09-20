/**
 * Local SQLite Reporting Service
 * High-performance offline SQL aggregation queries for financial, sales, and inventory analytics.
 */

import { getDatabase } from '../db';
import {
  SalesReportSummary,
  FinancialReportSummary,
  PaymentMethodBreakdown,
  InventoryValuationSummary,
  SalesmanPerformanceRecord,
  DailySalesData,
} from './types';

export async function getSalesSummary(startDate: number, endDate: number): Promise<SalesReportSummary> {
  const db = await getDatabase();
  const row = await db.queryOne<{
    totalRevenue: number;
    totalInvoices: number;
    totalDiscounts: number;
    totalTax: number;
  }>(
    `SELECT
       COALESCE(SUM(total_amount), 0) as totalRevenue,
       COUNT(*) as totalInvoices,
       COALESCE(SUM(discount_amount), 0) as totalDiscounts,
       COALESCE(SUM(tax_amount), 0) as totalTax
     FROM sales
     WHERE status NOT IN ('refunded', 'deleted', 'pending')
       AND timestamp BETWEEN ? AND ?;`,
    [startDate, endDate]
  );

  const totalRevenue = Number(row?.totalRevenue) || 0;
  const totalInvoices = Number(row?.totalInvoices) || 0;
  const totalDiscounts = Number(row?.totalDiscounts) || 0;
  const totalTax = Number(row?.totalTax) || 0;
  const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  return {
    totalRevenue,
    totalInvoices,
    totalDiscounts,
    totalTax,
    averageInvoiceValue,
  };
}

export async function getFinancialSummary(startDate: number, endDate: number): Promise<FinancialReportSummary> {
  const db = await getDatabase();

  // 1. Gross & Net Revenue
  const salesRow = await db.queryOne<{ grossRevenue: number; totalTax: number }>(
    `SELECT
       COALESCE(SUM(total_amount), 0) as grossRevenue,
       COALESCE(SUM(tax_amount), 0) as totalTax
     FROM sales
     WHERE status NOT IN ('refunded', 'deleted', 'pending')
       AND timestamp BETWEEN ? AND ?;`,
    [startDate, endDate]
  );

  const grossRevenue = Number(salesRow?.grossRevenue) || 0;
  const totalTax = Number(salesRow?.totalTax) || 0;
  const netRevenue = grossRevenue - totalTax;

  // 2. Cost of Goods Sold (COGS)
  const cogsRow = await db.queryOne<{ totalCOGS: number }>(
    `SELECT COALESCE(SUM(si.quantity * si.unit_cost), 0) as totalCOGS
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE s.status NOT IN ('refunded', 'deleted', 'pending')
       AND s.timestamp BETWEEN ? AND ?;`,
    [startDate, endDate]
  );
  const totalCOGS = Number(cogsRow?.totalCOGS) || 0;

  // 3. Operating Expenses
  const expRow = await db.queryOne<{ totalExpenses: number }>(
    `SELECT COALESCE(SUM(amount), 0) as totalExpenses
     FROM expenses
     WHERE date BETWEEN ? AND ?;`,
    [startDate, endDate]
  );
  const totalExpenses = Number(expRow?.totalExpenses) || 0;

  // 4. Margins and Net
  const grossProfit = netRevenue - totalCOGS;
  const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const netProfit = grossProfit - totalExpenses;
  const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  return {
    grossRevenue,
    totalTax,
    netRevenue,
    totalCOGS,
    grossProfit,
    grossMarginPercent,
    totalExpenses,
    netProfit,
    netMarginPercent,
  };
}

export async function getPaymentMethodDistribution(startDate: number, endDate: number): Promise<PaymentMethodBreakdown[]> {
  const db = await getDatabase();
  const rows = await db.query<{ paymentMode: string; totalAmount: number; transactionCount: number }>(
    `SELECT
       mode_id as paymentMode,
       COALESCE(SUM(amount), 0) as totalAmount,
       COUNT(*) as transactionCount
     FROM payments
     WHERE amount > 0 AND created_at BETWEEN ? AND ?
     GROUP BY mode_id
     ORDER BY totalAmount DESC;`,
    [startDate, endDate]
  );

  const total = rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);

  return rows.map(r => ({
    paymentMode: r.paymentMode,
    totalAmount: Number(r.totalAmount) || 0,
    transactionCount: Number(r.transactionCount) || 0,
    percentage: total > 0 ? ((Number(r.totalAmount) || 0) / total) * 100 : 0,
  }));
}

export async function getInventoryValuation(): Promise<InventoryValuationSummary> {
  const db = await getDatabase();
  const row = await db.queryOne<any>(
    `SELECT
       COUNT(*) as totalSkus,
       COALESCE(SUM(stock), 0) as totalUnitsInStock,
       COALESCE(SUM(stock * cost_price), 0) as costValuation,
       COALESCE(SUM(stock * retail_price), 0) as retailValuation,
       COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) as outOfStockCount,
       COALESCE(SUM(CASE WHEN stock > 0 AND stock <= min_stock_alert THEN 1 ELSE 0 END), 0) as lowStockCount
     FROM products
     WHERE active = 1;`
  );

  const costValuation = Number(row?.costValuation) || 0;
  const retailValuation = Number(row?.retailValuation) || 0;

  return {
    totalSkus: Number(row?.totalSkus) || 0,
    totalUnitsInStock: Number(row?.totalUnitsInStock) || 0,
    costValuation,
    retailValuation,
    potentialProfit: retailValuation - costValuation,
    outOfStockCount: Number(row?.outOfStockCount) || 0,
    lowStockCount: Number(row?.lowStockCount) || 0,
  };
}

export async function getSalesmanPerformance(startDate: number, endDate: number): Promise<SalesmanPerformanceRecord[]> {
  const db = await getDatabase();
  const rows = await db.query<{ salesmanId: string; totalSalesCount: number; totalRevenue: number }>(
    `SELECT
       COALESCE(salesman_id, 'Unassigned') as salesmanId,
       COUNT(*) as totalSalesCount,
       COALESCE(SUM(total_amount), 0) as totalRevenue
     FROM sales
     WHERE status NOT IN ('refunded', 'deleted', 'pending')
       AND timestamp BETWEEN ? AND ?
     GROUP BY salesman_id
     ORDER BY totalRevenue DESC;`,
    [startDate, endDate]
  );

  return rows.map(r => {
    const totalRevenue = Number(r.totalRevenue) || 0;
    const totalSalesCount = Number(r.totalSalesCount) || 0;
    return {
      salesmanId: r.salesmanId,
      salesmanName: r.salesmanId === 'Unassigned' ? 'Unassigned' : `Salesman (${r.salesmanId})`,
      totalSalesCount,
      totalRevenue,
      averageTicket: totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0,
    };
  });
}

export async function getDailySalesTrend(startDate: number, endDate: number): Promise<DailySalesData[]> {
  const db = await getDatabase();
  const rows = await db.query<{ timestamp: number; total_amount: number }>(
    `SELECT timestamp, total_amount
     FROM sales
     WHERE status NOT IN ('refunded', 'deleted', 'pending')
       AND timestamp BETWEEN ? AND ?
     ORDER BY timestamp ASC;`,
    [startDate, endDate]
  );

  const dayMap = new Map<string, { revenue: number; count: number; ts: number }>();
  for (const r of rows) {
    const d = new Date(Number(r.timestamp));
    const dayKey = d.toISOString().split('T')[0];
    const prev = dayMap.get(dayKey) || { revenue: 0, count: 0, ts: d.getTime() };
    prev.revenue += Number(r.total_amount) || 0;
    prev.count += 1;
    dayMap.set(dayKey, prev);
  }

  return Array.from(dayMap.entries()).map(([date, val]) => ({
    date,
    timestamp: val.ts,
    revenue: val.revenue,
    invoices: val.count,
  }));
}
