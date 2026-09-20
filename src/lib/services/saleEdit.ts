/**
 * Sale Edit Service
 * Coordinates atomic bill amendments via local SQLite transaction.
 */

import { Sale } from '../../types';
import { editSale } from './sales/saleEditCoordinator';

export async function editSaleAtomic(oldSale: any, newSale: any, cashier: string): Promise<Sale> {
  return editSale(oldSale.id, newSale, cashier);
}
