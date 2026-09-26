import { useCallback } from 'react';
import { useCartStore } from '../../../stores';
import { addBundleToCart } from '../../../lib/services/addBundleToCart';
import { CartItemTopping } from '../../../types';

interface BundleHandlerDeps {
  appCart: any[];
  appProducts: any[];
  isReturnMode: boolean;
  currency: string;
  setActiveGroup: (v: any) => void;
}

export function useBundleGridHandlers({ appCart, appProducts, isReturnMode, currency, setActiveGroup }: BundleHandlerDeps) {
  const handleBundleQuantity = useCallback((item: any, d: number) => {
    if (item.isGroup) {
      if (d > 0) handleAddBundle(item);
      return;
    }

    const bundleItemsInCart = appCart.filter((x: any) => {
      const bId = x.bundleId || x.bundle_id;
      return bId && bId.startsWith(item.id + '-');
    });
    if (bundleItemsInCart.length === 0) {
      if (d > 0) handleAddBundle(item);
      return;
    }

    let currentQty = 0;
    if (item.items && item.items.length > 0) {
      const firstBi = item.items[0];
      const cartItem = bundleItemsInCart.find(x => x.product.id === firstBi.productId);
      if (cartItem) {
        currentQty = Math.round(cartItem.quantity / firstBi.quantity);
      }
    } else {
      currentQty = bundleItemsInCart[0].quantity;
    }

    const newBundleQty = currentQty + d;

    if (newBundleQty <= 0) {
      const updatedCart = appCart.filter((x: any) => {
        const bId = x.bundleId || x.bundle_id;
        return !(bId && bId.startsWith(item.id + '-'));
      });
      useCartStore.getState().setCart(updatedCart);
      return;
    }

    if (currentQty === 0) currentQty = 1;

    const newCart = appCart.map(cartItem => {
      const bId = cartItem.bundleId || cartItem.bundle_id;
      if (bId && bId.startsWith(item.id + '-')) {
        const itemBaseQty = cartItem.quantity / currentQty;
        const qty = isReturnMode ? -Math.abs(itemBaseQty * newBundleQty) : itemBaseQty * newBundleQty;

        const itemBaseDiscount = (cartItem.discount || 0) / currentQty;
        const discount = isReturnMode ? -Math.abs(itemBaseDiscount * newBundleQty) : itemBaseDiscount * newBundleQty;

        const toppingsTotal = (cartItem.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
        return {
          ...cartItem,
          quantity: qty,
          discount: discount,
          subtotal: ((cartItem.price ?? cartItem.product.price) + toppingsTotal) * qty - discount
        };
      }
      return cartItem;
    });

    useCartStore.getState().setCart(newCart);
  }, [appCart, appProducts, isReturnMode,]);

  const processBundleAdd = (bundle: any, selectedItems?: { productId: string; quantity: number }[], toppingsMap?: Record<string, CartItemTopping[]>) => {
    addBundleToCart({ bundle, appProducts, appCart, isReturnMode, currency, selectedItems, toppingsMap });
  };

  const handleAddBundle = (bundleOrGroup: any) => {
    if (bundleOrGroup.isGroup) {
      setActiveGroup(bundleOrGroup);
    } else {
      processBundleAdd(bundleOrGroup);
    }
  };

  return { handleBundleQuantity, processBundleAdd, handleAddBundle };
}
