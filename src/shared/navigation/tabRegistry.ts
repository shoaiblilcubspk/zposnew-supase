import { RealIconName } from '../icons/realIcons';

/**
 * 🧭 Centralized Navigation & Tabs Registry
 * Single Source of Truth for all navigation tabs, sub-tabs, chips, and payment modes.
 * Updating an icon or title here updates it everywhere across Header, Drawers, Chips, and Screens.
 */

export interface NavTabItem {
  id: string;
  label: string;
  realIcon: RealIconName;
  color?: string;
  permission?: string;
}

// ── 1. Main Header & Mobile Drawer Navigation Tabs ──────────────────────────
export const MAIN_NAV_ITEMS: NavTabItem[] = [
  { id: 'pos', label: 'POS', realIcon: 'pos', permission: 'view_pos' },
  { id: 'transactions', label: 'Sales', realIcon: 'sales', permission: 'view_transactions' },
  { id: 'expenses', label: 'Expenses', realIcon: 'expenses', permission: 'view_expenses' },
  { id: 'inventory', label: 'Inventory', realIcon: 'inventory', permission: 'view_inventory' },
  { id: 'customers', label: 'Customers', realIcon: 'customers', permission: 'view_customers' },
  { id: 'discounts', label: 'Discounts', realIcon: 'discounts', permission: 'view_discounts' },
  { id: 'suppliers', label: 'Suppliers', realIcon: 'suppliers', permission: 'view_suppliers' },
  { id: 'users', label: 'Users', realIcon: 'users', permission: 'view_users' },
  { id: 'reports', label: 'Reports', realIcon: 'reports', permission: 'view_reports' },
];

// ── 2. Settings Sub-Tabs ───────────────────────────────────────────────────
export const SETTINGS_TABS: NavTabItem[] = [
  { id: 'general', label: 'General Settings', realIcon: 'generalSettings' },
  { id: 'mesh', label: 'Cloud Sync', realIcon: 'device' },
  { id: 'receipt', label: 'Receipt Design', realIcon: 'receipt' },
  { id: 'security', label: 'Security & Account', realIcon: 'security' },
  { id: 'backup', label: 'Backup & Restore', realIcon: 'database' },
  { id: 'how-to', label: 'How To Use Guide', realIcon: 'userGuide' },
];

// ── 3. Inventory Sub-Tabs ──────────────────────────────────────────────────
export const INVENTORY_TABS: NavTabItem[] = [
  { id: 'inventory', label: 'Products', realIcon: 'product' },
  { id: 'purchases', label: 'History', realIcon: 'purchases' },
  { id: 'purchase_orders', label: 'Restock', realIcon: 'productRestock' },
  { id: 'bundles', label: 'Bundles & Deals', realIcon: 'deals' },
  { id: 'groups', label: 'Groups', realIcon: 'categories' },
  { id: 'media', label: 'Media', realIcon: 'media' },
];

// ── 4. Reports Sub-Tabs ────────────────────────────────────────────────────
export const REPORTS_TABS: NavTabItem[] = [
  { id: 'sales', label: 'Overview', realIcon: 'reports' },
  { id: 'inventory', label: 'Inventory', realIcon: 'inventory' },
  { id: 'customers', label: 'Customers', realIcon: 'customers' },
  { id: 'expenses', label: 'Expenses', realIcon: 'expenses' },
  { id: 'financial', label: 'Financial', realIcon: 'bankWallet' },
  { id: 'salesmen', label: 'Salesmen', realIcon: 'salesman' },
  { id: 'suppliers', label: 'Suppliers', realIcon: 'suppliers' },
];

// ── 5. Payment Methods (Checkout) ──────────────────────────────────────────
export const PAYMENT_METHODS: NavTabItem[] = [
  { id: 'cash', label: 'Cash', realIcon: 'cashWallet' },
  { id: 'card', label: 'Card', realIcon: 'cardWallet' },
  { id: 'online', label: 'Online', realIcon: 'bankWallet' },
  { id: 'credit', label: 'Credit', realIcon: 'salesman' },
  { id: 'split', label: 'Split', realIcon: 'split' },
];

// ── 6. Drawer Wallets ──────────────────────────────────────────────────────
export const WALLET_MODES: Record<string, { label: string; realIcon: RealIconName }> = {
  cash: { label: 'Cash Wallet', realIcon: 'cashWallet' },
  card: { label: 'Card Wallet', realIcon: 'cardWallet' },
  online: { label: 'Online Wallet', realIcon: 'bankWallet' },
  credit: { label: 'Credit Wallet', realIcon: 'expenses' },
};
