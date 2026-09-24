/**
 * Discount repository — Supabase-only cloud-direct.
 * Reads from the local mirror (`src/data`), writes through the sync queue. No P2P, no Dexie.
 * Rows are snake_case (Rule 3); mapped to the camelCase `Discount` domain type at this boundary.
 */

import { localQuery, localQueryOne, insertRow, updateRow, softDeleteRow } from '../../../data';
import { Discount } from '../../../types';

export function mapSqliteDiscount(row: any): Discount {
  let conditions: any[] = [];
  try { conditions = JSON.parse(row.conditions || '[]'); } catch {}
  let validDays: number[] | undefined;
  try { validDays = row.valid_days ? JSON.parse(row.valid_days) : undefined; } catch {}
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    type: row.type as 'percentage' | 'fixed',
    value: Number(row.value) || 0,
    conditions,
    minAmount: row.min_amount != null ? Number(row.min_amount) : undefined,
    maxDiscount: row.max_discount != null ? Number(row.max_discount) : undefined,
    validFrom: row.valid_from ? new Date(row.valid_from) : new Date(),
    validTo: row.valid_to ? new Date(row.valid_to) : new Date(),
    validDays,
    active: Boolean(row.active),
    isAutoApply: Boolean(row.is_auto_apply),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

function discountToRow(d: Partial<Discount>): Record<string, any> {
  return {
    name: d.name || 'Unnamed Discount',
    description: d.description || '',
    type: d.type || 'percentage',
    value: Number(d.value) || 0,
    conditions: JSON.stringify(d.conditions || []),
    min_amount: d.minAmount ?? null,
    max_discount: d.maxDiscount ?? null,
    valid_from: d.validFrom ? new Date(d.validFrom).toISOString() : new Date().toISOString(),
    valid_to: d.validTo
      ? new Date(d.validTo).toISOString()
      : new Date(Date.now() + 30 * 86400_000).toISOString(),
    valid_days: d.validDays ? JSON.stringify(d.validDays) : null,
    active: d.active !== false ? 1 : 0,
    is_auto_apply: d.isAutoApply ? 1 : 0,
  };
}

export async function getAllDiscounts(): Promise<Discount[]> {
  const rows = await localQuery<any>(`SELECT * FROM discounts WHERE active = 1 ORDER BY created_at ASC;`);
  return rows.map(mapSqliteDiscount);
}

export async function getDiscountById(id: string): Promise<Discount | null> {
  const row = await localQueryOne<any>(`SELECT * FROM discounts WHERE id = ?;`, [id]);
  return row ? mapSqliteDiscount(row) : null;
}

export async function createDiscount(data: Omit<Discount, 'id'>, _userId = 'system'): Promise<Discount> {
  const row = await insertRow('discounts', discountToRow(data));
  return mapSqliteDiscount(row);
}

export async function updateDiscount(id: string, updates: Partial<Discount>, _userId = 'system'): Promise<Discount> {
  const existing = await getDiscountById(id);
  if (!existing) throw new Error(`Discount ${id} not found`);

  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name || 'Unnamed Discount';
  if (updates.description !== undefined) patch.description = updates.description || '';
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.value !== undefined) patch.value = Number(updates.value) || 0;
  if (updates.conditions !== undefined) patch.conditions = JSON.stringify(updates.conditions || []);
  if (updates.minAmount !== undefined) patch.min_amount = updates.minAmount ?? null;
  if (updates.maxDiscount !== undefined) patch.max_discount = updates.maxDiscount ?? null;
  if (updates.validFrom !== undefined) patch.valid_from = new Date(updates.validFrom).toISOString();
  if (updates.validTo !== undefined) patch.valid_to = new Date(updates.validTo).toISOString();
  if (updates.validDays !== undefined) patch.valid_days = updates.validDays ? JSON.stringify(updates.validDays) : null;
  if (updates.active !== undefined) patch.active = updates.active ? 1 : 0;
  if (updates.isAutoApply !== undefined) patch.is_auto_apply = updates.isAutoApply ? 1 : 0;
  if (Object.keys(patch).length > 0) await updateRow('discounts', id, patch);

  return { ...existing, ...updates, id };
}

export async function deleteDiscount(id: string, _userId = 'system'): Promise<void> {
  await softDeleteRow('discounts', id, 'active');
}
