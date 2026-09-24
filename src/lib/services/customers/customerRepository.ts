/**
 * Customer repository — Supabase-only cloud-direct.
 * Reads from the local mirror (`src/data`), writes through the sync queue. No P2P, no Dexie.
 * Rows are snake_case (Rule 3); mapped to the camelCase `Customer` domain type at this boundary.
 */

import { localQuery, localQueryOne, insertRow, updateRow, softDeleteRow } from '../../../data';
import { Customer } from '../../../types';

export function mapSqliteCustomer(row: any): Customer {
  const balance = Number(row.current_balance) || 0;
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    priceTier: 'retail',
    totalPurchases: 0,
    balance,
    creditLimit: Number(row.credit_limit) || 0,
    creditUsed: balance,
    // credit_limit = 0 means unlimited (not disabled). Credit is controlled globally
    // via appSettings.enableCreditSales, not per-customer, so allowCredit is always true.
    allowCredit: true,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

export async function getAllCustomers(): Promise<Customer[]> {
  const rows = await localQuery<any>(`SELECT * FROM customers WHERE active = 1 ORDER BY name ASC;`);
  return rows.map(mapSqliteCustomer);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = await localQueryOne<any>(`SELECT * FROM customers WHERE id = ?;`, [id]);
  return row ? mapSqliteCustomer(row) : null;
}

export async function searchCustomers(queryStr: string): Promise<Customer[]> {
  const term = `%${queryStr.trim().toLowerCase()}%`;
  const rows = await localQuery<any>(
    `SELECT * FROM customers
     WHERE active = 1 AND (LOWER(name) LIKE ? OR LOWER(phone) LIKE ?)
     ORDER BY name ASC LIMIT 50;`,
    [term, term]
  );
  return rows.map(mapSqliteCustomer);
}

export async function createCustomer(
  customer: Omit<Customer, 'id'>,
  _userId = 'system'
): Promise<Customer> {
  // Phone-based dedup: prevents duplicate UUIDs when 2 devices create the same person.
  if (customer.phone && customer.phone.trim()) {
    const existing = await localQueryOne<any>(
      `SELECT * FROM customers WHERE phone = ? AND active = 1 LIMIT 1;`,
      [customer.phone.trim()]
    );
    if (existing) return mapSqliteCustomer(existing);
  }

  const row = await insertRow('customers', {
    name: customer.name,
    phone: customer.phone || null,
    email: customer.email || null,
    address: customer.address || null,
    credit_limit: Number(customer.creditLimit) || 0,
    current_balance: Number(customer.balance) || 0,
    active: 1,
  });
  return mapSqliteCustomer(row);
}

export async function updateCustomer(
  id: string,
  updates: Partial<Customer>,
  _userId = 'system'
): Promise<Customer> {
  const existing = await getCustomerById(id);
  if (!existing) throw new Error(`Customer ${id} not found.`);

  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.phone !== undefined) patch.phone = updates.phone || null;
  if (updates.email !== undefined) patch.email = updates.email || null;
  if (updates.address !== undefined) patch.address = updates.address || null;
  if (updates.creditLimit !== undefined) patch.credit_limit = Number(updates.creditLimit) || 0;
  if (updates.balance !== undefined) patch.current_balance = Number(updates.balance) || 0;
  if (Object.keys(patch).length > 0) await updateRow('customers', id, patch);

  return { ...existing, ...updates, id, updatedAt: new Date() };
}

export async function deleteCustomer(id: string, _userId = 'system'): Promise<void> {
  await softDeleteRow('customers', id, 'active');
}
