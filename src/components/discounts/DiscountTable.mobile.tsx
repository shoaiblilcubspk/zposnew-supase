import React from 'react';
import { Edit, Trash2, Gift, Percent } from 'lucide-react';
import { Discount } from '../../types';
import { Badge, Button, EmptyState } from '../../shared/ui';
import { formatAppDate } from '../../lib/dateUtils';

interface DiscountTableMobileProps {
  discounts: Discount[];
  currency: string;
  country?: string;
  canManageDiscounts: boolean;
  onEdit: (discount: Discount) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (discount: Discount) => void;
  getDiscountTypeTone: (type: string) => string;
}

export function DiscountTableMobile({
  discounts,
  currency,
  country,
  canManageDiscounts,
  onEdit,
  onDelete,
  onToggleStatus,
  getDiscountTypeTone,
}: DiscountTableMobileProps) {
  if (discounts.length === 0) {
    return (
      <div className="py-12 text-center">
        <EmptyState
          icon={<Gift className="h-8 w-8 text-neutral-400 opacity-60" />}
          title="No discounts found"
          subtext="Create your first promotional offer"
          className="!p-0"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {discounts.map((discount) => (
        <div
          key={discount.id}
          className="p-3 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col justify-between"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-neutral-900 dark:text-white text-[13px] truncate">
                {discount.name}
              </h4>
              {discount.description && (
                <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{discount.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(discount)}
                className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                title="Edit"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(discount.id)}
                disabled={!canManageDiscounts}
                className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-rose-600 disabled:opacity-30"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Badges & Value */}
          <div className="py-2 border-y border-neutral-100 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge tone={getDiscountTypeTone(discount.type) as any} size="sm">
                {discount.type.replace('_', ' ')}
              </Badge>
              <span className="text-[11px] text-neutral-400 font-mono">
                {discount.conditions?.length || 0} rule(s)
              </span>
            </div>

            <div className="font-mono font-bold text-neutral-900 dark:text-white text-[13.5px] tabular-nums">
              {discount.type === 'percentage' && `${discount.value}%`}
              {discount.type === 'fixed' && `${currency} ${discount.value}`}
            </div>
          </div>

          {/* Footer: Date & Status */}
          <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
            <span className="text-neutral-500 truncate">
              {formatAppDate(discount.validFrom, country)} – {formatAppDate(discount.validTo, country)}
            </span>

            <button
              type="button"
              onClick={() => onToggleStatus(discount)}
              className={`px-2 py-0.5 rounded text-[10.5px] font-mono border transition-colors shrink-0 ${
                discount.active
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-neutral-100 dark:bg-white/[0.04] text-neutral-500 border-neutral-200 dark:border-white/[0.06]'
              }`}
            >
              {discount.active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
