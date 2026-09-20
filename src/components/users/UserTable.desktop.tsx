import React from 'react';
import { Edit, Trash2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { User } from '../../types';
import { Avatar, EmptyState } from '../../shared/ui';

interface UserTableDesktopProps {
  users: User[];
  currentUserId?: string;
  loading: boolean;
  totalUsersCount: number;
  onTogglePermission: (user: User, perm: 'canEditPrice' | 'canGiveDiscount') => void;
  onToggleStatus: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export function UserTableDesktop({
  users,
  currentUserId,
  loading,
  totalUsersCount,
  onTogglePermission,
  onToggleStatus,
  onEdit,
  onDelete,
}: UserTableDesktopProps) {
  return (
    <div className="hidden lg:block overflow-x-auto flex-1">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead>
          <tr className="bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08] h-8">
            <th className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Operator</th>
            <th className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider text-center">Role</th>
            <th className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider text-center">Price Override</th>
            <th className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider text-center">Discounts</th>
            <th className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider text-center">Status</th>
            <th className="px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
          {totalUsersCount === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center">
                <EmptyState
                  icon={<Users className="h-8 w-8 text-neutral-400" />}
                  title="No users found"
                  className="!p-0 opacity-60"
                />
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.id}
                className={`h-11 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors ${
                  !user.active ? 'opacity-50' : ''
                }`}
              >
                <td className="px-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={user.avatar || undefined} name={user.name} size="sm" shape="square" />
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white truncate">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="ml-1.5 text-[10px] text-primary font-mono">(You)</span>
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono tracking-tight">@{user.username}</p>
                    </div>
                  </div>
                </td>

                <td className="px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-white/[0.08]">
                    {user.role}
                  </span>
                </td>

                <td className="px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onTogglePermission(user, 'canEditPrice')}
                    disabled={loading || user.role === 'admin'}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                      user.canEditPrice || user.role === 'admin'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-neutral-100 dark:bg-white/[0.04] text-neutral-500 border-neutral-200 dark:border-white/[0.06]'
                    }`}
                  >
                    {user.canEditPrice || user.role === 'admin' ? 'Allowed' : 'Locked'}
                  </button>
                </td>

                <td className="px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onTogglePermission(user, 'canGiveDiscount')}
                    disabled={loading || user.role === 'admin'}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                      user.canGiveDiscount || user.role === 'admin'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-neutral-100 dark:bg-white/[0.04] text-neutral-500 border-neutral-200 dark:border-white/[0.06]'
                    }`}
                  >
                    {user.canGiveDiscount || user.role === 'admin' ? 'Allowed' : 'Locked'}
                  </button>
                </td>

                <td className="px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleStatus(user)}
                    disabled={loading || user.id === currentUserId}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                      user.active
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                    }`}
                  >
                    {user.active ? <><CheckCircle2 className="h-3 w-3" /> Active</> : <><XCircle className="h-3 w-3" /> Inactive</>}
                  </button>
                </td>

                <td className="px-3 text-right">
                  <div className="flex justify-end items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      disabled={loading}
                      aria-label="Edit user"
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {user.id !== currentUserId && (
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
