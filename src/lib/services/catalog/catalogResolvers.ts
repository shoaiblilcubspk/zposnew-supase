import { generateId } from '../../localDb';

export async function resolveCategoryId(category: string | undefined, db: any, now: number): Promise<string | null> {
  if (!category || !category.trim()) return null;
  const name = category.trim();
  const existing = (await db.queryOne(
    `SELECT id FROM categories WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1;`,
    [name, name]
  )) as { id: string } | null;
  if (existing) return existing.id;
  const catId = `CAT-${generateId()}`;
  await db.execute(
    `INSERT OR IGNORE INTO categories (id, name, active, updated_at) VALUES (?, ?, 1, ?);`,
    [catId, name, now]
  );
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
  await db.execute(
    `INSERT OR IGNORE INTO suppliers (id, name, balance, active, updated_at) VALUES (?, ?, 0, 1, ?);`,
    [suppId, name, now]
  );
  try {
    const { useInventoryStore } = await import('../../../stores');
    useInventoryStore.getState().addSupplier({
      id: suppId, name, email: '', phone: '', address: '', openingBalance: 0,
      createdAt: new Date(now), updatedAt: new Date(now)
    });
  } catch {}
  return suppId;
}
