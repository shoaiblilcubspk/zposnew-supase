import { useState, useMemo, useRef, useEffect } from 'react';
import { Product } from '../../../types';
import { InventoryToolbar } from '../InventoryToolbar';
import { InventoryTable } from '../InventoryTable';
import { BulkEditModal } from '../BulkEditModal';
import { BarcodeGenerator, clearPersistedBarcodeState } from '../BarcodeGenerator';
import { sonner } from '../../../lib/sonner';
import { useSettingsStore } from '../../../stores';
import { useBarcodeScanner } from '../../../hooks/useBarcodeScanner';
import { normalizeBarcodeValue } from '../../../utils/barcode';
import { formatCurrency } from '../../../lib/currencies';
import { Package, AlertTriangle, TrendingUp, TrendingDown, ChevronLeft } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { ProductImportExportModal } from '../ProductImportExportModal';
import { useProductsListHandlers } from '../useProductsListHandlers';
import { getExpiryStatus } from '../../../utils/expiryUtils';

interface Props {
  appProducts: Product[];
  categories: string[];
  suppliers: string[];
  isAdmin: boolean;
  canManageStock: boolean;
  canEditProduct: boolean;
  profile: any;
  setEditingProduct: (p: Product | null) => void;
  setShowProductModal: (val: boolean) => void;
  handleEditProduct: (p: Product) => void;
  setShowBarcodeGenerator: (val: boolean) => void;
  showBarcodeGenerator: boolean;
}

