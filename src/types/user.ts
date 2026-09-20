export interface Salesman {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'salesman';
  canEditPrice: boolean;
  canEditProduct: boolean;
  canGiveDiscount: boolean;
  canDeleteSale: boolean;
  canViewProfit: boolean;
  canManageStock: boolean;
  canManagePO: boolean;
  canViewRecords: boolean;
  canEditSale: boolean;
  canViewExpiry?: boolean;
  requirePinOnSale?: boolean;
  active: boolean;
  lastLogin?: Date;
  avatar?: string;
  actionHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}