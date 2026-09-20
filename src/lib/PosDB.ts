import Dexie, { Table } from 'dexie';
import {
  Product, Customer, Sale, Discount, User, SalesTab, Expense, Category, Supplier, Topping, VariantStockHistory, ProductAddon
} from '../types';
import {
  SCHEMA_V19, SCHEMA_V20, SCHEMA_V21, SCHEMA_V18, SCHEMA_V16, SCHEMA_V15,
  SCHEMA_V14, SCHEMA_V13, SCHEMA_V12, SCHEMA_V11, SCHEMA_V1, SCHEMA_V2, SCHEMA_V4,
  SCHEMA_V5, SCHEMA_V6, SCHEMA_V7, SCHEMA_V8, SCHEMA_V9, SCHEMA_V10,
  migrateV13, migrateV4, migrateV8
} from './posDbHelpers';

// PHASE 17 — auto stock reconciliation flag.
// When true, the stockHistory hooks below skip recomputing product.stock.
// Bulk cloud imports and realtime mirror-writes set this so the
// authoritative cloud value isn't double-counted; only LOCAL mutations trigger
// the ledger-derived recompute.
export let stockReconcileSuspended = false;
export const setStockReconcileSuspended = (v: boolean) => { stockReconcileSuspended = v; };

// Full CURRENT schema for the opened (top) version. MUST declare EVERY table the
// app uses — Dexie only exposes table handles for tables present in the version
// that is actually opened. The extracted SCHEMA_V22 constant only added
// `customer_ledger` and omitted `paymentModes` / `salesmen`, which broke every
// `localDb.<table>` access at startup. This is the consolidated v19 base + v20
// (payments) + v21 (pendingOps batchId) + v22 (customer_ledger) plus the two
// tables that were dropped during extraction.
const SCHEMA_CURRENT = {
  savedReceiptPngs: 'id, invoiceNumber, saleDate',
  products: 'id, name, barcode, barcodeValue, sku, categoryId, supplierId, isDraft, trackInventory, stock',
  categories: 'id, name',
  suppliers: 'id, name',
  sales: 'id, invoiceNumber, customerId, timestamp, saleDate, status, dcNumber, extraCharges',
  customers: 'id, name, phone, email',
  expenses: 'id, categoryId, date',
  discounts: 'id, name, type, active',
  users: 'id, username, email',
  purchaseRecords: 'id, productId, supplierId, date',
  purchaseOrders: 'id, poNumber, supplierId',
  purchaseOrderItems: 'id, poId, productId',
  supplierTransactions: 'id, supplierId',
  payments: 'id, name, isActive',
  paymentModes: 'id, name, isActive',
  stockHistory: 'id, productId, timestamp, type, referenceId',
  salesTabs: 'id, userId',
  appSettings: 'id, storeName, currency, theme, interfaceMode, receiptPaperSize, receiptTemplate, country, businessType, posGridColumns, enableSplitPayment',
  syncHistory: '++id, timestamp',
  bundles: 'id, name, active',
  bundleItems: 'id, bundleId, productId',
  toppings: 'id, name',
  variantStockHistory: 'id, productId, variantId, createdAt',
  productAddons: 'id, productId, addonProductId, active',
  salesmen: 'id, name, active',
  payment_movements: 'id, modeId, referenceId, createdAt',
  sale_audit_log: 'id, saleId, action, createdAt',
  priceHistory: 'id, productId, createdAt',
  customerLedger: 'id, customerId, saleId, createdAt',
};

