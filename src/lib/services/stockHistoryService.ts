import { StockHistory } from '../../types';
import { localDb } from '../localDb';
import { mapStockHistory } from './mappers';

export const stockHistoryService = {
  async getAll(): Promise<StockHistory[]> {
    const items = await localDb.stockHistory.toArray();
    return items.map(mapStockHistory).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async fetchRemote(_lastSyncTime?: Date): Promise<StockHistory[]> {
    const items = await localDb.stockHistory.toArray();
    return items.map(mapStockHistory);
  }
};
