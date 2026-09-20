import React from 'react';
import { ShoppingCart, Keyboard, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { CheckoutPage } from './CheckoutPage';
import { SalesTabManager } from './SalesTabManager';
import { GridDensityController } from './GridDensityController';
import { DraftsModal } from './DraftsModal';
import { ProductOptionsModal } from './ProductOptionsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { formatCurrency } from '../../lib/currencies';
import { usePOSTerminalData } from './usePOSTerminalData';

export function POSTerminal() {
  const {
    posContainerRef, isTouchMode, scrollTabs, canScrollTabsLeft, canScrollTabsRight,
    tabsRef, checkTabsScroll, appSalesTabs, isReturnMode, setIsReturnMode,
    setIsShortcutsModalOpen, addToCart, setIsDraftsModalOpen, showCheckout,
    handleCheckout, saveDraft, isMobileCartOpen, setIsMobileCartOpen, appCart,
    cartTotal, appSettings, handleCheckoutComplete, isDraftsModalOpen, loadDraft,
    optionsProduct, setOptionsProduct, setPendingWeight, pendingWeight,
    isShortcutsModalOpen, setShowCheckout
  } = usePOSTerminalData();

  return (
    <div
      ref={posContainerRef}
      tabIndex={-1}
      className="flex flex-col md:flex-row h-full w-full bg-gray-50 dark:bg-app relative overflow-hidden transition-colors select-none outline-none"
    >
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-app transition-colors relative">
          <div className="bg-white dark:bg-surface px-2 py-0.5 sm:px-4 sm:py-2 border-b border-gray-200 dark:border-white/5 flex items-center justify-between shadow-sm z-10 transition-colors flex-shrink-0">
            <div className="flex items-center min-w-0 flex-1 md:shrink-0 mr-2 gap-1 lg:gap-2 justify-start">
              <div className="relative group flex items-center min-w-0 flex-shrink">
                <button
                  onClick={() => scrollTabs('left')}
                  style={{ minHeight: 'unset' }}
                  className={`absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 min-h-0 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shadow-md transition-opacity duration-200 active:scale-90 ${canScrollTabsLeft ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none hidden'}`}
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>

                <div
                  ref={tabsRef}
                  onScroll={checkTabsScroll}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-hide overscroll-x-contain touch-pan-x min-w-0 flex-shrink"
                >
                  <SalesTabManager showAddButton={false} />
                </div>

                <button
                  onClick={() => scrollTabs('right')}
                  style={{ minHeight: 'unset' }}
                  className={`absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 min-h-0 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shadow-md transition-opacity duration-200 active:scale-90 ${canScrollTabsRight ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none hidden'}`}
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {appSalesTabs.length < 3 && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('create-new-tab'))}
                  style={{ minHeight: 'unset' }}
                  className="w-6 h-6 lg:w-7 lg:h-7 min-h-0 flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded transition-colors border border-emerald-500/20 hover:bg-emerald-600 hover:text-white shrink-0 z-10"
                  title="Add New Tab"
                >
                  <Plus className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                </button>
              )}

              <div className="h-4 w-[1px] bg-neutral-200 dark:bg-white/10 shrink-0 hidden lg:block" />
              <GridDensityController />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setIsShortcutsModalOpen(true)}
                style={{ minHeight: 'unset' }}
                className="h-7 w-7 min-h-0 bg-neutral-100 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded transition-colors flex items-center justify-center shrink-0"
                title={"Shortcuts Guide"}
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-neutral-200 dark:bg-white/10 shrink-0 mx-0.5" />
              <span className={`text-[11px] font-mono uppercase tracking-wider leading-none ${isReturnMode ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500'}`}>
                {isReturnMode ? "Return" : "Sale"}
              </span>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isReturnMode}
                    onChange={(e) => {
                      setIsReturnMode(e.target.checked);
                      window.dispatchEvent(new CustomEvent('refocus-search'));
                    }}
                  />
                  <div className={`block w-7 h-4 lg:w-8 lg:h-5 rounded-full transition-colors ${isReturnMode ? 'bg-rose-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}></div>
                  <div className={`dot absolute left-[2px] top-[2px] bg-white w-3 h-3 lg:w-4 lg:h-4 rounded-full transition-transform ${isReturnMode ? 'transform translate-x-3' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ProductGrid
              onAddToCart={(p, w) => addToCart(p, w, isReturnMode)}
              onOpenDrafts={() => setIsDraftsModalOpen(true)}
              onAddTab={() => window.dispatchEvent(new CustomEvent('create-new-tab'))}
              isReturnMode={isReturnMode}
            />
          </div>
        </div>

        <div className={`hidden md:flex flex-col h-full p-2 lg:py-3 lg:pl-2 lg:pr-5 bg-gray-50 dark:bg-app flex-shrink-0 z-30 transition-all duration-300 overflow-hidden ${isTouchMode ? 'w-[410px]' : 'w-[340px]'}`}>
          <Cart onCheckout={handleCheckout} onSaveDraft={saveDraft} />
        </div>

        {appCart.length > 0 && (
          <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] left-3 right-3 max-w-md mx-auto h-[54px] px-3 rounded-[22px] bg-white/90 dark:bg-[#121214]/90 backdrop-blur-2xl backdrop-saturate-[180%] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_10px_30px_-4px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-between z-40 select-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-white/[0.08] flex items-center justify-center text-neutral-800 dark:text-neutral-100 transition-colors">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-mono font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#121214] shadow-xs">
                  {appCart.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold leading-none mb-0.5">{"Total"}</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white text-[14px] tabular-nums leading-tight truncate">{formatCurrency(cartTotal, appSettings.currency)}</span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-[12.5px] transition-all flex items-center gap-1.5 shadow-[0_2px_10px_rgba(16,185,129,0.35)] shrink-0 cursor-pointer"
            >
              <span>{"Review Cart"}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-85" />
            </button>
          </div>
        )}

        {isMobileCartOpen && (
          <div 
            data-modal="true"
            onClick={() => setIsMobileCartOpen(false)}
            className="md:hidden fixed inset-0 z-[1000] bg-black/70 transition-opacity flex items-center justify-center p-3 sm:p-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-surface w-full max-w-[480px] max-h-[calc(100dvh-2.5rem-env(safe-area-inset-top))] sm:max-h-[calc(90dvh-env(safe-area-inset-top))] rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-2xl flex flex-col animate-in fade-in duration-150 overflow-hidden"
            >
              <Cart
                onCheckout={() => {
                  setIsMobileCartOpen(false);
                  handleCheckout();
                }}
                onSaveDraft={() => {
                  setIsMobileCartOpen(false);
                  saveDraft();
                }}
                isMobileDrawer={true}
                onClose={() => setIsMobileCartOpen(false)}
              />
            </div>
          </div>
        )}

        {showCheckout && (
          <CheckoutPage
            onClose={() => setShowCheckout(false)}
            onComplete={handleCheckoutComplete}
          />
        )}

        <DraftsModal
          isOpen={isDraftsModalOpen}
          onClose={() => setIsDraftsModalOpen(false)}
          onLoadDraft={loadDraft}
        />

        {optionsProduct && (
          <ProductOptionsModal
            product={optionsProduct}
            isOpen={!!optionsProduct}
            onClose={() => {
              setOptionsProduct(null);
              setPendingWeight(undefined);
            }}
            onConfirm={(options: any) => {
              addToCart(optionsProduct, pendingWeight, isReturnMode, options);
              setOptionsProduct(null);
              setPendingWeight(undefined);
            }}
          />
        )}

        <ShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
      </div>
    </div>
  );
}