export class PosDB extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  discounts!: Table<Discount>;
  users!: Table<User>;
  categories!: Table<Category>;
  suppliers!: Table<Supplier>;
  purchaseRecords!: Table<any>;
  purchaseOrders!: Table<any>;
  purchaseOrderItems!: Table<any>;
  supplierTransactions!: Table<any>;
  payments!: Table<any>;
  paymentModes!: Table<any>;
  stockHistory!: Table<any>;
  salesTabs!: Table<SalesTab>;
  expenses!: Table<Expense>;
  appSettings!: Table<any>;
  syncHistory!: Table<any>;
  bundles!: Table<any>;
  bundleItems!: Table<any>;
  toppings!: Table<Topping>;
  variantStockHistory!: Table<VariantStockHistory>;
  productAddons!: Table<ProductAddon>;
  savedReceiptPngs!: Table<any>;
  salesmen!: Table<any>;
  payment_movements!: Table<any>;
  sale_audit_log!: Table<any>;
  priceHistory!: Table<any>;
  customerLedger!: Table<any>;

  constructor() {
    const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
    const dbName = `ZaynahsPosDB_${projectRef}`;

    super(dbName);

    this.on('versionchange', () => {
      this.close();
      console.warn('Database version changed. Closing connection to allow upgrade.');
    });

    // Versions MUST be declared in strictly ascending, unique order or Dexie
    // throws at construction (which previously made every table handle undefined).
    this.version(1).stores(SCHEMA_V1);
    this.version(2).stores(SCHEMA_V2);
    this.version(4).stores(SCHEMA_V4).upgrade(migrateV4);
    this.version(5).stores(SCHEMA_V5);
    this.version(6).stores(SCHEMA_V6);
    this.version(7).stores(SCHEMA_V7);
    this.version(8).stores(SCHEMA_V8).upgrade(migrateV8);
    this.version(9).stores(SCHEMA_V9);
    this.version(10).stores(SCHEMA_V10);
    this.version(11).stores(SCHEMA_V11);
    this.version(12).stores(SCHEMA_V12);
    this.version(13).stores(SCHEMA_V13).upgrade(migrateV13);
    this.version(14).stores(SCHEMA_V14);
    this.version(15).stores(SCHEMA_V15);
    this.version(16).stores(SCHEMA_V16);
    this.version(18).stores(SCHEMA_V18);
    this.version(19).stores(SCHEMA_V19);
    this.version(20).stores(SCHEMA_V20);
    this.version(21).stores(SCHEMA_V21);
    this.version(22).stores(SCHEMA_CURRENT);
    this.version(23).stores(SCHEMA_CURRENT);
    this.version(24).stores(SCHEMA_CURRENT);
    this.version(25).stores(SCHEMA_CURRENT);
    this.version(26).stores(SCHEMA_CURRENT);
    this.version(27).stores(SCHEMA_CURRENT);
    this.version(28).stores(SCHEMA_CURRENT);
    this.version(29).stores(SCHEMA_CURRENT);
    this.version(30).stores(SCHEMA_CURRENT);
    this.version(31).stores(SCHEMA_CURRENT);
    this.version(32).stores(SCHEMA_CURRENT);
    this.version(33).stores(SCHEMA_CURRENT);
    // v34 — Stage 1 decommission: drop vestigial productBatches (FIFO/lot layer, never populated)
    this.version(34).stores({ productBatches: null });
    // v35 — Stage 1 decommission: drop combo-layer slot tables (never populated; combo feature removed)
    this.version(35).stores({ bundleSlots: null, bundleSlotOptions: null });
    // v36 — Stage 1 decommission: collapse duplicate snake_case stores. These were
    // vestigial empty orphans (camelCase appSettings/purchaseRecords/customerLedger
    // are the live handles; migrateV13 already emptied the legacy snake pair). No
    // code holds a localDb.<snake> handle; snake names elsewhere are cloud entities.
    this.version(36).stores({ app_settings: null, purchase_records: null, customer_ledger: null });
    // v37 — Drop pendingOps. The app is cloud-direct.
    this.version(37).stores({ pendingOps: null });

    // PHASE 17 — every local stock_history write recomputes product.stock from
    // the full ledger sum. This makes product.stock ledger-derived (single source
    // of truth) and self-heals any desync, regardless of which code path wrote
    // the movement. Bulk/cloud writes are suspended via stockReconcileSuspended.
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- Dexie writing-hooks lose `this`; a stable self reference is required
    const self = this;
    this.stockHistory.hook('creating', function(_primKey, obj: any) {
      if (stockReconcileSuspended) return;
      const pid = obj?.productId;
      if (!pid) return;
      Dexie.ignoreTransaction(async () => {
        try {
          const rows = await self.stockHistory.where('productId').equals(pid).toArray() as any[];
          let sum = 0;
          let found = false;
          for (const h of rows) { 
            if (h.variantId) continue; 
            sum += Number(h.changeQty) || 0; 
            if (h.id === obj.id) found = true;
          }
          if (!found) {
            sum += Number(obj.changeQty) || 0;
          }
          await self.products.update(pid, { stock: sum, updatedAt: new Date() });
          const { useProductsStore } = await import('../stores');
          const prod = useProductsStore.getState().products.find(p => p.id === pid);
          if (prod) useProductsStore.getState().updateProduct({ ...prod, stock: sum });
        } catch (e) {
          console.error("Hook error", e);
        }
      });
    });
    this.stockHistory.hook('deleting', function(_primKey, obj: any) {
      if (stockReconcileSuspended) return;
      const pid = obj?.productId;
      if (!pid) return;
      Dexie.ignoreTransaction(async () => {
        try {
          const rows = await self.stockHistory.where('productId').equals(pid).toArray() as any[];
          let sum = 0;
          let found = false;
          for (const h of rows) { 
            if (h.variantId) continue; 
            sum += Number(h.changeQty) || 0; 
            if (h.id === obj.id) found = true;
          }
          if (found) {
            sum -= Number(obj.changeQty) || 0;
          }
          await self.products.update(pid, { stock: sum, updatedAt: new Date() });
          const { useProductsStore } = await import('../stores');
          const prod = useProductsStore.getState().products.find(p => p.id === pid);
          if (prod) useProductsStore.getState().updateProduct({ ...prod, stock: sum });
        } catch (e) {
          console.error("Hook error", e);
        }
      });
    });
  }
}
