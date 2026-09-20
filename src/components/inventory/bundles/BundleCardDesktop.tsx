import { Gift, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Edit, Trash2 } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { Bundle } from '../../../types';

interface BundleCardDesktopProps {
  bundle: Bundle;
  appSettings: any;
  isExpandedLocal: boolean;
  canManage: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  itemCount: number;
  discAmt: number;
  totalPrice: number;
  finalAmt: number;
}

export function BundleCardDesktop({ bundle, appSettings, isExpandedLocal, canManage, onToggleExpand, onEdit, onToggleActive, onDelete, itemCount, discAmt, totalPrice, finalAmt }: BundleCardDesktopProps) {
  return (
    <div className="hidden sm:flex items-center gap-3 p-3">
      <div className="h-8 w-8 rounded flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08]">
        <Gift className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-900 dark:text-white text-[13px] truncate tracking-[-0.01em]">{bundle.name}</p>
          {!bundle.active && <Badge tone="neutral" size="sm">{"Inactive"}</Badge>}
          {(bundle.name?.length < 3 || (bundle.discountType === 'percentage' && bundle.discountValue > 100) || discAmt >= totalPrice) && (
            <Badge tone="danger" size="sm" title={"This bundle has invalid pricing — edit or delete it"}>{"Invalid"}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 font-mono text-[11px]">
          <span className="text-neutral-500">
            {"{count} products".replace('{count}', String(itemCount))}
          </span>
          {discAmt > 0 && (
            <span className="text-rose-500 font-semibold tabular-nums">
              {bundle.discountType === 'percentage' ? `-${bundle.discountValue}%` : `-${formatCurrency(discAmt, appSettings.currency)}`}
            </span>
          )}
          <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(finalAmt, appSettings.currency)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          icon={isExpandedLocal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        />
        {canManage && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleActive}
              className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              title={bundle.active ? "Disable" : "Enable"}
              icon={bundle.active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-neutral-400" />}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              icon={<Edit className="h-3.5 w-3.5" />}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-rose-600"
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </>
        )}
      </div>
    </div>
  );
}
