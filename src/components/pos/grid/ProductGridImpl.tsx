import { useSalesStore } from '../../../stores';
import { useAppStore, useCartStore, useProductsStore, useSettingsStore } from '../../../stores';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CameraScanner } from '../../../shared/ui/CameraScanner';
import { Product } from '../../../types';
import { getCurrencySymbol } from '../../../lib/currencies';
import { settingsService } from '../../../lib/services';
import { normalizeBarcodeValue } from '../../../utils/barcode';
import { sonner } from '../../../lib/sonner';
import { SkeletonLoader } from '../../../shared/ui/SkeletonLoader';
import { GridControls } from './GridControls';
import { ProductCard } from './ProductCard';
import { BundleGrid } from './BundleGrid';
import { getGridClasses } from './gridClasses';
import { useGridSearchFocus } from './useGridSearchFocus';
import { filterProducts, findProductByBarcode } from './filterGridProducts';

interface ProductGridProps {
  onAddToCart: (product: Product, weight?: number) => void;
  onOpenDrafts?: () => void;
  onAddTab?: () => void;
  isReturnMode?: boolean;
}

export function ProductGrid({ onAddToCart, onOpenDrafts, onAddTab: _onAddTab, isReturnMode = false }: ProductGridProps) {
  const _navigate = useNavigate();
  const appProducts = useProductsStore(s => s.products);
  const appSales = useSalesStore(s => s.sales);
  const appSettings = useSettingsStore(s => s.settings);
  const appCart = useCartStore(s => s.cart);
  const appBundles = useAppStore(s => s.bundles);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const prevSearchRef = useRef('');
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useGridSearchFocus(searchRef);

  useEffect(() => {
    const prev = prevSearchRef.current;
    if (searchTerm !== '' && prev === '' && selectedCategory !== 'All') {
      setSelectedCategory('All');
    }
    prevSearchRef.current = searchTerm;
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 3) return;

    const timer = setTimeout(() => {
      const found = findProductByBarcode(appProducts, term, false);

      if (found) {
        onAddToCart(found);
        setSearchTerm('');
        sonner.success(`Added: ${found.name}`);

        if (!isMobileDevice) {
          setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 50);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, appProducts, onAddToCart]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = e.currentTarget.value.trim();
      if (barcode.length < 2) return;
      e.preventDefault();

      const found = findProductByBarcode(appProducts, barcode, true);

      if (found) {
        onAddToCart(found);
        setSearchTerm('');
        sonner.success(`Added: ${found.name}`);

        if (!isMobileDevice) {
          setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 50);
        }
      }
    }
  };

  const draftsCount = (appSales ?? []).filter(sale => sale.notes?.includes('DRAFT_SALE')).length;
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && /Macintosh/i.test(navigator.userAgent));

  const filteredProducts = useMemo(() => filterProducts(appProducts, searchTerm, selectedCategory), [appProducts, searchTerm, selectedCategory]);

  const categories = ['All', '__BUNDLES__', ...Array.from(new Set((appProducts ?? []).map(p => p.category))).filter(Boolean)];
  const isTouchMode = appSettings?.interfaceMode === 'touch';

  const checkScrollButtons = () => {
    if (categoriesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const categoriesElement = categoriesRef.current;
    if (categoriesElement) {
      categoriesElement.addEventListener('scroll', checkScrollButtons, { passive: true });
      return () => categoriesElement.removeEventListener('scroll', checkScrollButtons);
    }
  }, [categories]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const scrollAmount = 200;
      const currentScroll = categoriesRef.current.scrollLeft;
      const targetScroll = direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount;
      categoriesRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const _handleColumnChange = (cols: number) => {
    useSettingsStore.getState().setSettings({ posGridColumns: cols });

    // Removed DB sync since grid columns are a local device UI preference

    sonner.success(`Grid density set to ${cols} columns`);
  };

  const gridCols = appSettings?.posGridColumns ?? 4;

  if (!appSettings || !appProducts) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-transparent">
        <SkeletonLoader type="grid" count={8} />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-white dark:bg-app transition-colors h-full overflow-hidden">
        <GridControls
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchRef={searchRef}
          onOpenDrafts={onOpenDrafts}
          draftsCount={draftsCount}
          setShowScanner={setShowScanner}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          showLeftScroll={showLeftScroll}
          showRightScroll={showRightScroll}
          scrollCategories={scrollCategories}
          categoriesRef={categoriesRef}
          isTouchMode={isTouchMode}
          onSearchKeyDown={handleSearchKeyDown}
        />

        <div className="flex-1 p-2 lg:p-6 overflow-y-auto min-h-0 bg-gray-50/50 dark:bg-transparent custom-scrollbar pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-8"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {selectedCategory === '__BUNDLES__' ? (
            <BundleGrid onAddToCart={onAddToCart} currency={getCurrencySymbol(appSettings.currency)} isTouchMode={isTouchMode} isReturnMode={isReturnMode} gridCols={gridCols} appBundles={appBundles} appProducts={appProducts} appCart={appCart} />
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="h-10 w-10 text-neutral-400 mb-2 opacity-60" />
              <p className="text-neutral-900 dark:text-white text-[13px] font-semibold">{"No products found"}</p>
              <p className="text-[12px] text-neutral-500 font-mono mt-0.5">Try searching with a different term or category</p>
            </div>
          ) : (
            <div className={getGridClasses(gridCols)}>
              {filteredProducts.map((product) => {
                const cartItem = appCart.find(item => !item.bundleId && !item.bundle_id && item.product.id === product.id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onUpdateQuantity={(p, d) => {
                      const idx = appCart.findIndex(item => !item.bundleId && !item.bundle_id && item.product.id === p.id);
                      if (idx >= 0) {
                        const item = appCart[idx];
                        const newQty = item.quantity + d;
                        const price = p.price;
                        let updatedDiscount = item.discount || 0;
                        if (item.discountValue && item.discountValue > 0) {
                          if (item.discountType === 'percentage') {
                            updatedDiscount = (price * newQty * item.discountValue) / 100;
                          } else {
                            updatedDiscount = Math.sign(newQty) * item.discountValue;
                          }
                        }
                        if (newQty === 0) {
                          updatedDiscount = 0;
                        }
                        useCartStore.getState().updateCartItem({
                            index: idx,
                            item: {
                              ...item,
                              quantity: newQty,
                              discount: updatedDiscount,
                              subtotal: (price * newQty) - updatedDiscount
                            }
                          });
                      } else if (d > 0) {
                        onAddToCart(p);
                      }
                    }}
                    cartQuantity={cartItem?.quantity || 0}
                    currency={getCurrencySymbol(appSettings.currency)}
                    isTouchMode={isTouchMode}
                    gridCols={gridCols}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <CameraScanner
          isContinuous={true}
          onScan={(code) => {
            const term = code.trim();
            setSearchTerm(term);

            const normalizedCode = normalizeBarcodeValue(term);

            const product = appProducts.find((p: Product) => {
              const pBarcode = (p.barcode || '').toUpperCase().replace(/O/g, '0');
              const pSku = (p.sku || '').toUpperCase().replace(/O/g, '0');
              const pBarcodeVal = (p.barcodeValue || '').toUpperCase().replace(/O/g, '0');

              if (p.barcodeValue === term || p.barcode === term || p.sku === term) return true;
              return pBarcodeVal === normalizedCode || pBarcode === normalizedCode || pSku === normalizedCode;
            });

            if (product) {
              onAddToCart(product);
              setSearchTerm('');
            } else {
              sonner.error(`Barcode not found: ${term}`);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}

export default ProductGrid;
