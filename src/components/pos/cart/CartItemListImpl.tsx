import { useCartStore, useAppStore, useProductsStore, useSettingsStore } from '../../../stores';
import { useAuth } from '../../../context/AuthContext';
import { sonner } from '../../../lib/sonner';
import { Bundle } from '../../../types';
import { computeLineDiscount } from '../../../lib/lineDiscount';
import { CartItemListBody } from './CartItemListBody';

interface CartItemListProps {
  activePromotions: { discountName: string; discountAmount: number }[];
}

export function CartItemList({ activePromotions }: CartItemListProps) {
  const appSettings = useSettingsStore(s => s.settings);
  const appCart = useCartStore(s => s.cart);
  const appBundles = useAppStore(s => s.bundles);
  const appProducts = useProductsStore(s => s.products);
  const { profile } = useAuth();

  const showDiscount = appSettings.receiptShowDiscount !== false &&
    !appCart.some(item => item.bundleHideItemPrices === true || item.bundle_hide_item_prices === true);

  const updateQuantity = (index: number, newQuantity: number) => {
    const item = appCart[index];
    const price = item.product.price;
    const toppingsTotal = (item.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
    const effectivePrice = price + toppingsTotal;

    const { discount, subtotal } = computeLineDiscount(
      effectivePrice,
      newQuantity,
      item.discountValue || 0,
      item.discountType || 'percentage'
    );

    useCartStore.getState().updateCartItem({
        index,
        item: {
          ...item,
          quantity: newQuantity,
          discount,
          subtotal,
        },
      },);
  };

  const updateBundleQuantity = async (bundleId: string, newBundleQty: number) => {
    const bundleItemsInCart = appCart.filter(i => (i.bundleId || i.bundle_id) === bundleId);

    if (bundleItemsInCart.length === 0) return;

    if (newBundleQty === 0) {
      useCartStore.getState().setCart(appCart.filter(item => (item.bundleId || item.bundle_id) !== bundleId));
      return;
    }

    // IMEI/Serial check: Prevent increasing quantity of deals with serialized items
    const oldBundleQtyInCart = bundleItemsInCart[0]?.quantity || 1;
    if (newBundleQty > oldBundleQtyInCart) {
      const hasSerializedItem = bundleItemsInCart.some((item: any) => item.product?.requireSerial || item.serialNumber);
      if (hasSerializedItem) {
        sonner.error('Cannot Increase Quantity', 'This deal contains a serialized/IMEI item. You must add the deal again separately to assign a unique serial number.');
        return;
      }
    }

    // Extract the original bundle definition UUID (removes the hash suffix)
    const originalBundleDefId = bundleId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0] || bundleId;

    let bundleDef = appBundles?.find(b => b.id === originalBundleDefId);
    if (!bundleDef) {
      const { bundlesService } = await import('../../../lib/services');
      const all = await bundlesService.getAll().catch(() => [] as Bundle[]);
      bundleDef = all.find((b) => b.id === originalBundleDefId);
    }
    if (!bundleDef) {
      console.warn(`[Cart] Cannot update bundle ${originalBundleDefId}: definition not found in state or localDb.`);
      sonner.error('Bundle definition not found. Try refreshing.');
      return;
    }

    let oldBundleQty = 1;
    if (bundleDef && bundleDef.items && bundleDef.items.length > 0) {
      const firstBi = bundleDef.items[0];
      const cartItem = bundleItemsInCart.find(x => x.product.id === firstBi.productId);
      if (cartItem) {
        oldBundleQty = Math.round(cartItem.quantity / firstBi.quantity);
      }
    } else {
      oldBundleQty = bundleItemsInCart[0].quantity;
    }
    if (oldBundleQty === 0) oldBundleQty = 1; // Fallback to avoid division by zero

    const newCart = appCart.map(item => {
      if ((item.bundleId || item.bundle_id) === bundleId) {
        const itemBaseQty = item.quantity / oldBundleQty;
        const qty = itemBaseQty * newBundleQty;

        const itemBaseDiscount = (item.discount || 0) / oldBundleQty;
        const discount = itemBaseDiscount * newBundleQty;

        const toppingsTotal = (item.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
        return {
          ...item,
          quantity: qty,
          discount: discount,
          subtotal: (item.product.price + toppingsTotal) * qty - discount
        };
      }
      return item;
    });

    useCartStore.getState().setCart(newCart);
  };

  const removeFromCart = (index: number) => useCartStore.getState().removeFromCart(index);

  const applyDiscount = (index: number, discount: number, discountType: 'percentage' | 'fixed') => {
    const item = appCart[index];
    const price = item.product.price;
    const toppingsTotal = (item.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
    const effectivePrice = price + toppingsTotal;
    const { discount: discountAmount, subtotal } = computeLineDiscount(
      effectivePrice,
      item.quantity,
      discount,
      discountType
    );
    useCartStore.getState().updateCartItem({
        index,
        item: {
          ...item,
          discount: discountAmount,
          discountValue: discount,
          discountType,
          subtotal,
        },
      },);
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
    >
      <CartItemListBody
        cartItems={appCart}
        appBundles={appBundles}
        appProducts={appProducts}
        profile={profile}
        currency={appSettings.currency}
        showDiscount={showDiscount}
        activePromotions={activePromotions}
        onUpdateQuantity={updateQuantity}
        onUpdateBundleQuantity={updateBundleQuantity}
        onRemove={removeFromCart}
        onApplyDiscount={applyDiscount}
      />
    </div>
  );
}
