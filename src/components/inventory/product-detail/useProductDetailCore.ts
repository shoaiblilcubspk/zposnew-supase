import { useMemo } from 'react';
import { useProductsStore, useInventoryStore, useSalesStore, useSettingsStore } from '../../../stores';
import { useAuth } from '../../../context/AuthContext';
import { Product } from '../../../types';
import { createDetailHandlers } from './detailActions';
import { useProductDetailData } from './useProductDetailData';
import { useProductDetailLedger } from './useProductDetailLedger';
import { useProductDetailHistory } from './useProductDetailHistory';

export interface ProductDetailHubProps {
  product: Product;
  onBack: () => void;
  onEdit: () => void;
}

export function useProductDetail({ product: initialProduct, onBack, onEdit }: ProductDetailHubProps) {
  const appProducts = useProductsStore(s => s.products);
  const appSuppliers = useInventoryStore(s => s.suppliers);
  const appSettings = useSettingsStore(s => s.settings);
  const appSales = useSalesStore(s => s.sales);
  const appPurchaseRecords = useInventoryStore(s => s.purchaseRecords);

  const { profile } = useAuth();

  // Live authoritative product derived from reactive products store
  const product = useMemo(() => {
    return (appProducts || []).find(p => p && p.id === initialProduct.id) || initialProduct;
  }, [appProducts, initialProduct]);

  const saleById = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of (appSales || [])) m.set(s.id, s);
    return m;
  }, [appSales]);

  const data = useProductDetailData(product, appProducts, appSuppliers, appSettings);

  const ledger = useProductDetailLedger({
    product,
    appSales,
    appPurchaseRecords,
    productStockHistory: data.productStockHistory,
    saleById,
    isInfinite: data.isInfinite,
  });

  const history = useProductDetailHistory({
    productStockHistory: data.productStockHistory,
    filterType: data.filterType,
    setFilterType: data.setFilterType,
    historyPage: data.historyPage,
    setHistoryPage: data.setHistoryPage,
    setClickedRowId: data.setClickedRowId,
    setSelectedSale: data.setSelectedSale,
    HISTORY_PER_PAGE: data.HISTORY_PER_PAGE,
  });

  const canEditProduct = profile?.role === 'admin' || profile?.canEditProduct;
  const canManageStock = profile?.role === 'admin' || profile?.role === 'manager' || profile?.canManageStock || profile?.canManagePO;

  const base: any = {
    product, onBack, onEdit,
    appProducts, appSuppliers, appSettings, appSales, appPurchaseRecords,
    profile, canEditProduct, canManageStock,
    ...data,
    saleById,
    ...ledger,
    ...history,
    HISTORY_PER_PAGE: data.HISTORY_PER_PAGE,
  };

  const { handleAdjustment, handleQuickRestock, handleSave, generateBarcode, generateSku } = createDetailHandlers(base);

  return {
    ...base,
    handleAdjustment, handleQuickRestock, handleSave, generateBarcode, generateSku,
  };
}

export type ProductDetailController = ReturnType<typeof useProductDetail>;
