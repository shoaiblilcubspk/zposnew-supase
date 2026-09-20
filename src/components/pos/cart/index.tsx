import { useAppStore, useCartStore, useCustomersStore, useSettingsStore } from '../../../stores';
import { useEffect, useState } from 'react';
import {
  User, ShoppingCart, X,
  Eraser, MessageCircle, Edit2, Eye,
} from 'lucide-react';
import { CustomerDetailModal } from '../../customers/CustomerDetailModal';
import { customersService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import { Customer } from '../../../types';
import { getDealCountBreakdown } from '../../../lib/utils';
import { useCartCalculations } from '../../../hooks/useCartCalculations';
import { CartItemList } from './CartItemList';
import { CartFooter } from './CartFooter';
import { CustomerSearchDropdown } from './CustomerSearchDropdown';

interface CartProps {
  onCheckout: () => void;
  onSaveDraft: () => void;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

export function Cart({ onCheckout, onSaveDraft, isMobileDrawer, onClose }: CartProps) {
  const appSettings = useSettingsStore(s => s.settings);
  const appCart = useCartStore(s => s.cart);
  const appBundles = useAppStore(s => s.bundles);
  const appCustomers = useCustomersStore(s => s.customers);
  const appBillDiscountValue = useCartStore(s => s.billDiscountValue);
  const appActiveSalesTab = useCartStore(s => s.activeSalesTab);
  const appEditingSaleId = useCartStore(s => s.editingSaleId);
  const appSelectedCustomer = useCartStore(s => s.selectedCustomer);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [billDiscountInput, setBillDiscountInput] = useState('');
  const [showPromoModal, setShowPromoModal] = useState(false);

  const isTouchMode = appSettings.interfaceMode === 'touch';

  const { subtotal, taxAmount, total, activePromotions, freeGifts, billDiscountAmount, isBelowCost, manualItemDiscountTotal } =
    useCartCalculations();

  const cartItems = appCart;
  const { label: dealLabel } = getDealCountBreakdown(cartItems, appBundles);

  const selectCustomer = (customer: Customer) => {
    useCartStore.getState().setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    setCustomerSearch('');
    setIsAddingCustomer(false);
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      sonner.alert('Error!', 'Name and Phone are required.');
      return;
    }
    try {
      const customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: '',
        priceTier: 'retail',
        totalPurchases: 0,
      };
      const created = await customersService.create(customerData);
      useCustomersStore.getState().addCustomer(created);
      useCartStore.getState().setSelectedCustomer(created);
      setIsAddingCustomer(false);
      setShowCustomerSearch(false);
      setCustomerSearch('');
      setNewCustomer({ name: '', phone: '', email: '' });
      sonner.success('Customer added and selected.');
    } catch {
      sonner.alert('Error!', 'Failed to create customer.');
    }
  };

  const filteredCustomers = appCustomers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes((customerSearch || '').toLowerCase()) ||
      (c.email || '').toLowerCase().includes((customerSearch || '').toLowerCase()) ||
      (c.phone || '').includes(customerSearch || '')
  );

  useEffect(() => {
    setBillDiscountInput(appBillDiscountValue > 0 ? String(appBillDiscountValue) : '');
  }, [appBillDiscountValue, appActiveSalesTab]);

  return (
    <div
      className={`
        bg-white dark:bg-surface flex flex-col transition-all duration-150
        border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none
        ${isMobileDrawer
          ? 'w-full h-full rounded-md'
          : `rounded-md
             ${isTouchMode ? 'w-full lg:w-[410px]' : 'w-full lg:w-[340px]'}
             h-full`
        }
      `}
    >
      {/* ══ HEADER ══ */}
      <div className="shrink-0 pl-3 pr-4 pt-2.5 pb-2 border-b border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface z-30">
        {/* Title row */}
        <div className="flex items-start sm:items-center justify-between mb-1.5">
          <div className="flex items-start sm:items-center gap-2 flex-wrap">
            <h2 className={`font-semibold text-neutral-900 dark:text-white flex items-center ${isTouchMode ? 'text-base' : 'text-[13px]'}`}>
              {"Cart"}
            </h2>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider whitespace-normal">
              {dealLabel}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {appCart.length > 0 && (
              <button
                onClick={() =>
                  sonner.confirm('Clear Cart?', 'Remove all items?').then((r) => r.isConfirmed && useCartStore.getState().clearCart())
                }
                className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors flex items-center gap-1"
                title="Clear Cart"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
            )}
            {isMobileDrawer && onClose ? (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            ) : (
              <ShoppingCart className="h-4 w-4 text-gray-600 dark:text-gray-500" />
            )}
          </div>
        </div>

        {/* Editing Sale Banner */}
        {appEditingSaleId && (
          <div className="mb-2 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-amber-500 rounded flex items-center justify-center">
                <Edit2 className="h-3 w-3 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-none">
                  {"Editing Sale"}
                </p>
                <p className="text-[10px] font-mono text-amber-600/70 mt-0.5">ID: {appEditingSaleId.substring(0, 12)}...</p>
              </div>
            </div>
            <button
              onClick={() => {
                sonner.confirm('Cancel Edit?', 'The current changes will be lost and the original bill will remain as is.').then(r => {
                  if (r.isConfirmed) useCartStore.getState().clearCart();
                });
              }}
              className="flex items-center gap-1.5 px-3 h-7 bg-amber-500 text-white rounded-full text-[11px] font-bold uppercase tracking-wider active:scale-95 transition-all shadow-sm shadow-amber-500/20"
            >
              <X className="h-3.5 w-3.5" /> <span>{"Cancel"}</span>
            </button>
          </div>
        )}

        {/* Customer row */}
        <div className="relative">
          {appSelectedCustomer ? (
            <div className="flex items-center justify-between bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 rounded-full px-3.5 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 dark:text-emerald-300 truncate leading-none">
                  {appSelectedCustomer.name}
                </p>
                <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                  {appSelectedCustomer.phone || appSelectedCustomer.email}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {appSelectedCustomer.phone && (
                  <button
                    onClick={() => {
                      const clean = appSelectedCustomer!.phone.replace(/\D/g, '');
                      window.open(`https://wa.me/${clean}`, '_blank');
                    }}
                    className="p-1.5 text-primary hover:bg-emerald-500/10 rounded-full transition-all active:scale-95"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setViewingCustomer(appSelectedCustomer)}
                  className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-full transition-all active:scale-95"
                  title="View Customer"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => useCartStore.getState().setSelectedCustomer(null)}
                  className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-full transition-all active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerSearch(true)}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-full border border-dashed border-gray-300 dark:border-white/10 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:border-emerald-400 hover:text-primary hover:bg-emerald-500/5 active:scale-95 transition-all"
            >
              <User className="h-3.5 w-3.5" />
              {"Select Customer"}
            </button>
          )}

          {/* ── Customer Search Dropdown ── */}
          {showCustomerSearch && (
            <CustomerSearchDropdown
              showCustomerSearch={showCustomerSearch}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              isAddingCustomer={isAddingCustomer}
              setIsAddingCustomer={setIsAddingCustomer}
              newCustomer={newCustomer}
              setNewCustomer={setNewCustomer}
              filteredCustomers={filteredCustomers}
              selectCustomer={selectCustomer}
              setViewingCustomer={setViewingCustomer}
              setShowCustomerSearch={setShowCustomerSearch}
              handleQuickAddCustomer={handleQuickAddCustomer}
            />
          )}
        </div>
      </div>

      {/* ══ CART ITEMS ══ */}
      <CartItemList activePromotions={activePromotions} />

      {/* ══ SUMMARY + CHECKOUT ══ */}
      {appCart.length > 0 && (
        <CartFooter
          subtotal={subtotal}
          taxAmount={taxAmount}
          manualItemDiscountTotal={manualItemDiscountTotal}
          activePromotions={activePromotions}
          freeGifts={freeGifts}
          billDiscountAmount={billDiscountAmount}
          isBelowCost={isBelowCost}
          total={total}
          billDiscountInput={billDiscountInput}
          setBillDiscountInput={setBillDiscountInput}
          showPromoModal={showPromoModal}
          setShowPromoModal={setShowPromoModal}
          onSaveDraft={onSaveDraft}
          onCheckout={onCheckout}
        />
      )}

      {/* Customer Profile Viewer */}
      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
}
