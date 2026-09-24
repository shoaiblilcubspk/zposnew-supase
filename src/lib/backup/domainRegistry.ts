/**
 * Backup Domain Registry — the single source of truth for what can be exported/imported and how
 * (AGENTS.md future-proof rule). One entry per domain: its tables (with append-only flag +
 * sensitive columns), the group it belongs to for the UI checklist, and its dependencies.
 * Adding a new domain to backup = adding one entry here; the export/import engine is generic.
 */

export type DomainGroup = 'Catalog' | 'People' | 'Transactions' | 'Settings';

export interface DomainTable {
  name: string;
  /** Append-only (Rule 7): imported as insert-or-ignore, never updated/deleted. */
  appendOnly?: boolean;
  /** Columns stripped from plain exports (only kept in an encrypted .zpos with explicit opt-in). */
  sensitiveColumns?: string[];
}

export interface DomainDef {
  key: string;
  label: string;
  group: DomainGroup;
  tables: DomainTable[];
  /** Other domain keys that should exist / be auto-included on the target. */
  deps?: string[];
}

export const DOMAIN_REGISTRY: DomainDef[] = [
  // ── Catalog ────────────────────────────────────────────────────────────────
  { key: 'categories', label: 'Categories', group: 'Catalog', tables: [{ name: 'categories' }] },
  { key: 'suppliers', label: 'Suppliers', group: 'Catalog', tables: [{ name: 'suppliers' }] },
  {
    key: 'products', label: 'Products (+ variants, images)', group: 'Catalog',
    tables: [{ name: 'products' }, { name: 'product_variants' }, { name: 'product_images' }],
    deps: ['categories', 'suppliers'],
  },
  { key: 'bundles', label: 'Bundles & Deals', group: 'Catalog', tables: [{ name: 'bundles' }, { name: 'bundle_items' }], deps: ['products'] },
  { key: 'discounts', label: 'Discounts', group: 'Catalog', tables: [{ name: 'discounts' }] },
  { key: 'addons', label: 'Add-ons & Toppings', group: 'Catalog', tables: [{ name: 'product_addons' }, { name: 'toppings' }] },

  // ── People ─────────────────────────────────────────────────────────────────
  { key: 'customers', label: 'Customers', group: 'People', tables: [{ name: 'customers' }] },
  { key: 'salesmen', label: 'Salesmen', group: 'People', tables: [{ name: 'salesmen' }] },
  {
    key: 'users', label: 'Staff Users & Roles', group: 'People',
    tables: [{ name: 'staff_users', sensitiveColumns: ['password_hash'] }, { name: 'roles' }],
  },

  // ── Transactions ─────────────────────────────────────────────────────────────
  {
    key: 'sales', label: 'Sales / Invoices', group: 'Transactions',
    tables: [
      { name: 'sales' },
      { name: 'sale_items', appendOnly: true },
      { name: 'sale_voids', appendOnly: true },
      { name: 'sale_refunds', appendOnly: true },
      { name: 'sale_audit_log', appendOnly: true },
    ],
    deps: ['products', 'customers'],
  },
  { key: 'payments', label: 'Payments', group: 'Transactions', tables: [{ name: 'payments', appendOnly: true }, { name: 'payment_modes' }] },
  { key: 'customer_ledger', label: 'Customer Ledger', group: 'Transactions', tables: [{ name: 'customer_ledger', appendOnly: true }], deps: ['customers'] },
  { key: 'expenses', label: 'Expenses', group: 'Transactions', tables: [{ name: 'expenses' }, { name: 'expense_categories' }] },
  { key: 'purchases', label: 'Purchases / Restock', group: 'Transactions', tables: [{ name: 'purchase_records' }, { name: 'purchase_orders' }, { name: 'purchase_order_items' }], deps: ['products', 'suppliers'] },
  {
    key: 'inventory', label: 'Stock Ledger & History', group: 'Transactions',
    tables: [
      { name: 'inventory_ledger', appendOnly: true },
      { name: 'stock_history', appendOnly: true },
      { name: 'variant_stock_history', appendOnly: true },
      { name: 'price_history', appendOnly: true },
    ],
    deps: ['products'],
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  { key: 'settings', label: 'Store & Receipt Settings', group: 'Settings', tables: [{ name: 'store_settings' }, { name: 'receipt_settings' }] },
  { key: 'audit', label: 'System Audit Log', group: 'Settings', tables: [{ name: 'audit_logs', appendOnly: true }] },
];

export function getDomain(key: string): DomainDef | undefined {
  return DOMAIN_REGISTRY.find((d) => d.key === key);
}

/** Resolve a set of domain keys to include their dependencies (transitive). */
export function withDependencies(keys: string[]): string[] {
  const out = new Set<string>();
  const visit = (k: string) => {
    if (out.has(k)) return;
    out.add(k);
    getDomain(k)?.deps?.forEach(visit);
  };
  keys.forEach(visit);
  // Preserve registry order (dependencies before dependents for import safety).
  return DOMAIN_REGISTRY.filter((d) => out.has(d.key)).map((d) => d.key);
}

export const ALL_DOMAIN_KEYS = DOMAIN_REGISTRY.map((d) => d.key);
