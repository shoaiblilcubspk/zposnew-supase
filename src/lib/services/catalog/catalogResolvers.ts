import { generateId } from '../../localDb';
import { commitLocalTransaction } from '../../events';
import { getDeviceId } from '../../mesh/deviceIdentity';

export async function resolveCategoryId(category: string | undefined, db: any, now: number): Promise<string | null> {
  if (!category || !category.trim()) return null;
  const name = category.trim();
  const existing = (await db.queryOne(
    `SELECT id FROM categories WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1;`,
    [name, name]
  )) as { id: string } | null;
  if (existing) return existing.id;
  const catId = `CAT-${generateId()}`;
  const deviceId = await getDeviceId();

  await commitLocalTransaction({
    entityType: 'CATEGORY',
    entityId: catId,
    operation: 'CREATE',
    eventType: 'CATEGORY_CREATED',
    deviceId,
    userId: 'system',
    payload: { id: catId, name, active: 1, color: null, icon: null, updatedAt: now },
    execute: async (tx) => {
      await tx.execute(
        `INSERT OR IGNORE INTO categories (id, name, active, updated_at) VALUES (?, ?, 1, ?);`,
        [catId, name, now]
      );
    },
  });

  try {
    const { useInventoryStore } = await import('../../../stores');
    useInventoryStore.getState().addCategory({ id: catId, name, active: true, createdAt: new Date(now) });
  } catch {}
  return catId;
}

export async function resolveSupplierId(supplier: string | undefined, db: any, now: number): Promise<string | null> {
  if (!supplier || !supplier.trim()) return null;
  const name = supplier.trim();
  const existing = (await db.queryOne(
    `SELECT id FROM suppliers WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1;`,
    [name, name]
  )) as { id: string } | null;
  if (existing) return existing.id;
  const suppId = `SUP-${generateId()}`;
  const deviceId = await getDeviceId();

  await commitLocalTransaction({
    entityType: 'SUPPLIER',
    entityId: suppId,
    operation: 'CREATE',
    eventType: 'SUPPLIER_CREATED',
    deviceId,
    userId: 'system',
    payload: { id: suppId, name, balance: 0, active: 1, updatedAt: now },
    execute: async (tx) => {
      await tx.execute(
        `INSERT OR IGNORE INTO suppliers (id, name, balance, active, updated_at) VALUES (?, ?, 0, 1, ?);`,
        [suppId, name, now]
      );
    },
  });

  try {
    const { useInventoryStore } = await import('../../../stores');
    useInventoryStore.getState().addSupplier({
      id: suppId, name, email: '', phone: '', address: '', openingBalance: 0,
      createdAt: new Date(now), updatedAt: new Date(now)
    });
  } catch {}
  return suppId;
}
