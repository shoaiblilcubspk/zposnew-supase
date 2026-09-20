/**
 * Local SQLite Category Repository
 * Authoritative local category queries and outbox mutations.
 */

import { getDatabase } from '../../db';
import { Category } from '../../../types';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';
import { localDb, generateId } from '../../localDb';

export function mapSqliteCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: '',
    active: Boolean(row.active),
    createdAt: new Date(row.updated_at),
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.query(
    `SELECT * FROM categories WHERE active = 1 ORDER BY name ASC;`
  );
  return rows.map(mapSqliteCategory);
}

export async function createCategory(
  nameOrObj: string | Category,
  userId: string = 'system'
): Promise<Category> {
  const deviceId = await getDeviceId();
  const db = await getDatabase();
  const rawName = typeof nameOrObj === 'object' ? nameOrObj.name.trim() : (nameOrObj as string).trim();
  const now = Date.now();

  // ─── Name-based deduplication ────────────────────────────────────────────────
  // Prevents 2 devices creating same category name with different UUIDs
  const existing = await db.queryOne<any>(
    `SELECT * FROM categories WHERE LOWER(name) = LOWER(?) AND active = 1 LIMIT 1;`,
    [rawName]
  );
  if (existing) return mapSqliteCategory(existing);

  const id = typeof nameOrObj === 'object' ? nameOrObj.id || generateId() : generateId();
  const name = rawName;

  const category: Category = {
    id,
    name,
    description: typeof nameOrObj === 'object' ? nameOrObj.description : undefined,
    active: true,
    createdAt: new Date(now),
  };

  await commitLocalTransaction({
    entityType: 'CATEGORY',
    entityId: id,
    operation: 'CREATE',
    eventType: 'CATEGORY_CREATED',
    deviceId,
    userId,
    payload: {
      id,
      name,
      active: 1,
      updatedAt: now,
    },
    execute: async (tx) => {
      await tx.execute(
        `INSERT OR REPLACE INTO categories (id, name, active, updated_at)
         VALUES (?, ?, 1, ?);`,
        [id, name, now]
      );
    },
  });

  try {
    await localDb.categories.put(category);
  } catch {}

  return category;
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>,
  userId: string = 'system'
): Promise<void> {
  const deviceId = await getDeviceId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'CATEGORY',
    entityId: id,
    operation: 'UPDATE',
    eventType: 'CATEGORY_UPDATED',
    deviceId,
    userId,
    payload: {
      id,
      ...updates,
      updatedAt: now,
    },
    execute: async (tx) => {
      if (updates.name !== undefined) {
        await tx.execute(
          `UPDATE categories SET name = ?, active = ?, updated_at = ? WHERE id = ?;`,
          [updates.name, updates.active !== undefined ? (updates.active ? 1 : 0) : 1, now, id]
        );
      }
    },
  });

  try {
    await localDb.categories.update(id, updates);
  } catch {}
}

export async function deleteCategory(id: string, userId: string = 'system'): Promise<void> {
  const deviceId = await getDeviceId();
  const now = Date.now();

  await commitLocalTransaction({
    entityType: 'CATEGORY',
    entityId: id,
    operation: 'DELETE',
    eventType: 'CATEGORY_DELETED',
    deviceId,
    userId,
    payload: { id, deletedAt: now },
    execute: async (tx) => {
      await tx.execute(`UPDATE categories SET active = 0, updated_at = ? WHERE id = ?;`, [now, id]);
      await tx.execute(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
         VALUES ('CATEGORY', ?, ?, ?);`,
        [id, now, userId]
      );
    },
  });

  try {
    await localDb.categories.delete(id);
  } catch {}
}
