import { useCustomersStore, useSalesStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Mail, CreditCard, Users, Receipt, ChevronLeft } from 'lucide-react';
import { Customer } from '../../types';
import { can } from '../../lib/permissions';
import { CustomerModal } from './CustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { sonner } from '../../lib/sonner';
import { formatCurrency } from '../../lib/currencies';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { Button } from '../../shared/ui';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { CustomerTable } from './CustomerTable';
import {
  CURRENCY_DIAL_CODE,
  computeCustomerDateRange,
  filterCustomers,
  filterSalesByDate,
  computeActiveCustomers,
  getCustomerTotalPurchases,
  computeTotalPurchases,
} from './customerManagerUtils';

export function CustomerManager() {
  const navigate = useNavigate();
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSettings = useSettingsStore(s => s.settings);
  const appCustomers = useCustomersStore(s => s.customers);
  const appSales = useSalesStore(s => s.sales);
  const canManageCustomers = can(appCurrentUser?.role, 'manage_customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ITEMS_PER_PAGE, setPageSize] = useState(25);

  const { validStartDate, validEndDate } = useMemo(() =>
    computeCustomerDateRange(dateFilter, startDateInput, endDateInput, appSettings.country),
    [dateFilter, startDateInput, endDateInput, appSettings.country]);

  const filteredCustomers = useMemo(() =>
    filterCustomers(appCustomers, appSales, searchTerm, dateFilter, validStartDate, validEndDate, appSettings.country),
    [appCustomers, appSales, searchTerm, dateFilter, validStartDate, validEndDate, appSettings.country]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!canManageCustomers) { sonner.error('You do not have permission to delete customers.'); return; }
    const hasLinkedSales = appSales.some(s => s.customerId === customerId);
    let proceed = false;

    if (hasLinkedSales) {
      const result = await sonner.confirm(
        "Delete Customer?",
        "This customer has linked sales. Their sales history will remain in your records assigned to Guest. Delete the customer profile anyway?",
        "YES, DELETE PROFILE"
      );
      proceed = result.isConfirmed;
    } else {
      const result = await sonner.deleteConfirm('customer');
      proceed = result.isConfirmed;
    }

    if (!proceed) return;

    try {
      sonner.loading('Deleting customer...');
      const { customersService } = await import('../../lib/services');
      await customersService.delete(customerId);
      useCustomersStore.getState().deleteCustomer(customerId);
      sonner.success('Customer deleted successfully!');
    } catch (error) {
      console.error('Error deleting customer:', error);
      sonner.error('Failed to delete customer. Please try again.');
    } finally {
      sonner.close();
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  const handleWhatsAppRedirect = (phone: string) => {
    if (!phone) return;
    let digits = phone.replace(/\D/g, '');

    const dialCode = CURRENCY_DIAL_CODE[appSettings.currency] || '92';

    if (!digits.startsWith(dialCode)) {
      if (digits.startsWith('0')) {
        digits = dialCode + digits.substring(1);
      } else {
        digits = dialCode + digits;
      }
    }

    window.open(`https://wa.me/${digits}`, '_blank');
  };

  const filteredSalesByDate = useMemo(() =>
    filterSalesByDate(appSales, validStartDate, validEndDate, dateFilter, appSettings.country),
    [appSales, validStartDate, validEndDate, dateFilter, appSettings.country]);

  const totalCustomers = appCustomers.length;

  const totalPurchases = useMemo(() =>
    computeTotalPurchases(appCustomers, dateFilter, filteredSalesByDate),
    [appCustomers, dateFilter, filteredSalesByDate]);

  const getCustomerTotalPurchasesFn = (customerId: string, defaultTotal: number | undefined) =>
    getCustomerTotalPurchases(
      dateFilter === 'all' ? appSales : filteredSalesByDate,
      customerId,
      defaultTotal
    );

  const averagePurchase = totalCustomers > 0 ? totalPurchases / totalCustomers : 0;

  const activeCustomers = useMemo(() =>
    computeActiveCustomers(appCustomers, appSettings.country),
    [appCustomers, appSettings.country]);

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-6 max-w-[1400px] mx-auto">
      {/* Layer 1: Identity & Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pos')}
            className="!p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-5 h-5 text-neutral-400 dark:text-neutral-500 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[15px] sm:text-lg font-semibold tracking-tight text-neutral-900 dark:text-white truncate">
                Customers
              </h1>
              <p className="text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 font-normal mt-0.5">
                CRM Directory • <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{appCustomers.length}</span> Records
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleAddCustomer}
          icon={<Plus className="h-3.5 w-3.5" />}
          className="shrink-0 h-8 !px-2.5 sm:!px-3 !text-[11px] sm:!text-[12px]"
        >
          {"Add Customer"}
        </Button>
      </div>

      {/* Layer 2: Filter Toolbar */}
      <div className="bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
          <div className="flex-1 min-w-0">
            <SharedSearchBar
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
              placeholder={"Search customers..."}
            />
          </div>

          <div className="w-full sm:w-auto min-w-0 shrink-0">
            <SearchableSelect
              label={"RANGE"}
              options={[
                { id: 'all', label: "ALL TIME" },
                { id: 'today', label: "TODAY" },
                { id: 'yesterday', label: "YESTERDAY" },
                { id: 'last7', label: "LAST 7 DAYS" },
                { id: 'thisMonth', label: "THIS MONTH" },
                { id: 'lastMonth', label: "PREVIOUS MONTH" },
                { id: 'custom', label: "CUSTOM RANGE" }
              ]}
              value={dateFilter}
              onChange={setDateFilter}
              icon={Receipt}
            />
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-2.5 pt-2.5 border-t border-neutral-200 dark:border-white/[0.08] w-full">
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full sm:flex-1 h-8 px-2.5 text-[12px] font-mono bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary"
            />
            <span className="hidden sm:block text-[11px] text-neutral-500 uppercase tracking-tight">to</span>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-full sm:flex-1 h-8 px-2.5 text-[12px] font-mono bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-white outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* Layer 3: Flat Linear Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", icon: User, value: totalCustomers, sub: "Profiles" },
          { label: "Total Sales", icon: CreditCard, value: formatCurrency(totalPurchases, appSettings.currency) },
          { label: "Average Sale", icon: Mail, value: formatCurrency(averagePurchase, appSettings.currency) },
          { label: "Active (30d)", icon: Users, value: activeCustomers }
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {item.label}
              </span>
              <item.icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {item.value}
              </span>
              {item.sub && (
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {item.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main View Container (Pinned Height for Pagination) */}
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none sm:min-h-[calc(100vh-320px)] min-h-[280px] flex flex-col justify-between">
        <CustomerTable
          filteredCustomers={filteredCustomers}
          paginatedCustomers={paginatedCustomers}
          appSettings={appSettings}
          canManageCustomers={canManageCustomers}
          currentPage={currentPage}
          totalPages={totalPages}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
          handleViewCustomer={handleViewCustomer}
          handleEditCustomer={handleEditCustomer}
          handleDeleteCustomer={handleDeleteCustomer}
          handleWhatsAppRedirect={handleWhatsAppRedirect}
          getCustomerTotalPurchases={getCustomerTotalPurchasesFn}
        />
      </div>

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customer={editingCustomer}
      />

      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
}
