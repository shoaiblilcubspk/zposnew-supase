/**
 * Category repository — Supabase-only cloud-direct (Phase 10c).
 * Reads from the local mirror (`src/data`), writes through the sync queue. No P2P, no Dexie.
 * Rows are snake_case (Rule 3); we map to the camelCase `Category` domain type at this boundary.
 */

import { localQuery, localQueryOne, insertRow, updateRow, softDeleteRow } from '../../../data';
import { Category } from '../../../types';

export function mapSqliteCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    active: row.active === undefined ? true : Boolean(row.active),
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const rows = await localQuery<any>(`SELECT * FROM categories WHERE active = 1 ORDER BY name ASC;`);
  return rows.map(mapSqliteCategory);
}

export async function createCategory(
  nameOrObj: string | Category,
  _userId: string = 'system'
): Promise<Category> {
  const rawName = (typeof nameOrObj === 'object' ? nameOrObj.name : nameOrObj).trim();

  // Name-based dedup: avoid two devices creating the same category under different UUIDs.
  const existing = await localQueryOne<any>(
    `SELECT * FROM categories WHERE LOWER(name) = LOWER(?) AND active = 1 LIMIT 1;`,
    [rawName]
  );
  if (existing) return mapSqliteCategory(existing);

  const id = typeof nameOrObj === 'object' && nameOrObj.id ? nameOrObj.id : undefined;
  const row = await insertRow('categories', {
    ...(id ? { id } : {}),
    name: rawName,
    active: 1,
  });
  return mapSqliteCategory(row);
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>,
  _userId: string = 'system'
): Promise<void> {
  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.active !== undefined) patch.active = updates.active ? 1 : 0;
  if (Object.keys(patch).length === 0) return;
  await updateRow('categories', id, patch);
}

export async function deleteCategory(id: string, _userId: string = 'system'): Promise<void> {
  await softDeleteRow('categories', id, 'active');
}
