/**
 * Sales Queries & Reports — Supabase-only cloud-direct (Phase 10i).
 * Reads sales history/report sets from the local mirror; updates go through the sync queue.
 * Cloud-direct schema uses ISO `sold_at` (server clock), not an epoch `timestamp`.
 */

import { Sale } from '../../types';
import { localQuery, localQueryOne, updateRow } from '../../data';
import { mapSqliteSale, batchHydrateSaleItems } from './sales/salesRepository';

export async function getAllSales(): Promise<Sale[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM sales WHERE status NOT IN ('deleted', 'void') ORDER BY sold_at DESC;`
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
  const conditions: string[] = ["status NOT IN ('deleted', 'void')"];
  const params: any[] = [];

  if (filters.startDate) { conditions.push('sold_at >= ?'); params.push(filters.startDate.toISOString()); }
  if (filters.endDate) { conditions.push('sold_at <= ?'); params.push(filters.endDate.toISOString()); }
  if (filters.invoiceNumber) {
    conditions.push('(invoice_number LIKE ? OR customer_name LIKE ?)');
    params.push(`%${filters.invoiceNumber}%`, `%${filters.invoiceNumber}%`);
  }
  if (filters.customerId) { conditions.push('customer_id = ?'); params.push(filters.customerId); }
  if (filters.paymentMethod) { conditions.push('payment_method = ?'); params.push(filters.paymentMethod); }
  if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
  if (filters.cashier) { conditions.push('user_id = ?'); params.push(filters.cashier); }
  if (filters.saleType) { conditions.push('sale_type = ?'); params.push(filters.saleType); }

  const sql = `SELECT * FROM sales WHERE ${conditions.join(' AND ')} ORDER BY sold_at DESC LIMIT 200;`;
  const rows = await localQuery<any>(sql, params);
  return batchHydrateSaleItems(rows);
}

export async function updateSale(id: string, updates: Partial<Sale>): Promise<Sale> {
  const existingRow = await localQueryOne<any>(`SELECT * FROM sales WHERE id = ?;`, [id]);
  const patch: Record<string, any> = {};
  if (updates.notes !== undefined) patch.notes = updates.notes || null;
  if (updates.status !== undefined) patch.status = updates.status || 'completed';
  if (Object.keys(patch).length > 0) await updateRow('sales', id, patch);

  const mergedRow = { ...(existingRow || { id }), ...patch };
  return mapSqliteSale(mergedRow);
}

export async function getReportSalesLocal(startDate: Date, endDate: Date): Promise<Sale[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM sales
     WHERE status NOT IN ('refunded', 'deleted', 'pending', 'void')
       AND sold_at >= ? AND sold_at <= ?
     ORDER BY sold_at DESC;`,
    [startDate.toISOString(), endDate.toISOString()]
  );

  const sales = rows.map((r: any) => mapSqliteSale(r));
  for (const s of sales) {
    const itemRows = await localQuery<any>(`SELECT * FROM sale_items WHERE sale_id = ?;`, [s.id]);
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
  const rows = await localQuery<any>(
    `SELECT * FROM sales
     WHERE status IN ('refunded', 'partially_refunded')
       AND sold_at >= ? AND sold_at <= ?
     ORDER BY sold_at DESC;`,
    [startDate.toISOString(), endDate.toISOString()]
  );
  return rows.map((r: any) => mapSqliteSale(r));
}

export async function getReportRefunds(startDate: Date, endDate: Date): Promise<Sale[]> {
  return getReportRefundsLocal(startDate, endDate);
}

/**
 * Legacy back-fill of sale_items.unit_cost was a one-time migration against the OLD DB.
 * In the cloud-direct fresh-start model there is nothing to patch, so this is a no-op.
 */
export async function patchLegacySales(): Promise<number> {
  return 0;
}

