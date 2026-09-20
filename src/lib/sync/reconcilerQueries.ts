/**
 * Reconciler Data Query Helpers
 * Retrieves complete entity payloads from local SQLite for P2P reconciliation exchange.
 */

import { safeTs } from '../utils/safeTimestamp';
import { getDatabase, TABLES } from '../db';

export async function getReconcileUsers(ids: string[]): Promise<any[]> {
  const db = await getDatabase();
  const list: any[] = [];
  for (const id of ids.slice(0, 50)) {
    const u = await db.queryOne(`SELECT * FROM ${TABLES.USERS} WHERE id = ?;`, [id]);
    if (u) list.push(u);
  }
  return list;
}

export async function getReconcileProducts(ids: string[]): Promise<any[]> {
  const db = await getDatabase();
  const list: any[] = [];
  for (const id of ids.slice(0, 100)) {
    const p = await db.queryOne(`SELECT * FROM ${TABLES.PRODUCTS} WHERE id = ?;`, [id]);
    if (p) list.push(p);
  }
  return list;
}

export async function getReconcileInventoryTxs(ids: string[]): Promise<any[]> {
  const db = await getDatabase();
  const list: any[] = [];
  for (const id of ids.slice(0, 100)) {
    const row = await db.queryOne(`SELECT * FROM ${TABLES.INVENTORY_TRANSACTIONS} WHERE id = ?;`, [id]);
    if (row) list.push(row);
  }
  return list;
}

export async function getReconcileFullSales(saleIds: string[]): Promise<any[]> {
  const db = await getDatabase();
  const list: any[] = [];
  for (const id of saleIds.slice(0, 50)) {
    const sale = await db.queryOne(`SELECT * FROM ${TABLES.SALES} WHERE id = ?;`, [id]);
    if (!sale) continue;
    const items = await db.query(`SELECT * FROM ${TABLES.SALE_ITEMS} WHERE sale_id = ?;`, [id]);
    const payments = await db.query(`SELECT * FROM ${TABLES.PAYMENTS} WHERE sale_id = ?;`, [id]);
    list.push({ sale, items: items || [], payments: payments || [] });
  }
  return list;
}

export function diffSalesManifest(localSales: any[], remoteSales: any[]) {
  const localSaleMap = new Map<string, any>(localSales.map((s) => [s.id, s]));
  const remoteSaleMap = new Map<string, any>((remoteSales || []).map((s) => [s.id, s]));

  const salesToVoidLocally: string[] = [];
  const salesToVoidRemotely: string[] = [];
  const missingSalesLocally: string[] = [];
  const missingSalesRemotely: string[] = [];

  for (const rs of remoteSales || []) {
    const ls = localSaleMap.get(rs.id);
    if (!ls) {
      if (rs.status !== 'void') missingSalesLocally.push(rs.id);
    } else if (rs.status === 'void' && ls.status !== 'void') {
      salesToVoidLocally.push(rs.id);
    } else if (rs.status !== 'void' && ls.status !== 'void') {
      const lsTime = Number(ls.updated_at) || 0;
      const rsTime = safeTs(rs.updatedAt, 0);
      const lsTotal = Number(ls.total_amount) || 0;
      const rsTotal = Number(rs.total) || 0;
      if (rsTime > lsTime || (rsTotal !== lsTotal && rsTime >= lsTime)) {
        missingSalesLocally.push(rs.id);
      }
    }
  }
  for (const [id, ls] of localSaleMap.entries()) {
    const rs = remoteSaleMap.get(id);
    if (!rs) {
      if (ls.status !== 'void') missingSalesRemotely.push(id);
    } else if (ls.status === 'void' && rs.status !== 'void') {
      salesToVoidRemotely.push(id);
    } else if (ls.status !== 'void' && rs.status !== 'void') {
      const lsTime = Number(ls.updated_at) || 0;
      const rsTime = safeTs(rs.updatedAt, 0);
      const lsTotal = Number(ls.total_amount) || 0;
      const rsTotal = Number(rs.total) || 0;
      if (lsTime > rsTime || (lsTotal !== rsTotal && lsTime >= rsTime)) {
        missingSalesRemotely.push(id);
      }
    }
  }
  return { salesToVoidLocally, salesToVoidRemotely, missingSalesLocally, missingSalesRemotely };
}

