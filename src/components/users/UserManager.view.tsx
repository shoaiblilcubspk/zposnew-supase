import { Plus, Users, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Pagination, RealIcon, ScrollableTabBar } from '../../shared/ui';
import { SharedSearchBar } from '../../shared/modules/search-and-list';
import { UserModal } from './UserModal';
import { UserTableDesktop } from './UserTable.desktop';
import { UserTableMobile } from './UserTable.mobile';
import { useUserManagerLogic, RoleFilter } from './useUserManagerLogic';

interface UserManagerProps {
  initialRoleFilter?: RoleFilter;
}

export function UserManager({ initialRoleFilter = 'all' }: UserManagerProps = {}) {
  const navigate = useNavigate();
  const {
    appUsers,
    appCurrentUser,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    showUserModal,
    setShowUserModal,
    editingUser,
    defaultRoleForModal,
    loading,
    filteredUsers,
    page,
    totalPages,
    pageItems,
    goToPage,
    pageSize,
    setPageSize,
    handleEditUser,
    handleDeleteUser,
    handleAddUser,
    togglePermission,
    toggleUserStatus,
    activeUsers,
    adminUsers,
    managerUsers,
    cashierUsers,
    salesmanUsers,
  } = useUserManagerLogic(initialRoleFilter);

  return (
    <div className="main-content-scroll p-4 sm:p-6 bg-app space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-1 border-b border-gray-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pos')}
            className="!p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-xl font-semibold text-gray-900 dark:text-white tracking-[-0.01em] truncate">
              Staff & Permissions
            </h1>
            <p className="text-[11px] sm:text-[12px] text-gray-500 mt-0.5 truncate">
              Decentralized access control • {appUsers.length} total staff members
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => handleAddUser()}
          disabled={loading}
          className="shrink-0 h-8 !px-2.5 sm:!px-3 !text-[11px] sm:!text-[13px]"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {roleFilter === 'salesman' ? 'Add Salesman' : 'Add Staff'}
        </Button>
      </div>

      {/* Asymmetric Linear Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Staff', value: appUsers.length, sub: 'Registered members', cls: 'text-2xl text-gray-900 dark:text-white' },
          { label: 'Active Operators', value: activeUsers, sub: 'Authorized for POS', cls: 'text-xl text-emerald-600 dark:text-emerald-400' },
          { label: 'Cashiers', value: cashierUsers, sub: 'Terminal billing staff', cls: 'text-xl text-gray-900 dark:text-white' },
          { label: 'Salesmen', value: salesmanUsers, sub: 'Order attribution', cls: 'text-xl text-gray-900 dark:text-white' },
        ].map((m, i) => (
          <div key={i} className="p-3 bg-surface border border-gray-200 dark:border-white/[0.08] rounded-md">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{m.label}</div>
            <div className={`font-semibold tabular-nums tracking-tight mt-1 ${m.cls}`}>{m.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Role Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <ScrollableTabBar containerClassName="flex-1 min-w-0">
          {[
            { id: 'all', label: 'All Staff', realIcon: 'users' as const, count: appUsers.length },
            { id: 'admin', label: 'Admins', realIcon: 'settings' as const, count: adminUsers },
            { id: 'manager', label: 'Managers', realIcon: 'generalSettings' as const, count: managerUsers },
            { id: 'cashier', label: 'Cashiers', realIcon: 'pos' as const, count: cashierUsers },
            { id: 'salesman', label: 'Salesmen', realIcon: 'salesman' as const, count: salesmanUsers },
          ].map((tab) => {
            const active = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id as any)}
                className={`group relative whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-2 px-3 h-8 rounded-full text-[12.5px] tracking-tight active:scale-95 border cursor-pointer select-none ${
                  active
                    ? 'bg-primary text-white font-bold border-primary shadow-xs'
                    : 'bg-white dark:bg-white/[0.05] text-neutral-900 dark:text-neutral-100 font-semibold border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.08]'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                  <RealIcon name={tab.realIcon} size={20} />
                </div>
                <span>{tab.label}</span>
                <span className={`text-[10.5px] font-mono tabular-nums px-1.5 py-0.2 rounded-full ${
                  active ? 'bg-white/20 text-white font-bold' : 'bg-neutral-100 dark:bg-white/[0.08] text-neutral-600 dark:text-neutral-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </ScrollableTabBar>

        <div className="bg-surface p-1 border border-gray-200 dark:border-white/[0.08] rounded-md sm:w-80">
          <SharedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, username..."
          />
        </div>
      </div>

      {/* High-Density Staff Table */}
      <div className="bg-surface rounded-md border border-gray-200 dark:border-white/[0.08] overflow-hidden min-h-[calc(100vh-320px)] flex flex-col justify-between">
        {/* Desktop High-Density Table */}
        <UserTableDesktop
          users={pageItems}
          currentUserId={appCurrentUser?.id}
          loading={loading}
          totalUsersCount={filteredUsers.length}
          onTogglePermission={togglePermission}
          onToggleStatus={toggleUserStatus}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />

        {/* Mobile Native App Cards */}
        <div className="lg:hidden p-3 flex-1">
          <UserTableMobile
            users={pageItems}
            currentUserId={appCurrentUser?.id}
            loading={loading}
            onTogglePermission={togglePermission}
            onToggleStatus={toggleUserStatus}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
        </div>

        <div className="px-3 py-2 border-t border-gray-200 dark:border-white/[0.08] flex items-center justify-between text-[12px] text-gray-500 mt-auto">
          <span>
            Showing {filteredUsers.length === 0 ? '0 of 0' : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredUsers.length)} of ${filteredUsers.length}`}
          </span>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredUsers.length}
            mode="numbered"
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        user={editingUser}
        defaultRole={defaultRoleForModal}
      />
    </div>
  );
}

