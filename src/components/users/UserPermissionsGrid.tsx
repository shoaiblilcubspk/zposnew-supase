import React from 'react';
import { Tag, Percent, Edit3, Trash2, Database, ClipboardList, History, Calendar, KeyRound } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ToggleSwitch } from '../../shared/ui';

interface UserPermissionsGridProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isOtherAdmin: boolean;
}

const PERMISSIONS = [
  { key: 'canEditPrice', label: 'Price Override', icon: Tag },
  { key: 'canGiveDiscount', label: 'Issue Discounts', icon: Percent },
  { key: 'canEditProduct', label: 'Manage Products', icon: Edit3 },
  { key: 'canEditSale', label: 'Edit Completed Sales', icon: Edit3 },
  { key: 'canDeleteSale', label: 'Void / Delete Sales', icon: Trash2 },
  { key: 'canManageStock', label: 'Inventory Adjustments', icon: Database },
  { key: 'canManagePO', label: 'Purchase Orders (PO)', icon: ClipboardList },
  { key: 'canViewRecords', label: 'Transaction Records', icon: History },
  { key: 'canViewExpiry', label: 'View Expiry & Alerts', icon: Calendar },
  { key: 'requirePinOnSale', label: 'Require PIN on Sale Save', icon: KeyRound, isPinGate: true },
];

export function UserPermissionsGrid({ formData, setFormData, isOtherAdmin }: UserPermissionsGridProps) {
  return (
    <div className="space-y-2">
      <div className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
        Operational Privileges
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSIONS.map((perm) => {
          const isAllowed = perm.isPinGate
            ? Boolean(formData.requirePinOnSale)
            : (formData.role === 'admin' || Boolean(formData[perm.key]));
          const isDisabled = perm.isPinGate ? isOtherAdmin : (formData.role === 'admin');

          return (
            <div
              key={perm.key}
              className="h-8 px-3 flex items-center justify-between bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded"
            >
              <div className="flex items-center gap-2">
                <perm.icon className={cn('h-3.5 w-3.5', isAllowed ? 'text-primary' : 'text-gray-400')} />
                <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{perm.label}</span>
              </div>
              <ToggleSwitch
                checked={isAllowed}
                onChange={(checked) => setFormData((prev: any) => ({ ...prev, [perm.key]: checked }))}
                disabled={isDisabled}
                size="sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
