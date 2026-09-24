import { User } from '../../types';
import { localQuery, localQueryOne, insertRow, updateRow, softDeleteRow } from '../../data';
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
    const rows = await localQuery<any>(`SELECT * FROM salesmen WHERE active = 1 ORDER BY name ASC;`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || undefined,
      active: Boolean(r.active),
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
    }));
  },

  async fetchRemote(): Promise<any[]> {
    return this.getAll();
  },

  async create(salesman: any) {
    const row = await insertRow('salesmen', {
      ...(salesman.id ? { id: salesman.id } : {}),
      name: salesman.name || '',
      phone: salesman.phone || null,
      active: salesman.active === false ? 0 : 1,
    });
    return { id: row.id, name: row.name, phone: row.phone || undefined, active: true, createdAt: new Date() };
  },

  async update(id: string, updates: any) {
    const patch: Record<string, any> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.phone !== undefined) patch.phone = updates.phone || null;
    if (updates.active !== undefined) patch.active = updates.active ? 1 : 0;
    if (Object.keys(patch).length > 0) await updateRow('salesmen', id, patch);
    return localQueryOne<any>(`SELECT * FROM salesmen WHERE id = ?;`, [id]);
  },

  async delete(id: string) {
    await softDeleteRow('salesmen', id, 'active');
  },
};

export const usersService = {
  async getAll(): Promise<User[]> {
    try {
      return await getAllUsers();
    } catch {
      return [];
    }
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
  const { productsService } = await import('./productsService');
  const products = await productsService.getAll();
  const missing = products.filter((p) => !p.barcode || !p.barcodeValue);
  const updatedNames: string[] = [];

  for (const prod of missing) {
    const val = prod.barcode || generateBarcodeValue(prod.name || prod.id);
    await productsService.update(prod.id, { barcode: val, barcodeValue: val } as any);
    updatedNames.push(prod.name);
  }

  return { count: updatedNames.length, updated: updatedNames };
};
