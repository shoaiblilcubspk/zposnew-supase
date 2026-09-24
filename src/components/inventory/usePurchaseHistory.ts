import { useInventoryStore, useProductsStore, useSettingsStore, useUiStore, useUsersStore } from '../../stores';
import React, { useState, useMemo } from 'react';
import { Product, PurchaseRecord } from '../../types';
import { purchaseRecordsService, suppliersService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { computeDateBoundaries, filterPurchaseRecords, buildExportRows } from './purchaseHistoryUtils';

export function usePurchaseHistory() {
  const appInventoryPurchasesPage = useUiStore(s => s.inventoryPurchasesPage);
  const appProducts = useProductsStore(s => s.products);
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSuppliers = useInventoryStore(s => s.suppliers);
  const appSettings = useSettingsStore(s => s.settings);
  const appPurchaseRecords = useInventoryStore(s => s.purchaseRecords);
  const appUsers = useUsersStore(s => s.users);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [supplierFilter, setSupplierFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [dateRange, setDateRange] = useState('last30');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [view, setView] = useState<'list' | 'entry'>('list');
  const [formData, setFormData] = useState<any>({
    productId: '',
    productName: '',
    sku: '',
    quantity: 0,
    costPrice: 0,
    retailPrice: 0,
    supplier: '',
    date: new Date().toLocaleDateString('en-CA'),
    notes: ''
  });

  const currentPage = appInventoryPurchasesPage;
  const setCurrentPage = (val: number | ((prev: number) => number)) => {
    const newVal = typeof val === 'function' ? val(currentPage) : val;
    useUiStore.getState().setInventoryPurchasesPage(Math.max(1, newVal));
  };
  const [itemsPerPage, setPageSize] = useState(25);

  const [_isSubmitting, setIsSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const _handleProductSearch = (query: string) => {
    setFormData((prev: any) => ({ ...prev, productName: query }));
    if (query.length > 1) {
      const matches = appProducts.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const _selectProduct = (p: Product) => {
    setFormData((prev: any) => ({
      ...prev,
      productId: p.id,
      productName: p.name,
      sku: p.sku || '',
      costPrice: p.cost || 0,
      retailPrice: p.price || 0,
      supplier: p.supplier || prev.supplier || ''
    }));
    setSearchTerm('');
    setSuggestions([]);
    sonner.success(`${p.name} selected`, 1000);
  };

  const _handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const productName = String(formData.productName || '').trim();
    const supplierName = String(formData.supplier || '').trim();
    const quantity = Number(formData.quantity);
    const costPrice = Number(formData.costPrice);
    const retailPrice = Number(formData.retailPrice);
    const selectedProduct = appProducts.find((p) => p.id === formData.productId);
    const matchedProduct = appProducts.find(
      (p) =>
        p.name.toLowerCase() === productName.toLowerCase() &&
        (!formData.sku || p.sku === formData.sku)
    );
    const resolvedProductId = formData.productId || selectedProduct?.id || matchedProduct?.id;

    if (!productName || !resolvedProductId) {
      sonner.error('Select a valid product before saving');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      sonner.error('Quantity must be greater than 0');
      return;
    }

    if (!Number.isFinite(costPrice) || costPrice <= 0) {
      sonner.error('Enter a valid cost price');
      return;
    }

    if (!Number.isFinite(retailPrice) || retailPrice <= 0) {
      sonner.error('Enter a valid retail price');
      return;
    }

    setIsSubmitting(true);
    sonner.loading('Saving record...');

    try {
      const recordData = {
        ...formData,
        productId: resolvedProductId,
        productName,
        supplier: supplierName,
        quantity,
        costPrice,
        retailPrice,
        totalAmount: quantity * costPrice,
        addedBy: appCurrentUser?.name || appCurrentUser?.username || 'System',
        date: new Date(formData.date!).toISOString()
      } as PurchaseRecord;

      const newRecord = await purchaseRecordsService.create(recordData);

      if (supplierName) {
        const matched = appSuppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
        if (matched) {
          try {
            await suppliersService.recordBill({
              supplierId: matched.id,
              amount: quantity * (costPrice || 0),
              note: `Stock In: ${productName} x${quantity}`,
              referenceId: newRecord.id,
              sourceType: 'auto_purchase',
            });
          } catch (ledgerErr) {
            console.warn('[PurchaseHistory] Failed to record supplier bill:', ledgerErr);
          }
        }
      }

      const product = appProducts.find(p => p.id === recordData.productId);
      if (product) {
        const freshProduct = await (await import('../../lib/services')).productsService.getById(product.id);
        if (freshProduct) {
          useProductsStore.getState().updateProduct(freshProduct);
        }
      }

      useInventoryStore.getState().addPurchaseRecord(newRecord);
      sonner.success('Stock updated successfully');

      setView('list');
    } catch (error) {
      console.error('Error saving record:', error);
      sonner.error('Failed to save record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (record: PurchaseRecord) => {
    const result = await sonner.deleteConfirm('this record');
    if (result.isConfirmed) {
      try {
        await purchaseRecordsService.delete(record.id);

        const freshProduct = await (await import('../../lib/services')).productsService.getById(record.productId);
        if (freshProduct) {
          useProductsStore.getState().updateProduct(freshProduct);
        }

        useInventoryStore.getState().deletePurchaseRecord(record.id);
        sonner.success('Record deleted and stock reverted');
      } catch (error) {
        console.error('Failed to delete purchase record:', error);
        sonner.error('Failed to delete record');
      }
    }
  };

  const dateBoundaries = useMemo(() =>
    computeDateBoundaries(dateRange, startDateInput, endDateInput, appSettings.country),
    [dateRange, startDateInput, endDateInput, appSettings.country]);

  const filteredRecords = useMemo(() =>
    filterPurchaseRecords(
      appPurchaseRecords, appProducts, debouncedSearch,
      supplierFilter, categoryFilter, userFilter, dateBoundaries
    ),
    [appPurchaseRecords, appProducts, debouncedSearch, supplierFilter, categoryFilter, userFilter, dateBoundaries]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredRecords, currentPage, itemsPerPage]);

  const suppliers = ['All', ...Array.from(new Set([
    ...appSuppliers.map(s => s.name).filter(Boolean),
    ...(appPurchaseRecords || []).map(r => r.supplier).filter(Boolean)
  ]))];
  const categoriesList = ['All', ...Array.from(new Set(appProducts.map(p => p.category).filter(Boolean)))];
  const usersList = ['All', ...Array.from(new Set([
    ...appUsers.map(u => u.name).filter(Boolean),
    ...(appPurchaseRecords || []).map(r => r.addedBy).filter(Boolean)
  ]))];

  const selectedProductForForm = useMemo(() => {
    if (formData.productId) {
      const byId = appProducts.find((p) => p.id === formData.productId);
      if (byId) return byId;
    }

    const name = String(formData.productName || '').trim().toLowerCase();
    if (!name) return undefined;

    return appProducts.find((p) => p.name.toLowerCase() === name);
  }, [formData.productId, formData.productName, appProducts]);

  const exportColumns = [
    { key: 'date', label: "Date" },
    { key: 'productName', label: "Product" },
    { key: 'sku', label: "SKU" },
    { key: 'supplier', label: "Supplier" },
    { key: 'quantity', label: "Quantity", format: 'number' as const },
    { key: 'costPrice', label: 'Cost Price', format: 'currency' as const },
    { key: 'retailPrice', label: 'Retail Price', format: 'currency' as const },
    { key: 'totalCost', label: 'Total Cost', format: 'currency' as const },
    { key: 'notes', label: "Notes" },
  ];

  const exportRows = useMemo(() => buildExportRows(filteredRecords), [filteredRecords]);

  return {
    appSettings,
    view,
    setView,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    supplierFilter,
    setSupplierFilter,
    suppliers,
    categoryFilter,
    setCategoryFilter,
    categoriesList,
    userFilter,
    setUserFilter,
    usersList,
    dateRange,
    setDateRange,
    startDateInput,
    setStartDateInput,
    endDateInput,
    setEndDateInput,
    currentPage,
    totalPages,
    itemsPerPage,
    setPageSize,
    paginatedRecords,
    appProducts,
    filteredRecords,
    exportColumns,
    exportRows,
    handleDeleteRecord,
    suggestions,
    selectedProductForForm,
  };
}
