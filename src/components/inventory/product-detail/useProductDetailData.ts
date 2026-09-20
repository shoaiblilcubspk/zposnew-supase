import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product } from '../../../types';
import { localDb } from '../../../lib/localDb';
import { productToppingsService } from '../../../lib/services';
import { getProductStockHistory } from '../../../lib/services/inventory/inventoryLedgerRepository';

export function useProductDetailData(
  product: Product,
  appProducts: any[],
  appSuppliers: any[],
  appSettings: any
) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    action: 'remove',
    quantity: '1',
    reason: 'Correction',
    notes: ''
  });
  const [restockData, setRestockData] = useState({
    quantity: '1',
    supplier: product.supplier || '',
    cost: product.cost?.toString() || '',
    recordAsSupplierBill: true
  });
  const [isCompressing, setIsCompressing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT' | 'ADJUST' | 'RETURN'>('ALL');
  const [historyPage, setHistoryPage] = useState(1);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showBatchStockIn, setShowBatchStockIn] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeScannerField, setActiveScannerField] = useState<'sku' | 'barcode'>('barcode');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const HISTORY_PER_PAGE = 7;

  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [clickedRowId, setClickedRowId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: product.name,
    sku: product.sku || '',
    barcode: product.barcode || '',
    price: product.price?.toString() || '0',
    cost: product.cost?.toString() || '0',
    minStock: product.minStock?.toString() || '0',
    stock: product.stock?.toString() || '0',
    targetStock: product.targetStock?.toString() || '',
    category: product.category,
    supplier: product.supplier || '',
    description: product.description || '',
    active: product.active ?? true,
    trackInventory: product.trackInventory !== false && product.stock < 990000,
    image: product.image || '',
    isService: product.isService || false,
    requireSerial: product.requireSerial || false,
    productType: (product.productType === 'variable') ? 'variable' : 'simple',
  });

  const [variants, setVariants] = useState<any[]>((product.variants || []).map((v: any) => ({ ...v, optionsRaw: '' })));
  const [variantData, setVariantData] = useState<any[]>(product.variantData || []);
  const [modifiers, setModifiers] = useState<any[]>(product.modifiers || []);
  const [productAddons, setProductAddons] = useState<any[]>(product.productAddons || []);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [toppingLoading, setToppingLoading] = useState(false);

  useEffect(() => {
    setFormData({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: product.price?.toString() || '0',
      cost: product.cost?.toString() || '0',
      minStock: product.minStock?.toString() || '0',
      stock: product.stock?.toString() || '0',
      targetStock: product.targetStock?.toString() || '',
      category: product.category,
      supplier: product.supplier || '',
      description: product.description || '',
      active: product.active ?? true,
      trackInventory: product.trackInventory !== false && product.stock < 990000,
      image: product.image || '',
      isService: product.isService || false,
      requireSerial: product.requireSerial || false,
      productType: (product.productType === 'variable') ? 'variable' : 'simple'
    });
    setVariants((product.variants || []).map((v: any) => ({ ...v, optionsRaw: '' })));
    setVariantData(product.variantData || []);
    setModifiers(product.modifiers || []);
    setProductAddons(product.productAddons || []);
  }, [product]);

  useEffect(() => {
    setToppingLoading(true);
    productToppingsService.getByProduct(product.id)
      .then(setToppingIds)
      .catch(() => setToppingIds([]))
      .finally(() => setToppingLoading(false));
  }, [product.id]);

  const categories = useMemo(() => {
    const cats = appProducts.map(p => p.category).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [appProducts]);

  const suppliers = useMemo(() => {
    return Array.from(new Set(appSuppliers?.map(s => s.name) || [])).sort();
  }, [appSuppliers]);

  const currency = appSettings?.currency || 'PKR';

  const isInfinite = isEditMode
    ? !formData.trackInventory
    : (product.trackInventory === false || product.stock >= 990000);

  const [sqliteHistory, setSqliteHistory] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchHistory = () => {
      getProductStockHistory(product.id)
        .then((records) => {
          if (active) setSqliteHistory(records);
        })
        .catch((e) => console.error('Error fetching product stock history from sqlite:', e));
    };

    fetchHistory();

    const handleTxCreated = (e: any) => {
      if (!e.detail?.productId || e.detail.productId === product.id) {
        fetchHistory();
      }
    };

    window.addEventListener('inventory-tx-created', handleTxCreated);
    window.addEventListener('sales-updated', fetchHistory);

    return () => {
      active = false;
      window.removeEventListener('inventory-tx-created', handleTxCreated);
      window.removeEventListener('sales-updated', fetchHistory);
    };
  }, [product.id, product.stock, isUpdating, showStockIn, showAdjustment, showRestock]);

  const dexieHistory = useLiveQuery(
    () => localDb.stockHistory.where('productId').equals(product.id).toArray(),
    [product.id]
  ) || [];

  const productStockHistory = sqliteHistory.length > 0 ? sqliteHistory : dexieHistory;

  return {
    isUpdating, setIsUpdating,
    isEditMode, setIsEditMode,
    showStockIn, setShowStockIn,
    showAdjustment, setShowAdjustment,
    showRestock, setShowRestock,
    adjustmentData, setAdjustmentData,
    restockData, setRestockData,
    isCompressing, setIsCompressing,
    filterType, setFilterType,
    historyPage, setHistoryPage,
    showMediaLibrary, setShowMediaLibrary,
    showBatchStockIn, setShowBatchStockIn,
    showScanner, setShowScanner,
    activeScannerField, setActiveScannerField,
    fileInputRef,
    selectedSale, setSelectedSale,
    clickedRowId, setClickedRowId,
    formData, setFormData,
    variants, setVariants,
    variantData, setVariantData,
    modifiers, setModifiers,
    productAddons, setProductAddons,
    toppingIds, setToppingIds,
    toppingLoading, setToppingLoading,
    categories, suppliers, currency,
    isInfinite,
    productStockHistory,
    HISTORY_PER_PAGE,
  };
}