export function ProductsList({
  appProducts, categories, suppliers, isAdmin, canManageStock, canEditProduct, profile,
  setEditingProduct, setShowProductModal, handleEditProduct,
  setShowBarcodeGenerator, showBarcodeGenerator
}: Props) {
  const appSettings = useSettingsStore(s => s.settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canViewExpiry = isAdmin || Boolean(profile?.canViewExpiry);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSupplier, _setSelectedSupplier] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('barcode_selected_product_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [barcodeProducts, setBarcodeProducts] = useState<Product[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [_showScannerInInventory, setShowScannerInInventory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ITEMS_PER_PAGE, setPageSize] = useState(25);

  useEffect(() => {
    localStorage.setItem('barcode_selected_product_ids', JSON.stringify(selectedProductIds));
  }, [selectedProductIds]);

  useEffect(() => {
    if (showBarcodeGenerator && selectedProductIds.length > 0) {
      const filtered = appProducts.filter(p => selectedProductIds.includes(p.id));
      setBarcodeProducts(prev => {
        const prevIds = prev.map(x => x.id).join(',');
        const nextIds = filtered.map(x => x.id).join(',');
        if (prevIds !== nextIds) {
          return filtered;
        }
        return prev;
      });
    } else if (!showBarcodeGenerator) {
      setBarcodeProducts([]);
    }
  }, [appProducts, showBarcodeGenerator, selectedProductIds]);

  const filteredProducts = useMemo(() => {
    return appProducts
      .filter(product => {
        const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const matchesSupplier = selectedSupplier === 'All' || product.supplier === selectedSupplier;
        const matchesType = selectedType === 'All' ||
          (selectedType === 'services' && product.isService) ||
          (selectedType === 'serialized' && product.requireSerial) ||
          (selectedType === 'variable' && product.productType === 'variable') ||
          (selectedType === 'standard' && !product.isService && !product.requireSerial && product.productType !== 'variable') ||
          (selectedType === 'expiring_soon' && getExpiryStatus(product.expiryDate, product.expiryAlertDays).status === 'expiring_soon') ||
          (selectedType === 'expired' && getExpiryStatus(product.expiryDate, product.expiryAlertDays).status === 'expired');
        const matchesVariation = product.productType !== 'variation';
        return matchesSearch && matchesCategory && matchesSupplier && matchesType && matchesVariation;
      })
      .sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;
        switch (sortBy) {
          case 'name': aValue = (a.name || '').toLowerCase(); bValue = (b.name || '').toLowerCase(); break;
          case 'stock': aValue = a.stock; bValue = b.stock; break;
          case 'price': aValue = a.price; bValue = b.price; break;
          default: aValue = (a.name || '').toLowerCase(); bValue = (b.name || '').toLowerCase();
        }
        if (sortOrder === 'asc') return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        else return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      });
  }, [appProducts, searchTerm, selectedCategory, selectedSupplier, selectedType, sortBy, sortOrder]);

  const totalPages = useMemo(() => Math.ceil(filteredProducts.length / ITEMS_PER_PAGE), [filteredProducts.length, ITEMS_PER_PAGE]);
  const paginatedProducts = useMemo(() => filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filteredProducts, currentPage, ITEMS_PER_PAGE]);

  useBarcodeScanner((barcode: string) => {
    if (!appProducts) return;
    const term = barcode.trim();
    const normalizedTerm = normalizeBarcodeValue(term);
    let found = appProducts.find(p => p.barcode === term || p.sku === term);
    if (!found) {
      found = appProducts.find(p => {
        const pBarcode = normalizeBarcodeValue(p.barcode || '');
        const pSku = normalizeBarcodeValue(p.sku || '');
        return pBarcode === normalizedTerm || pSku === normalizedTerm;
      });
    }
    if (found) {
      setSearchTerm(found.barcode || found.sku || '');
      setCurrentPage(1);
      sonner.success(`Found: ${found.name}`);
    } else {
      sonner.error(`Product not found: ${term}`);
    }
  });

  const {
    handleDeleteProduct,
    handleSelectAll,
    handleSelectProduct,
    handleBulkDelete,
    handleExportSelected,
    handleImportJSON,
    showImportExportModal,
    setShowImportExportModal
  } = useProductsListHandlers({
    appProducts,
    selectedProductIds,
    setSelectedProductIds,
    filteredProducts,
    setShowBarcodeGenerator,
    setBarcodeProducts
  });

  const lowStockProducts = appProducts.filter(p => p.trackInventory !== false && p.stock < 990000 && p.stock >= 0 && p.stock <= (p.minStock || 5));
  const totalValue = appProducts.reduce((sum, p) => sum + ((p.trackInventory === false || p.stock >= 990000) ? 0 : (p.stock || 0) * (p.cost || 0)), 0);
  const outOfStockProducts = appProducts.filter(p => p.trackInventory !== false && p.stock < 990000 && p.stock <= 0);

  if (showBarcodeGenerator) {
    return (
      <div className="fixed inset-0 z-[450] bg-white dark:bg-surface animate-in fade-in zoom-in-95 duration-300 flex flex-col">
        <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2.5 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-app">
          <Button variant="ghost" onClick={() => {
            setShowBarcodeGenerator(false);
            setBarcodeProducts([]);
            setSelectedProductIds([]);
            clearPersistedBarcodeState();
            localStorage.removeItem('barcode_selected_product_ids');
            localStorage.removeItem('barcode_selected_quantities');
            localStorage.removeItem('barcode_show_generator');
          }} className="!min-h-0 !h-8 !px-2.5 !rounded !bg-transparent !text-neutral-600 dark:!text-neutral-400 hover:!bg-neutral-100 dark:hover:!bg-surface-hover">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[13px] font-medium">Back</span>
          </Button>
          <div className="h-4 w-px bg-neutral-200 dark:border-white/[0.08] mx-1" />
          <p className="text-[12px] text-neutral-400">Management / Barcode Print Engine</p>
        </div>
        <div className="flex-1 min-h-0">
          <BarcodeGenerator
            products={barcodeProducts}
            onClose={() => {
              setShowBarcodeGenerator(false);
              setBarcodeProducts([]);
              setSelectedProductIds([]);
              clearPersistedBarcodeState();
            }}
            onProductsChange={(next) => setSelectedProductIds(next.map(p => p.id))}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
        {[
          { label: "Active Items", value: appProducts.filter(p => p.active !== false && p.productType !== 'variation').length, icon: Package, isWarning: false },
          { label: "Low Stock", value: lowStockProducts.length, icon: AlertTriangle, isWarning: lowStockProducts.length > 0 },
          { label: "Stock Value", value: formatCurrency(totalValue, appSettings.currency), icon: TrendingUp, isWarning: false },
          { label: "Out of Stock", value: outOfStockProducts.length, icon: TrendingDown, isWarning: outOfStockProducts.length > 0 },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {stat.label}
                </span>
                <Icon className={`w-4 h-4 ${stat.isWarning ? 'text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`} />
              </div>
              <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      <InventoryToolbar
        searchTerm={searchTerm}
        onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        handleImportJSON={handleImportJSON}
        handleExportSelected={handleExportSelected}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={(val) => { setSelectedCategory(val); setCurrentPage(1); }}
        selectedType={selectedType}
        onTypeChange={(val) => { setSelectedType(val); setCurrentPage(1); }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
        canManageStock={canEditProduct}
        selectedCount={selectedProductIds.length}
        handleBulkDelete={handleBulkDelete}
        onBulkEdit={() => setShowBulkEditModal(true)}
        onPrintBarcodes={() => { setBarcodeProducts(appProducts.filter(p => selectedProductIds.includes(p.id))); setShowBarcodeGenerator(true); }}
        onAddProduct={() => { setEditingProduct(null); setShowProductModal(true); }}
        onScanClick={() => setShowScannerInInventory(true)}
        canViewExpiry={canViewExpiry}
      />

      <InventoryTable
        paginatedProducts={paginatedProducts}
        selectedProductIds={selectedProductIds}
        filteredProducts={filteredProducts}
        handleSelectAll={handleSelectAll}
        handleSelectProduct={handleSelectProduct}
        handleEditProduct={handleEditProduct}
        handleDeleteProduct={handleDeleteProduct}
        currentPage={currentPage}
        totalPages={totalPages}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
        onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onPageSizeChange={setPageSize}
        isAdmin={isAdmin}
        profile={profile}
        canManageStock={canManageStock}
        canEditProduct={canEditProduct}
        canViewExpiry={canViewExpiry}
      />

      <BulkEditModal selectedIds={selectedProductIds} isOpen={showBulkEditModal} onClose={() => setShowBulkEditModal(false)} categories={categories} suppliers={suppliers} />
      <ProductImportExportModal
        open={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        selectedProductIds={selectedProductIds}
      />
    </>
  );
}
