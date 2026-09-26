import { useAppStore } from '../../../stores';
import { bundlesService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import type { Bundle, Product } from '../../../types';
import type { BundleForm } from './formTypes';

interface SaveBundleArgs {
  form: BundleForm;
  editingBundle: Bundle | null;
  products: Product[];
  setSaving: (v: boolean) => void;
  onClose: () => void;
}

export async function saveBundle({ form, editingBundle, products, setSaving, onClose }: SaveBundleArgs): Promise<void> {
  if (!form.name || form.name.trim().length < 3) return sonner.error('Bundle name must be at least 3 characters');

  if (form.items.length < 1) return sonner.error('Bundle must contain at least 1 product');

  const bundleTotal = form.items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const discountAmount = form.discountType === 'percentage'
    ? (bundleTotal * form.discountValue) / 100
    : Math.min(form.discountValue, bundleTotal);

  if (form.discountType === 'percentage' && form.discountValue > 100) return sonner.error('Percentage discount cannot exceed 100%');
  if (bundleTotal > 0 && discountAmount >= bundleTotal) return sonner.error('Discount cannot equal or exceed the total price');
  setSaving(true);
  try {
    if (editingBundle) {
      await bundlesService.update(editingBundle.id, {
        name: form.name,
        description: form.description,
        image: form.image || undefined,
        barcode: form.barcode || undefined,
        discountValue: form.discountValue,
        discountType: form.discountType,
        overridePrice: form.overridePrice || undefined,
        hideItemPrices: form.hideItemPrices,
        items: form.items,
      });
      useAppStore.getState().updateBundle({
        ...editingBundle,
        name: form.name,
        description: form.description,
        image: form.image || undefined,
        barcode: form.barcode || editingBundle.barcode,
        discountValue: form.discountValue,
        discountType: form.discountType,
        overridePrice: form.overridePrice || undefined,
        hideItemPrices: form.hideItemPrices,
        items: form.items.map((i, idx) => ({
          id: `${editingBundle.id}-${idx}`,
          bundleId: editingBundle.id,
          productId: i.productId,
          quantity: i.quantity,
        })),
        updatedAt: new Date(),
      });
      sonner.success('Bundle updated successfully!');
    } else {
      const created = await bundlesService.create({
        name: form.name,
        description: form.description,
        image: form.image || undefined,
        barcode: form.barcode || undefined,
        discountValue: form.discountValue,
        discountType: form.discountType,
        overridePrice: form.overridePrice || undefined,
        hideItemPrices: form.hideItemPrices,
        items: form.items,
      });
      useAppStore.getState().addBundle(created);
      sonner.success('Bundle created successfully!');
    }
    onClose();
  } catch (err: any) {
    sonner.error(err.message || 'Error saving bundle');
  } finally {
    setSaving(false);
  }
}
