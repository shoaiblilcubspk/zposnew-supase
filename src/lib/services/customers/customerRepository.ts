/**
 * Local SQLite Customer Repository
 * Authoritative customer directory query and mutation engine with outbox replication.
 */

import { getDatabase } from '../../db';
import { Customer } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';

export function mapSqliteCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    priceTier: 'retail',
    totalPurchases: 0,
    balance: Number(row.current_balance) || 0,
    creditLimit: Number(row.credit_limit) || 0,
    creditUsed: Number(row.current_balance) || 0,
    // credit_limit = 0 means unlimited (not disabled). allowCredit is always true per customer.
    // Credit is controlled globally via appSettings.enableCreditSales, not per-customer limit.
    allowCredit: row.allow_credit !== undefined ? Boolean(row.allow_credit) : true,
    createdAt: new Date(Number(row.updated_at) || Date.now()),
    updatedAt: new Date(Number(row.updated_at) || Date.now()),
  };
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM customers WHERE active = 1 ORDER BY name ASC;`
  );
  return rows.map(mapSqliteCustomer);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const db = await getDatabase();
  const row = await db.queryOne(`SELECT * FROM customers WHERE id = ?;`, [id]);
  return row ? mapSqliteCustomer(row) : null;
}

export async function searchCustomers(queryStr: string): Promise<Customer[]> {
  const db = await getDatabase();
  const term = `%${queryStr.trim().toLowerCase()}%`;
  const rows = await db.query(
    `SELECT * FROM customers 
     WHERE active = 1 AND (LOWER(name) LIKE ? OR LOWER(phone) LIKE ?)
     ORDER BY name ASC LIMIT 50;`,
    [term, term]
  );
  return rows.map(mapSqliteCustomer);
}

export async function createCustomer(
  customer: Omit<Customer, 'id'>,
  userId = 'system'
): Promise<Customer> {
  const deviceId = await getDeviceId();
  const db = await getDatabase();
  const now = Date.now();

  // ─── Phone-based deduplication ─────────────────────────────────────────────
  // If a customer with same phone already exists on this device, return it.
  // This prevents duplicate UUID creation when 2 devices create the same person.
  if (customer.phone && customer.phone.trim()) {
    const existing = await db.queryOne<any>(
      `SELECT * FROM customers WHERE phone = ? AND active = 1 LIMIT 1;`,
      [customer.phone.trim()]
    );
    if (existing) return mapSqliteCustomer(existing);
  }

  const id = generateId();

  const newCustomer: Customer = {
    ...customer,
    id,
    balance: Number(customer.balance) || 0,
    creditLimit: Number(customer.creditLimit) || 0,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };

  await commitLocalTransaction({
    entityType: 'CUSTOMER',
    entityId: id,
    operation: 'CREATE',
    eventType: 'CUSTOMER_CREATED',
    deviceId,
    userId,
    payload: {
      id,
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      email: newCustomer.email || null,
      address: newCustomer.address || null,
      creditLimit: newCustomer.creditLimit || 0,
      currentBalance: newCustomer.balance || 0,
      active: 1,
      updatedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `INSERT INTO customers (
          id, name, phone, email, address, credit_limit, current_balance, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?);`,
        [
          id,
          newCustomer.name,
          newCustomer.phone || null,
          newCustomer.email || null,
          newCustomer.address || null,
          newCustomer.creditLimit || 0,
          newCustomer.balance || 0,
          now,
        ]
      );
    },
  });

  try {
    await localDb.customers.put(newCustomer);
  } catch {}

  return newCustomer;
}

export async function updateCustomer(
  id: string,
  updates: Partial<Customer>,
  userId = 'system'
): Promise<Customer> {
  const deviceId = await getDeviceId();
  const existing = await getCustomerById(id);
  if (!existing) throw new Error(`Customer ${id} not found.`);

  const now = Date.now();
  const updated: Customer = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date(now),
  };

  await commitLocalTransaction({
    entityType: 'CUSTOMER',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'CUSTOMER_UPDATED',
    deviceId,
    userId,
    payload: {
      id,
      name: updated.name,
      phone: updated.phone || null,
      email: updated.email || null,
      address: updated.address || null,
      creditLimit: updated.creditLimit || 0,
      currentBalance: updated.balance || 0,
      updatedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `UPDATE customers SET
          name = ?, phone = ?, email = ?, address = ?, credit_limit = ?, current_balance = ?, updated_at = ?
         WHERE id = ?;`,
        [
          updated.name,
          updated.phone || null,
          updated.email || null,
          updated.address || null,
          updated.creditLimit || 0,
          updated.balance || 0,
          now,
          id,
        ]
      );
    },
  });

  try {
    await localDb.customers.put(updated);
  } catch {}

  return updated;
}

export async function deleteCustomer(id: string, userId = 'system'): Promise<void> {
  const deviceId = await getDeviceId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'CUSTOMER',
    entityId: id,
    operation: 'DELETE',
    eventType: 'CUSTOMER_DELETED',
    deviceId,
    userId,
    payload: { id, deletedAt: now },
    execute: async (tx) => {
      await tx.execute(`UPDATE customers SET active = 0, updated_at = ? WHERE id = ?;`, [now, id]);
      await tx.execute(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
         VALUES ('CUSTOMER', ?, ?, ?);`,
        [id, now, userId]
      );
    },
  });

  try {
    await localDb.customers.delete(id);
  } catch {}
}
