/**
 * Local SQLite Sales Queries & Reports
 * Directly queries local SQLite database for sales history, search, and date-filtered report sets.
 */

import { Sale } from '../../types';
import { getDatabase } from '../db';
import { localDb } from '../localDb';
import { mapSqliteSale, batchHydrateSaleItems } from './sales/salesRepository';

export async function getAllSales(): Promise<Sale[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM sales WHERE status NOT IN ('deleted', 'void') ORDER BY timestamp DESC;`
  );
  return batchHydrateSaleItems(rows);
}

export async function fetchRemoteSales(): Promise<Sale[]> {
  return getAllSales();
}

export async function searchSales(filters: {
  startDate?: Date;
  endDate?: Date;
  invoiceNumber?: string;
  customerId?: string;
  paymentMethod?: string;
  status?: string;
  cashier?: string;
  salesman?: string;
  saleType?: string;
}): Promise<Sale[]> {
  const db = await getDatabase();
  const conditions: string[] = ["status NOT IN ('deleted', 'void')"];
  const params: any[] = [];

  if (filters.startDate) {
    conditions.push('timestamp >= ?');
    params.push(filters.startDate.getTime());
  }
  if (filters.endDate) {
    conditions.push('timestamp <= ?');
    params.push(filters.endDate.getTime());
  }
  if (filters.invoiceNumber) {
    conditions.push('(invoice_number LIKE ? OR customer_name LIKE ?)');
    params.push(`%${filters.invoiceNumber}%`, `%${filters.invoiceNumber}%`);
  }
  if (filters.customerId) {
    conditions.push('customer_id = ?');
    params.push(filters.customerId);
  }
  if (filters.paymentMethod) {
    conditions.push('payment_method = ?');
    params.push(filters.paymentMethod);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.cashier) {
    conditions.push('user_id = ?');
    params.push(filters.cashier);
  }

  const sql = `SELECT * FROM sales WHERE ${conditions.join(' AND ')} ORDER BY timestamp DESC LIMIT 200;`;
  const rows = await db.query(sql, params);
  return batchHydrateSaleItems(rows);
}

export async function updateSale(id: string, updates: Partial<Sale>): Promise<Sale> {
  const db = await getDatabase();
  const existing = await localDb.sales.get(id);
  const updated = { ...existing, ...updates, updatedAt: new Date() } as Sale;

  await db.execute(
    `UPDATE sales SET notes = ?, status = ? WHERE id = ?;`,
    [updated.notes || null, updated.status || 'completed', id]
  );

  try {
    await localDb.sales.put(updated);
  } catch {}

  return updated;
}

export async function getReportSalesLocal(startDate: Date, endDate: Date): Promise<Sale[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM sales
     WHERE status NOT IN ('refunded', 'deleted', 'pending', 'void')
       AND timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp DESC;`,
    [startDate.getTime(), endDate.getTime()]
  );

  // Hydrate items from sale_items for reporting breakdowns
  const sales = rows.map((r: any) => mapSqliteSale(r));
  for (const s of sales) {
    const itemRows = await db.query(
      `SELECT * FROM sale_items WHERE sale_id = ?;`,
      [s.id]
    );
    s.items = itemRows.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.name,
      quantity: Number(r.quantity) || 0,
      price: Number(r.unit_price) || 0,
      cost: Number(r.unit_cost) || 0,
      total: Number(r.total_price) || 0,
      product: {
        id: r.product_id,
        name: r.name,
        price: Number(r.unit_price) || 0,
        cost: Number(r.unit_cost) || 0,
      },
    })) as any;
  }

  return sales;
}

export async function getReportSales(startDate: Date, endDate: Date): Promise<Sale[]> {
  return getReportSalesLocal(startDate, endDate);
}

export async function getReportRefundsLocal(startDate: Date, endDate: Date): Promise<Sale[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM sales
     WHERE status IN ('refunded', 'partially_refunded')
       AND timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp DESC;`,
    [startDate.getTime(), endDate.getTime()]
  );
  return rows.map((r: any) => mapSqliteSale(r));
}

export async function getReportRefunds(startDate: Date, endDate: Date): Promise<Sale[]> {
  return getReportRefundsLocal(startDate, endDate);
}

export async function patchLegacySales(): Promise<number> {
  // Pure local audit
  const db = await getDatabase();
  const itemsWithoutCost = await db.query<any>(
    `SELECT si.id, p.cost_price
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     WHERE si.unit_cost IS NULL OR si.unit_cost = 0;`
  );

  for (const item of itemsWithoutCost) {
    await db.execute(
      `UPDATE sale_items SET unit_cost = ? WHERE id = ?;`,
      [Number(item.cost_price) || 0, item.id]
    );
  }

  return itemsWithoutCost.length;
}
