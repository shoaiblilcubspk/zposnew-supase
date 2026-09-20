import React from 'react';
import { Edit, Trash2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { User } from '../../types';
import { Avatar, EmptyState } from '../../shared/ui';

interface UserTableMobileProps {
  users: User[];
  currentUserId?: string;
  loading: boolean;
  onTogglePermission: (user: User, perm: 'canEditPrice' | 'canGiveDiscount') => void;
  onToggleStatus: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export function UserTableMobile({
  users,
  currentUserId,
  loading,
  onTogglePermission,
  onToggleStatus,
  onEdit,
  onDelete,
}: UserTableMobileProps) {
  if (users.length === 0) {
    return (
      <div className="py-10 text-center">
        <EmptyState
          icon={<Users className="h-8 w-8 text-neutral-400 opacity-50" />}
          title="No users found"
          className="!p-0"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        const isAdmin = user.role === 'admin';

        return (
          <div
            key={user.id}
            className={`p-3 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col justify-between transition-colors ${
              !user.active ? 'opacity-60' : ''
            }`}
          >
            {/* Header: Avatar, Name, Username, Role, Actions */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={user.avatar || undefined} name={user.name} size="sm" shape="square" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-neutral-900 dark:text-white text-[13px] truncate">
                      {user.name}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] text-primary font-mono font-bold">(You)</span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono truncate">@{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.08]">
                  {user.role}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  disabled={loading}
                  aria-label="Edit user"
                  className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => onDelete(user.id)}
                    disabled={loading}
                    aria-label="Delete user"
                    className="p-1 text-neutral-500 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Permissions & Status Row */}
            <div className="pt-2 border-t border-neutral-100 dark:border-white/[0.06] grid grid-cols-3 gap-1.5 text-center">
              <div>
                <p className="text-[10px] text-neutral-400 font-medium uppercase mb-1">Price</p>
                <button
                  type="button"
                  onClick={() => onTogglePermission(user, 'canEditPrice')}
                  disabled={loading || isAdmin}
                  className={`w-full py-1 rounded text-[11px] font-mono border transition-colors ${
                    user.canEditPrice || isAdmin
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-neutral-100 dark:bg-white/[0.04] text-neutral-500 border-neutral-200 dark:border-white/[0.06]'
                  }`}
                >
                  {user.canEditPrice || isAdmin ? 'Allowed' : 'Locked'}
                </button>
              </div>

              <div>
                <p className="text-[10px] text-neutral-400 font-medium uppercase mb-1">Discounts</p>
                <button
                  type="button"
                  onClick={() => onTogglePermission(user, 'canGiveDiscount')}
                  disabled={loading || isAdmin}
                  className={`w-full py-1 rounded text-[11px] font-mono border transition-colors ${
                    user.canGiveDiscount || isAdmin
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-neutral-100 dark:bg-white/[0.04] text-neutral-500 border-neutral-200 dark:border-white/[0.06]'
                  }`}
                >
                  {user.canGiveDiscount || isAdmin ? 'Allowed' : 'Locked'}
                </button>
              </div>

              <div>
                <p className="text-[10px] text-neutral-400 font-medium uppercase mb-1">Status</p>
                <button
                  type="button"
                  onClick={() => onToggleStatus(user)}
                  disabled={loading || isSelf}
                  className={`w-full py-1 rounded text-[11px] font-medium border flex items-center justify-center gap-1 transition-colors ${
                    user.active
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                  }`}
                >
                  {user.active ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      <span>Inactive</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
