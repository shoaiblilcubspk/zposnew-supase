import { Gift, Package, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { Bundle } from '../../../types';

interface BundleCardMobileProps {
  bundle: Bundle;
  appSettings: any;
  isExpandedLocal: boolean;
  canManage: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  actionMenuOpen: boolean;
  menuUpward: boolean;
  onToggleMenu: (bundleId: string, e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  itemCount: number;
  discAmt: number;
  totalPrice: number;
  finalAmt: number;
  productImages: { bi: any; product: any }[];
}

export function BundleCardMobile({ bundle, appSettings, isExpandedLocal, canManage, onToggleExpand, onEdit, onToggleActive, onDelete, actionMenuOpen, menuUpward, onToggleMenu, onCloseMenu, itemCount, discAmt, totalPrice, finalAmt, productImages }: BundleCardMobileProps) {
  return (
    <div className="sm:hidden p-4 space-y-1.5">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-md border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center shrink-0 ${bundle.active ? 'bg-primary/10' : 'bg-neutral-100 dark:bg-white/5'}`}>
          <Gift className={`h-4 w-4 ${bundle.active ? 'text-primary' : 'text-neutral-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-neutral-900 dark:text-white uppercase text-[13px] line-clamp-1 leading-tight">{bundle.name}</p>
            {!bundle.active && <Badge tone="neutral" className="!bg-neutral-200 dark:!bg-white/10 !text-neutral-500 !px-1.5 !py-0.2 !rounded !text-[9px] shrink-0">{"Inactive"}</Badge>}
            {(bundle.name?.length < 3 || (bundle.discountType === 'percentage' && bundle.discountValue > 100) || discAmt >= totalPrice) && (
              <Badge tone="danger" variant="solid" className="!bg-rose-500 !px-1.5 !py-0.2 !rounded !text-[9px] shrink-0" title={"This bundle has invalid pricing — edit or delete it"}>{"Invalid"}</Badge>
            )}
          </div>
        </div>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            onClick={(e) => onToggleMenu(bundle.id, e)}
            className="!min-h-0 !p-1.5 !rounded !bg-transparent hover:!bg-neutral-100 dark:hover:!bg-white/5"
            icon={<MoreHorizontal className="h-4 w-4 text-neutral-500" />}
          />
          {actionMenuOpen && (
            <div className={`absolute right-0 ${menuUpward ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-lg z-[100] p-1 min-w-[150px]`} onClick={onCloseMenu}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { onToggleExpand(); onCloseMenu(); }}
                className="w-full !justify-start !min-h-0 !px-2.5 !py-1.5 !rounded !bg-transparent hover:!bg-neutral-100 dark:hover:!bg-white/5 !text-[12px] !font-medium !text-neutral-700 dark:!text-neutral-300"
              >
                {isExpandedLocal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {isExpandedLocal ? "Collapse" : "Expand"}
              </Button>
              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { onEdit(); onCloseMenu(); }}
                    className="w-full !justify-start !min-h-0 !px-2.5 !py-1.5 !rounded !bg-transparent hover:!bg-neutral-100 dark:hover:!bg-white/5 !text-[12px] !font-medium !text-neutral-700 dark:!text-neutral-300"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    {"Edit"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { onToggleActive(); onCloseMenu(); }}
                    className="w-full !justify-start !min-h-0 !px-2.5 !py-1.5 !rounded !bg-transparent hover:!bg-neutral-100 dark:hover:!bg-white/5 !text-[12px] !font-medium !text-neutral-700 dark:!text-neutral-300"
                  >
                    {bundle.active ? <ToggleLeft className="h-3.5 w-3.5 text-neutral-400" /> : <ToggleRight className="h-3.5 w-3.5 text-primary" />}
                    {bundle.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { onDelete(); onCloseMenu(); }}
                    className="w-full !justify-start !min-h-0 !px-2.5 !py-1.5 !rounded !bg-transparent hover:!bg-rose-50 dark:hover:!bg-rose-500/10 !text-[12px] !font-medium !text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {"Delete"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pl-[48px]">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[11px] text-neutral-500 whitespace-nowrap">
            {"{count} products".replace('{count}', String(itemCount))}
          </span>
          <span className="text-[11px] font-mono text-rose-500 whitespace-nowrap">
            {bundle.discountType === 'percentage' && discAmt > 0 ? `-${bundle.discountValue}%` : discAmt > 0 ? `-${formatCurrency(discAmt, appSettings.currency)}` : ''}
          </span>
          <span className="text-[11px] font-mono font-medium text-primary whitespace-nowrap">{formatCurrency(finalAmt, appSettings.currency)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {productImages.slice(0, 3).map(({ bi, product }, idx) => (
            <div
              key={bi.id || idx}
              className="h-7 w-7 rounded overflow-hidden bg-neutral-100 dark:bg-white/5 shrink-0 border border-neutral-200 dark:border-white/[0.08]"
              title={`${product.name} (x${bi.quantity})`}
            >
              {product.image ? (
                <img src={product.image} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/10">
                  <Package className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>
          ))}
          {productImages.length > 3 && (
            <div className="flex items-center justify-center h-7 w-7 rounded bg-primary/10 text-primary dark:text-emerald-400 text-[10px] font-mono border border-primary/20 shrink-0">
              +{productImages.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
