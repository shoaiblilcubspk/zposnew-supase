import { PurchaseRecord } from '../../../types';
import { purchaseRecordsService, productsService, generateId } from '../../../lib/services';
import { localDb } from '../../../lib/localDb';
import { sonner } from '../../../lib/sonner';
import { useProductsStore, useInventoryStore } from '../../../stores';
import { DetailCtx } from './detailContext';

export async function performAdjustment(ctx: DetailCtx) {
  const qtyChange = parseInt(ctx.adjustmentData.quantity);
  if (isNaN(qtyChange) || qtyChange === 0) return;
  const reason = ctx.adjustmentData.reason || 'Correction';

  const result = await sonner.confirm(
    'Confirm Adjustment?',
    'Adjusting stock by <strong>{qty}</strong> due to <strong>{reason}</strong>.'
      .replace('{qty}', (qtyChange > 0 ? '+' : '') + qtyChange)
      .replace('{reason}', reason),
    'Yes, Confirm'
  );

  if (!result.isConfirmed) return;

  ctx.setIsUpdating(true);
  sonner.loading('Adjusting stock...');

  try {
    const now = new Date();
    const currentStock = ctx.product.stock ?? 0;
    // Signed new stock (negative allowed per plan PART O — problem is never hidden).
    const newStock = currentStock + qtyChange;
    const adjustmentId = generateId();

    const newRecord = await purchaseRecordsService.create({
      productId: ctx.product.id,
      productName: ctx.product.name,
      sku: ctx.product.sku || '',
      quantity: qtyChange,
      costPrice: ctx.product.cost || 0,
      totalAmount: Math.abs(qtyChange) * (ctx.product.cost || 0),
      type: 'Adjustment',
      supplier: reason.toUpperCase(),
      date: now,
      addedBy: ctx.profile?.email || 'System',
      notes: ctx.adjustmentData.notes ? `${reason}: ${ctx.adjustmentData.notes}` : `Manual Adjustment: ${reason}`
    } as any);

    useInventoryStore.getState().addPurchaseRecord(newRecord);

    const freshProduct = await productsService.getById(ctx.product.id);
    if (freshProduct) {
      useProductsStore.getState().updateProduct(freshProduct);
      ctx.setFormData(prev => ({ ...prev, stock: String(freshProduct.stock) }));
    } else {
      ctx.setFormData(prev => ({ ...prev, stock: String(newStock) }));
    }

    sonner.success('Stock adjusted successfully');
    ctx.setShowAdjustment(false);
    ctx.setAdjustmentData({ action: 'remove', quantity: '1', reason: 'Correction', notes: '' });
  } catch (error) {
    console.error('Adjustment failed:', error);
    sonner.error('Failed to adjust stock');
  } finally {
    ctx.setIsUpdating(false);
    sonner.close();
  }
}
