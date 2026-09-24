import { purchaseRecordsService, productsService } from './services';
import { useInventoryStore } from '../stores/inventoryStore';
import { useProductsStore } from '../stores/productsStore';

/**
 * Shared single source of truth for committing stock-in entries to inventory.
 *
 * Used by BOTH PurchaseOrderSystem (bulk PO admit) and ProductDetailHub
 * (per-product Quick Restock) — never write a second parallel implementation.
 *
 * Per item:
 *  1. Creates a Purchase Record via purchaseRecordsService.create
 *     (handles product stock update, last-cost update + stock_history internally)
 *  2. Updates the inventory store (ADD_PURCHASE_RECORD)
 *  3. Optionally records the supplier ledger bill (when toggle is ON + supplier matched)
 *  4. Re-reads the fresh product from localDb and updates the products store (UPDATE_PRODUCT)
 */

export interface StockInCommitItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  costPrice: number;
  supplier?: string;
  type?: string;
  notes?: string;
  variantId?: string;
  variantLabel?: string;
}

interface StockInCommitParams {
  items: StockInCommitItem[];
  recordAsSupplierBill?: boolean;
  suppliers: { id: string; name: string }[];
  profile?: { email?: string | null } | null;
  date?: Date;
}

export async function commitStockInToInventory({
  items,
  recordAsSupplierBill = true,
  suppliers,
  profile,
  date = new Date(),
}: StockInCommitParams) {
  let lastProduct: any = null;

  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) continue;

    const supplier = item.supplier || 'PO TRANSIT';

    let supplierBillData = null;
    if (recordAsSupplierBill && supplier !== 'PO TRANSIT' && supplier !== 'DIRECT ENTRY') {
      const matchedSupplier = suppliers.find(
        s => s.id === supplier || s.name.toLowerCase() === supplier.toLowerCase()
      );
      if (matchedSupplier) {
        supplierBillData = {
          supplierId: matchedSupplier.id,
          amount: item.quantity * (item.costPrice || 0),
          note: `PO Stock In: ${item.name} x${item.quantity}`,
          sourceType: 'auto_purchase' as const,
        };
      }
    }

    const newRecord = await purchaseRecordsService.create({
      productId: item.id,
      productName: item.name,
      sku: item.sku || '',
      variantId: item.variantId,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      costPrice: item.costPrice || 0,
      totalAmount: item.quantity * (item.costPrice || 0),
      type: (item.type as any) || 'Stock IN',
      supplier,
      date,
      addedBy: profile?.email || 'System',
      notes: item.notes || `Stock In | ${date.toLocaleDateString()}`
    }, supplierBillData);

    useInventoryStore.getState().addPurchaseRecord(newRecord);

    // Read fresh product from authoritative SQLite productsService (with localDb fallback)
    const freshProduct = await productsService.getById(item.id);
    if (freshProduct) {
      lastProduct = freshProduct;
      useProductsStore.getState().updateProduct(freshProduct);
    }
  }

  return lastProduct;
}
