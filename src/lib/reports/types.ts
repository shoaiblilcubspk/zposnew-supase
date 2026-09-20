/**
 * Local Reporting Engine Types
 * Data transfer interfaces for offline SQLite analytical aggregations.
 */

export interface SalesReportSummary {
  totalRevenue: number;
  totalInvoices: number;
  totalDiscounts: number;
  totalTax: number;
  averageInvoiceValue: number;
}

export interface DailySalesData {
  date: string;
  timestamp: number;
  revenue: number;
  invoices: number;
}

export interface FinancialReportSummary {
  grossRevenue: number;
  totalTax: number;
  netRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
}

export interface PaymentMethodBreakdown {
  paymentMode: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface InventoryValuationSummary {
  totalSkus: number;
  totalUnitsInStock: number;
  costValuation: number;
  retailValuation: number;
  potentialProfit: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export interface SalesmanPerformanceRecord {
  salesmanId: string;
  salesmanName: string;
  totalSalesCount: number;
  totalRevenue: number;
  averageTicket: number;
}

export interface CategorySalesSummary {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
}
