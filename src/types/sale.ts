import { Product, ProductModifier, CartItemTopping, ProductAddon } from './product';
import { Customer } from './customer';
import { CardDetails } from './settings';

export interface CartAddonItem {
  addon: ProductAddon;
  quantity: number;
  subtotal: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  weight?: number; // For weight-based products
  discount: number; // Calculated amount
  discountValue?: number; // Raw input (e.g. 10 for 10%)
  discountType: 'percentage' | 'fixed';
  subtotal: number;
  price?: number;
  // batchId removed — batch system deprecated
  purchaseCost?: number; // Total purchase cost for this line item (FIFO calculated)
  originalPrice?: number; // The original retail price before any manual edits
  // FIFO Tracking info added for reporting
  fifoDetails?: {
    batchId: string;
    quantity: number;
    cost: number;
    salePrice: number;
  }[];
  selectedVariant?: string; // e.g., "Size: M, Color: Red" (legacy — kept for backward compat)
  selectedVariantId?: string; // The VariantData.id for per-variant stock tracking
  selectedVariantLabel?: string; // Human-readable label for display (e.g., "10 Inch, Red")
  selectedModifiers?: ProductModifier[];
  addonItems?: CartAddonItem[]; // Inventory-tracked addon products selected by customer
  serialNumber?: string;
  // Bundle Deal fields
  bundleId?: string;   // Which bundle this item came from (for grouping in cart/receipt)
  bundle_id?: string;  // Legacy alias
  bundleName?: string; // Display name of the bundle deal
  bundleHideItemPrices?: boolean; // When true, this item's original price is hidden; only deal total shown
  refundedQuantity?: number; // Quantity of this item that was refunded
  toppings?: CartItemTopping[]; // Extra toppings added to this item
  displayToppings?: CartItemTopping[]; // Toppings mapped for visual display under nested deal items without charging
  dealSize?: string; // Selected deal size (e.g. 'large', 'medium')
}

export interface Discount {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  conditions: DiscountCondition[];
  minAmount?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  validDays?: number[]; // 0-6 (Sunday-Saturday)
  active: boolean;
  isAutoApply: boolean;
  createdAt: Date;
}

export interface DiscountCondition {
  type: 'min_amount' | 'specific_products' | 'payment_method' | 'customer_tier' | 'card_type' | 'bank_name' | 'category';
  value: any;
  operator?: 'equals' | 'greater_than' | 'less_than' | 'in_array';
  minQuantity?: number; // For specific_products or category condition - minimum quantity required
}

export interface SplitPayment {
  method: 'cash' | 'card' | 'digital' | 'cheque';
  amount: number;
  reference?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  editedFromInvoice?: string | null;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  billDiscountValue?: number;
  billDiscountType?: 'percentage' | 'fixed';
  paymentMethod: 'cash' | 'card' | 'digital' | 'online' | 'cheque' | 'split' | 'credit';
  cardDetails?: CardDetails;
  status: 'pending' | 'completed' | 'refunded' | 'partially_refunded' | 'draft';
  paymentStatus?: 'paid' | 'partially_paid' | 'unpaid' | 'refunded' | 'partially_refunded' | 'reversed' | string;
  cashier: string;
  cashierRole?: string; // Role of the cashier at sale time (cashier | salesman) — column exists in `sales`
  timestamp: Date;
  receiptNumber: string;
  notes?: string;
  appliedDiscounts?: AppliedDiscount[];
  freeGifts?: CartItem[];
  receivedAmount?: number;   // Cash received from customer
  changeAmount?: number;    // Change given back
  saleDate?: string; // YYYY-MM-DD
  saleType?: 'retail' | 'wholesale';
  dcNumber?: string;
  // New features
  extraCharges?: { name: string; amount: number }[];
  splitPayments?: SplitPayment[];
  refundedAmount?: number; // Total amount refunded from this sale
  // NOTE: a `refundedAt?` field was removed — there is NO matching `refunded_at`
  // column in the `sales` table, so it was dead type drift (C5).
  deliveryAddress?: string;
  deliveryFee?: number;
  deliveryLocationLat?: number;
  deliveryLocationLng?: number;
  customerNotes?: string;
  deviceId?: string;
  syncedAt?: Date;
  // Salesman tracking
  salesmanId?: string;
  salesmanName?: string;
}

export interface RefundRequest {
  type: 'full' | 'partial';
  items: {
    index: number;
    productId: string;
    qty: number;
    refundAmount: number;
  }[];
  totalRefundAmount: number;
  reason?: string;
  method?: string;
}

export interface AppliedDiscount {
  discountId: string;
  discountName: string;
  discountAmount: number;
  type: 'percentage' | 'fixed';
}

export interface SalesTab {
  id: string;
  name: string;
  cart: CartItem[];
  selectedCustomer: Customer | null;
  billDiscountValue?: number;
  billDiscountType?: 'percentage' | 'fixed';
  notes?: string;
  editingSaleId?: string | null;
  salesmanId?: string | null;
  createdAt: Date;
}