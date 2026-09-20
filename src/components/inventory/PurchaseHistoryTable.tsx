import { Package } from 'lucide-react';
import { PurchaseHistoryCard, PurchaseHistoryMobileCard } from './PurchaseHistoryCard';
import { PurchaseRecord, Product } from '../../types';
import { EmptyState, Pagination } from '../../shared/ui';

interface PurchaseHistoryTableProps {
  paginatedRecords: PurchaseRecord[];
  appProducts: Product[];
  currency: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: (val: number | ((prev: number) => number)) => void;
  setPageSize: (val: number) => void;
  handleDeleteRecord: (record: PurchaseRecord) => void;
}

export function PurchaseHistoryTable({
  paginatedRecords,
  appProducts,
  currency,
  currentPage,
  totalPages,
  itemsPerPage,
  setCurrentPage,
  setPageSize,
  handleDeleteRecord,
}: PurchaseHistoryTableProps) {
  return (
    <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-320px)] flex flex-col justify-between">
      <div className="hidden lg:block overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-8 bg-neutral-50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
              <th className="px-3.5 py-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Date & Identity"}</th>
              <th className="px-3.5 py-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">{"Procurement Details"}</th>
              <th className="px-3.5 py-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">{"Financial Impact"}</th>
              <th className="px-3.5 py-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-right">{"Admin Control"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {paginatedRecords.length > 0 ? paginatedRecords.map((record) => (
              <PurchaseHistoryCard
                key={record.id}
                record={record}
                appProducts={appProducts}
                currency={currency}
                onDelete={handleDeleteRecord}
              />
            )) : (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <EmptyState
                    className="!p-0 opacity-40"
                    icon={<Package className="h-8 w-8 text-neutral-400" />}
                    title={"No Procurement Records Found"}
                    subtext={"Adjust your filters or perform system actions"}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden p-3 space-y-2 flex-1">
        {paginatedRecords.length > 0 ? paginatedRecords.map((record) => (
          <PurchaseHistoryMobileCard
            key={record.id}
            record={record}
            appProducts={appProducts}
            currency={currency}
          />
        )) : (
          <EmptyState compact className="!py-10 opacity-40" icon={<Package className="h-8 w-8 text-neutral-400" />} title="No Records" />
        )}
      </div>

      <div className="px-3 py-2 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between mt-auto">
        <p className="text-[11px] text-neutral-500 font-mono">
          Page {currentPage} of {totalPages}
        </p>
        <Pagination
          mode="prevNext"
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={itemsPerPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
