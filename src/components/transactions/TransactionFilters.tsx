import React from 'react';
import { LayoutGrid, User, Briefcase, Store, Package } from 'lucide-react';
import { useUsersStore, useSalesStore, useSettingsStore } from '../../stores';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { SegmentedControl, DateRangePicker } from '../../shared/ui';
import { SharedSearchBar } from '../../shared/modules/search-and-list';

interface TransactionFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  saleTypeFilter: 'all' | 'retail' | 'wholesale';
  setSaleTypeFilter: (v: 'all' | 'retail' | 'wholesale') => void;
  statusFilter: 'all' | 'sales' | 'refunds';
  setStatusFilter: (v: 'all' | 'sales' | 'refunds') => void;
  paymentFilter: string;
  setPaymentFilter: (v: string) => void;
  selectedCashier: string;
  setSelectedCashier: (v: string) => void;
  selectedSalesman: string;
  setSelectedSalesman: (v: string) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  startDateInput: string;
  setStartDateInput: (v: string) => void;
  endDateInput: string;
  setEndDateInput: (v: string) => void;
  setCurrentPage: (v: number) => void;
}

export function TransactionFilters({
  searchTerm,
  setSearchTerm,
  saleTypeFilter,
  setSaleTypeFilter,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
  selectedCashier,
  setSelectedCashier,
  selectedSalesman,
  setSelectedSalesman,
  dateFilter,
  setDateFilter,
  startDateInput,
  setStartDateInput,
  endDateInput,
  setEndDateInput,
  setCurrentPage,
}: TransactionFiltersProps) {
  const appUsers = useUsersStore(s => s.users);
  const appSalesmen = useUsersStore(s => s.salesmen);
  const appSales = useSalesStore(s => s.sales);
  const appSettings = useSettingsStore(s => s.settings);

  const cashiersList = React.useMemo(() => {
    const userNames = appUsers.map(u => u.name).filter(c => c && c.toUpperCase() !== 'UNKNOWN');
    const saleCashiers = appSales.map(s => s.cashier).filter(c => c && c.toUpperCase() !== 'UNKNOWN');
    return ['all', ...Array.from(new Set([...userNames, ...saleCashiers]))];
  }, [appSales, appUsers]);

  const salesmenList = React.useMemo(() => {
    const activeNames = appSalesmen?.map(s => s.name).filter(Boolean) || [];
    const userNames = appUsers.map(u => u.name).filter(Boolean);
    const saleSalesmen = appSales.map(s => s.salesmanName).filter(Boolean);
    return ['all', ...Array.from(new Set([...activeNames, ...userNames, ...saleSalesmen]))];
  }, [appSales, appSalesmen, appUsers]);

  const saleTypeToggles = [
    { key: 'all', label: "All", icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'retail', label: "Retail", icon: <Store className="h-4 w-4" />, enabled: appSettings.retailEnabled },
    { key: 'wholesale', label: "Wholesale", icon: <Package className="h-4 w-4" />, enabled: appSettings.wholesaleEnabled },
  ].filter((tt: any) => tt.key === 'all' || tt.enabled);

  return (
    <div className="bg-white dark:bg-surface p-3 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-2.5">
      {/* Top Row: Search (Left) + Status Segmented & Date Range Picker (Right) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex-1 min-w-0" title={"Searches all-time records in cloud, ignoring date filters"}>
          <SharedSearchBar
            value={searchTerm}
            onChange={val => { setSearchTerm(val); setCurrentPage(1); }}
            placeholder={"Search sales..."}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 md:flex items-center gap-2 w-full md:w-auto">
          <SegmentedControl
            size="sm"
            options={[
              { label: "All", value: 'all' },
              { label: "Sales", value: 'sales' },
              { label: "Refunds", value: 'refunds' }
            ]}
            value={statusFilter}
            onChange={(val: string) => { setStatusFilter(val as any); setCurrentPage(1); }}
            className="w-full md:w-56"
          />

          <div className="w-full md:w-auto min-w-0">
            <DateRangePicker
              preset={dateFilter}
              presets={[
                { id: 'today', label: "Today" },
                { id: 'yesterday', label: "Yesterday" },
                { id: 'last7', label: "Last 7 Days" },
                { id: 'thisMonth', label: "This Month" },
                { id: 'lastMonth', label: "Previous Month" },
                { id: 'custom', label: "Custom Range" },
                { id: 'all', label: "All Time" }
              ]}
              onPresetChange={val => { setDateFilter(val); setCurrentPage(1); }}
              startDate={startDateInput}
              endDate={endDateInput}
              onStartDateChange={(v) => { setStartDateInput(v); setCurrentPage(1); }}
              onEndDateChange={(v) => { setEndDateInput(v); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Secondary Filter Dropdowns in a unified aligned strip */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 dark:border-white/[0.04]">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full">
          <SearchableSelect
            label={"SALE TYPE"}
            options={saleTypeToggles.map(tt => ({ id: tt.key, label: tt.label }))}
            value={saleTypeFilter}
            onChange={(val: any) => { setSaleTypeFilter(val); setCurrentPage(1); }}
            icon={LayoutGrid}
          />
          <SearchableSelect
            label={"PAYMENT"}
            options={[
              { id: 'all', label: "All" },
              { id: 'cash', label: "Cash" },
              { id: 'card', label: "Card" },
              { id: 'online', label: "Online" },
              ...(appSettings?.enableCreditSales ? [{ id: 'credit', label: "Credit" }] : []),
              { id: 'split', label: "Split" },
            ]}
            value={paymentFilter}
            onChange={val => { setPaymentFilter(val); setCurrentPage(1); }}
            placeholder={"Payment"}
          />
          <SearchableSelect
            label={"CASHIER"}
            options={cashiersList.map(c => ({ id: c, label: c === 'all' ? "All" : c }))}
            value={selectedCashier}
            onChange={val => { setSelectedCashier(val); setCurrentPage(1); }}
            placeholder={"Cashier"}
            icon={User}
          />
          <SearchableSelect
            label={"SALESMAN"}
            options={salesmenList.map(s => ({ id: s, label: s === 'all' ? "All" : s }))}
            value={selectedSalesman}
            onChange={val => { setSelectedSalesman(val); setCurrentPage(1); }}
            placeholder={"Salesman"}
            icon={Briefcase}
          />
        </div>
      </div>
    </div>
  );
}
