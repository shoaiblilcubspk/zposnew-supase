/**
 * Catalog resolvers — Supabase-only cloud-direct (Phase 4: bundle-aware).
 * Resolve a free-text category/supplier name to an id. The `*Op` variants return an
 * atomicWrite insert op (when the entity is new) so category/supplier creation lives INSIDE
 * the product's bundle (§1.5.1) — never a separate half-savable write. No P2P, no Dexie.
 */

import { localQueryOne, insertRow, type AtomicInsert } from '../../../data';
import { safeRandomUUID } from '../../crypto/uuid';

export interface CatalogResolve {
  id: string | null;
  /** Present only when the entity is new and must be inserted as part of the bundle. */
  op?: AtomicInsert;
  created?: { kind: 'category' | 'supplier'; id: string; name: string };
}

/** Resolve a category name to an id; if new, return an insert op to include in the bundle. */
export async function resolveCategoryOp(category: string | undefined): Promise<CatalogResolve> {
  if (!category || !category.trim()) return { id: null };
  const name = category.trim();
  const existing = await localQueryOne<{ id: string }>(
    `SELECT id FROM categories WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1;`,
    [name, name]
  );
  if (existing) return { id: existing.id };
  const id = safeRandomUUID();
  return {
    id,
    op: { table: 'categories', op: 'insert', row: { id, name, active: 1 } },
    created: { kind: 'category', id, name },
  };
}

/** Resolve a supplier name to an id; if new, return an insert op to include in the bundle. */
export async function resolveSupplierOp(supplier: string | undefined): Promise<CatalogResolve> {
  if (!supplier || !supplier.trim()) return { id: null };
  const name = supplier.trim();
  const existing = await localQueryOne<{ id: string }>(
    `SELECT id FROM suppliers WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1;`,
    [name, name]
  );
  if (existing) return { id: existing.id };
  const id = safeRandomUUID();
  return {
    id,
    op: { table: 'suppliers', op: 'insert', row: { id, name, balance: 0, active: 1 } },
    created: { kind: 'supplier', id, name },
  };
}

export async function resolveCategoryId(
  category: string | undefined,
  _db?: any,
  now: number = Date.now()
): Promise<string | null> {
  if (!category || !category.trim()) return null;
  const name = category.trim();
  const existing = await localQueryOne<{ id: string }>(
    `SELECT id FROM categories WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1;`,
    [name, name]
  );
  if (existing) return existing.id;

  const row = await insertRow('categories', { name, active: 1 });

  try {
    const { useInventoryStore } = await import('../../../stores');
    useInventoryStore.getState().addCategory({ id: row.id, name, active: true, createdAt: new Date(now) });
  } catch {}
  return row.id;
}

export async function resolveSupplierId(
  supplier: string | undefined,
  _db?: any,
  now: number = Date.now()
): Promise<string | null> {
  if (!supplier || !supplier.trim()) return null;
  const name = supplier.trim();
  const existing = await localQueryOne<{ id: string }>(
    `SELECT id FROM suppliers WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1;`,
    [name, name]
  );
  if (existing) return existing.id;

  const row = await insertRow('suppliers', { name, balance: 0, active: 1 });

  try {
    const { useInventoryStore } = await import('../../../stores');
    useInventoryStore.getState().addSupplier({
      id: row.id, name, email: '', phone: '', address: '', openingBalance: 0,
      createdAt: new Date(now), updatedAt: new Date(now),
    });
  } catch {}
  return row.id;
}
