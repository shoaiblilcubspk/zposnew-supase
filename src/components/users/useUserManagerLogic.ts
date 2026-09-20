import { useState } from 'react';
import { useSettingsStore, useUsersStore } from '../../stores';
import { User as UserType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { usePagination } from '../../shared/ui';

export type RoleFilter = 'all' | 'admin' | 'manager' | 'cashier' | 'salesman';

export function useUserManagerLogic(initialRole: RoleFilter = 'all') {
  const appUsers = useUsersStore(s => s.users);
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSettings = useSettingsStore(s => s.settings);

  const { refreshProfile, user: authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(initialRole);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [defaultRoleForModal, setDefaultRoleForModal] = useState<'admin' | 'manager' | 'cashier' | 'salesman'>('cashier');
  const [loading, setLoading] = useState(false);

  const filteredUsers = appUsers.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const { page, totalPages, pageItems, goToPage, pageSize, setPageSize } = usePagination(filteredUsers, 25);

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === appCurrentUser?.id) {
      sonner.warning('You cannot delete your own account');
      return;
    }

    const result = await sonner.deleteConfirm('user');
    if (result.isConfirmed) {
      setLoading(true);
      sonner.loading('Deleting user...');
      try {
        await usersService.delete(userId);
        useUsersStore.getState().setUsers(appUsers.filter(u => u.id !== userId));
        sonner.success('User deleted successfully!');
      } catch (error: any) {
        sonner.error(`Error deleting user: ${error.message}`);
      } finally {
        setLoading(false);
        sonner.close();
      }
    }
  };

  const handleAddUser = (role?: 'admin' | 'manager' | 'cashier' | 'salesman') => {
    setEditingUser(null);
    const targetRole = role || (roleFilter !== 'all' ? roleFilter : 'cashier');
    setDefaultRoleForModal(targetRole);
    setShowUserModal(true);
  };

  const togglePermission = async (user: UserType, key: keyof UserType) => {
    setLoading(true);
    sonner.loading(`Updating permissions...`);
    try {
      const updatedUser = await usersService.update(user.id, { [key]: !user[key] });
      
      if (user.id === authUser?.id) {
        await refreshProfile();
      }

      useUsersStore.getState().setUsers(appUsers.map(u => u.id === user.id ? updatedUser : u));
      sonner.success(`Permission updated successfully!`);
    } catch (error: any) {
      sonner.error(`Error updating permission: ${error.message}`);
    } finally {
      setLoading(false);
      sonner.close();
    }
  };

  const toggleUserStatus = async (user: UserType) => {
    if (user.id === appCurrentUser?.id) {
      sonner.warning('You cannot deactivate your own account');
      return;
    }

    setLoading(true);
    sonner.loading(`${user.active ? 'Deactivating' : 'Activating'} user...`);
    try {
      const updatedUser = await usersService.update(user.id, { active: !user.active });
      
      if (user.id === appCurrentUser?.id) {
        await refreshProfile();
      }

      useUsersStore.getState().setUsers(appUsers.map(u => u.id === user.id ? updatedUser : u));
      sonner.success(`User ${user.active ? 'deactivated' : 'activated'} successfully!`);
    } catch (error: any) {
      sonner.error(`Error updating user: ${error.message}`);
    } finally {
      setLoading(false);
      sonner.close();
    }
  };

  const activeUsers = appUsers.filter(u => u.active).length;
  const adminUsers = appUsers.filter(u => u.role === 'admin').length;
  const managerUsers = appUsers.filter(u => u.role === 'manager').length;
  const cashierUsers = appUsers.filter(u => u.role === 'cashier').length;
  const salesmanUsers = appUsers.filter(u => u.role === 'salesman').length;

  return {
    appUsers,
    appCurrentUser,
    appSettings,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    showUserModal,
    setShowUserModal,
    editingUser,
    setEditingUser,
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
  };
}
