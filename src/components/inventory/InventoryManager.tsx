import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProductsStore, useSettingsStore, useUiStore, useInventoryStore } from '../../stores';
import { Product } from '../../types';
import { Button, RealIcon, ScrollableTabBar } from '../../shared/ui';
import { INVENTORY_TABS } from '../../shared/navigation/tabRegistry';
import { SkeletonLoader } from '../../shared/ui/SkeletonLoader';
import { MediaLibrary } from '../../shared/MediaLibrary';
import { ReceiptPrint } from '../pos/ReceiptPrint';

import { ProductDetailHub } from './ProductDetailHub';
import { ProductModal } from './ProductModal';
import { PurchaseOrderSystem } from './PurchaseOrderSystem';
import { PurchaseHistory } from './PurchaseHistory';
import { BundleManager } from './BundleManager';
import { SupplierManager } from './suppliers/SupplierManager';
import { ProductsList } from './tabs/ProductsList';
import { CategoriesList } from './tabs/CategoriesList';

type TabType = 'inventory' | 'purchase_orders' | 'groups' | 'media' | 'purchases' | 'bundles' | 'store_sort' | 'suppliers';

const SUB_TAB_SEGMENT_TO_INTERNAL: Record<string, TabType> = {
  products: 'inventory', history: 'purchases', restock: 'purchase_orders',
  bundles: 'bundles', groups: 'groups', media: 'media', 'store-sort': 'store_sort', suppliers: 'suppliers',
};

const INTERNAL_TO_SUB_TAB_SEGMENT: Record<string, string> = {
  inventory: 'products', purchases: 'history', purchase_orders: 'restock',
  bundles: 'bundles', groups: 'groups', media: 'media', store_sort: 'store-sort', suppliers: 'suppliers',
};

