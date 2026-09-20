import { useAppStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState } from 'react';
import { Plus, Edit, Trash2, Percent, Gift, ChevronLeft } from 'lucide-react';
import { Discount } from '../../types';
import { can } from '../../lib/permissions';
import { DiscountModal } from './DiscountModal';
import { sonner } from '../../lib/sonner';
import { formatAppDate } from '../../lib/dateUtils';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { Button, Badge, EmptyState, Pagination, usePagination } from '../../shared/ui';

import { DiscountTableMobile } from './DiscountTable.mobile';

export function DiscountManager() {
  const appCurrentUser = useUsersStore(s => s.currentUser);
const appDiscounts = useAppStore(s => s.discounts);
const appSettings = useSettingsStore(s => s.settings);
  const canManageDiscounts = can(appCurrentUser?.role, 'manage_discounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  const filteredDiscounts = appDiscounts.filter(discount =>
    discount?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredDiscounts, 20);

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount);
    setShowDiscountModal(true);
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!canManageDiscounts) { sonner.error('You do not have permission to delete discounts.'); return; }
    const result = await sonner.deleteConfirm('discount');
    if (result.isConfirmed) {
      try {
        sonner.loading('Deleting discount...');
        const { discountsService } = await import('../../lib/services');
        await discountsService.delete(discountId);
        useAppStore.getState().deleteDiscount(discountId);
        sonner.success('Discount deleted successfully!');
      } catch (error) {
        console.error('Error deleting discount:', error);
        sonner.error('Failed to delete discount. Please try again.');
      } finally {
        sonner.close();
      }
    }
  };

  const handleAddDiscount = () => {
    setEditingDiscount(null);
    setShowDiscountModal(true);
  };

  const toggleDiscountStatus = async (discount: Discount) => {
    try {
      sonner.loading(`${discount.active ? 'Deactivating' : 'Activating'} discount...`);
      const updatedDiscount = { ...discount, active: !discount.active };
      const { discountsService } = await import('../../lib/services');
      await discountsService.update(discount.id, updatedDiscount);
      useAppStore.getState().updateDiscount(updatedDiscount);
      sonner.success(`Discount ${discount.active ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error updating discount:', error);
      sonner.error('Failed to update discount. Please try again.');
    } finally {
      sonner.close();
    }
  };

  const getDiscountTypeTone = (type: string) => (type === 'percentage' || type === 'fixed' ? 'success' : 'neutral');

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="h-8 px-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08] shrink-0"
          >
            <span className="hidden sm:inline text-[12px] font-medium">POS</span>
          </Button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <Gift className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight truncate">
                Discounts & Promotions
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono tracking-tight truncate">
                {appDiscounts.length} promotional rules configured
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleAddDiscount}
          icon={<Plus className="h-3.5 w-3.5" />}
          className="shrink-0"
        >
          <span>{"Add Discount"}</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Discounts", value: appDiscounts.length, icon: Percent },
          { label: "Active Discounts", value: appDiscounts.filter(d => d.active).length, icon: Gift },
          { label: "Percentage Offers", value: appDiscounts.filter(d => d.type === 'percentage').length, icon: Percent },
          { label: "Fixed Offers", value: appDiscounts.filter(d => d.type === 'fixed').length, icon: Percent },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {stat.label}
                </span>
                <Icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="max-w-md">
          <SharedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={"Search discounts..."}
          />
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-340px)] flex flex-col justify-between">
        <div className="hidden lg:block overflow-x-auto flex-1">
          <table className="table w-full">
            <thead className="h-8 bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
              <tr>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Discount"}</th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">{"Type"}</th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Value"}</th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">{"Conditions"}</th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden lg:table-cell">{"Valid Period"}</th>
                <th className="px-3.5 py-2 text-center text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">{"Status"}</th>
                <th className="px-3.5 py-2 text-right text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Actions"}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {filteredDiscounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <EmptyState
                      icon={<Gift className="h-8 w-8 text-neutral-400" />}
                      title={"No discounts found"}
                      subtext={"Create your first promotional offer"}
                      className="!p-0 opacity-60"
                    />
                  </td>
                </tr>
              )}
              {pageItems.map((discount) => (
                <tr key={discount.id} className="h-11 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3.5 py-2">
                    <div>
                      <div className="text-[13px] font-medium text-neutral-900 dark:text-white">{discount.name}</div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{discount.description}</div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 hidden sm:table-cell">
                    <Badge tone={getDiscountTypeTone(discount.type) as 'success' | 'info' | 'neutral'} size="sm">
                      {discount.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2 font-mono font-semibold text-neutral-900 dark:text-white text-[13px] tabular-nums">
                    {discount.type === 'percentage' && `${discount.value}%`}
                    {discount.type === 'fixed' && `${appSettings.currency} ${discount.value}`}
                  </td>
                  <td className="px-3.5 py-2 hidden md:table-cell">
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      {discount.conditions.length} condition(s)
                    </div>
                  </td>
                  <td className="px-3.5 py-2 text-neutral-700 dark:text-neutral-300 hidden lg:table-cell">
                    <div className="text-[11px] font-mono">
                      <div>{formatAppDate(discount.validFrom, appSettings.country)}</div>
                      <div className="text-neutral-400">to {formatAppDate(discount.validTo, appSettings.country)}</div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 text-center hidden sm:table-cell">
                    <button
                      onClick={() => toggleDiscountStatus(discount)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                        discount.active
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-neutral-100 dark:bg-white/[0.04] text-neutral-500 border-neutral-200 dark:border-white/[0.06]'
                      }`}
                    >
                      {discount.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-3.5 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDiscount(discount)}
                        className="!p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDiscount(discount.id)}
                        disabled={!canManageDiscounts}
                        className="!p-1 text-neutral-500 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Native App Cards */}
        <div className="lg:hidden p-3 flex-1">
          <DiscountTableMobile
            discounts={pageItems}
            currency={appSettings.currency}
            country={appSettings.country}
            canManageDiscounts={canManageDiscounts}
            onEdit={handleEditDiscount}
            onDelete={handleDeleteDiscount}
            onToggleStatus={toggleDiscountStatus}
            getDiscountTypeTone={getDiscountTypeTone}
          />
        </div>

        {/* Pinned Pagination Footer */}
        <div className="px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-4 mt-auto">
          <p className="hidden sm:block text-[11px] text-neutral-500 font-mono">
            Showing {filteredDiscounts.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredDiscounts.length)} of ${filteredDiscounts.length}`}
          </p>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={filteredDiscounts.length}
              mode="numbered"
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      </div>

      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        discount={editingDiscount}
      />
    </div>
  );
}