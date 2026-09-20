/**
 * Local-First Sale Creation Pipeline
 * Commits sales directly to local SQLite database in < 10ms and replicates via P2P outbox.
 */

import { Sale } from '../../types';
import { commitLocalSale } from './sales/localSaleCommit';

export async function createSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
  if (!sale.invoiceNumber || String(sale.invoiceNumber).trim() === '' || sale.invoiceNumber === 'undefined') {
    console.error('[FATAL] Attempted to create a sale without a valid invoiceNumber:', sale);
    throw new Error('Cannot create a sale without a valid invoice number. This prevents ghost records.');
  }

  return commitLocalSale(sale);
}