export function InventoryManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subTab } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const appProducts = useProductsStore(s => s.products);
  const appPendingReturnTab = useUiStore(s => s.pendingReturnTab);
  const appSettings = useSettingsStore(s => s.settings);
  const { profile } = useAuth();

  const products = appProducts ?? [];
  const isAdmin = Boolean(profile?.role === 'admin' || profile?.role === 'manager');
  const canManageStock = Boolean(isAdmin || profile?.canManageStock || profile?.canManagePO);
  const canManagePO = Boolean(isAdmin || profile?.canManagePO);
  const canViewRecords = Boolean(isAdmin || profile?.canViewRecords);
  const canEditProduct = Boolean(profile?.role === 'admin' || profile?.canEditProduct);

  const activeTab = (subTab ? SUB_TAB_SEGMENT_TO_INTERNAL[subTab] : 'inventory') as TabType;

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(() => localStorage.getItem('barcode_show_generator') === 'true');
  const [viewingSale, setViewingSale] = useState<any | null>(null);

  const detailId = searchParams.get('detail');
  const editId = searchParams.get('edit');
  const isNew = searchParams.get('new') === '1' || searchParams.get('action') === 'new';

  // Restore detail & edit view on mount or browser refresh
  useEffect(() => {
    if (detailId && products.length > 0) {
      const found = products.find(p => p.id === detailId);
      if (found) setDetailProduct(found);
    } else if (!detailId) {
      setDetailProduct(null);
    }
  }, [detailId, products]);

  useEffect(() => {
    if (editId && products.length > 0) {
      const found = products.find(p => p.id === editId);
      if (found) {
        setEditingProduct(found);
        setShowProductModal(true);
      }
    } else if (isNew) {
      setEditingProduct(null);
      setShowProductModal(true);
    } else if (!editId && !isNew) {
      setShowProductModal(false);
      setEditingProduct(null);
    }
  }, [editId, isNew, products]);

  useEffect(() => {
    localStorage.setItem('barcode_show_generator', String(showBarcodeGenerator));
  }, [showBarcodeGenerator]);

  useEffect(() => {
    const navState = location.state as { productId?: string; fromSale?: string } | null;
    if (navState?.productId) {
      setSearchParams({ detail: navState.productId });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setSearchParams]);

  useEffect(() => {
    if (appPendingReturnTab === 'purchases') navigate('/inventory/history');
  }, [appPendingReturnTab, navigate]);

  useEffect(() => {
    const handleOpenProduct = (e: any) => {
      if (e.detail) setSearchParams({ detail: e.detail });
    };
    window.addEventListener('open-product-hub', handleOpenProduct);
    return () => window.removeEventListener('open-product-hub', handleOpenProduct);
  }, [setSearchParams]);

  const appCategories = useInventoryStore(s => s.categories);
  const appSuppliers = useInventoryStore(s => s.suppliers);

  const categories = useMemo(() => {
    const fromCatTable = (appCategories || []).map(c => {
      if (typeof c === 'object' && c !== null) return c.name;
      if (typeof c === 'string') return c;
      return '';
    }).filter(Boolean);
    const rawCategories = products.map((p: Product) => {
      const cat = p.category;
      if (typeof cat === 'string' && cat.trim().startsWith('{')) {
        try { return JSON.parse(cat).name || cat; } catch (_) {}
      }
      return cat;
    }).filter(Boolean);
    return ['All', ...Array.from(new Set([...fromCatTable, ...rawCategories])).sort()];
  }, [appCategories, products]);

  const suppliers = useMemo(() => {
    const fromSupTable = (appSuppliers || []).map(s => s?.name).filter(Boolean);
    const fromProducts = products.map(p => p.supplier).filter(Boolean) as string[];
    return ['All', ...Array.from(new Set([...fromSupTable, ...fromProducts])).sort()];
  }, [appSuppliers, products]);

  if (!appSettings || !appProducts) {
    return <div className="p-6 bg-gray-50 dark:bg-transparent"><SkeletonLoader type="list" count={6} /></div>;
  }

  const freshProduct = useMemo(() => {
    if (!detailProduct) return null;
    return (products || []).find(p => p && p.id === detailProduct.id) || detailProduct;
  }, [detailProduct, products]);

  return (
    <>
      {detailProduct && freshProduct && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50 dark:bg-app font-sans w-full max-w-[1400px] mx-auto">
          <ProductDetailHub
            product={freshProduct}
            onBack={() => {
              setDetailProduct(null);
              setSearchParams({});
              const navState = location.state as { fromSale?: string } | null;
              if (navState?.fromSale) {
                useUiStore.getState().setPendingReturnSaleId(navState.fromSale);
                navigate('/transactions');
              } else if (appPendingReturnTab) {
                const targetTab = appPendingReturnTab;
                useUiStore.getState().setPendingReturnTab(null);
                window.dispatchEvent(new CustomEvent('navigate', { detail: targetTab }));
              }
            }}
            onEdit={() => {}}
          />
        </div>
      )}

      {showProductModal && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50 dark:bg-app font-sans w-full max-w-[1400px] mx-auto">
          <ProductModal
            product={editingProduct}
            isOpen={true}
            onClose={() => {
              setShowProductModal(false);
              setEditingProduct(null);
              setSearchParams({});
            }}
          />
        </div>
      )}

      {!detailProduct && !showProductModal && !showBarcodeGenerator && (
        <div className="main-content-scroll p-1 sm:p-4 lg:p-6 space-y-3 lg:space-y-6 bg-gray-50 dark:bg-app max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))}
                icon={<ChevronLeft className="h-4 w-4" />}
                className="h-8 px-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08]"
              >
                <span className="hidden sm:inline text-[12px] font-medium">POS</span>
              </Button>

              <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <RealIcon name="inventory" size="sm" className="w-5 h-5" />
                <div>
                  <h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight">
                    Inventory Management
                  </h1>
                  <p className="text-[12px] text-neutral-500 font-normal tracking-tight mt-0.5">
                    Manage catalog, stock levels & barcodes
                  </p>
                </div>
              </div>
            </div>

            <ScrollableTabBar>
              {INVENTORY_TABS.filter(t => {
                if (t.id === 'purchases') return canViewRecords;
                if (t.id === 'purchase_orders') return appSettings.enablePurchaseOrders !== false && canManagePO;
                return true;
              }).map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate('/inventory/' + INTERNAL_TO_SUB_TAB_SEGMENT[tab.id])}
                    className={`group relative whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-2 px-3 h-8 rounded-full text-[12.5px] tracking-tight active:scale-95 border cursor-pointer select-none ${
                      isActive
                        ? 'bg-primary text-white font-bold border-primary shadow-xs'
                        : 'bg-white dark:bg-white/[0.05] text-neutral-900 dark:text-neutral-100 font-semibold border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                      <RealIcon name={tab.realIcon} size={20} />
                    </div>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </ScrollableTabBar>
          </div>

          {activeTab === 'inventory' ? (
            <ProductsList 
              appProducts={products}
              categories={categories}
              suppliers={suppliers}
              isAdmin={isAdmin}
              canManageStock={canManageStock}
              canEditProduct={canEditProduct}
              profile={profile}
              setEditingProduct={(p) => {
                setEditingProduct(p);
                if (p) setSearchParams({ edit: p.id });
                else setSearchParams({ new: '1' });
              }}
              setShowProductModal={setShowProductModal}
              handleEditProduct={(p) => {
                setDetailProduct(p);
                setSearchParams({ detail: p.id });
              }}
              setShowBarcodeGenerator={setShowBarcodeGenerator}
              showBarcodeGenerator={showBarcodeGenerator}
            />
          ) : activeTab === 'purchase_orders' ? (
            canManagePO ? <PurchaseOrderSystem /> : <div className="p-20 text-center uppercase font-black text-gray-600">Access Denied</div>
          ) : activeTab === 'purchases' ? (
            canViewRecords ? <PurchaseHistory /> : <div className="p-20 text-center uppercase font-black text-gray-600">Access Denied</div>
          ) : activeTab === 'bundles' ? (
            <BundleManager />
          ) : activeTab === 'groups' ? (
            <CategoriesList categories={categories} appProducts={products} appSettings={appSettings} setSelectedCategory={(_c) => {}} />
          ) : activeTab === 'suppliers' ? (
            <SupplierManager />
          ) : (
            <MediaLibrary isOpen={true} onClose={() => navigate('/inventory/products')} onSelect={() => {}} standalone={true} />
          )}

          {viewingSale && <ReceiptPrint sale={viewingSale} onClose={() => setViewingSale(null)} />}
        </div>
      )}
      {showBarcodeGenerator && (
        <ProductsList 
          appProducts={products} categories={categories} suppliers={suppliers} isAdmin={isAdmin} canManageStock={canManageStock} canEditProduct={canEditProduct} profile={profile}
          setEditingProduct={setEditingProduct} setShowProductModal={setShowProductModal} handleEditProduct={(p) => setDetailProduct(p)}
          setShowBarcodeGenerator={setShowBarcodeGenerator} showBarcodeGenerator={showBarcodeGenerator}
        />
      )}
    </>
  );
}
