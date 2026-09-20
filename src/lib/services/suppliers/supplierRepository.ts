/**
 * Local SQLite Supplier Repository
 * Authoritative supplier directory query and mutation engine with outbox replication.
 */

import { getDatabase } from '../../db';
import { Supplier } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';

export function mapSqliteSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    openingBalance: Number(row.balance) || 0,
    createdAt: new Date(Number(row.updated_at) || Date.now()),
    updatedAt: new Date(Number(row.updated_at) || Date.now()),
  };
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM suppliers WHERE active = 1 ORDER BY name ASC;`
  );
  return rows.map(mapSqliteSupplier);
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const db = await getDatabase();
  const row = await db.queryOne(`SELECT * FROM suppliers WHERE id = ?;`, [id]);
  return row ? mapSqliteSupplier(row) : null;
}

export async function createSupplier(
  supplier: Omit<Supplier, 'id' | 'createdAt'>,
  userId = 'system'
): Promise<Supplier> {
  const deviceId = await getDeviceId();
  const db = await getDatabase();
  const now = Date.now();
  const balance = Number(supplier.openingBalance) || 0;

  // ─── Phone-based deduplication ─────────────────────────────────────────────
  if (supplier.phone && supplier.phone.trim()) {
    const existing = await db.queryOne<any>(
      `SELECT * FROM suppliers WHERE phone = ? AND active = 1 LIMIT 1;`,
      [supplier.phone.trim()]
    );
    if (existing) return mapSqliteSupplier(existing);
  }
  // ─── Name-based deduplication (for suppliers without phone) ────────────────
  if (supplier.name && supplier.name.trim()) {
    const existing = await db.queryOne<any>(
      `SELECT * FROM suppliers WHERE LOWER(name) = LOWER(?) AND active = 1 LIMIT 1;`,
      [supplier.name.trim()]
    );
    if (existing) return mapSqliteSupplier(existing);
  }

  const id = generateId();

  const newSupplier: Supplier = {
    ...supplier,
    id,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };

  await commitLocalTransaction({
    entityType: 'SUPPLIER',
    entityId: id,
    operation: 'CREATE',
    eventType: 'SUPPLIER_CREATED',
    deviceId,
    userId,
    payload: {
      id,
      name: newSupplier.name,
      phone: newSupplier.phone || null,
      email: newSupplier.email || null,
      address: newSupplier.address || null,
      balance,
      active: 1,
      updatedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `INSERT INTO suppliers (id, name, phone, email, address, balance, active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?);`,
        [
          id,
          newSupplier.name,
          newSupplier.phone || null,
          newSupplier.email || null,
          newSupplier.address || null,
          balance,
          now,
        ]
      );
    },
  });

  try {
    await localDb.suppliers.put(newSupplier);
  } catch {}

  return newSupplier;
}

export async function updateSupplier(
  id: string,
  updates: Partial<Supplier>,
  userId = 'system'
): Promise<Supplier> {
  const deviceId = await getDeviceId();
  const existing = await getSupplierById(id);
  if (!existing) throw new Error(`Supplier ${id} not found.`);

  const now = Date.now();
  const updated: Supplier = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date(now),
  };

  await commitLocalTransaction({
    entityType: 'SUPPLIER',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'SUPPLIER_UPDATED',
    deviceId,
    userId,
    payload: {
      id,
      name: updated.name,
      phone: updated.phone || null,
      email: updated.email || null,
      address: updated.address || null,
      updatedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, updated_at = ? WHERE id = ?;`,
        [
          updated.name,
          updated.phone || null,
          updated.email || null,
          updated.address || null,
          now,
          id,
        ]
      );
    },
  });

  try {
    await localDb.suppliers.put(updated);
  } catch {}

  return updated;
}

export async function deleteSupplier(id: string, userId = 'system'): Promise<void> {
  const deviceId = await getDeviceId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'SUPPLIER',
    entityId: id,
    operation: 'DELETE',
    eventType: 'SUPPLIER_DELETED',
    deviceId,
    userId,
    payload: { id, deletedAt: now },
    execute: async (tx) => {
      await tx.execute(`UPDATE suppliers SET active = 0, updated_at = ? WHERE id = ?;`, [now, id]);
      await tx.execute(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
         VALUES ('SUPPLIER', ?, ?, ?);`,
        [id, now, userId]
      );
    },
  });

  try {
    await localDb.suppliers.delete(id);
  } catch {}
}
