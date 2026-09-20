import { User } from '../../types';
import { localDb, generateId } from '../localDb';
import { generateBarcodeValue } from '../../utils/barcode';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  setUserStatus, 
  resetUserPin 
} from './users/userRepository';

export const salesmenService = {
  async getAll() {
    return await localDb.salesmen.toArray();
  },

  async fetchRemote(): Promise<any[]> {
    return this.getAll();
  },

  async create(salesman: any) {
    const id = generateId();
    const newSalesman = {
      ...salesman,
      id,
      active: salesman.active ?? true,
      createdAt: new Date(),
    };
    await localDb.salesmen.put(newSalesman);
    return newSalesman;
  },

  async update(id: string, updates: any) {
    await localDb.salesmen.update(id, { ...updates, updatedAt: new Date() });
    return await localDb.salesmen.get(id);
  },

  async delete(id: string) {
    await localDb.salesmen.delete(id);
  },
};

export const usersService = {
  async getAll(): Promise<User[]> {
    try {
      const sqliteUsers = await getAllUsers();
      if (sqliteUsers && sqliteUsers.length > 0) return sqliteUsers;
    } catch {}
    const users = await localDb.users.toArray();
    return users.filter((u: any) => !u.deleted_at && !u.deletedAt);
  },

  async fetchRemote(): Promise<User[]> {
    return this.getAll();
  },

  async create(user: Partial<User> & { pin?: string; password?: string }): Promise<User> {
    const pin = user.pin || user.password || '1234';
    return createUser({
      name: user.name || 'Staff Member',
      username: user.username || `user_${Date.now()}`,
      pin,
      role: (user.role as any) || 'cashier',
      email: user.email,
      avatar: user.avatar,
      canEditPrice: user.canEditPrice,
      canEditProduct: user.canEditProduct,
      canGiveDiscount: user.canGiveDiscount,
      canDeleteSale: user.canDeleteSale,
      canViewProfit: user.canViewProfit,
      canManageStock: user.canManageStock,
      canManagePO: user.canManagePO,
      canViewRecords: user.canViewRecords,
      canEditSale: user.canEditSale,
    });
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    return updateUser(id, updates);
  },

  async delete(id: string): Promise<void> {
    await setUserStatus(id, false);
  },

  async blockUser(userId: string): Promise<void> {
    await setUserStatus(userId, false);
  },

  async changeUserPassword(userId: string, newPinOrPass: string): Promise<void> {
    await resetUserPin(userId, newPinOrPass);
  },
};

export const seedMissingBarcodes = async (): Promise<{ count: number; updated: string[] }> => {
  const products = await localDb.products.toArray();
  const missing = products.filter(p => !p.barcode || !p.barcodeValue);
  const updatedNames: string[] = [];

  for (const prod of missing) {
    const val = prod.barcode || generateBarcodeValue(prod.name || prod.id);
    await localDb.products.where('id').equals(prod.id).modify({ barcodeValue: val, barcode: val });
    updatedNames.push(prod.name);
  }

  return { count: updatedNames.length, updated: updatedNames };
};
