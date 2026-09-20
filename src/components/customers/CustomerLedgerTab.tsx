import { useEffect, useState, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, TrendingUp, CheckCircle, Download, FileText, Send } from 'lucide-react';
import { Customer, CustomerLedger } from '../../types';
import { fetchCustomerLedger } from '../../lib/services/customerLedgerService';
import { useSettingsStore, useUsersStore } from '../../stores';
import { formatCurrency, getCurrencySymbol } from '../../lib/currencies';
import { formatAppDateTime } from '../../lib/dateUtils';
import { Badge, Button, EmptyState, Pagination, usePagination, Select } from '../../shared/ui';
import { SkeletonLoader } from '../../shared/ui/SkeletonLoader';
import { ExportButton } from '../../shared/export';
import { sonner } from '../../lib/sonner';
import { DateRangePicker, DateRangePreset } from '../../shared/ui/DateRangePicker';
import { computeCustomerDateRange, LEDGER_TYPE_LABELS, LEDGER_DATE_PRESETS } from './customerManagerUtils';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { RefundCustomerModal } from './RefundCustomerModal';

interface Props {
  customer: Customer;
}

export function CustomerLedgerTab({ customer }: Props) {
  const settings = useSettingsStore(s => s.settings);
  const currency = settings?.currency || 'PKR';
  const [entries, setEntries] = useState<CustomerLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerLedger(customer.id);
      setEntries(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e: any) {
      setError(e?.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [customer.id]);

  const { validStartDate, validEndDate } = useMemo(() =>
    computeCustomerDateRange(preset, startDate, endDate, settings?.country || ''),
    [preset, startDate, endDate, settings?.country]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Date filter
      if (preset !== 'all') {
        const entryTime = new Date(entry.createdAt).getTime();
        if (entryTime < validStartDate.getTime()) return false;
        if (entryTime > validEndDate.getTime()) return false;
      }
      
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'payment' && !['payment', 'payment_received'].includes(entry.type)) return false;
        if (typeFilter === 'sale' && !['sale', 'sale_credit'].includes(entry.type)) return false;
        if (typeFilter === 'refund' && entry.type !== 'refund') return false;
        if (typeFilter === 'adjustment' && entry.type !== 'adjustment') return false;
      }
      return true;
    });
  }, [entries, preset, validStartDate, validEndDate, typeFilter]);

  const { pageItems, page, totalPages, goToPage, pageSize, setPageSize } = usePagination(filteredEntries, 15);
  const totalDebit = filteredEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filteredEntries.reduce((s, e) => s + e.credit, 0);
  // Use live balance from the most recent ledger entry if available (ignoring filters for overall balance)
  const balance = entries.length > 0 ? entries[0].balanceAfter : (customer.balance || 0);

  const handleClearKhata = () => {
    if (balance === 0) return;
    if (balance > 0) {
      setIsReceiveModalOpen(true);
    } else {
      setIsRefundModalOpen(true);
    }
  };

  const handleWhatsApp = () => {
    let msg = `*Ledger Summary for ${customer.name}*\n\n`;
    if (balance > 0) {
      msg += `You have to pay us: *${formatCurrency(balance, currency)}*\n`;
    } else if (balance < 0) {
      msg += `We have to pay you: *${formatCurrency(Math.abs(balance), currency)}*\n`;
    } else {
      msg += `Your balance is completely settled (Nil).\n`;
    }
    msg += `\nThank you!`;
    const phone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
    if (!phone) {
      sonner.error('Customer has no phone number saved.');
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const exportColumns = [
    { label: 'Date', key: 'date' },
    { label: 'Type', key: 'type' },
    { label: 'Note/Ref', key: 'note' },
    { label: 'Debit (Pay)', key: 'debit', format: 'currency' as const },
    { label: 'Credit (Receive)', key: 'credit', format: 'currency' as const },
    { label: 'Balance', key: 'balance', format: 'currency' as const },
  ];

  const exportRows = filteredEntries.map(e => ({
    date: formatAppDateTime(e.createdAt),
    type: LEDGER_TYPE_LABELS[e.type]?.label || e.type,
    note: e.note || e.reference || '',
    debit: e.debit,
    credit: e.credit,
    balance: e.balanceAfter,
  }));

  if (loading) return <SkeletonLoader rows={6} />;
  if (error) return (
    <div className="text-center py-8 text-red-500 text-sm">{error}
      <button onClick={load} className="ml-2 underline">Retry</button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Filters & Actions Header */}
      <div className="flex flex-col md:flex-row gap-2.5 md:items-center p-2.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <DateRangePicker
            preset={preset}
            presets={LEDGER_DATE_PRESETS}
            onPresetChange={setPreset}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            className="flex-1 md:max-w-md"
          />
          <div className="w-full md:w-44">
            <Select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)} 
              className="!w-full !h-8 !text-[12px]"
            >
              <option value="all">All Types</option>
              <option value="sale">Credit Sales</option>
              <option value="payment">Payments</option>
              <option value="refund">Refunds</option>
              <option value="adjustment">Adjustments</option>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {filteredEntries.length > 0 && (
            <ExportButton
              data={exportRows}
              columns={exportColumns}
              title={`Customer Ledger — ${customer.name}`}
              filtersSummary={`Customer: ${customer.name} • Net Balance: ${formatCurrency(balance, currency)}`}
              filename={`Ledger_${customer.name}_${Date.now()}`}
              currencySymbol={getCurrencySymbol(currency)}
              className="!h-8 !px-2.5 !text-[11px]"
            />
          )}
          <Button variant="secondary" size="sm" onClick={handleWhatsApp} className="!h-8 !px-2.5 !text-[11px]">
            <Send className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Share
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3.5 shadow-none">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">Total Credit Given (Sales)</div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-500">{formatCurrency(totalDebit, currency)}</div>
        </div>
        <div className="rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3.5 shadow-none">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">Total Received (Payments)</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCredit, currency)}</div>
        </div>
        <div className="rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] p-3.5 shadow-none flex justify-between items-center">
          <div>
            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
              {balance === 0 ? 'Balance Clear' : balance > 0 ? 'To Receive' : 'To Pay'}
            </div>
            <div className={`text-xl font-bold font-mono tabular-nums ${balance > 0 ? 'text-amber-600 dark:text-amber-400' : balance < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
              {formatCurrency(Math.abs(balance), currency)}
            </div>
          </div>
          {balance !== 0 && (
            <Button onClick={handleClearKhata} variant="primary" size="sm" className="!h-7 !px-2.5 !text-[11px]">
              Clear Khata
            </Button>
          )}
        </div>
      </div>

      {/* Ledger table container */}
      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-360px)] flex flex-col justify-between">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
            <EmptyState icon={<TrendingUp className="w-8 h-8 text-neutral-400 opacity-60" />} title="No ledger entries found" description="Try adjusting your filters" className="!p-0" />
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="h-8 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
                  <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Date & Time</th>
                  <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Type</th>
                  <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Note / Ref</th>
                  <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">Debit</th>
                  <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">Credit</th>
                  <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
                {pageItems.map(entry => {
                  const meta = LEDGER_TYPE_LABELS[entry.type] || { label: entry.type, color: 'bg-neutral-100 text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300' };
                  return (
                    <tr key={entry.id} className="h-10 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-3.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap font-mono text-[12px]">
                        {formatAppDateTime(entry.createdAt)}
                      </td>
                      <td className="px-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.08]">
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3.5 text-neutral-700 dark:text-neutral-300 max-w-[150px] truncate">
                        {entry.note || entry.reference || '—'}
                      </td>
                      <td className="px-3.5 text-right font-mono tabular-nums text-[13px]">
                        {entry.debit > 0 ? (
                          <span className="text-rose-500 font-medium">{formatCurrency(entry.debit, currency)}</span>
                        ) : <span className="text-neutral-400 opacity-40">—</span>}
                      </td>
                      <td className="px-3.5 text-right font-mono tabular-nums text-[13px]">
                        {entry.credit > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(entry.credit, currency)}</span>
                        ) : <span className="text-neutral-400 opacity-40">—</span>}
                      </td>
                      <td className="px-3.5 text-right font-mono tabular-nums font-semibold text-[13px]">
                        <span className={entry.balanceAfter > 0 ? 'text-amber-600 dark:text-amber-400' : entry.balanceAfter < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}>
                          {formatCurrency(Math.abs(entry.balanceAfter), currency)}
                        </span>
                        {entry.balanceAfter !== 0 && (
                          <span className="text-[9px] ml-1 opacity-70 uppercase">
                            {entry.balanceAfter > 0 ? 'DR' : 'CR'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pinned Pagination Footer */}
        <div className="px-3.5 py-2.5 bg-neutral-50/50 dark:bg-white/[0.01] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-auto">
          <span>
            Showing {filteredEntries.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredEntries.length)} of ${filteredEntries.length}`}
          </span>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredEntries.length}
            mode="numbered"
          />
        </div>
      </div>

      {isReceiveModalOpen && (
        <ReceivePaymentModal customer={customer} onClose={() => setIsReceiveModalOpen(false)} onSuccess={() => load()} />
      )}
      {isRefundModalOpen && (
        <RefundCustomerModal customer={customer} onClose={() => setIsRefundModalOpen(false)} onSuccess={() => load()} initialAmount={Math.abs(balance)} />
      )}
    </div>
  );
}
