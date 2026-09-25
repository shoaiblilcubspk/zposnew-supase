/**
 * Local SQLite schema — mirrors the Supabase schema 1:1 (Rule 9).
 * Same table + column names (snake_case) so the sync mapping layer stays trivial.
 *
 * SQLite type mapping from Postgres:
 *   uuid / text        -> TEXT
 *   timestamptz        -> TEXT (ISO-8601 string, server-clock value copied down on pull)
 *   numeric / real     -> REAL
 *   boolean            -> INTEGER (0/1)
 *   jsonb              -> TEXT (JSON string)
 *
 * NOTE: local rows carry the SAME operation_id + server timestamps as the cloud row once
 * synced. New local writes generate operation_id client-side (UUID v4) and set created_at/
 * updated_at to a provisional local ISO time; the server clock value overwrites on pull.
 */

export const LOCAL_SCHEMA_VERSION = 1;

export const LOCAL_SCHEMA_STATEMENTS: string[] = [
  // ---- store_settings (single row) ----
  `CREATE TABLE IF NOT EXISTS store_settings (
    id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL UNIQUE,
    store_name TEXT NOT NULL DEFAULT 'Zaynahs POS',
    store_address TEXT NOT NULL DEFAULT '',
    store_phone TEXT, store_email TEXT, store_website TEXT, store_logo TEXT,
    tax_rate REAL NOT NULL DEFAULT 0, tax_id TEXT,
    currency TEXT NOT NULL DEFAULT 'PKR', country TEXT NOT NULL DEFAULT 'PK',
    language TEXT DEFAULT 'en', business_type TEXT NOT NULL DEFAULT 'general',
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-', invoice_counter INTEGER NOT NULL DEFAULT 0,
    invoice_pad_digits INTEGER NOT NULL DEFAULT 4, custom_receipt_number INTEGER NOT NULL DEFAULT 0,
    po_prefix TEXT DEFAULT 'PO-', po_counter INTEGER NOT NULL DEFAULT 0,
    retail_enabled INTEGER NOT NULL DEFAULT 1, wholesale_enabled INTEGER NOT NULL DEFAULT 0,
    default_sale_type TEXT DEFAULT 'retail', sound_enabled INTEGER NOT NULL DEFAULT 1,
    allow_negative_stock INTEGER NOT NULL DEFAULT 0, refund_approval_threshold REAL NOT NULL DEFAULT 0,
    enable_credit_sales INTEGER NOT NULL DEFAULT 0, cashier_can_credit INTEGER NOT NULL DEFAULT 0,
    allow_credit_over_limit INTEGER NOT NULL DEFAULT 0, enable_split_payment INTEGER NOT NULL DEFAULT 1,
    enable_extra_charges INTEGER NOT NULL DEFAULT 0, enable_purchase_orders INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- receipt_settings (single row) ----
  `CREATE TABLE IF NOT EXISTS receipt_settings (
    id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL UNIQUE,
    receipt_paper_size TEXT NOT NULL DEFAULT '80mm', receipt_density TEXT NOT NULL DEFAULT 'normal',
    receipt_template TEXT NOT NULL DEFAULT 'modern', receipt_font_scale REAL NOT NULL DEFAULT 1,
    receipt_font_bold INTEGER NOT NULL DEFAULT 0, receipt_font_weight INTEGER,
    receipt_padding_top INTEGER NOT NULL DEFAULT 0, receipt_padding_bottom INTEGER NOT NULL DEFAULT 0,
    receipt_padding_left INTEGER NOT NULL DEFAULT 0, receipt_padding_right INTEGER NOT NULL DEFAULT 0,
    receipt_offset_x INTEGER NOT NULL DEFAULT 0, receipt_header_offset_x INTEGER, receipt_footer_offset_x INTEGER,
    receipt_header TEXT, receipt_footer TEXT, receipt_show_footer INTEGER NOT NULL DEFAULT 1,
    receipt_show_logo INTEGER NOT NULL DEFAULT 1, receipt_show_tax INTEGER NOT NULL DEFAULT 1,
    receipt_show_discount INTEGER NOT NULL DEFAULT 1, receipt_show_store_name INTEGER NOT NULL DEFAULT 1,
    receipt_show_store_address INTEGER NOT NULL DEFAULT 1, receipt_show_store_phone INTEGER NOT NULL DEFAULT 1,
    receipt_show_store_email INTEGER NOT NULL DEFAULT 0, receipt_show_customer_name INTEGER NOT NULL DEFAULT 1,
    receipt_show_customer_phone INTEGER NOT NULL DEFAULT 1, receipt_show_notes INTEGER NOT NULL DEFAULT 1,
    receipt_show_barcode INTEGER NOT NULL DEFAULT 0, receipt_show_delivery_address INTEGER NOT NULL DEFAULT 0,
    receipt_show_qr_code INTEGER NOT NULL DEFAULT 0,
    barcode_paper_size TEXT DEFAULT 'Thermal-40x30', barcode_a4_columns INTEGER, barcode_a4_rows INTEGER,
    barcode_show_price INTEGER DEFAULT 1, barcode_show_name INTEGER DEFAULT 1, barcode_show_sku INTEGER DEFAULT 0,
    barcode_show_category INTEGER DEFAULT 0, barcode_show_barcode INTEGER DEFAULT 1, barcode_show_qr INTEGER DEFAULT 0,
    barcode_scale REAL, barcode_height INTEGER, barcode_padding INTEGER, barcode_border INTEGER DEFAULT 0,
    barcode_qr_size INTEGER, barcode_name_lines INTEGER, barcode_font_size INTEGER, barcode_content_scale REAL,
    barcode_margin_x INTEGER, barcode_margin_y INTEGER, barcode_gap_x INTEGER, barcode_gap_y INTEGER, barcode_bar_width REAL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- categories ----
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, color TEXT, icon TEXT, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- suppliers ----
  `CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT,
    balance REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- products ----
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, barcode TEXT, sku TEXT,
    category_id TEXT, supplier_id TEXT,
    cost_price REAL NOT NULL DEFAULT 0, retail_price REAL NOT NULL DEFAULT 0,
    stock REAL NOT NULL DEFAULT 0, min_stock_alert REAL NOT NULL DEFAULT 5,
    track_inventory INTEGER NOT NULL DEFAULT 1, image_hash TEXT,
    is_service INTEGER NOT NULL DEFAULT 0, require_serial INTEGER NOT NULL DEFAULT 0,
    product_type TEXT NOT NULL DEFAULT 'simple', variants_json TEXT, variant_data_json TEXT,
    product_addons_json TEXT, expiry_date TEXT, expiry_alert_days INTEGER NOT NULL DEFAULT 90,
    active INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`,

  // ---- product_variants ----
  `CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL, name TEXT NOT NULL, sku TEXT, barcode TEXT,
    cost_price REAL, retail_price REAL, stock REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);`,

  // ---- product_images ----
  `CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL, image_hash TEXT NOT NULL, storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/webp', file_size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);`,

  // ---- discounts ----
  `CREATE TABLE IF NOT EXISTS discounts (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT 'percentage',
    value REAL NOT NULL DEFAULT 0, conditions TEXT NOT NULL DEFAULT '[]', min_amount REAL, max_discount REAL,
    valid_from TEXT, valid_to TEXT, valid_days TEXT, active INTEGER NOT NULL DEFAULT 1,
    is_auto_apply INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- bundles / bundle_items ----
  `CREATE TABLE IF NOT EXISTS bundles (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', discount_value REAL NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'percentage', override_price REAL, hide_item_prices INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1, image TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS bundle_items (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    bundle_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);`,

  // ---- inventory_ledger (append-only) ----
  `CREATE TABLE IF NOT EXISTS inventory_ledger (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL, variant_id TEXT, type TEXT NOT NULL, quantity REAL NOT NULL,
    reference_type TEXT NOT NULL, reference_id TEXT, device_id TEXT, user_id TEXT, notes TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_inv_ledger_product ON inventory_ledger(product_id);`,
  `CREATE INDEX IF NOT EXISTS idx_inv_ledger_ref ON inventory_ledger(reference_type, reference_id);`,

  // ---- sales / sale_items / sale_voids / sale_refunds ----
  `CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, invoice_number TEXT UNIQUE NOT NULL,
    device_id TEXT, customer_id TEXT, customer_name TEXT, user_id TEXT, salesman_id TEXT, salesman_name TEXT,
    subtotal REAL NOT NULL DEFAULT 0, discount_amount REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0,
    extra_charges REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0, tendered_amount REAL NOT NULL DEFAULT 0,
    change_amount REAL NOT NULL DEFAULT 0, payment_method TEXT NOT NULL DEFAULT 'cash', status TEXT NOT NULL DEFAULT 'completed',
    refunded_amount REAL NOT NULL DEFAULT 0, sale_type TEXT NOT NULL DEFAULT 'retail', notes TEXT,
    sold_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);`,
  `CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);`,
  `CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, sale_id TEXT NOT NULL,
    product_id TEXT, variant_id TEXT, name TEXT NOT NULL, quantity REAL NOT NULL, unit_price REAL NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0, total_price REAL NOT NULL, notes TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);`,
  `CREATE TABLE IF NOT EXISTS sale_voids (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, sale_id TEXT NOT NULL,
    reason TEXT, voided_by TEXT, device_id TEXT, created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sale_refunds (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, sale_id TEXT NOT NULL,
    amount REAL NOT NULL, reason TEXT, refunded_by TEXT, device_id TEXT, items_json TEXT, created_at TEXT NOT NULL
  );`,

  // ---- payment_modes / payments ----
  `CREATE TABLE IF NOT EXISTS payment_modes (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, sale_id TEXT, mode_code TEXT NOT NULL,
    amount REAL NOT NULL, reference TEXT, device_id TEXT, user_id TEXT, created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);`,

  // ---- customers / customer_ledger ----
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT,
    credit_limit REAL NOT NULL DEFAULT 0, current_balance REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`,
  `CREATE TABLE IF NOT EXISTS customer_ledger (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, customer_id TEXT NOT NULL, type TEXT NOT NULL,
    amount REAL NOT NULL, sale_id TEXT, payment_mode TEXT, notes TEXT, device_id TEXT, user_id TEXT, created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_customer_ledger_cust ON customer_ledger(customer_id);`,

  // ---- expense_categories / expenses ----
  `CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL,
    payment_mode TEXT, store_type TEXT DEFAULT 'retail', notes TEXT, user_id TEXT, device_id TEXT, spent_at TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );`,

  // ---- purchase_records (purchase / restock history log) ----
  `CREATE TABLE IF NOT EXISTS purchase_records (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'Stock IN', product_id TEXT, product_name TEXT NOT NULL DEFAULT '',
    sku TEXT, variant_id TEXT, variant_label TEXT, quantity REAL NOT NULL DEFAULT 0,
    cost_price REAL NOT NULL DEFAULT 0, retail_price REAL, total_amount REAL NOT NULL DEFAULT 0,
    supplier TEXT, supplier_id TEXT, added_by TEXT, notes TEXT,
    purchased_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_purchase_records_product ON purchase_records(product_id);`,

  // ---- stock_history (append-only) ----
  `CREATE TABLE IF NOT EXISTS stock_history (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL, change_qty REAL NOT NULL DEFAULT 0, type TEXT NOT NULL DEFAULT 'adjustment',
    reference_id TEXT, note TEXT, balance_after REAL, cashier_id TEXT, cashier_name TEXT,
    was_oversold INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_id);`,

  // ---- variant_stock_history (append-only) ----
  `CREATE TABLE IF NOT EXISTS variant_stock_history (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL, variant_id TEXT, variant_label TEXT, change_qty REAL NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'adjustment', reference_id TEXT, note TEXT, balance_after REAL,
    cashier_name TEXT, created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_variant_stock_history_product ON variant_stock_history(product_id);`,

  // ---- price_history (append-only) ----
  `CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL, old_price REAL, new_price REAL, old_cost REAL, new_cost REAL,
    changed_by TEXT, note TEXT, created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);`,

  // ---- sale_audit_log (append-only) ----
  `CREATE TABLE IF NOT EXISTS sale_audit_log (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    sale_id TEXT, invoice_number TEXT, action TEXT NOT NULL, performed_by_name TEXT,
    performed_by_role TEXT, device_id TEXT, note TEXT, meta TEXT, created_at TEXT NOT NULL
  );`,

  // ---- toppings (config) ----
  `CREATE TABLE IF NOT EXISTS toppings (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, price_small REAL NOT NULL DEFAULT 0, price_medium REAL NOT NULL DEFAULT 0,
    price_large REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- product_addons (config) ----
  `CREATE TABLE IF NOT EXISTS product_addons (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL, addon_product_id TEXT, name TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL DEFAULT 0, max_qty REAL NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_product_addons_product ON product_addons(product_id);`,

  // ---- salesmen (config) ----
  `CREATE TABLE IF NOT EXISTS salesmen (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, phone TEXT, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- purchase_orders + purchase_order_items (config) ----
  `CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    po_number TEXT NOT NULL, supplier_id TEXT, status TEXT NOT NULL DEFAULT 'draft',
    total_amount REAL NOT NULL DEFAULT 0, notes TEXT, received_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE,
    purchase_order_id TEXT NOT NULL, product_id TEXT, quantity REAL NOT NULL DEFAULT 0,
    received_qty REAL NOT NULL DEFAULT 0, cost_price REAL, unit_price REAL, is_received INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);`,

  // ---- roles / staff_users / audit_logs ----
  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS staff_users (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier', full_name TEXT, email TEXT, avatar TEXT, is_active INTEGER NOT NULL DEFAULT 1,
    can_view_expiry INTEGER NOT NULL DEFAULT 1, require_pin_on_sale INTEGER NOT NULL DEFAULT 0,
    permissions TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_staff_users_username ON staff_users(username);`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, user_id TEXT, device_id TEXT, action TEXT NOT NULL,
    entity_type TEXT, entity_id TEXT, details TEXT, created_at TEXT NOT NULL
  );`,

  // ---- integration_settings (third-party API keys, e.g. Pexels; generic KV, synced) ----
  `CREATE TABLE IF NOT EXISTS integration_settings (
    id TEXT PRIMARY KEY, operation_id TEXT NOT NULL UNIQUE, key_name TEXT NOT NULL UNIQUE,
    key_value TEXT, metadata TEXT, updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,

  // ---- sync_queue (local-only; never synced) ----
  `CREATE TABLE IF NOT EXISTS sync_queue (
    operation_id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL,     -- insert | update | delete | rpc
    payload TEXT NOT NULL,            -- JSON row/args
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | synced | error
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);`,

  // Seed default payment modes locally (mirrors 0005). operation_id fixed for idempotency.
  `INSERT OR IGNORE INTO payment_modes (id, operation_id, code, name, is_active, created_at, updated_at)
   VALUES
    ('11111111-1111-4111-8111-000000000001','11111111-1111-4111-8111-a00000000001','cash','Cash',1,'1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z'),
    ('11111111-1111-4111-8111-000000000002','11111111-1111-4111-8111-a00000000002','card','Card',1,'1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z'),
    ('11111111-1111-4111-8111-000000000003','11111111-1111-4111-8111-a00000000003','bank','Bank Transfer',1,'1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z'),
    ('11111111-1111-4111-8111-000000000004','11111111-1111-4111-8111-a00000000004','udhar','Udhar / Credit',1,'1970-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z');`,
];

/**
 * Idempotent ADD COLUMN migrations for EXISTING local databases. `CREATE TABLE IF NOT EXISTS`
 * never alters an already-created table, so any column added after a device first synced must
 * be applied here. Each statement is run with its error swallowed (a duplicate-column error on
 * an already-migrated device is expected and harmless). Append new ALTERs here whenever a
 * synced column is added — this keeps existing installs in lockstep with fresh clones.
 */
export const LOCAL_SCHEMA_MIGRATIONS: string[] = [
  `ALTER TABLE expenses ADD COLUMN deleted_at TEXT`,
  `ALTER TABLE purchase_records ADD COLUMN deleted_at TEXT`,
  `ALTER TABLE bundle_items ADD COLUMN deleted_at TEXT`,
  `ALTER TABLE staff_users ADD COLUMN permissions TEXT NOT NULL DEFAULT '{}'`,
];

/** All synced table names (used by the pull side of the sync engine). */
export const SYNCED_TABLES = [
  'store_settings', 'receipt_settings', 'categories', 'suppliers', 'products',
  'product_variants', 'product_images', 'discounts', 'bundles', 'bundle_items',
  'inventory_ledger', 'sales', 'sale_items', 'sale_voids', 'sale_refunds',
  'payment_modes', 'payments', 'customers', 'customer_ledger',
  'expense_categories', 'expenses', 'purchase_records', 'roles', 'staff_users', 'audit_logs',
  'stock_history', 'variant_stock_history', 'price_history', 'sale_audit_log',
  'toppings', 'product_addons', 'salesmen', 'purchase_orders', 'purchase_order_items',
  'integration_settings',
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

/** Append-only tables — never UPDATE/DELETE locally or on the server. */
export const APPEND_ONLY_TABLES: SyncedTable[] = [
  'inventory_ledger', 'sale_items', 'sale_voids', 'sale_refunds',
  'payments', 'customer_ledger', 'audit_logs',
  'stock_history', 'variant_stock_history', 'price_history', 'sale_audit_log',
];
