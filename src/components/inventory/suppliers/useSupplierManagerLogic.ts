import { useInventoryStore, useSettingsStore } from '../../../stores';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Supplier } from '../../../types';
import { suppliersService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import { usePagination } from '../../../shared/ui';
import {
  getTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getStartOfInputDayInTimezone,
  getEndOfInputDayInTimezone,
} from '../../../lib/dateUtils';

export function useSupplierManagerLogic() {
  const appSuppliers = useInventoryStore(s => s.suppliers);
  const appSettings = useSettingsStore(s => s.settings);

  const { profile } = useAuth();
  // RBAC matrix: supplier manage/payment = admin|manager
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const canManage = isAdmin || !!profile?.canManagePO;

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('thisMonth');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [totalRemaining, setTotalRemaining] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadTotals = async () => {
      try {
        const balances = await Promise.all(
          appSuppliers.map(s => suppliersService.getBalance(s.id))
        );
        if (!cancelled) {
          setTotalRemaining(balances.reduce((sum, b) => sum + b, 0));
        }
      } catch (err) {
        console.error('Failed to load supplier balances', err);
      }
    };
    loadTotals();
    return () => { cancelled = true; };
  }, [appSuppliers]);

  const activeSuppliers = appSuppliers.length;

  const filteredSuppliers = useMemo(() => {
    return appSuppliers.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.businessType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [appSuppliers, searchTerm]);

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredSuppliers, 24);

  const handleAddEdit = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (formData: Partial<Supplier>) => {
    try {
      sonner.loading('Saving supplier...');
      if (editingSupplier) {
        const updated = await suppliersService.update(editingSupplier.id, formData);
        useInventoryStore.getState().updateSupplier(updated);
        sonner.dismissAll();
        sonner.success('Supplier updated!');
      } else {
        const created = await suppliersService.create({
          ...(formData as any),
        });
        useInventoryStore.getState().setSuppliers([...appSuppliers, created]);

        sonner.dismissAll();
        sonner.success('Supplier added!');
      }
    } catch (err) {
      console.error(err);
      sonner.error('Failed to save supplier.');
    } finally {
      sonner.close();
    }
  };

  const handleDelete = async (id: string, _name: string) => {
    if (!isAdmin) {
      sonner.error('Only administrators can delete suppliers.');
      return;
    }

    const { isConfirmed } = await sonner.deleteConfirm('supplier record');
    if (isConfirmed) {
      try {
        sonner.loading('Deleting...');
        await suppliersService.delete(id);
        useInventoryStore.getState().deleteSupplier(id);
        sonner.dismissAll();
        sonner.success('Supplier deleted successfully.');
      } catch (err) {
        console.error(err);
        sonner.error('Failed to delete supplier.');
      } finally {
        sonner.close();
      }
    }
  };

  const { validStartDate, validEndDate } = useMemo(() => {
    const timezone = getTimezone(appSettings.country);
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dateFilter === 'custom') {
      startDate = startDateInput
        ? new Date(getStartOfInputDayInTimezone(startDateInput, timezone).getTime())
        : new Date(getStartOfDayInTimezone(now, timezone).getTime());
      endDate = endDateInput
        ? new Date(getEndOfInputDayInTimezone(endDateInput, timezone).getTime())
        : new Date(getEndOfDayInTimezone(now, timezone).getTime());
    } else if (dateFilter === 'today') {
      startDate = getStartOfDayInTimezone(now, timezone);
      endDate = getEndOfDayInTimezone(now, timezone);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      startDate = getStartOfDayInTimezone(yesterday, timezone);
      endDate = getEndOfDayInTimezone(yesterday, timezone);
    } else if (dateFilter === 'last7') {
      const last7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate = getStartOfDayInTimezone(last7, timezone);
      endDate = getEndOfDayInTimezone(now, timezone);
    } else if (dateFilter === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = getStartOfDayInTimezone(startOfMonth, timezone);
      endDate = getEndOfDayInTimezone(now, timezone);
    } else if (dateFilter === 'lastMonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      startDate = getStartOfDayInTimezone(lm, timezone);
      endDate = getEndOfDayInTimezone(lmEnd, timezone);
    } else if (dateFilter === 'all') {
      startDate = new Date(Date.UTC(2000, 0, 1));
      endDate = getEndOfDayInTimezone(now, timezone);
    } else {
      startDate = new Date(Date.UTC(2000, 0, 1));
      endDate = getEndOfDayInTimezone(now, timezone);
    }

    return { validStartDate: startDate, validEndDate: endDate };
  }, [dateFilter, startDateInput, endDateInput, appSettings.country]);

  return {
    appSuppliers,
    appSettings,
    profile,
    isAdmin,
    canManage,
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    startDateInput,
    setStartDateInput,
    endDateInput,
    setEndDateInput,
    selectedSupplierId,
    setSelectedSupplierId,
    totalRemaining,
    isModalOpen,
    setIsModalOpen,
    editingSupplier,
    setEditingSupplier,
    activeSuppliers,
    filteredSuppliers,
    page,
    totalPages,
    pageItems,
    goToPage,
    pageSize,
    setPageSize,
    handleAddEdit,
    handleSaveSupplier,
    handleDelete,
    validStartDate,
    validEndDate,
  };
}
