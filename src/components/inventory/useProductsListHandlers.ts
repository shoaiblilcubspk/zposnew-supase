import { useState } from 'react';
import { useProductsStore } from '../../stores';
import { sonner } from '../../lib/sonner';
import { productsService } from '../../lib/services';

interface UseProductsListHandlersArgs {
  appProducts: any[];
  selectedProductIds: string[];
  setSelectedProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  filteredProducts: any[];
  fileInputRef?: React.RefObject<HTMLInputElement>;
  setShowBarcodeGenerator: (v: boolean) => void;
  setBarcodeProducts: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useProductsListHandlers({
  selectedProductIds,
  setSelectedProductIds,
  filteredProducts,
  setShowBarcodeGenerator: _setShowBarcodeGenerator,
  setBarcodeProducts: _setBarcodeProducts
}: UseProductsListHandlersArgs) {
  const [showImportExportModal, setShowImportExportModal] = useState(false);

  const handleDeleteProduct = async (id: string, name: string) => {
    const res = await sonner.confirm('Delete Product?', `Are you sure you want to delete "${name}"?`);
    if (!res.isConfirmed) return;
    try {
      await productsService.delete(id);
      useProductsStore.getState().deleteProduct(id);
      setSelectedProductIds(prev => prev.filter(pid => pid !== id));
      sonner.success('Product deleted successfully');
    } catch (err: any) {
      sonner.error(err.message || 'Failed to delete product');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds(prev => [...prev, id]);
    } else {
      setSelectedProductIds(prev => prev.filter(pid => pid !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const res = await sonner.confirm(
      'Bulk Delete?',
      `Are you sure you want to delete ${selectedProductIds.length} selected items?`
    );
    if (!res.isConfirmed) return;
    try {
      await productsService.bulkDelete(selectedProductIds);
      useProductsStore.getState().bulkDelete(selectedProductIds);
      setSelectedProductIds([]);
      sonner.success(`Deleted ${selectedProductIds.length} products`);
    } catch (err: any) {
      sonner.error(err.message || 'Bulk delete failed');
    }
  };

  const handleExportSelected = () => {
    setShowImportExportModal(true);
  };

  const handleImportJSON = () => {
    setShowImportExportModal(true);
  };

  return {
    handleDeleteProduct,
    handleSelectAll,
    handleSelectProduct,
    handleBulkDelete,
    handleExportSelected,
    handleImportJSON,
    showImportExportModal,
    setShowImportExportModal
  };
}
