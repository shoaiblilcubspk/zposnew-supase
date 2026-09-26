import { useCartStore } from '../../stores';
import { bundlesService } from './index';
import { sonner } from '../sonner';
import { CartItemTopping } from '../../types';

export interface AddBundleToCartArgs {
  bundle: any;
  appProducts: any[];
  appCart: any[];
  isReturnMode: boolean;
  currency: string;
  selectedItems?: { productId: string; quantity: number }[];
  toppingsMap?: Record<string, CartItemTopping[]>;
}

/**
 * SINGLE SOURCE OF TRUTH for adding a bundle/deal to the cart. Used by the POS grid
 * (tap-to-add / deal builder) AND the scan path (hardware + camera), so a scanned bundle
 * barcode reaches the exact same expansion + proportional-discount logic — no duplicate
 * implementation (§4).
 */
export function addBundleToCart({
  bundle,
  appProducts,
  appCart,
  isReturnMode,
  currency,
  selectedItems,
  toppingsMap,
}: AddBundleToCartArgs): boolean {
  try {
    if (!bundle) {
      sonner.error('Bundle data is missing');
      return false;
    }

    const effectiveBundle = selectedItems ? { ...bundle, items: selectedItems } : bundle;
    let variantToSet: string | undefined;
    const lowerName = String(bundle.name || '').toLowerCase();
    if (lowerName.includes(' - small')) {
      variantToSet = '6 Inch';
    } else if (lowerName.includes(' - medium')) {
      variantToSet = '10 Inch';
    } else if (lowerName.includes(' - large')) {
      variantToSet = '13 Inch';
    }

    const signaturePayload = {
      baseId: bundle.id,
      items: selectedItems?.map(i => `${i.productId}:${i.quantity}`).sort().join(',') || '',
      toppings: toppingsMap ? Object.entries(toppingsMap).map(([pid, tArr]) => `${pid}:${tArr.map(t => t.id).sort().join(',')}`).sort().join('|') : '',
    };
    const signatureString = JSON.stringify(signaturePayload);
    let hash = 0;
    for (let i = 0; i < signatureString.length; i++) {
      hash = ((hash << 5) - hash) + signatureString.charCodeAt(i);
      hash |= 0;
    }
    const bundleInstanceId = `${bundle.id}-${Math.abs(hash)}`;

    const cartItems = bundlesService.getBundleCartItems(effectiveBundle, appProducts).map((item, idx) => {
      const updatedItem: any = { ...item, bundleId: bundleInstanceId, bundle_id: bundleInstanceId };

      if (variantToSet) {
        updatedItem.selectedVariant = variantToSet;
      }

      if (toppingsMap && Object.keys(toppingsMap).length > 0 && toppingsMap[item.product.id] && toppingsMap[item.product.id].length > 0) {
        const toppingsArr = toppingsMap[item.product.id];
        updatedItem.displayToppings = toppingsArr;

        if (idx === 0) {
          const toppingsPrice = toppingsArr.reduce((sum, t) => sum + t.price, 0);
          updatedItem.toppings = toppingsArr;
          updatedItem.subtotal = updatedItem.subtotal + toppingsPrice * updatedItem.quantity;
        }
      }

      return updatedItem;
    });

    if (!cartItems || cartItems.length === 0) {
      sonner.error('No products available in this bundle deal');
      return false;
    }

    const itemsToDispatch = isReturnMode
      ? cartItems.map(item => ({
        ...item,
        quantity: -Math.abs(item.quantity),
        discount: -Math.abs(item.discount),
        subtotal: -Math.abs(item.subtotal),
      }))
      : cartItems;

    const existingInstance = appCart.filter(x => (x.bundleId || x.bundle_id) === bundleInstanceId);
    if (existingInstance.length > 0) {
      const mergedItems = itemsToDispatch.map(item => {
        const prev = existingInstance.find(x => x.product.id === item.product.id);
        if (!prev) return item;
        return {
          ...prev,
          quantity: prev.quantity + item.quantity,
          discount: prev.discount + item.discount,
          subtotal: prev.subtotal + item.subtotal,
        };
      });
      useCartStore.getState().setCart([...appCart.filter(x => (x.bundleId || x.bundle_id) !== bundleInstanceId), ...mergedItems]);
    } else {
      useCartStore.getState().mergeBundleCartItems(itemsToDispatch);
    }

    const discountText = bundle.discountType === 'percentage'
      ? `${bundle.discountValue}%`
      : `${currency}${bundle.discountValue}`;
    sonner.success(`🎁 ${bundle.name} added — ${discountText} discount applied!`);
    return true;
  } catch (err) {
    console.error('[Bundle] Add bundle error:', err);
    sonner.error('Could not add bundle — please try again');
    return false;
  }
}
