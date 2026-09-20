export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  businessType?: string;
  paymentTerms?: string;
  openingBalance?: number;
  rating?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  status: 'draft' | 'confirmed' | 'received' | 'cancelled';
  totalAmount: number;
  notes?: string;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  poId?: string;
  purchaseOrderId?: string;
  productId: string;
  quantity: number;
  receivedQty: number;
  costPrice?: number;
  unitPrice?: number;
  isReceived?: boolean;
  createdAt?: Date;
  created_at?: Date;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: 'purchase' | 'loan' | 'advance' | 'payment' | 'return' | 'opening_balance';
  sourceType?: 'auto_purchase' | 'manual_bill' | 'payment' | 'opening_balance' | 'return';
  amount: number;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  balanceAfter?: number;
  isManualOverride?: boolean;
  overrideBy?: string;
  paymentType?: string;
  splitPayments?: any;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Payment {
  id: string;
  supplierId?: string;
  customerId?: string;
  amount: number;
  paymentType?: string;
  method?: string;
  direction?: 'in' | 'out';
  note?: string;
  notes?: string;
  isManualOverride?: boolean;
  overrideBy?: string;
  createdAt: Date;
}

export interface StockHistory {
  id: string;
  productId: string;
  changeQty: number;
  type: 'sale' | 'purchase' | 'return' | 'adjustment' | 'initial' | 'stock_in' | 'adjustment_out';
  referenceId?: string;
  note?: string;
  balanceAfter?: number;
  cashierId?: string;
  cashierName?: string;
  createdAt: Date;
  wasOversold?: boolean;
}

export interface PurchaseRecord {
  id: string;
  type: 'Opening' | 'Stock IN' | 'Sale' | 'Adjustment' | 'Transfer' | 'AUDIT' | 'Damage' | 'Restock' | string;
  productId?: string;
  productName: string;
  sku?: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  costPrice: number;
  retailPrice?: number;
  totalAmount: number;
  supplier: string;
  date: Date;
  addedBy: string;
  notes?: string;
  qty_remaining?: number; // actual remaining stock after this stock-in (C5 — schema has the column)
  createdAt?: Date;
  updatedAt?: Date;
}