import { useCartStore, useProductsStore, useSettingsStore } from '../../stores';
import { useState, useCallback, useEffect, useRef } from 'react';
import { normalizeBarcodeValue } from '../../utils/barcode';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { sonner } from '../../lib/sonner';
import { useHardwareScanner } from '../../hooks/useHardwareScanner';
import { usePOSKeyboard } from '../../hooks/usePOSKeyboard';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useCartActions } from './useCartActions';

export function usePOSTerminalData() {
  const _navigate = useNavigate();
const appSettings = useSettingsStore(s => s.settings);
const appCart = useCartStore(s => s.cart);
const appProducts = useProductsStore(s => s.products);
const appActiveSalesTab = useCartStore(s => s.activeSalesTab);
const _appSelectedCustomer = useCartStore(s => s.selectedCustomer);
  const appSalesTabs = useCartStore(s => s.salesTabs);

  const { _user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isReturnMode, setIsReturnMode] = useState(false);


  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null);
  const [pendingWeight, setPendingWeight] = useState<number | undefined>(undefined);

  const isTouchMode = appSettings.interfaceMode === 'touch';
  const posContainerRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { play } = useSoundFeedback();

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 140;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);
  const [_canScrollShortcutsLeft, setCanScrollShortcutsLeft] = useState(false);
  const [_canScrollShortcutsRight, setCanScrollShortcutsRight] = useState(false);

  const checkTabsScroll = useCallback(() => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollTabsLeft(scrollLeft > 0);
      setCanScrollTabsRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  const checkShortcutsScroll = useCallback(() => {
    if (shortcutsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = shortcutsRef.current;
      setCanScrollShortcutsLeft(scrollLeft > 0);
      setCanScrollShortcutsRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  useEffect(() => {
    checkTabsScroll();
    checkShortcutsScroll();
    
    const resizeObserver = new ResizeObserver(() => {
      checkTabsScroll();
      checkShortcutsScroll();
    });

    if (tabsRef.current) resizeObserver.observe(tabsRef.current);
    if (shortcutsRef.current) resizeObserver.observe(shortcutsRef.current);

    return () => resizeObserver.disconnect();
  }, [checkTabsScroll, checkShortcutsScroll]);

  useEffect(() => {
    // Only focus the POS container for Electron keyboard events
    posContainerRef.current?.focus({ preventScroll: true });
  }, []);

  // Lock background <main> container scrolling when any popup, mobile drawer or checkout is open
  useEffect(() => {
    const isAnyPopupOpen = isMobileCartOpen || showCheckout || isDraftsModalOpen || isShortcutsModalOpen || !!optionsProduct;
    const mainEl = document.querySelector('main');
    if (isAnyPopupOpen) {
      document.body.style.overflow = 'hidden';
      if (mainEl) {
        mainEl.style.overflow = 'hidden';
      }
    } else {
      const otherOpenModals = document.querySelectorAll('[data-modal="true"]');
      if (otherOpenModals.length === 0) {
        document.body.style.overflow = '';
      }
      if (mainEl) {
        mainEl.style.overflow = '';
      }
    }
    return () => {
      const otherOpenModals = document.querySelectorAll('[data-modal="true"]');
      if (otherOpenModals.length === 0) {
        document.body.style.overflow = '';
      }
      if (mainEl) {
        mainEl.style.overflow = '';
      }
    };
  }, [isMobileCartOpen, showCheckout, isDraftsModalOpen, isShortcutsModalOpen,
    setShowCheckout, optionsProduct]);

  const { addToCart, saveDraft, loadDraft, cartTotal } = useCartActions();

  const handleScan = useCallback((barcode: string) => {
    try {
      const term = barcode.trim();
      const normalizedTerm = normalizeBarcodeValue(term);

      // 1. Try exact match
      let scannedProduct = appProducts.find(
        (p: Product) => p.barcodeValue === term || p.barcode === term || p.sku === term
      );

      // 2. If not found, try normalized match (handles OCR confusion)
      if (!scannedProduct) {
        scannedProduct = appProducts.find((p: Product) => {
          const pBarcodeVal = normalizeBarcodeValue(p.barcodeValue);
          const pBarcode = normalizeBarcodeValue(p.barcode);
          const pSku = normalizeBarcodeValue(p.sku);
          return pBarcodeVal === normalizedTerm || pBarcode === normalizedTerm || pSku === normalizedTerm;
        });
      }

      if (!scannedProduct) {
        play('error');
        sonner.error(`Not found: ${term}`);
        return;
      }

      play('scan');
      addToCart(scannedProduct, undefined, isReturnMode, undefined, setOptionsProduct, setPendingWeight);

      if (scannedProduct.trackInventory && scannedProduct.stock <= 0) {
        // Warning is already handled inside addToCart, but adding explicit matching message just in case
        // sonner.warning(`⚠️ Out of stock: ${scannedProduct.name} — added but verify stock`);
      } else {
        sonner.success(`Added: ${scannedProduct.name}`);
      }
    } catch {
      sonner.error('Scanner error — check connection');
    }
  }, [appProducts, addToCart, isReturnMode]);

  useHardwareScanner(handleScan);

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handleCheckoutComplete = () => {
    // Note: setShowCheckout(false) is now handled by the modal's onClose callback 
    // to ensure ReceiptPrint has time to display/auto-print.

    // Clear current tab after successful checkout
    if (appActiveSalesTab) {
      useCartStore.getState().updateSalesTab({
          id: appActiveSalesTab,
          updates: { cart: [], selectedCustomer: null }
        });
    }
    play('payment');
  };

  const handleNewTab = () => {
    window.dispatchEvent(new CustomEvent('create-new-tab'));
  };

  const handleFocusSearch = () => {
    window.dispatchEvent(new CustomEvent('refocus-search'));
  };

  const handleClearCart = () => {
    if (appCart.length === 0) return;
    useCartStore.getState().clearCart();
  };

  // ── Keyboard Shortcuts ──
  usePOSKeyboard({
    isCheckoutOpen: showCheckout,
    onFocusSearch: handleFocusSearch,
    onCheckout: () => { if (appCart.length > 0) handleCheckout(); },
    onSaveDraft: saveDraft,
    onNewTab: handleNewTab,
    onToggleReturnMode: () => {
      setIsReturnMode(prev => !prev);
      window.dispatchEvent(new CustomEvent('refocus-search'));
    },
    onOpenDrafts: () => setIsDraftsModalOpen(true),
    onClearCart: handleClearCart,
  });
  return {
    posContainerRef,
    isTouchMode,
    scrollTabs,
    canScrollTabsLeft,
    canScrollTabsRight,
    tabsRef,
    checkTabsScroll,
    appSalesTabs,
    isReturnMode,
    setIsReturnMode,
    setIsShortcutsModalOpen,
    addToCart,
    setIsDraftsModalOpen,
    showCheckout,
    handleCheckout,
    saveDraft,
    isMobileCartOpen,
    setIsMobileCartOpen,
    appCart,
    cartTotal,
    appSettings,
    handleCheckoutComplete,
    isDraftsModalOpen,
    loadDraft,
    optionsProduct,
    setOptionsProduct,
    setPendingWeight,
    pendingWeight,
    isShortcutsModalOpen,
    setShowCheckout,
  };
}
