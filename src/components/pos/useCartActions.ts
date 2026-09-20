import { useCartStore, useProductsStore, useSettingsStore, useSalesStore } from '../../stores';
import { Product, ProductModifier, CartAddonItem, CartItemTopping, Sale } from '../../types';
import { sonner } from '../../lib/sonner';
import { salesService } from '../../lib/services';
import { useAuth } from '../../context/AuthContext';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useCartCalculations } from '../../hooks/useCartCalculations';
import { getExpiryStatus } from '../../utils/expiryUtils';

export function useCartActions() {
  const appCart = useCartStore(s => s.cart);
  const appProducts = useProductsStore(s => s.products);
  const appSettings = useSettingsStore(s => s.settings);
  const appSelectedCustomer = useCartStore(s => s.selectedCustomer);
  const appActiveSalesTab = useCartStore(s => s.activeSalesTab);
  const { user } = useAuth();
  const { play } = useSoundFeedback();
  const { total: cartTotal } = useCartCalculations();

  const addToCart = (
    product: Product,
    weight?: number,
    isReturnMode: boolean = false,
    options?: {
      selectedVariant?: string;
      selectedVariantId?: string;
      selectedVariantLabel?: string;
      selectedModifiers?: ProductModifier[];
      addonItems?: CartAddonItem[];
      serialNumber?: string;
      toppings?: CartItemTopping[];
      overrideProduct?: Product;
    },
    setOptionsProduct?: (p: Product | null) => void,
    setPendingWeight?: (w: number | undefined) => void
  ) => {
    if (options?.overrideProduct) {
      product = options.overrideProduct;
    }

    if (!options && (
      product.productType === 'variable' ||
      (product.variants && product.variants.length > 0) ||
      (product.productAddons && product.productAddons.length > 0) ||
      product.requireSerial
    )) {
      if (setPendingWeight) setPendingWeight(weight);
      if (setOptionsProduct) setOptionsProduct(product);
      return;
    }

    const existingItemIndex = appCart.findIndex(item =>
      item.product.id === product.id &&
      !item.bundleId && !item.bundle_id &&
      (product.isWeightBased ? false : true) &&
      (!options?.selectedVariant || item.selectedVariant === options.selectedVariant) &&
      (!options?.serialNumber || item.serialNumber === options.serialNumber)
    );

    const shouldAddNewLine = product.isWeightBased || product.requireSerial || (options?.addonItems && options.addonItems.length > 0) || (options?.selectedModifiers && options.selectedModifiers.length > 0);
    const quantityModifier = isReturnMode ? -1 : 1;
    let newQuantity = quantityModifier;

    if (existingItemIndex >= 0 && !shouldAddNewLine) {
      newQuantity = appCart[existingItemIndex].quantity + quantityModifier;
    } else {
      newQuantity = product.isWeightBased ? (isReturnMode ? -1 : 1) : quantityModifier;
    }

    if (product.trackInventory && !isReturnMode) {
      if (product.stock <= 0) {
        if (!appSettings.allowNegativeStock) {
          sonner.error(`Out of stock! ${product.name} has 0 in stock — cannot add.`);
          return;
        }
        sonner.warning(`Out of stock! Added ${product.name}, but verify stock.`);
      } else if (newQuantity > product.stock) {
        if (!appSettings.allowNegativeStock) {
          sonner.error(`Stock limit exceeded for ${product.name} — only ${product.stock} in stock. Cannot add ${newQuantity}.`);
          return;
        }
        sonner.warning(`Stock limit exceeded for ${product.name} — only ${product.stock} in stock`);
      }
    }

    if (product.expiryDate && !isReturnMode) {
      const exp = getExpiryStatus(product.expiryDate, product.expiryAlertDays);
      if (exp.status === 'expired') {
        sonner.error(`Expired Item Alert: ${product.name} expired on ${product.expiryDate}!`);
      } else if (exp.status === 'expiring_soon') {
        sonner.warning(`Expiring Soon: ${product.name} expires in ${exp.daysRemaining} days (${product.expiryDate}).`);
      }
    }

    if (existingItemIndex >= 0 && !shouldAddNewLine) {
      const existingItem = appCart[existingItemIndex];
      const effectivePrice = existingItem.product.price;
      const toppingsTotal = (existingItem.toppings || []).reduce((sum: number, t: any) => sum + t.price, 0);
      const priceWithToppings = effectivePrice + toppingsTotal;
      let updatedDiscount = existingItem.discount || 0;
      
      if (existingItem.discountValue && existingItem.discountValue > 0) {
        if (existingItem.discountType === 'percentage') {
          updatedDiscount = (priceWithToppings * newQuantity * existingItem.discountValue) / 100;
        } else {
          updatedDiscount = Math.sign(newQuantity) * existingItem.discountValue;
        }
      }
      if (newQuantity === 0) {
        updatedDiscount = 0;
      }
      const updatedItem = {
        ...existingItem,
        quantity: newQuantity,
        discount: updatedDiscount,
        subtotal: priceWithToppings * newQuantity - updatedDiscount
      };
      useCartStore.getState().updateCartItem({ index: existingItemIndex, item: updatedItem });
    } else {
      const itemWeight = weight ? (isReturnMode ? -weight : weight) : undefined;
      let basePrice = product.price;
      let baseCost = product.cost;
      
      if (options?.selectedVariant && product.variantData && product.variantData.length > 0) {
        const selectedParts = options.selectedVariant.split(',').map(s => s.trim());
        const matchingVariant = product.variantData.find(vd => {
          let match = true;
          if (vd.option1 && !selectedParts.includes(vd.option1)) match = false;
          if (vd.option2 && !selectedParts.includes(vd.option2)) match = false;
          return match;
        });

        if (matchingVariant && matchingVariant.priceOverride !== undefined) {
          basePrice = matchingVariant.priceOverride;
        }
        if (matchingVariant && matchingVariant.cost !== undefined) {
          baseCost = matchingVariant.cost;
        }
      }

      if (options?.selectedModifiers) {
        options.selectedModifiers.forEach(m => basePrice += m.price);
      }
      
      if (options?.addonItems) {
        options.addonItems.forEach(item => {
          basePrice += item.subtotal;
          const addonProd = appProducts.find(p => p.id === item.addon.addonProductId);
          if (addonProd) {
            baseCost += (addonProd.cost || 0) * item.quantity;
          }
        });
      }

      const toppingsPrice = options?.toppings ? options.toppings.reduce((sum, t) => sum + t.price, 0) : 0;
      const price = product.isWeightBased ? (product.pricePerUnit || 0) * (weight || 1) : basePrice + toppingsPrice;

      const newItem = {
        product: (basePrice !== product.price || baseCost !== product.cost) 
                 ? { ...product, price: basePrice, cost: baseCost } 
                 : product,
        quantity: newQuantity,
        weight: itemWeight,
        discount: 0,
        discountType: 'percentage' as const,
        subtotal: product.isWeightBased ? price * Math.sign(newQuantity) : price * newQuantity,
        originalPrice: basePrice,
        selectedVariant: options?.selectedVariant,
        selectedVariantId: options?.selectedVariantId,
        selectedVariantLabel: options?.selectedVariantLabel,
        selectedModifiers: options?.selectedModifiers,
        addonItems: options?.addonItems,
        serialNumber: options?.serialNumber,
        toppings: options?.toppings
      };

      useCartStore.getState().addToCart(newItem);
    }
    play('addItem');
  };

  const saveDraft = async () => {
    if (appCart.length === 0) return;

    try {
      const draftSale: Omit<Sale, 'id'> = {
        invoiceNumber: `DRAFT-${Date.now().toString().slice(-6)}`,
        customerId: appSelectedCustomer?.id,
        customerName: appSelectedCustomer?.name,
        items: appCart,
        subtotal: cartTotal,
        discountAmount: 0,
        taxAmount: 0,
        total: cartTotal,
        paymentMethod: 'cash',
        status: 'pending',
        cashier: user?.user_metadata?.full_name || user?.email || 'Unknown',
        cashierRole: (user?.user_metadata?.role as string) || 'cashier',
        timestamp: new Date(),
        receiptNumber: `DRAFT-${Date.now().toString().slice(-6)}`,
        notes: 'DRAFT_SALE - payment pending',
      };

      const savedDraft = await salesService.create(draftSale);
      if ((savedDraft as any).wasOversold) {
        sonner.warning(
          'Stock Oversold',
          'Some items were sold beyond available stock. Inventory may show negative quantities.'
        );
      }
      useSalesStore.getState().addSale(savedDraft);
      useCartStore.getState().clearCart();

      if (appActiveSalesTab) {
        useCartStore.getState().updateSalesTab({
          id: appActiveSalesTab,
          updates: { cart: [], selectedCustomer: null }
        });
      }

      sonner.success('Draft sale saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      sonner.error('Failed to save draft. Please try again.');
    }
  };

  const loadDraft = async (draft: Sale) => {
    useCartStore.getState().clearCart();

    if (draft.customerId || draft.customerName) {
      useCartStore.getState().setSelectedCustomer({
        id: draft.customerId || '',
        name: draft.customerName || '',
        email: '',
        phone: '',
        address: '',
        priceTier: 'retail',
        totalPurchases: 0,
        createdAt: new Date()
      });
    }

    draft.items.forEach((item: any) => {
      useCartStore.getState().addToCart(item);
    });

    try {
      if (draft.id) {
        await salesService.delete(draft.id);
        useSalesStore.getState().deleteSale(draft.id);
      }
    } catch (error) {
      console.error('Error auto-deleting loaded draft:', error);
    }
  };

  return {
    addToCart,
    saveDraft,
    loadDraft,
    cartTotal,
  };
}
