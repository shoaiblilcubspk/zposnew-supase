import React from 'react';
import { Gift, Package, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../lib/currencies';
import { sonner } from '../../lib/sonner';
import { ProductThumb } from '../../shared/ui/ProductThumb';

interface Props {
  items: any[];
  appBundles: any[];
  appProducts: any[];
  appSettings: any;
  showDiscount: boolean;
  isAdmin: boolean;
  profile: any;
  transactionId: string;
  onNavigateToProduct: (productId: string, fromSale: string) => void;
}

export function TransactionItemsTable({
  items, appBundles, appProducts, appSettings, showDiscount,
  isAdmin: _isAdmin, profile: _profile, transactionId, onNavigateToProduct
}: Props) {
  const groupItems = (items: any[]) => {
    const bundlesMap = new Map<string, any>();
    const standaloneItems: any[] = [];

    items.forEach(item => {
      const bundleId = item.bundleId || item.bundle_id;
      const bundleName = item.bundleName || item.bundle_name;

      if (bundleId) {
        if (!bundlesMap.has(bundleId)) {
          bundlesMap.set(bundleId, {
            bundleId,
            bundleName,
            items: [],
            totalOriginal: 0,
            totalDiscount: 0,
            totalSubtotal: 0
          });
        }
        const b = bundlesMap.get(bundleId)!;
        b.items.push(item);
        const itemPrice = item.product?.price || ((item.subtotal + item.discount) / (item.quantity || 1));
        const original = itemPrice * item.quantity;
        b.totalOriginal += original;
        b.totalDiscount += (item.discount || 0);
        b.totalSubtotal += (item.subtotal || 0);
      } else {
        standaloneItems.push(item);
      }
    });

    const bundles = Array.from(bundlesMap.values()).map(b => {
      let bundleQty = 1;
      const firstCartItem = b.items[0];
      if (firstCartItem) {
        const bundleIdFull = firstCartItem.bundleId || firstCartItem.bundle_id;
        const originalBundleDefId = bundleIdFull?.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0] || bundleIdFull;
        const bundleDef = appBundles?.find(bd => bd.id === originalBundleDefId);
        
        if (bundleDef && bundleDef.items && bundleDef.items.length > 0) {
          const firstBi = bundleDef.items[0];
          const cItem = b.items.find((x: any) => x.product.id === firstBi.productId);
          if (cItem) {
            bundleQty = Math.round(cItem.quantity / firstBi.quantity);
          }
        } else if (firstCartItem.quantity > 0) {
          bundleQty = firstCartItem.quantity;
        }
      }
      
      if (bundleQty === 0) bundleQty = 1;
      
      return {
        ...b,
        bundleQty
      };
    });

    return { bundles, standaloneItems };
  };

  const { bundles, standaloneItems } = groupItems(items);
  const rows: React.ReactNode[] = [];

  if (bundles.length > 0) {
    rows.push(
      <tr key="section-bundles" className="bg-neutral-50/50 dark:bg-white/[0.01]">
        <td colSpan={3} className="px-3 py-1.5 border-b border-neutral-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-1.5">
            <Gift className="h-3 w-3 text-neutral-400 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              {"Bundle / Deal Items"} ({bundles.length})
            </span>
          </div>
        </td>
      </tr>
    );
  }

  const getItemImage = (item: any) => {
    if (!item) return null;
    return item.product?.image || item.product?.imageUrl || item.image || item.product_image || appProducts?.find(p => p.id === (item.product?.id || item.productId))?.image || null;
  };

  bundles.forEach((b, bIdx) => {
    const hideItemPrices = b.items.some((item: any) => item.bundleHideItemPrices === true || item.bundle_hide_item_prices === true);
    const bundleImage = getItemImage(b.items[0]);
    const discountStr = showDiscount && b.totalDiscount > 0 ? `-${formatCurrency(b.totalDiscount, appSettings.currency)}` : undefined;
    const bundleQty = b.bundleQty;

    rows.push(
      <tr key={`bundle-${b.bundleId}`} className="bg-neutral-50/[0.2] dark:bg-white/[0.01] border-t border-neutral-200 dark:border-white/[0.08]">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded overflow-hidden bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] shrink-0 flex items-center justify-center">
              {bundleImage ? (
                <ProductThumb image={bundleImage} alt={b.bundleName} imgClassName="w-full h-full object-cover" fallback={<Package className="h-3 w-3 text-neutral-400" />} />
              ) : (
                <Package className="h-3 w-3 text-neutral-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-medium text-neutral-900 dark:text-white truncate">{bIdx + 1}. {bundleQty > 1 ? `${bundleQty}x ${b.bundleName}` : b.bundleName}</span>
              {b.items[0]?.toppings && b.items[0].toppings.length > 0 && (
                <span className="text-[11px] text-neutral-500 leading-tight mt-0.5 truncate">
                  + {b.items[0].toppings.map((t: any) => `${bundleQty > 1 ? bundleQty + 'x ' : ''}${t.name} (${formatCurrency(t.price * bundleQty, appSettings.currency)})`).join(', ')}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 text-right text-[12px] font-mono tabular-nums text-neutral-500">{bundleQty}</td>
        <td className="px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1 font-mono tabular-nums">
            <span className="text-[12px] font-semibold text-neutral-900 dark:text-white">{formatCurrency(b.totalSubtotal, appSettings.currency)}</span>
            {discountStr && <span className="text-[10px] text-rose-500">{discountStr}</span>}
          </div>
        </td>
      </tr>
    );

    b.items.forEach((item: any, itemIdx: number) => {
      rows.push(
        <tr
          key={`bundle-${b.bundleId}-item-${itemIdx}`}
          onClick={() => {
            if (item.product?.id) {
              const exists = appProducts.some(p => p.id === item.product?.id);
              if (exists) {
                onNavigateToProduct(item.product.id, transactionId);
              } else {
                sonner.error("Product Deleted", "This product no longer exists in your inventory.");
              }
            }
          }}
          className={`${item.product?.id ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors group' : ''} border-t border-neutral-100 dark:border-white/[0.04]`}
        >
          <td className={`pl-10 pr-3 py-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 ${item.product?.id ? 'group-hover:text-neutral-900 dark:group-hover:text-white' : ''}`}>
            <span className="font-medium">- {bundleQty > 0 ? Math.round(item.quantity / bundleQty) : item.quantity}x {item.product?.name || 'Item'}</span>
            {item.selectedVariant && <span className="text-neutral-400 font-normal"> ({item.selectedVariant})</span>}
            {item.selectedModifiers && item.selectedModifiers.length > 0 && <span className="text-neutral-500 ml-1 font-normal">+ {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
            {item.addonItems && item.addonItems.length > 0 && <span className="text-neutral-500 ml-1 font-normal">+ Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
            {item.displayToppings && item.displayToppings.length > 0 && <span className="text-neutral-400 ml-1 font-normal">+ {item.displayToppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}</span>}
            {item.refundedQuantity > 0 && (
              <div className="text-[10px] font-mono text-rose-500 mt-0.5">
                {item.refundedQuantity} {"Returned"}
              </div>
            )}
          </td>
          <td className="px-3 py-1.5 text-right text-[11px] font-mono text-neutral-400">
          </td>
          <td className="px-3 py-1.5 text-right text-[11px] font-mono tabular-nums text-neutral-500">
            {!hideItemPrices && formatCurrency(item.product?.price * item.quantity, appSettings.currency)}
          </td>
        </tr>
      );
    });
  });

  if (bundles.length > 0 && standaloneItems.length > 0) {
    rows.push(
      <tr key="section-standalone" className="bg-neutral-50/50 dark:bg-white/[0.01]">
        <td colSpan={3} className="px-3 py-1.5 border-t border-b border-neutral-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-3 w-3 text-neutral-400 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              {"Other / Standalone Items"} ({standaloneItems.length})
            </span>
          </div>
        </td>
      </tr>
    );
  }

  standaloneItems.forEach((item, index) => {
    rows.push(
      <tr
        key={`standalone-${index}`}
        onClick={() => {
          if (item.product?.id) {
            const exists = appProducts.some(p => p.id === item.product?.id);
            if (exists) {
              onNavigateToProduct(item.product.id, transactionId);
            } else {
              sonner.error("Product Deleted", "This product no longer exists in your inventory.");
            }
          }
        }}
        className={item.product?.id ? "cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors group" : ""}
      >
        <td className={`px-3 py-2.5 text-[12px] font-medium text-neutral-900 dark:text-white transition-colors ${item.product?.id ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded overflow-hidden bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] shrink-0 flex items-center justify-center">
              {getItemImage(item) ? (
                <ProductThumb image={getItemImage(item)!} alt={item.product?.name || item.name || ''} imgClassName="w-full h-full object-cover" fallback={<Package className="h-3 w-3 text-neutral-400" />} />
              ) : (
                <Package className="h-3 w-3 text-neutral-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="truncate block font-semibold text-[13px] text-neutral-900 dark:text-white">
                {index + 1}. {item.product?.name || item.name || item.productName || "Item"}
              </span>
              {(item.selectedVariant || (item.selectedModifiers && item.selectedModifiers.length > 0) || item.serialNumber || (item.toppings && item.toppings.length > 0) || (item.displayToppings && item.displayToppings.length > 0)) && (
                <div className="flex flex-col gap-0.5 mt-0.5 text-[12px] text-neutral-600 dark:text-neutral-300">
                  {item.selectedVariant && <span>Variant: {item.selectedVariant}</span>}
                  {item.selectedModifiers && item.selectedModifiers.length > 0 && <span>+ {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
                  {item.addonItems && item.addonItems.length > 0 && <span>+ Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
                  {item.toppings && item.toppings.length > 0 && <span>+ {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), appSettings.currency)})`).join(', ')}</span>}
                  {item.displayToppings && item.displayToppings.length > 0 && <span>+ {item.displayToppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}</span>}
                  {item.serialNumber && <span className="text-amber-500 font-mono">SN: {item.serialNumber}</span>}
                </div>
              )}
              {showDiscount && item.discount > 0 && (
                <div className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-500 mt-1 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-500/20">
                  <Gift className="w-2.5 h-2.5" />
                  <span>Discount {item.discountType === 'percentage' && item.discountValue ? `(${item.discountValue}%)` : ''} -{formatCurrency(item.discount, appSettings.currency)}</span>
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-right text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap font-mono tabular-nums">
          <div>{item.quantity}</div>
          {item.refundedQuantity > 0 && (
            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tight mt-0.5 leading-none">
              {item.refundedQuantity} {"Returned"}
            </div>
          )}
        </td>
        <td className="px-3 py-3 text-right text-[13px] font-bold text-neutral-900 dark:text-white whitespace-nowrap font-mono tabular-nums">
          {formatCurrency(item.subtotal || item.totalPrice || ((item.product?.price || 0) * item.quantity), appSettings.currency)}
        </td>
      </tr>
    );
  });

  return (
    <div className="border border-neutral-200 dark:border-white/[0.08] rounded-md overflow-x-auto custom-scrollbar bg-white dark:bg-surface">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/[0.08]">
        <thead className="bg-neutral-100/80 dark:bg-white/[0.04]">
          <tr>
            <th className="px-3 py-2 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-left whitespace-nowrap">{"Item"}</th>
            <th className="px-3 py-2 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-right whitespace-nowrap">{"Qty"}</th>
            <th className="px-3 py-2 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-right whitespace-nowrap">{"Total"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
          {rows}
        </tbody>
      </table>
    </div>
  );
}
