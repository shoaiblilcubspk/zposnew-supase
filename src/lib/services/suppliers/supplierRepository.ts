/**
 * Supplier repository — Supabase-only cloud-direct (Phase 10d).
 * Reads from the local mirror, writes through the sync queue. No P2P, no Dexie.
 * Rows are snake_case (Rule 3); mapped to the camelCase `Supplier` domain type here.
 */

import { localQuery, localQueryOne, insertRow, updateRow, softDeleteRow } from '../../../data';
import { Supplier } from '../../../types';

export function mapSqliteSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    openingBalance: Number(row.balance) || 0,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const rows = await localQuery<any>(`SELECT * FROM suppliers WHERE active = 1 ORDER BY name ASC;`);
  return rows.map(mapSqliteSupplier);
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const row = await localQueryOne<any>(`SELECT * FROM suppliers WHERE id = ?;`, [id]);
  return row ? mapSqliteSupplier(row) : null;
}

export async function createSupplier(
  supplier: Omit<Supplier, 'id' | 'createdAt'>,
  _userId = 'system'
): Promise<Supplier> {
  const balance = Number(supplier.openingBalance) || 0;

  // Phone-based dedup, then name-based dedup (suppliers without phone).
  if (supplier.phone && supplier.phone.trim()) {
    const existing = await localQueryOne<any>(
      `SELECT * FROM suppliers WHERE phone = ? AND active = 1 LIMIT 1;`,
      [supplier.phone.trim()]
    );
    if (existing) return mapSqliteSupplier(existing);
  }
  if (supplier.name && supplier.name.trim()) {
    const existing = await localQueryOne<any>(
      `SELECT * FROM suppliers WHERE LOWER(name) = LOWER(?) AND active = 1 LIMIT 1;`,
      [supplier.name.trim()]
    );
    if (existing) return mapSqliteSupplier(existing);
  }

  const row = await insertRow('suppliers', {
    name: supplier.name,
    phone: supplier.phone || null,
    email: supplier.email || null,
    address: supplier.address || null,
    balance,
    active: 1,
  });
  return mapSqliteSupplier(row);
}

export async function updateSupplier(
  id: string,
  updates: Partial<Supplier>,
  _userId = 'system'
): Promise<Supplier> {
  const existing = await getSupplierById(id);
  if (!existing) throw new Error(`Supplier ${id} not found.`);

  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.phone !== undefined) patch.phone = updates.phone || null;
  if (updates.email !== undefined) patch.email = updates.email || null;
  if (updates.address !== undefined) patch.address = updates.address || null;
  if (updates.openingBalance !== undefined) patch.balance = Number(updates.openingBalance) || 0;
  if (Object.keys(patch).length > 0) await updateRow('suppliers', id, patch);

  return { ...existing, ...updates, id, updatedAt: new Date() };
}

export async function deleteSupplier(id: string, _userId = 'system'): Promise<void> {
  await softDeleteRow('suppliers', id, 'active');
}
