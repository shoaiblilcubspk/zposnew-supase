/**
 * Local SQLite Sales Repository
 * Authoritative local sales query engine.
 */

import { getDatabase } from '../../db';
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
    refundedAmount: Number(row.refunded_amount) || 0,
    notes: row.notes || undefined,
    editedFromInvoice: editedFromInv,
    timestamp: new Date(Number(row.timestamp)),
    receiptNumber: invoiceNum,
    items,
    extraCharges: extraList,
    deliveryFee: extraVal > 0 ? extraVal : undefined,
    splitPayments: finalSplit && finalSplit.length > 0 ? finalSplit : undefined,
  };
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const db = await getDatabase();
  const saleRow = await db.queryOne(`SELECT * FROM sales WHERE id = ?;`, [id]);
  if (!saleRow) return null;

  const [itemRows, paymentRows] = await Promise.all([
    db.query(
      `SELECT si.*, p.image_hash as product_image, c.name as product_category
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE si.sale_id = ?;`,
      [id]
    ),
    db.query(
      `SELECT p.*, pm.name as mode_name 
       FROM payments p 
       LEFT JOIN payment_modes pm ON p.mode_id = pm.id 
       WHERE p.sale_id = ?;`,
      [id]
    )
  ]);

  const items: CartItem[] = itemRows.map((r: any) => ({
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
  }));

  const splitPayments = paymentRows.length > 0 ? paymentRows.map((p: any) => ({
    method: p.mode_name || p.mode_id,
    amount: Number(p.amount) || 0,
    reference: p.reference || undefined,
  })) : undefined;

  return mapSqliteSale(saleRow, items, splitPayments);
}

export async function batchHydrateSaleItems(saleRows: any[]): Promise<Sale[]> {
  if (saleRows.length === 0) return [];
  const db = await getDatabase();
  const saleIds = saleRows.map((r) => r.id);
  const placeholders = saleIds.map(() => '?').join(',');

  const [itemRows, paymentRows] = await Promise.all([
    db.query(
      `SELECT si.*, p.image_hash as product_image, c.name as product_category
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE si.sale_id IN (${placeholders});`,
      saleIds
    ),
    db.query(
      `SELECT p.*, pm.name as mode_name 
       FROM payments p 
       LEFT JOIN payment_modes pm ON p.mode_id = pm.id 
       WHERE p.sale_id IN (${placeholders});`,
      saleIds
    )
  ]);

  const itemsBySaleId = new Map<string, CartItem[]>();
  for (const r of itemRows) {
    if (!itemsBySaleId.has(r.sale_id)) {
      itemsBySaleId.set(r.sale_id, []);
    }
    itemsBySaleId.get(r.sale_id)!.push({
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
    });
  }

  const paymentsBySaleId = new Map<string, any[]>();
  for (const p of paymentRows) {
    if (!paymentsBySaleId.has(p.sale_id)) {
      paymentsBySaleId.set(p.sale_id, []);
    }
    paymentsBySaleId.get(p.sale_id)!.push({
      method: p.mode_name || p.mode_id,
      amount: Number(p.amount) || 0,
      reference: p.reference || undefined,
    });
  }

  return saleRows.map((r: any) =>
    mapSqliteSale(r, itemsBySaleId.get(r.id) || [], paymentsBySaleId.get(r.id))
  );
}

export async function getRecentSales(limit = 100): Promise<Sale[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM sales WHERE status NOT IN ('deleted', 'void') ORDER BY timestamp DESC LIMIT ?;`,
    [limit]
  );
  return batchHydrateSaleItems(rows);
}

export async function getSalesByDateRange(startDate: number, endDate: number): Promise<Sale[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM sales 
     WHERE timestamp >= ? AND timestamp <= ? AND status NOT IN ('deleted', 'void')
     ORDER BY timestamp DESC;`,
    [startDate, endDate]
  );
  return batchHydrateSaleItems(rows);
}
