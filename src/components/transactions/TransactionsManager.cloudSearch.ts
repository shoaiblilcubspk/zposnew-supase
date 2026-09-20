import React, { useState } from 'react';
import { Sale } from '../../types';
import { salesService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { useSalesStore } from '../../stores';
import {
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getStartOfInputDayInTimezone,
  getEndOfInputDayInTimezone,
} from '../../lib/dateUtils';

interface CloudSearchParams {
  searchTerm: string;
  paymentFilter: string;
  saleTypeFilter: 'all' | 'retail' | 'wholesale';
  selectedCashier: string;
  selectedSalesman: string;
  dateFilter: string;
  startDateInput: string;
  endDateInput: string;
  timezone: string;
  refreshKey: number;
  loadMoreSales: (offset: number, limit: number) => Promise<void>;
}

export const useCloudSearch = ({
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
  loadMoreSales: _loadMoreSales,
}: CloudSearchParams) => {
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [cloudResults, setCloudResults] = useState<Sale[]>([]);
  const [isCloudSearch, setIsCloudSearch] = useState(false);

  React.useEffect(() => {
    const isActive =
      searchTerm.trim().length > 0 ||
      paymentFilter !== 'all' ||
      saleTypeFilter !== 'all' ||
      dateFilter !== 'today' ||
      selectedCashier !== 'all';
    setIsCloudSearch(isActive);
    if (!isActive) {
      setCloudResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        let startDate: Date | undefined;
        let endDate: Date | undefined;
        const now = new Date();
        if (dateFilter === 'today') {
          startDate = getStartOfDayInTimezone(now, timezone);
          endDate = getEndOfDayInTimezone(now, timezone);
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          startDate = getStartOfDayInTimezone(yesterday, timezone);
          endDate = getEndOfDayInTimezone(yesterday, timezone);
        } else if (dateFilter === 'last7') {
          startDate = getStartOfDayInTimezone(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), timezone);
          endDate = getEndOfDayInTimezone(now, timezone);
        } else if (dateFilter === 'thisMonth') {
          startDate = getStartOfDayInTimezone(new Date(now.getFullYear(), now.getMonth(), 1), timezone);
          endDate = getEndOfDayInTimezone(now, timezone);
        } else if (dateFilter === 'lastMonth') {
          startDate = getStartOfDayInTimezone(new Date(now.getFullYear(), now.getMonth() - 1, 1), timezone);
          endDate = getEndOfDayInTimezone(new Date(now.getFullYear(), now.getMonth(), 0), timezone);
        } else if (dateFilter === 'all') {
          startDate = new Date(Date.UTC(2000, 0, 1));
          endDate = getEndOfDayInTimezone(now, timezone);
        } else if (dateFilter === 'custom') {
          if (startDateInput) {
            startDate = getStartOfInputDayInTimezone(startDateInput, timezone);
          }
          if (endDateInput) {
            endDate = getEndOfInputDayInTimezone(endDateInput, timezone);
          }
        }
        const results = await salesService.searchSales({
          startDate,
          endDate,
          invoiceNumber: searchTerm.trim() || undefined,
          paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
          cashier: selectedCashier !== 'all' ? selectedCashier : undefined,
          salesman: selectedSalesman !== 'all' ? selectedSalesman : undefined,
          saleType: saleTypeFilter !== 'all' ? saleTypeFilter : undefined,
        });
        if (results && results.length > 0) {
          useSalesStore.getState().appendSales(results);
        }
        setCloudResults(results);
      } catch (e) {
        console.error("Cloud search failed", e);
        sonner.error('Search failed');
      } finally {
        setIsSearchingRemote(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, paymentFilter, saleTypeFilter, selectedCashier, selectedSalesman, dateFilter, startDateInput, endDateInput, refreshKey]);

  return { isSearchingRemote, cloudResults, isCloudSearch };
};
