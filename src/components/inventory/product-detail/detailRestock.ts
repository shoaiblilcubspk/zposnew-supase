import { formatCurrency } from '../../../lib/currencies';
import { commitStockInToInventory } from '../../../lib/stockInCommit';
import { sonner } from '../../../lib/sonner';
import { useProductsStore } from '../../../stores';
import { DetailCtx } from './detailContext';

export async function performQuickRestock(ctx: DetailCtx) {
  const qty = parseFloat(ctx.restockData.quantity);
  if (!qty || qty <= 0) return;
  const cost = parseFloat(ctx.restockData.cost) || ctx.product.cost || 0;
  const supplier = ctx.restockData.supplier.trim();

  if (!supplier) {
    sonner.error('Select a supplier to continue');
    return;
  }

  const result = await sonner.confirm(
    'Confirm Quick Restock?',
    'Add <strong>{qty} units</strong> of <strong>{name}</strong> to inventory counts for <strong>{total}</strong>.'
      .replace('{qty}', String(qty))
      .replace('{name}', ctx.product.name)
      .replace('{total}', formatCurrency(qty * cost, ctx.currency)),
    'Yes, Add Stock'
  );

  if (!result.isConfirmed) return;

  ctx.setIsUpdating(true);
  sonner.loading('Adding stock...');

  try {
    const updatedProd = await commitStockInToInventory({
      items: [{
        id: ctx.product.id,
        name: ctx.product.name,
        sku: ctx.product.sku || '',
        quantity: qty,
        costPrice: cost,
        supplier,
        type: 'Stock IN',
        notes: `Quick Restock | ${new Date().toLocaleDateString()}`
      }],
      recordAsSupplierBill: ctx.restockData.recordAsSupplierBill,
      suppliers: ctx.appSuppliers,
      profile: ctx.profile
    });

    if (updatedProd) {
      useProductsStore.getState().updateProduct(updatedProd);
      ctx.setFormData(prev => ({ ...prev, stock: String(updatedProd.stock) }));
    } else {
      const newStock = (ctx.product.stock || 0) + qty;
      ctx.setFormData(prev => ({ ...prev, stock: String(newStock) }));
    }

    sonner.success('Stock added successfully');
    ctx.setShowRestock(false);
    ctx.setRestockData({
      quantity: '1',
      supplier: ctx.product.supplier || '',
      cost: ctx.product.cost?.toString() || '',
      recordAsSupplierBill: false
    });
  } catch (error) {
    console.error('Quick restock failed:', error);
    sonner.error('Failed to add stock');
  } finally {
    ctx.setIsUpdating(false);
    sonner.close();
  }
}
