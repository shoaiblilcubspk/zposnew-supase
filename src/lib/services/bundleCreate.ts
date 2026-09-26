import { atomicWrite, newOperationId, type AtomicOp } from '../../data';
import { safeRandomUUID } from '../crypto/uuid';
import { generateBarcodeValue } from '../../utils/barcode';
import { Bundle } from '../../types';

/** Create a new bundle + its items as ONE atomic bundle (§1.5). */
export async function createBundle(data: {
  name: string;
  description?: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  items?: { productId: string; quantity: number }[];
  hideItemPrices?: boolean;
  overridePrice?: number;
  image?: string | null;
  barcode?: string;
}): Promise<Bundle> {
  const id = safeRandomUUID();
  const now = new Date();

  // Auto-generate a scannable barcode when none supplied, mirroring products so a whole
  // deal can be scanned/printed. (utils/barcode.generateBarcodeValue)
  const barcode = (data.barcode && data.barcode.trim()) || generateBarcodeValue(data.name);

  const itemRows = (data.items || []).map((item) => ({
    id: safeRandomUUID(),
    bundleId: id,
    productId: item.productId,
    quantity: item.quantity,
  }));

  const ops: AtomicOp[] = [
    {
      table: 'bundles', op: 'insert',
      row: {
        id,
        name: data.name.trim(),
        description: data.description || '',
        discount_value: data.discountValue,
        discount_type: data.discountType,
        override_price: data.overridePrice ?? null,
        hide_item_prices: data.hideItemPrices ? 1 : 0,
        active: 1,
        image: data.image || null,
        barcode,
      },
    },
    ...itemRows.map((item): AtomicOp => ({
      table: 'bundle_items', op: 'insert',
      row: { id: item.id, bundle_id: id, product_id: item.productId, quantity: item.quantity },
    })),
  ];

  await atomicWrite(ops, { operation_id: newOperationId(), action: 'create_bundle_deal' });

  return {
    id,
    name: data.name.trim(),
    description: data.description || '',
    discountValue: data.discountValue,
    discountType: data.discountType,
    overridePrice: data.overridePrice ?? undefined,
    hideItemPrices: data.hideItemPrices || false,
    active: true,
    image: data.image || undefined,
    barcode,
    items: itemRows.map((r) => ({ id: r.id, bundleId: id, productId: r.productId, quantity: r.quantity })),
    createdAt: now,
    updatedAt: now,
  };
}
