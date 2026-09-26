import { BundleCardDesktop } from './BundleCardDesktop';
import { BundleCardMobile } from './BundleCardMobile';
import { BundleCardExpanded } from './BundleCardExpanded';
import type { Bundle, Product } from '../../../types';

interface BundleCardProps {
  bundle: Bundle;
  products: Product[];
  appSettings: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canManage: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onPrintBarcode: () => void;
  actionMenuOpen: boolean;
  menuUpward: boolean;
  onToggleMenu: (bundleId: string, e: React.MouseEvent) => void;
  onCloseMenu: () => void;
}

export function BundleCard({
  bundle,
  products,
  appSettings,
  isExpanded,
  onToggleExpand,
  canManage,
  onEdit,
  onToggleActive,
  onDelete,
  onPrintBarcode,
  actionMenuOpen,
  menuUpward,
  onToggleMenu,
  onCloseMenu,
}: BundleCardProps) {
  const isExpandedLocal = isExpanded;
  let totalPrice = 0;
  let itemCount = 0;
  let productImages: { bi: any; product: any }[] = [];

  totalPrice = (bundle.items || []).reduce((sum, bi) => {
    const p = products.find(pr => pr.id === bi.productId);
    return sum + (p ? p.price * bi.quantity : 0);
  }, 0);
  itemCount = (bundle.items || []).reduce((s, bi) => s + (bi.quantity || 1), 0);
  productImages = (bundle.items || [])
    .map(bi => ({ bi, product: products.find(p => p.id === bi.productId) }))
    .filter((x): x is { bi: typeof bi; product: NonNullable<typeof x.product> } => !!x.product);

  const discAmt = bundle.discountType === 'percentage'
    ? (totalPrice * bundle.discountValue) / 100
    : Math.min(bundle.discountValue, totalPrice);
  const finalAmt = totalPrice - discAmt;

  return (
    <div
      key={bundle.id}
      className={`bg-white dark:bg-surface rounded-md border transition-colors ${bundle.active ? 'border-neutral-200 dark:border-white/[0.08]' : 'border-neutral-200/50 dark:border-white/[0.04] opacity-60'} overflow-visible shadow-none`}
    >
      <BundleCardDesktop
        bundle={bundle}
        appSettings={appSettings}
        isExpandedLocal={isExpandedLocal}
        canManage={canManage}
        onToggleExpand={onToggleExpand}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
        onPrintBarcode={onPrintBarcode}
        itemCount={itemCount}
        discAmt={discAmt}
        totalPrice={totalPrice}
        finalAmt={finalAmt}
      />

      <BundleCardMobile
        bundle={bundle}
        appSettings={appSettings}
        isExpandedLocal={isExpandedLocal}
        canManage={canManage}
        onToggleExpand={onToggleExpand}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
        onPrintBarcode={onPrintBarcode}
        actionMenuOpen={actionMenuOpen}
        menuUpward={menuUpward}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
        itemCount={itemCount}
        discAmt={discAmt}
        totalPrice={totalPrice}
        finalAmt={finalAmt}
        productImages={productImages}
      />

      {isExpandedLocal && (
        <BundleCardExpanded
          bundle={bundle}
          products={products}
          appSettings={appSettings}
          totalPrice={totalPrice}
          finalAmt={finalAmt}
        />
      )}
    </div>
  );
}
