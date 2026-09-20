/**
 * Sale Delete & Void Service
 * Executes atomic sale voiding and inventory restoration locally.
 */

import { Product } from '../../types';
import { voidSale } from './sales/saleEditCoordinator';

export async function deleteSale(
  id: string,
  currentCashierName?: string,
  _editInfo?: any,
  _overrideToken?: any
): Promise<Product[]> {
  return await voidSale(id, 'Deleted by cashier', currentCashierName);
}
