import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { formatAppDate, formatAppTime } from '../../../lib/dateUtils';
import { formatCurrency } from '../../../lib/currencies';
import { Badge, EmptyState, Pagination, Button } from '../../../shared/ui';

interface Props {
  loading: boolean;
  filteredLedger: any[];
  pageItems: any[];
  page: number;
  totalPages: number;
  goToPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  handleDeleteTransaction: (id: string) => void;
  appSettings: any;
}

export function TransactionList({
  loading, filteredLedger, pageItems, page, totalPages, goToPage,
  pageSize, setPageSize, handleDeleteTransaction, appSettings
}: Props) {
  
  const getBadge = (type: string, sourceType?: string) => {
    if (sourceType === 'auto_purchase') {
      return { label: 'AUTO-PURCHASE', tone: 'info' as const, cls: '!bg-blue-500/10 !text-blue-400 !border-blue-500/20' };
    }
    switch (type) {
      case 'payment':
        return { label: 'PAID', tone: 'success' as const, cls: '!bg-primary/10 !text-emerald-400 !border-primary/20' };
      case 'opening_balance':
        return { label: 'OPENING', tone: 'info' as const, cls: '!bg-violet-500/10 !text-violet-400 !border-violet-500/20' };
      default:
        return { label: 'MANUAL BILL', tone: 'danger' as const, cls: '!bg-red-500/10 !text-red-400 !border-red-500/20' };
    }
  };

  return (
    <>
      <div className="hidden md:block overflow-x-auto scrollbar-hide flex-1">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="h-8 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">{'Date & Time'}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-center">{'Type'}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">{'Description'}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">{'Paid (Dr)'}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">{'Bill (Cr)'}</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">{'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3.5 py-12 text-center text-neutral-500 font-mono text-[12px] italic animate-pulse">{'Loading ledger data...'}</td>
              </tr>
            ) : filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3.5 py-12 text-center">
                  <EmptyState
                    icon={<Clock className="h-8 w-8 text-neutral-400 opacity-60" />}
                    title={'No transactions yet'}
                    className="!p-0"
                  />
                </td>
              </tr>
            ) : (
              pageItems.map((tx, idx) => {
                const badge = getBadge(tx.type, tx.sourceType);
                return (
                  <tr key={idx} className="h-10 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-3.5 whitespace-nowrap">
                      <p className="text-[12px] font-mono font-medium text-neutral-900 dark:text-white leading-none">{formatAppDate(tx.date, appSettings.country)}</p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{formatAppTime(tx.date, appSettings.country)}</p>
                    </td>
                    <td className="px-3.5 text-center">
                      <Badge tone={badge.tone} size="sm">
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-3.5">
                      <p className="text-[13px] font-medium text-neutral-900 dark:text-white truncate max-w-[240px]" title={tx.detail}>{tx.detail}</p>
                    </td>
                    <td className="px-3.5 text-right whitespace-nowrap font-mono tabular-nums text-[13px]">
                      {tx.type === 'payment' && tx.debit > 0 ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(tx.debit, appSettings.currency)}
                        </span>
                      ) : <span className="text-neutral-400 opacity-50">—</span>}
                    </td>
                    <td className="px-3.5 text-right whitespace-nowrap font-mono tabular-nums text-[13px]">
                      {tx.type !== 'payment' && tx.credit > 0 ? (
                        <span className="font-semibold text-rose-500">
                          {formatCurrency(tx.credit, appSettings.currency)}
                        </span>
                      ) : <span className="text-neutral-400 opacity-50">—</span>}
                    </td>
                    <td className="px-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-rose-600"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-neutral-100 dark:divide-white/[0.04] flex-1">
        {loading ? (
          <div className="p-8 text-center text-neutral-500 font-mono text-[12px] italic">{'Loading transactions...'}</div>
        ) : filteredLedger.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-8 w-8 text-neutral-400 opacity-60" />}
            title={'No entries found'}
            className="p-8"
          />
        ) : (
          pageItems.map((tx, idx) => {
            const badge = getBadge(tx.type, tx.sourceType);
            return (
              <div key={idx} className="p-3 flex flex-col gap-2 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col font-mono text-[11px]">
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {formatAppDate(tx.date, appSettings.country)}
                    </span>
                    <span className="text-neutral-400">
                      {formatAppTime(tx.date, appSettings.country)}
                    </span>
                  </div>
                  <Badge tone={badge.tone} size="sm">
                    {badge.label}
                  </Badge>
                </div>

                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[60%]">{tx.detail}</span>
                  <div className="font-mono tabular-nums text-right">
                    {tx.type === 'payment' ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(tx.debit, appSettings.currency)}</span>
                    ) : (
                      <span className="font-semibold text-rose-500">-{formatCurrency(tx.credit, appSettings.currency)}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTransaction(tx.id)}
                    className="!h-6 !px-2 text-neutral-500 hover:text-rose-600 !text-[11px]"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> {'Delete'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-3.5 py-2.5 bg-neutral-50/50 dark:bg-white/[0.01] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-auto">
        <span className="hidden sm:inline">
          Showing {filteredLedger.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredLedger.length)} of ${filteredLedger.length}`}
        </span>
        <div className="mx-auto sm:mx-0">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredLedger.length}
            mode="numbered"
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </>
  );
}
