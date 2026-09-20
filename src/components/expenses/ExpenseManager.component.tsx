import { useExpensesStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState, useMemo, useRef } from 'react';
import {
  Plus, TrendingDown,
  Tag, CreditCard, User,
  Wallet,
  Receipt,
  ChevronLeft
} from 'lucide-react';
import { computeExpenseDateBoundaries, buildCashiersList, filterExpenses, computeExpenseStats, computeTopCategory } from './expenseManagerUtils';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { ExpenseModal } from './ExpenseModal';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { formatCurrency } from '../../lib/currencies';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { Button, DateRangePicker, Pagination } from '../../shared/ui';
import { ExpenseTable } from './ExpenseTable';
import { useExpenseManagerActions } from './useExpenseManagerActions';

export function ExpenseManager() {
  const appSettings = useSettingsStore(s => s.settings);
  const appUsers = useUsersStore(s => s.users);
  const appExpenses = useExpensesStore(s => s.expenses);
  const appCurrentUser = useUsersStore(s => s.currentUser);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'all' | 'cash' | 'card' | 'online'>('all');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [dateRange, setDateRange] = useState('today');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [ITEMS_PER_PAGE, setPageSize] = useState(25);

  const _paymentMethodScrollRef = useRef<HTMLDivElement>(null);
  const _categoryScrollRef = useRef<HTMLDivElement>(null);

  const { validStartDate, validEndDate } = useMemo(() =>
    computeExpenseDateBoundaries(dateRange, startDateInput, endDateInput, appSettings.country),
    [dateRange, startDateInput, endDateInput, appSettings.country]);

  const cashiersList = useMemo(() =>
    buildCashiersList(appExpenses, appUsers),
    [appExpenses, appUsers]);

  const filteredExpenses = useMemo(() =>
    filterExpenses(
      appExpenses, searchTerm, selectedCategory, selectedPaymentMethod,
      selectedCashier, validStartDate, validEndDate, dateRange, appSettings.country
    ),
    [appExpenses, searchTerm, selectedCategory, selectedPaymentMethod, selectedCashier, validStartDate, validEndDate, dateRange, appSettings.country]);

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() =>
    computeExpenseStats(appSettings.country, filteredExpenses),
    [appSettings.country, filteredExpenses]);

  const { handleSave, handleDelete } = useExpenseManagerActions({
    editingExpense,
    setEditingExpense,
    setIsModalOpen,
    appCurrentUser,
  });

  // Top spending category
  const topCategory = useMemo(() =>
    computeTopCategory(filteredExpenses),
    [filteredExpenses]);

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-4 max-w-[1400px] mx-auto">
      {/* Layer 1: Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="h-8 px-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08] shrink-0"
          >
            <span className="hidden sm:inline text-[12px] font-medium">POS</span>
          </Button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <TrendingDown className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight truncate">
                Expenses
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5">
                {appExpenses.length} total records
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          icon={<Plus className="h-3.5 w-3.5" />}
          className="shrink-0 h-8 !px-2.5 sm:!px-3 !text-[11px] sm:!text-[12px]"
        >
          <span>{"Add Expense"}</span>
        </Button>
      </div>

      {/* Layer 2: Filter Toolbar */}
      <div className="relative z-30 bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex flex-col xl:flex-row gap-3">
          {/* Search Box — shared module */}
          <div className="flex-1">
            <SharedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={"Search expenses..."}
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <SearchableSelect
              options={[
                { id: 'all', label: "All" },
                ...EXPENSE_CATEGORIES.map(c => ({ id: c, label: c }))
              ]}
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder={"Category"}
              icon={Tag}
            />
            <SearchableSelect
              options={[
                { id: 'all', label: "All" },
                { id: 'cash', label: "Cash" },
                { id: 'card', label: "Card" },
                { id: 'online', label: "Online Wallet" }
              ]}
              value={selectedPaymentMethod}
              onChange={(val: any) => setSelectedPaymentMethod(val)}
              placeholder={"Payment"}
              icon={CreditCard}
            />
            <SearchableSelect
              options={cashiersList.map(u => ({ id: u, label: u === 'all' ? "All" : u.toUpperCase() }))}
              value={selectedCashier}
              onChange={setSelectedCashier}
              placeholder={"User"}
              icon={User}
            />
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
              icon={Receipt}
            />
          </div>
        </div>
      </div>

      {/* Layer 3: Flat Linear Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Filtered Total
            </span>
            <TrendingDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(stats.filteredTotal, appSettings.currency)}
            </span>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
              {filteredExpenses.length} records
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              This Month
            </span>
            <Wallet className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(stats.thisMonthTotal, appSettings.currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3.5 shadow-none transition-colors duration-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Top Category
            </span>
            <Tag className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-lg font-semibold text-neutral-900 dark:text-white truncate">
              {topCategory?.name || "None"}
            </span>
            <span className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
              {topCategory ? formatCurrency(topCategory.amount, appSettings.currency) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main View Container (Pinned Height for Pagination) */}
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none sm:min-h-[calc(100vh-340px)] min-h-[280px] flex flex-col justify-between">

        <ExpenseTable
          filteredExpenses={filteredExpenses}
          paginatedExpenses={paginatedExpenses}
          appSettings={appSettings}
          setEditingExpense={setEditingExpense}
          setIsModalOpen={setIsModalOpen}
          handleDelete={handleDelete}
        />

        {/* Pinned Pagination Footer */}
        <div className="px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-4 mt-auto">
          <p className="hidden sm:block text-[11px] text-neutral-500 font-mono">
            Showing {filteredExpenses.length === 0 ? '0 of 0' : `${((currentPage - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredExpenses.length)} of ${filteredExpenses.length}`}
          </p>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={ITEMS_PER_PAGE}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSave}
        expense={editingExpense}
      />
    </div>
  );
}
