/**
 * Sales Repository — Supabase-only cloud-direct (Phase 10i).
 * Authoritative sales reads from the local mirror (snake_case). No P2P, no Dexie.
 * Maps mirror rows to the camelCase `Sale`/`CartItem` domain types at this boundary.
 */

import { localQuery, localQueryOne } from '../../../data';
import { Sale, CartItem } from '../../../types';

export function mapSqliteSale(row: any, items: CartItem[] = [], splitPayments?: any[]): Sale {
  let finalSplit = splitPayments;
  if (!finalSplit && row.split_payments) {
    try {
      finalSplit = typeof row.split_payments === 'string' ? JSON.parse(row.split_payments) : row.split_payments;
    } catch {}
  }

  const invoiceNum = row.invoice_number;
  const editedFromInv = row.edited_from_invoice || (row.notes?.match(/EDITED FROM INV #([A-Za-z0-9-_]+)/i)?.[1] || undefined);
  const extraVal = Number(row.extra_charges) || Number(row.delivery_fee) || 0;
  const extraList = extraVal > 0 ? [{ name: 'Delivery Charges (DC)', amount: extraVal }] : undefined;

  return {
    id: row.id,
    invoiceNumber: invoiceNum,
    deviceId: row.device_id,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || undefined,
    cashier: row.user_id,
    salesmanId: row.salesman_id || undefined,
    salesmanName: row.salesman_name || undefined,
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    total: Number(row.total_amount) || 0,
    receivedAmount: Number(row.tendered_amount) || 0,
    changeAmount: Number(row.change_amount) || 0,
    paymentMethod: (row.payment_method || 'cash') as any,
    status: (row.status || 'completed') as any,
    saleType: (row.sale_type || undefined) as any,
    refundedAmount: Number(row.refunded_amount) || 0,
    notes: row.notes || undefined,
    editedFromInvoice: editedFromInv,
    // Cloud-direct schema uses ISO `sold_at` (server clock), not an epoch `timestamp`.
    timestamp: row.sold_at ? new Date(row.sold_at) : (row.created_at ? new Date(row.created_at) : new Date()),
    receiptNumber: invoiceNum,
    items,
    extraCharges: extraList,
    deliveryFee: extraVal > 0 ? extraVal : undefined,
    splitPayments: finalSplit && finalSplit.length > 0 ? finalSplit : undefined,
  };
}

function mapItemRow(r: any): CartItem {
  return {
    product: {
      id: r.product_id,
      name: r.name,
      price: Number(r.unit_price) || 0,
      cost: Number(r.unit_cost) || 0,
      stock: 0,
      minStock: 0,
      category: r.product_category || '',
      image: r.product_image || undefined,
      description: '',
      taxable: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    quantity: Number(r.quantity) || 1,
    discount: Number(r.discount) || 0,
    discountType: 'fixed',
    subtotal: Number(r.total_price) || 0,
    selectedVariantId: r.variant_id || undefined,
  };
}

const ITEM_SELECT = `
  SELECT si.*, p.image_hash as product_image, c.name as product_category
  FROM sale_items si
  LEFT JOIN products p ON si.product_id = p.id
  LEFT JOIN categories c ON p.category_id = c.id`;

const PAYMENT_SELECT = `
  SELECT p.*, pm.name as mode_name
  FROM payments p
  LEFT JOIN payment_modes pm ON p.mode_code = pm.code`;

export async function getSaleById(id: string): Promise<Sale | null> {
  const saleRow = await localQueryOne<any>(`SELECT * FROM sales WHERE id = ?;`, [id]);
  if (!saleRow) return null;

  const [itemRows, paymentRows] = await Promise.all([
    localQuery<any>(`${ITEM_SELECT} WHERE si.sale_id = ?;`, [id]),
    localQuery<any>(`${PAYMENT_SELECT} WHERE p.sale_id = ?;`, [id]),
  ]);

  const items = itemRows.map(mapItemRow);
  const splitPayments = paymentRows.length > 0
    ? paymentRows.map((p: any) => ({ method: p.mode_name || p.mode_code, amount: Number(p.amount) || 0, reference: p.reference || undefined }))
    : undefined;

  return mapSqliteSale(saleRow, items, splitPayments);
}

export async function batchHydrateSaleItems(saleRows: any[]): Promise<Sale[]> {
  if (saleRows.length === 0) return [];
  const saleIds = saleRows.map((r) => r.id);
  const placeholders = saleIds.map(() => '?').join(',');

  const [itemRows, paymentRows] = await Promise.all([
    localQuery<any>(`${ITEM_SELECT} WHERE si.sale_id IN (${placeholders});`, saleIds),
    localQuery<any>(`${PAYMENT_SELECT} WHERE p.sale_id IN (${placeholders});`, saleIds),
  ]);

  const itemsBySaleId = new Map<string, CartItem[]>();
  for (const r of itemRows) {
    if (!itemsBySaleId.has(r.sale_id)) itemsBySaleId.set(r.sale_id, []);
    itemsBySaleId.get(r.sale_id)!.push(mapItemRow(r));
  }

  const paymentsBySaleId = new Map<string, any[]>();
  for (const p of paymentRows) {
    if (!paymentsBySaleId.has(p.sale_id)) paymentsBySaleId.set(p.sale_id, []);
    paymentsBySaleId.get(p.sale_id)!.push({ method: p.mode_name || p.mode_code, amount: Number(p.amount) || 0, reference: p.reference || undefined });
  }

  return saleRows.map((r: any) => mapSqliteSale(r, itemsBySaleId.get(r.id) || [], paymentsBySaleId.get(r.id)));
}

export async function getRecentSales(limit = 100): Promise<Sale[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM sales WHERE status NOT IN ('deleted', 'void') ORDER BY sold_at DESC LIMIT ?;`,
    [limit]
  );
  return batchHydrateSaleItems(rows);
}

export async function getSalesByDateRange(startDate: number, endDate: number): Promise<Sale[]> {
  const rows = await localQuery<any>(
    `SELECT * FROM sales
     WHERE sold_at >= ? AND sold_at <= ? AND status NOT IN ('deleted', 'void')
     ORDER BY sold_at DESC;`,
    [new Date(startDate).toISOString(), new Date(endDate).toISOString()]
  );
  return batchHydrateSaleItems(rows);
}
