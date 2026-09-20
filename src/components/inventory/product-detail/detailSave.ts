import { productsService, generateId, productToppingsService, applyVariantStockMovement } from '../../../lib/services';
import { localDb } from '../../../lib/localDb';
import { sonner } from '../../../lib/sonner';
import { useProductsStore } from '../../../stores';
import { DetailCtx } from './detailContext';

export async function performSave(ctx: DetailCtx) {
  const confirmMsg = ctx.showStockIn
    ? 'You have a pending Stock Entry open. Proceeding will save product details, but you should finish the Stock Entry separately to update inventory counts. Save changes anyway?'
    : 'Commit all modifications for this product to the database?';

  const result = await sonner.confirm(
    'Confirm Changes',
    confirmMsg,
    'Yes, Confirm'
  );

  if (!result.isConfirmed) return;

  ctx.setIsUpdating(true);
  sonner.loading('Syncing changes...');

  try {
    const isInfinity = ctx.formData.trackInventory === false;
    const wasInfinity = ctx.product.trackInventory === false || (ctx.product.stock || 0) >= 990000;

    const now = new Date();
    const newCost = parseFloat(ctx.formData.cost) || 0;
    const newPrice = parseFloat(ctx.formData.price) || 0;

    const updatedProduct = {
      ...ctx.product,
      ...ctx.formData,
      price: newPrice,
      cost: newCost,
      minStock: parseInt(ctx.formData.minStock) || 0,
      targetStock: ctx.formData.targetStock ? parseInt(ctx.formData.targetStock) : null,
      stock: isInfinity ? 0 : (parseFloat(ctx.formData.stock) || 0),
      trackInventory: ctx.formData.trackInventory,
      variants: ctx.variants.map((v: any) => ({ name: v.name, options: v.options })),
      variantData: ctx.variantData,
      modifiers: (ctx as any).modifiers,
      productAddons: (ctx as any).productAddons,
      isService: ctx.formData.isService,
      requireSerial: ctx.formData.requireSerial,
      productType: ctx.formData.productType,
      updatedAt: now,
    };

    if (!isInfinity && wasInfinity) {
      const histId = generateId();
      const histEntry = {
        id: histId,
        productId: ctx.product.id,
        changeQty: updatedProduct.stock,
        type: 'stock_in' as const,
        referenceId: 'INITIAL_STOCK',
        note: 'Inventory Tracking Enabled (Initial Balance)',
        balanceAfter: updatedProduct.stock,
        cashierName: ctx.profile?.email || 'System',
        createdAt: now
      };
      await localDb.stockHistory.add(histEntry);
    } else if (!isInfinity && !wasInfinity) {
      const oldStock = ctx.product.stock || 0;
      const newStockVal = updatedProduct.stock || 0;
      if (oldStock !== newStockVal) {
        const diffStock = newStockVal - oldStock;
        const adjHistId = generateId();
        const adjHistEntry = {
          id: adjHistId,
          productId: ctx.product.id,
          changeQty: diffStock,
          type: 'adjustment' as const,
          referenceId: 'MANUAL_EDIT',
          note: `Direct Stock Edit via Form (${oldStock} → ${newStockVal})`,
          balanceAfter: newStockVal,
          cashierName: ctx.profile?.email || 'System',
          createdAt: now
        };
        await localDb.stockHistory.add(adjHistEntry);
      }

      const savedVariantData = ctx.variantData || [];
      for (const vd of savedVariantData) {
        if (!vd.id) continue;
        const oldVd = (ctx.product.variantData || []).find((v: any) => v.id === vd.id);
        const oldVariantStock = oldVd?.stock ?? 0;
        const newVariantStock = vd.stock ?? 0;
        if (oldVariantStock !== newVariantStock) {
          await applyVariantStockMovement({
            product: ctx.product,
            variantId: vd.id,
            variantLabel: `${vd.option1 || ''}${vd.option2 ? ` / ${vd.option2}` : ''}`,
            changeQty: newVariantStock - oldVariantStock,
            type: 'adjustment',
            referenceId: 'MANUAL_EDIT',
            note: `Direct Variant Stock Edit (${oldVariantStock} → ${newVariantStock})`,
            cashierName: ctx.profile?.email || 'System',
            createdAt: now
          });
        }
      }
    }

    const _saved = await productsService.update(ctx.product.id, updatedProduct);
    await productToppingsService.setByProduct(ctx.product.id, (ctx as any).toppingIds || []);
    useProductsStore.getState().updateProduct(updatedProduct);
    sonner.success('Product updated successfully');
    ctx.setIsEditMode(false);
  } catch (_error) {
    sonner.error('Failed to update product');
  } finally {
    ctx.setIsUpdating(false);
    sonner.close();
  }
}
