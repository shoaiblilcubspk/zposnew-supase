/**
 * Migration 001: Initial Schema DDL
 * Core tables, relational constraints, foreign keys, and indexes for Zaynahs POS.
 */

export const MIGRATION_001_VERSION = 1;
export const MIGRATION_001_NAME = 'initial_schema';

export const MIGRATION_001_STATEMENTS: string[] = [
  // 1. Shop Profile & Cryptographic Identity
  `CREATE TABLE IF NOT EXISTS shop (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'PKR',
    tax_rate REAL DEFAULT 0.0,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    master_recovery_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  // 2. Devices Mesh
  `CREATE TABLE IF NOT EXISTS devices (
    device_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'terminal',
    public_key TEXT NOT NULL,
    last_seen INTEGER,
    is_revoked INTEGER DEFAULT 0,
    paired_at INTEGER NOT NULL
  );`,
  // 3. Users & Authentication
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    avatar TEXT,
    email TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
  // 4. Catalog Categories
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    active INTEGER DEFAULT 1,
    updated_at INTEGER NOT NULL
  );`,
  // 5. Products
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT,
    sku TEXT,
    category_id TEXT REFERENCES categories(id),
    supplier_id TEXT,
    cost_price REAL DEFAULT 0,
    retail_price REAL NOT NULL,
    stock REAL DEFAULT 0,
    min_stock_alert REAL DEFAULT 5,
    track_inventory INTEGER DEFAULT 1,
    image_hash TEXT,
    active INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`,

  // 6. Product Variants
  `CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    cost_price REAL,
    retail_price REAL,
    stock REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);`,

  // 7. Product Images
  `CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_hash TEXT NOT NULL,
    local_path TEXT NOT NULL,
    mime_type TEXT DEFAULT 'image/webp',
    file_size INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_images_hash ON product_images(image_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);`,

  // 8. Sales
  `CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    device_id TEXT NOT NULL,
    customer_id TEXT,
    user_id TEXT NOT NULL,
    salesman_id TEXT,
    subtotal REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    extra_charges REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    tendered_amount REAL NOT NULL,
    change_amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    refunded_amount REAL DEFAULT 0,
    notes TEXT,
    timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);`,
  `CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);`,

  // 9. Sale Items
  `CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    unit_cost REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total_price REAL NOT NULL,
    notes TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);`,

  // 10. Payment Modes (Wallets)
  `CREATE TABLE IF NOT EXISTS payment_modes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    balance REAL DEFAULT 0
  );`,

  // 11. Payments
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
    mode_id TEXT NOT NULL,
    amount REAL NOT NULL,
    reference TEXT,
    created_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);`,

  // 12. Append-Only Inventory Ledger
  `CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    variant_id TEXT,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    balance_after REAL,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON inventory_transactions(product_id);`,
  `CREATE INDEX IF NOT EXISTS idx_inv_tx_created ON inventory_transactions(created_at);`,

  // 13. Customers
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    credit_limit REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`,

  // 14. Customer Ledger
  `CREATE TABLE IF NOT EXISTS customer_ledger (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    sale_id TEXT,
    payment_mode TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_customer_ledger_cust ON customer_ledger(customer_id);`,

  // 15. Suppliers
  `CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    balance REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    updated_at INTEGER NOT NULL
  );`,

  // 16. Purchase Records
  `CREATE TABLE IF NOT EXISTS purchase_records (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id),
    invoice_number TEXT,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,

  // 17. Expenses
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_mode_id TEXT REFERENCES payment_modes(id),
    notes TEXT,
    user_id TEXT NOT NULL,
    date INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );`,

  // 18. Sync Outbox (Locally generated events)
  `CREATE TABLE IF NOT EXISTS sync_outbox (
    event_id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_synced INTEGER DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_seq ON sync_outbox(device_id, sequence);`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_synced ON sync_outbox(is_synced);`,

  // 19. Sync Inbox (Remotely received events)
  `CREATE TABLE IF NOT EXISTS sync_inbox (
    event_id TEXT PRIMARY KEY,
    sender_device_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    applied_at INTEGER NOT NULL
  );`,

  // 20. Tombstones
  `CREATE TABLE IF NOT EXISTS tombstones (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    deleted_at INTEGER NOT NULL,
    deleted_by TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
  );`,

  // 21. Settings
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // 22. Seed Default Payment Modes (if not present)
  `INSERT OR IGNORE INTO payment_modes (id, name, is_active, balance) VALUES
    ('cash', 'Cash', 1, 0),
    ('card', 'Card', 1, 0),
    ('bank', 'Bank Transfer', 1, 0),
    ('udhar', 'Udhar / Credit', 1, 0);`,
];
