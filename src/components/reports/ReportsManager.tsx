import React, { useState, useEffect } from 'react';
import { LayoutGrid, TrendingUp, Store, Truck, Users, Wallet, Briefcase } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { SkeletonLoader } from '../../shared/ui/SkeletonLoader';
import { DateRangePicker } from '../../shared/ui';

import { SalesReport } from './tabs/SalesReport';
import { ExpensesReport } from './tabs/ExpensesReport';
import { CustomersReport } from './tabs/CustomersReport';
import { FinancialReport } from './tabs/FinancialReport';
import { InventoryReport } from './tabs/InventoryReport';
import { SuppliersReport } from './tabs/SuppliersReport';
import { SalesmenReport } from './tabs/SalesmenReport';
import { ReportHeader } from './shared/ReportHeader';

import { useReportsData } from './useReportsData';
import { useParams } from 'react-router-dom';

export function ReportsManager() {
  const { subTab } = useParams();

  const validReportTypes = ['sales', 'inventory', 'customers', 'expenses', 'financial', 'suppliers', 'salesmen'] as const;
  type ReportType = typeof validReportTypes[number];
  const reportTypeParam = (validReportTypes.includes(subTab as ReportType) ? subTab : 'sales') as ReportType;

  const data = useReportsData(reportTypeParam);

  const {
    dateRange, setDateRange, startDateInput, setStartDateInput, endDateInput, setEndDateInput,
    selectedSupplier, setSelectedSupplier, selectedCategory, setSelectedCategory,
    selectedCashier, setSelectedCashier, selectedSalesman, setSelectedSalesman,
    selectedSaleType, setSelectedSaleType, selectedPayment, setSelectedPayment,
    reportType, validStartDate, validEndDate, isDataLoading, filteredSales, filteredExpenses,
    salesData, categoryData, saleTypeData, topProducts, featureAnalytics, totalRevenue,
    totalTransactions, averageTransaction, totalCostOfGoods, grossProfit, totalExpenseAmount,
    netProfit, walletStats, customerData, salesmanData, expensesTrendData, expenseCategoryData,
    suppliers, categories, cashiers, salesmenList, paymentMethods, appSettings, appUsers,
    appCurrentUser
  } = data;

  const [isRendered, setIsRendered] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!appSettings) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-transparent">
        <SkeletonLoader type="list" count={6} />
      </div>
    );
  }

  if (!isRendered) {
    return (
      <div className="main-content-scroll p-3 sm:p-4 lg:p-6 space-y-4 bg-app min-h-full max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-8 w-64 bg-neutral-200 dark:bg-white/5 rounded"></div>
          <div className="h-10 w-full bg-neutral-200 dark:bg-white/5 rounded-md"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-neutral-200 dark:bg-white/5 rounded-md"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-scroll p-3 sm:p-4 lg:p-6 bg-app space-y-3.5 max-w-[1400px] mx-auto">
      
      <ReportHeader
        validStartDate={validStartDate}
        validEndDate={validEndDate}
        appSettings={appSettings}
        isDataLoading={isDataLoading}
        appCurrentUser={appCurrentUser}
        reportType={reportType}
      />

      <div className="relative z-30 bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5">
          <div className="w-full xl:w-auto shrink-0">
            <DateRangePicker
              preset={dateRange}
              presets={[
                { id: 'today', label: "TODAY" },
                { id: 'yesterday', label: "YESTERDAY" },
                { id: 'last7', label: "LAST 7 DAYS" },
                { id: 'thisMonth', label: "THIS MONTH" },
                { id: 'lastMonth', label: "PREVIOUS MONTH" },
                { id: 'custom', label: "CUSTOM RANGE" },
                { id: 'all', label: "ALL TIME" }
              ]}
              onPresetChange={setDateRange}
              startDate={startDateInput}
              endDate={endDateInput}
              onStartDateChange={setStartDateInput}
              onEndDateChange={setEndDateInput}
              label={"RANGE"}
              icon={TrendingUp}
            />
          </div>

          <div className="hidden xl:block h-8 w-px bg-gray-200 dark:bg-white/10 shrink-0" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:flex xl:items-center gap-2 w-full">
            {reportType !== 'customers' && (
              <>
                <SearchableSelect
                  label={"SUPPLIER"}
                  options={[{ id: 'All', label: "ALL" }, ...suppliers.filter(s => s !== 'All').map(s => ({ id: s, label: s }))]}
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                  icon={Truck}
                  iconColor="text-rose-500"
                />
                <SearchableSelect
                  label={"CATEGORY"}
                  options={[{ id: 'All', label: "ALL" }, ...categories.filter(c => c !== 'All').map(c => ({ id: c, label: c }))]}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  icon={LayoutGrid}
                  iconColor="text-blue-500"
                />
                <SearchableSelect
                  label={"CASHIER"}
                  options={[{ id: 'All', label: "ALL" }, ...cashiers.filter(c => c !== 'All').map(c => ({ id: c, label: c }))]}
                  value={selectedCashier}
                  onChange={setSelectedCashier}
                  icon={Users}
                  iconColor="text-indigo-500"
                />
                <SearchableSelect
                  label={"SALESMAN"}
                  options={[{ id: 'All', label: "ALL" }, ...salesmenList.filter(s => s !== 'All').map(s => ({ id: s, label: s }))]}
                  value={selectedSalesman}
                  onChange={setSelectedSalesman}
                  icon={Briefcase}
                  iconColor="text-amber-500"
                />
                <SearchableSelect
                  label={"PAYMENT"}
                  options={[{ id: 'All', label: "ALL" }, ...paymentMethods.filter(m => m !== 'All').map(m => ({ id: m, label: m.toUpperCase() }))]}
                  value={selectedPayment}
                  onChange={setSelectedPayment}
                  icon={Wallet}
                  iconColor="text-emerald-500"
                />
                <SearchableSelect
                  label={"STORE"}
                  options={[
                    { id: 'all', label: "ALL" },
                    { id: 'retail', label: "RETAIL", enabled: appSettings.retailEnabled },
                    { id: 'wholesale', label: "WHOLESALE", enabled: appSettings.wholesaleEnabled }
                  ].filter(o => o.id === 'all' || o.enabled)}
                  value={selectedSaleType}
                  onChange={setSelectedSaleType}
                  icon={Store}
                  iconColor="text-purple-500"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {reportType === 'sales' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <SalesReport
            filteredSales={filteredSales}
            salesData={salesData}
            categoryData={categoryData}
            saleTypeData={saleTypeData}
            topProducts={topProducts}
            featureAnalytics={featureAnalytics}
            totalRevenue={totalRevenue}
            totalTransactions={totalTransactions}
            averageTransaction={averageTransaction}
            totalCostOfGoods={totalCostOfGoods}
            grossProfit={grossProfit}
            totalExpenseAmount={totalExpenseAmount}
            netProfit={netProfit}
            walletStats={walletStats}
            currency={appSettings.currency}
            theme={appSettings.theme}
            country={appSettings.country}
            users={appUsers}
            retailEnabled={appSettings.retailEnabled ?? true}
            wholesaleEnabled={appSettings.wholesaleEnabled}
          />
        </div>
      )}

      {reportType === 'customers' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <CustomersReport
            customerData={customerData}
            currency={appSettings.currency}
            theme={appSettings.theme}
            country={appSettings.country}
          />
        </div>
      )}

      {reportType === 'salesmen' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <SalesmenReport
            salesmanData={salesmanData}
            currency={appSettings.currency}
            theme={appSettings.theme}
          />
        </div>
      )}

      {reportType === 'expenses' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <ExpensesReport
            filteredExpenses={filteredExpenses}
            expensesTrendData={expensesTrendData}
            expenseCategoryData={expenseCategoryData}
            totalExpenseAmount={totalExpenseAmount}
            currency={appSettings.currency}
            theme={appSettings.theme}
            country={appSettings.country}
          />
        </div>
      )}

      {reportType === 'financial' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <FinancialReport
            totalRevenue={totalRevenue}
            totalTransactions={totalTransactions}
            totalCostOfGoods={totalCostOfGoods}
            grossProfit={grossProfit}
            totalExpenseAmount={totalExpenseAmount}
            filteredExpensesCount={filteredExpenses.length}
            netProfit={netProfit}
            walletStats={walletStats}
            currency={appSettings.currency}
          />
        </div>
      )}

      {reportType === 'inventory' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <InventoryReport
            startDate={validStartDate}
            endDate={validEndDate}
            globalSupplier={selectedSupplier}
            globalCategory={selectedCategory}
            globalStore={selectedSaleType}
            sales={filteredSales}
          />
        </div>
      )}

      {reportType === 'suppliers' && (
        <div className="relative z-20 mt-2 sm:mt-4">
          <SuppliersReport
            currency={appSettings.currency}
            country={appSettings.country}
          />
        </div>
      )}
    </div>
  );
}