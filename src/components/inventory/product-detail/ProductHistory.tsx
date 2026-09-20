import { History, PackageSearch } from 'lucide-react';
import { Button, EmptyState, Pagination } from '../../../shared/ui';
import { formatAppTime } from '../../../lib/dateUtils';
import type { ProductDetailController } from './useProductDetail';

export function ProductHistory({ d }: { d: ProductDetailController }) {
  const { appSettings, movementHistory, totalHistoryPages, historyPage, setHistoryPage, paginatedHistory, handleRowClick, clickedRowId, filterType, setFilterType, HISTORY_PER_PAGE } = d;

  return (
    <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PackageSearch className="w-4 h-4 text-neutral-400" />
          <h4 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Movement History"}</h4>
        </div>
        <div className="flex flex-wrap bg-neutral-100 dark:bg-white/[0.04] p-0.5 rounded-md border border-neutral-200 dark:border-white/[0.08]">
          {(['ALL', 'IN', 'OUT', 'ADJUST', 'RETURN'] as const).map(opt => {
            const isActive = filterType === opt;
            return (
              <button
                key={opt}
                onClick={() => setFilterType(opt)}
                className={`px-3 py-1 rounded text-[12px] font-semibold uppercase tracking-wider transition-colors ${isActive ? 'bg-white dark:bg-surface text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/[0.08] shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100/80 dark:bg-white/[0.04] border-b border-neutral-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">{"Date / Time"}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-center">{"Entity / Source"}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-center">{"User"}</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-right">{"Qty Change"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {movementHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <EmptyState compact icon={<History className="h-full w-full" />} title={"No records found"} />
                  </td>
                </tr>
              ) : paginatedHistory.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => handleRowClick(h)}
                    className={`group hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer active:scale-[0.99] ${clickedRowId === h.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                  >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${h.bg} ${h.color}`}><h.icon className="w-4 h-4" /></div>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900 dark:text-white leading-tight">
                          {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 mt-0.5">{formatAppTime(h.date, appSettings.timezone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{h.entity}</p>
                    <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{h.label}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[12px] font-mono font-medium text-neutral-800 dark:text-neutral-200">{h.user?.split('@')[0] || 'System'}</span>
                    {h.notes && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic mt-0.5 leading-snug whitespace-normal break-words max-w-[280px] mx-auto">
                        {h.notes}
                      </p>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold text-[14px] tabular-nums ${h.color}`}>
                    {h.type === 'IN' ? '+' : '-'}{h.qty} <span className="text-[11px] font-medium opacity-80 ml-0.5">{h.type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-neutral-100 dark:divide-white/5">
          {movementHistory.length === 0 ? (
            <EmptyState compact icon={<History className="h-full w-full" />} title={"No records found"} className="!py-20" />
          ) : paginatedHistory.map((h) => (
              <div
                key={h.id}
                onClick={() => handleRowClick(h)}
                className={`p-3.5 flex flex-col gap-2.5 transition-colors cursor-pointer ${clickedRowId === h.id ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-l-2 border-emerald-500' : ''}`}
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded ${h.bg} ${h.color}`}><h.icon className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-900 dark:text-white leading-tight">{new Date(h.date).toLocaleDateString()}</p>
                    <p className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 mt-0.5">{formatAppTime(h.date, appSettings.timezone)}</p>
                  </div>
                </div>
                <div className={`text-[14px] font-mono font-bold tabular-nums ${h.color}`}>
                  {h.type === 'IN' ? '+' : '-'}{h.qty} <span className="text-[11px] font-medium opacity-80">{h.type}</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-neutral-50 dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-0.5">{"Reference"}</p>
                  <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[140px]">{h.entity}</p>
                </div>
                <div className="text-right flex flex-col">
                  <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-0.5">{"Source / User"}</p>
                  <p className="text-[13px] font-mono font-medium text-emerald-600 dark:text-emerald-400">{h.user?.split('@')[0] || 'System'}</p>
                </div>
              </div>
              {h.notes && (
                <p className="text-[12px] text-neutral-700 dark:text-neutral-300 italic px-1 whitespace-normal break-words leading-relaxed">
                  {h.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {totalHistoryPages > 1 && (
        <div className="px-4 sm:px-6 py-3 bg-neutral-50 dark:bg-surface border-t border-neutral-200 dark:border-white/[0.08]">
          <Pagination
            page={historyPage}
            totalPages={totalHistoryPages}
            onPageChange={setHistoryPage}
            totalItems={movementHistory.length}
            pageSize={HISTORY_PER_PAGE}
          />
        </div>
      )}
    </div>
  );
}
