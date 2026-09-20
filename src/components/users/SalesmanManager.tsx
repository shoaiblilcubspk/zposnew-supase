import { useUsersStore } from '../../stores';
import { useState } from 'react';
import { Plus, Edit, Trash2, Users, ChevronLeft } from 'lucide-react';
import { Salesman } from '../../types';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { Badge, Button, EmptyState, Pagination, usePagination } from '../../shared/ui';
import { salesmenService } from '../../lib/services';
import { SalesmanModal } from './SalesmanModal';
import { sonner } from '../../lib/sonner';

export function SalesmanManager() {
  const appSalesmen = useUsersStore(s => s.salesmen);
const appCurrentUser = useUsersStore(s => s.currentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<Salesman | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredSalesmen = appSalesmen.filter(salesman =>
    salesman.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (salesman.phone && salesman.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredSalesmen, 25);

  const handleEdit = (salesman: Salesman) => {
    setEditingSalesman(salesman);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await sonner.deleteConfirm('salesman');
    if (result.isConfirmed) {
      setLoading(true);
      sonner.loading('Deleting salesman...');
      try {
        await salesmenService.delete(id);
        useUsersStore.getState().setSalesmen(appSalesmen.filter(s => s.id !== id));
        sonner.success('Salesman deleted successfully!');
      } catch (error: any) {
        sonner.error(`Error deleting salesman: ${error.message}`);
      } finally {
        setLoading(false);
        sonner.close();
      }
    }
  };

  const handleAdd = () => {
    setEditingSalesman(null);
    setShowModal(true);
  };

  const activeSalesmen = appSalesmen.filter(s => s.active).length;

  return (
    <div className="main-content-scroll p-1 sm:p-4 lg:p-6 bg-gray-50/50 dark:bg-app space-y-3 lg:space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-3 min-w-0">
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

          <div className="flex items-center gap-2.5 min-w-0">
            <Users className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight truncate">
                Salesmen Management
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono tracking-tight truncate">
                {activeSalesmen} active • {appSalesmen.length} total records
              </p>
            </div>
          </div>
        </div>

        {appCurrentUser?.role === 'admin' && (
          <Button
            onClick={handleAdd}
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            className="shrink-0"
          >
            <span>{"Add Salesman"}</span>
          </Button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
        <div className="max-w-md">
          <SharedSearchBar
            placeholder={"Search salesmen..."}
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none min-h-[calc(100vh-280px)] flex flex-col justify-between">
        <div className="hidden lg:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="h-8 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
                <th scope="col" className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[45%]">
                  {"Salesman Info"}
                </th>
                <th scope="col" className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">
                  {"Status"}
                </th>
                <th scope="col" className="px-3.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-right w-[120px]">
                  {"Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {pageItems.map((salesman) => (
                <tr key={salesman.id} className="h-11 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-neutral-900 dark:text-white truncate">
                          {salesman.name}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-mono">{salesman.phone || 'No phone'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 whitespace-nowrap text-center">
                    <Badge tone={salesman.active ? 'success' : 'neutral'} size="sm">
                      {salesman.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-3.5 whitespace-nowrap text-right">
                    {appCurrentUser?.role === 'admin' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(salesman)}
                          className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          title={"Edit"}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(salesman.id)}
                          className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-rose-600"
                          title={"Delete"}
                          disabled={loading}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSalesmen.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3.5 py-16 text-center">
                    <EmptyState
                      icon={<Users className="w-8 h-8 text-neutral-400 opacity-60" />}
                      title={"No Salesmen Found"}
                      subtext={searchTerm ? "Try adjusting your search terms" : "Add your first salesman to get started"}
                      className="!p-0"
                      action={
                        !searchTerm && appCurrentUser?.role === 'admin' ? (
                          <Button size="sm" variant="primary" onClick={handleAdd}>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {"Add Salesman"}
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Native App Cards */}
        <div className="lg:hidden p-3 flex-1">
          {filteredSalesmen.length === 0 ? (
            <div className="py-12 text-center">
              <EmptyState
                icon={<Users className="w-8 h-8 text-neutral-400 opacity-60" />}
                title={"No Salesmen Found"}
                subtext={searchTerm ? "Try adjusting your search terms" : "Add your first salesman to get started"}
                className="!p-0"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pageItems.map((salesman) => (
                <div
                  key={salesman.id}
                  className="p-3 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-neutral-900 dark:text-white text-[13px] truncate">
                          {salesman.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 font-mono">{salesman.phone || 'No phone'}</p>
                      </div>
                    </div>
                    <Badge tone={salesman.active ? 'success' : 'neutral'} size="sm">
                      {salesman.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {appCurrentUser?.role === 'admin' && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(salesman)}
                        className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                        title={"Edit"}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(salesman.id)}
                        className="!h-7 !w-7 !p-0 text-neutral-500 hover:text-rose-600"
                        title={"Delete"}
                        disabled={loading}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pinned Pagination Footer */}
        <div className="px-3.5 py-2.5 bg-neutral-50/50 dark:bg-white/[0.01] border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-auto">
          <span className="hidden sm:inline">
            Showing {filteredSalesmen.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredSalesmen.length)} of ${filteredSalesmen.length}`}
          </span>
          <div className="mx-auto sm:mx-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={filteredSalesmen.length}
            />
          </div>
        </div>
      </div>

      <SalesmanModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        salesman={editingSalesman}
      />
    </div>
  );
}
