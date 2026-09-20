/**
 * Bulk Product Operations Helper
 * Executes batched product updates and deletions sequentially.
 */

import { Product } from '../../../types';
import { deleteProduct, updateProduct } from './productRepository';

export async function bulkDeleteProducts(ids: string[], userId: string = 'system'): Promise<void> {
  for (const id of ids) {
    await deleteProduct(id, userId);
  }
}

export async function bulkUpdateProducts(
  ids: string[],
  updates: Partial<Product>,
  userId: string = 'system'
): Promise<void> {
  for (const id of ids) {
    await updateProduct(id, updates, userId);
  }
}
