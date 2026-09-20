import { useCustomersStore, useExpensesStore, usePaymentsStore, useSalesStore, useSettingsStore, useUiStore, useUsersStore } from '../../stores';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, History } from 'lucide-react';
import { useApp } from '../../context/SupabaseAppContext';
import { useAuth } from '../../context/AuthContext';
import { getTimezone } from '../../lib/dateUtils';
import { getCurrencySymbol } from '../../lib/currencies';
import { Sale } from '../../types';
import { ReceiptPrint } from '../pos/ReceiptPrint';
import { normalizePaymentMethod, salesService } from '../../lib/services';
import { TransactionDetailModal } from './TransactionDetailModal';
import { ExportButton } from '../../shared/export';
import { Button, RealIcon } from '../../shared/ui';
import { TransactionTable, computeWalletTotals, buildExportColumns, buildExportRows } from './TransactionTable';
import { TransactionFilters } from './TransactionFilters';
import { TransactionHeaderCards } from './TransactionHeaderCards';
import { isDraftSale, computeDateRange } from './TransactionsManager.utils';
import { useCloudSearch } from './TransactionsManager.cloudSearch';

export function TransactionsManager() {
  const navigate = useNavigate();
  const appSettings = useSettingsStore(s => s.settings);
  const appSales = useSalesStore(s => s.sales);
  const appPendingReturnSaleId = useUiStore(s => s.pendingReturnSaleId);
  const appPendingSearch = useUiStore(s => s.pendingSearch);
  const appUsers = useUsersStore(s => s.users);
  const appExpenses = useExpensesStore(s => s.expenses);
  const appPayments = usePaymentsStore(s => s.payments);
  const appCustomers = useCustomersStore(s => s.customers);
  const { loadMoreSales } = useApp();
  const { profile } = useAuth();
  // admin/manager see cost+profit export columns; cashier limited (RBAC matrix)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const timezone = getTimezone(appSettings.country);
  const { retailEnabled, wholesaleEnabled } = appSettings;
  const showRetail = retailEnabled !== false;
  const showWholesale = !!wholesaleEnabled;
  const activeCardsCount = 2 + (showRetail ? 1 : 0) + (showWholesale ? 1 : 0);

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sales' | 'refunds'>('all');
  const [selectedCashier, setSelectedCashier] = useState('all');
  const [selectedSalesman, setSelectedSalesman] = useState('all');
  const [_isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshKey, _setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchSales = async () => {
      try {
        const sales = await salesService.getAll();
        if (mounted && sales) {
          useSalesStore.getState().setSales(sales);
        }
      } catch (err) {
        console.error('[TransactionsManager] Failed to load sales:', err);
      }
    };

    fetchSales();

    const handleFocus = () => fetchSales();
    window.addEventListener('focus', handleFocus);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pos_last_sale_event') {
        fetchSales();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshKey]);

  const { isSearchingRemote } = useCloudSearch({
    searchTerm,
    paymentFilter,
    saleTypeFilter,
    selectedCashier,
    selectedSalesman,
    dateFilter,
    startDateInput,
    endDateInput,
    timezone,
    refreshKey,
    loadMoreSales,
  });

  const _handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMoreSales(appSales.length, 100);
    setIsLoadingMore(false);
  };

  const [selectedTransaction, setSelectedTransaction] = useState<Sale | null>(null);
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);

  React.useEffect(() => {
    if (appPendingReturnSaleId) {
      const saleToOpen = appSales.find(s => s.id === appPendingReturnSaleId);
      if (saleToOpen) {
        setSelectedTransaction(saleToOpen);
      }
      useUiStore.getState().setPendingReturnSaleId(null);
    }
  }, [appPendingReturnSaleId, appSales]);

  const [currentPage, setCurrentPage] = useState(1);
  const [ITEMS_PER_PAGE, setPageSize] = useState(15);

  React.useEffect(() => {
    if (appPendingSearch) {
      setSearchTerm(appPendingSearch);
      setCurrentPage(1);
      useUiStore.getState().setPendingSearch(null);
    }
  }, [appPendingSearch]);

  const { startTs, endTs } = useMemo(() => computeDateRange(dateFilter, startDateInput, endDateInput, timezone), [dateFilter, startDateInput, endDateInput, timezone]);

  const filteredTransactions = useMemo(() => {
    return (appSales || []).filter(sale => {
      if (isDraftSale(sale)) return false;
      if (sale.status === 'pending' || sale.status === 'deleted' || sale.status === 'void') return false;
      const inv = sale.invoiceNumber ? String(sale.invoiceNumber).trim() : '';
      const rec = sale.receiptNumber ? String(sale.receiptNumber).trim() : '';
      if ((!inv || inv === 'undefined') && (!rec || rec === 'undefined')) return false;

      const saleTs = new Date(sale.timestamp).getTime();
      if (saleTs < startTs || saleTs > endTs) return false;

      const matchesSearch = !searchTerm.trim() || (
        (sale.receiptNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.invoiceNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.customerName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.cashier ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesPayment = paymentFilter === 'all' ||
        sale.paymentMethod === paymentFilter ||
        (sale.paymentMethod === 'split' && (sale.splitPayments || []).some((sp: any) => sp.method === paymentFilter || normalizePaymentMethod(sp.method) === paymentFilter));
      const matchesSaleType = saleTypeFilter === 'all' || sale.saleType === saleTypeFilter || (!sale.saleType && saleTypeFilter === 'retail');
      const matchesCashier = selectedCashier === 'all' || sale.cashier === selectedCashier;
      const matchesSalesman = selectedSalesman === 'all' || sale.salesmanName === selectedSalesman;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'sales'
          ? (sale.status !== 'refunded' && sale.status !== 'partially_refunded')
          : (sale.status === 'refunded' || sale.status === 'partially_refunded'));
      return matchesSearch && matchesPayment && matchesSaleType && matchesCashier && matchesSalesman && matchesStatus;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [appSales, startTs, endTs, searchTerm, paymentFilter, saleTypeFilter, selectedCashier, selectedSalesman, statusFilter]);

  const totalRevenue = filteredTransactions.reduce((s, x) => s + (x.total - (x.refundedAmount || 0)), 0);
  const totalItemsSold = filteredTransactions.reduce((s, x) => s + (x.items || []).reduce((i, item) => i + item.quantity, 0), 0);
  const retailSalesTotal = useMemo(() => {
    return filteredTransactions
      .filter(t => t.saleType === 'retail' || !t.saleType)
      .reduce((sum, t) => sum + (t.total - (t.refundedAmount || 0)), 0);
  }, [filteredTransactions]);
  const wholesaleSalesTotal = useMemo(() => {
    return filteredTransactions
      .filter(t => t.saleType === 'wholesale')
      .reduce((sum, t) => sum + (t.total - (t.refundedAmount || 0)), 0);
  }, [filteredTransactions]);
  const walletTotals = computeWalletTotals(filteredTransactions, appExpenses, appPayments, startTs, endTs);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const canEditSale = isAdmin || profile?.canEditSale;
  const canDeleteSale = isAdmin || profile?.canDeleteSale;

  const exportColumns = useMemo(() => buildExportColumns(isAdmin), [isAdmin]);
  const exportRows = useMemo(() => buildExportRows(filteredTransactions, appCustomers, appUsers, isAdmin, appSettings.country, appSettings.timezone), [filteredTransactions, appCustomers, appUsers, isAdmin, appSettings.country, appSettings.timezone]);

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 space-y-3 lg:space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate('/pos')}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="h-8 px-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08] shrink-0"
          >
            <span className="hidden sm:inline text-[12px] font-medium">POS</span>
          </Button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <RealIcon name="sales" size="sm" />
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight truncate">
                Sales & Transactions
              </h1>
              <p className="text-[11px] sm:text-[12px] text-neutral-500 font-normal tracking-tight mt-0.5">
                {isSearchingRemote ? "Searching all records..." : (
                  <>
                    <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{filteredTransactions.length}</span> records
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <ExportButton
            data={exportRows}
            columns={exportColumns}
            title="Sales Detailed Report"
            filtersSummary={`${appSettings.currency} • ${filteredTransactions.length} records`}
            currencySymbol={getCurrencySymbol(appSettings.currency)}
            className="h-8 !px-2.5 sm:!px-3 !text-[11px] sm:!text-[12px] !font-medium !rounded !shadow-none shrink-0"
          />
        )}
      </div>

      <TransactionHeaderCards
        totalRevenue={totalRevenue}
        retailSalesTotal={retailSalesTotal}
        wholesaleSalesTotal={wholesaleSalesTotal}
        totalItemsSold={totalItemsSold}
        walletTotals={walletTotals}
        appSettings={appSettings}
        showRetail={showRetail}
        showWholesale={showWholesale}
        activeCardsCount={activeCardsCount}
      />

      <TransactionFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        saleTypeFilter={saleTypeFilter}
        setSaleTypeFilter={setSaleTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        selectedCashier={selectedCashier}
        setSelectedCashier={setSelectedCashier}
        selectedSalesman={selectedSalesman}
        setSelectedSalesman={setSelectedSalesman}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        startDateInput={startDateInput}
        setStartDateInput={setStartDateInput}
        endDateInput={endDateInput}
        setEndDateInput={setEndDateInput}
        setCurrentPage={setCurrentPage}
      />

      <TransactionTable
        transactions={paginatedTransactions}
        filteredCount={filteredTransactions.length}
        isSearchingRemote={isSearchingRemote}
        currency={appSettings.currency}
        country={appSettings.country}
        canEditSale={!!canEditSale}
        canDeleteSale={!!canDeleteSale}
        onView={setSelectedTransaction}
        onReprint={setReprintSale}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={ITEMS_PER_PAGE}
        onPageSizeChange={setPageSize}
      />

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          allTransactions={filteredTransactions}
          onNavigate={setSelectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onReprint={sale => setReprintSale(sale)}
        />
      )}
      {reprintSale && <ReceiptPrint sale={reprintSale} onClose={() => setReprintSale(null)} />}
    </div>
  );
}
