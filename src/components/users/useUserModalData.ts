import { useUsersStore } from '../../stores';
import { useState, useEffect } from 'react';
import { User as UserType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../lib/services';
import { sonner } from '../../lib/sonner';

export type UserRole = 'admin' | 'manager' | 'cashier' | 'salesman';

interface UseUserModalDataOptions {
  user?: UserType | null;
  currentUser?: UserType | null;
  onSuccess?: () => void;
  onClose: () => void;
  defaultRole?: UserRole;
}

export function useUserModalData(options: UseUserModalDataOptions) {
  const { user, onClose, onSuccess, defaultRole = 'cashier' } = options;
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appUsers = useUsersStore(s => s.users);
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const initialRole = defaultRole || 'cashier';
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    pin: '',
    confirmPin: '',
    role: initialRole as UserRole,
    active: true,
    avatar: '',
    canEditPrice: initialRole === 'admin' || initialRole === 'manager',
    canGiveDiscount: initialRole !== 'salesman',
    canDeleteSale: initialRole === 'admin',
    canViewProfit: initialRole === 'admin' || initialRole === 'manager',
    canManageStock: initialRole === 'admin' || initialRole === 'manager',
    canManagePO: initialRole === 'admin' || initialRole === 'manager',
    canViewRecords: initialRole !== 'salesman',
    canEditSale: initialRole === 'admin' || initialRole === 'manager',
    canEditProduct: initialRole === 'admin' || initialRole === 'manager',
    canViewExpiry: true,
    requirePinOnSale: false,
  });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        name: user.name,
        email: user.email || '',
        pin: '',
        confirmPin: '',
        role: user.role as UserRole,
        active: user.active,
        avatar: user.avatar || '',
        canEditPrice: user.canEditPrice ?? false,
        canGiveDiscount: user.canGiveDiscount ?? false,
        canDeleteSale: user.canDeleteSale ?? false,
        canViewProfit: user.canViewProfit ?? false,
        canManageStock: user.canManageStock ?? false,
        canManagePO: user.canManagePO ?? false,
        canViewRecords: user.canViewRecords ?? false,
        canEditSale: user.canEditSale ?? false,
        canEditProduct: user.canEditProduct ?? false,
        canViewExpiry: user.canViewExpiry ?? true,
        requirePinOnSale: user.requirePinOnSale ?? false,
      });
    } else {
      const initRole = defaultRole || 'cashier';
      setFormData({
        username: '',
        name: '',
        email: '',
        pin: '',
        confirmPin: '',
        role: initRole,
        active: true,
        avatar: '',
        canEditPrice: initRole === 'admin' || initRole === 'manager',
        canGiveDiscount: initRole !== 'salesman',
        canDeleteSale: initRole === 'admin',
        canViewProfit: initRole === 'admin' || initRole === 'manager',
        canManageStock: initRole === 'admin' || initRole === 'manager',
        canManagePO: initRole === 'admin' || initRole === 'manager',
        canViewRecords: initRole !== 'salesman',
        canEditSale: initRole === 'admin' || initRole === 'manager',
        canEditProduct: initRole === 'admin' || initRole === 'manager',
        canViewExpiry: true,
        requirePinOnSale: false,
      });
    }
  }, [user, defaultRole]);

  const handleRoleChange = (newRole: UserRole) => {
    setFormData(prev => {
      const defaults: Record<UserRole, Record<string, boolean>> = {
        admin: {
          canEditPrice: true,
          canGiveDiscount: true,
          canDeleteSale: true,
          canViewProfit: true,
          canManageStock: true,
          canManagePO: true,
          canViewRecords: true,
          canEditSale: true,
          canEditProduct: true,
          canViewExpiry: true,
        },
        manager: {
          canEditPrice: true,
          canGiveDiscount: true,
          canDeleteSale: false,
          canViewProfit: true,
          canManageStock: true,
          canManagePO: true,
          canViewRecords: true,
          canEditSale: true,
          canEditProduct: true,
          canViewExpiry: true,
        },
        cashier: {
          canEditPrice: false,
          canGiveDiscount: true,
          canDeleteSale: false,
          canViewProfit: false,
          canManageStock: false,
          canManagePO: false,
          canViewRecords: true,
          canEditSale: false,
          canEditProduct: false,
          canViewExpiry: true,
        },
        salesman: {
          canEditPrice: false,
          canGiveDiscount: false,
          canDeleteSale: false,
          canViewProfit: false,
          canManageStock: false,
          canManagePO: false,
          canViewRecords: false,
          canEditSale: false,
          canEditProduct: false,
          canViewExpiry: false,
        },
      };

      return { ...prev, role: newRole, ...defaults[newRole] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanUsername = formData.username.trim().toLowerCase();
      if (!cleanUsername) {
        sonner.error('Username is required');
        setLoading(false);
        return;
      }
      if (!formData.name.trim()) {
        sonner.error('Full Name is required');
        setLoading(false);
        return;
      }

      if (user) {
        // Update existing user
        const isOtherAdmin = user?.role === 'admin' && user?.id !== appCurrentUser?.id;
        if (formData.pin) {
          if (isOtherAdmin) {
            sonner.error('Security rule: You cannot modify the security PIN of another Administrator.');
            setLoading(false);
            return;
          }
          if (formData.pin.length < 4 || formData.pin.length > 12) {
            sonner.error('PIN must be between 4 and 12 digits');
            setLoading(false);
            return;
          }
          if (formData.pin !== formData.confirmPin) {
            sonner.error('PIN and Confirm PIN do not match');
            setLoading(false);
            return;
          }
          await usersService.changeUserPassword(user.id, formData.pin);
        }

        const updatePayload: Partial<UserType> = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          active: formData.active,
          avatar: formData.avatar || undefined,
          canEditPrice: formData.canEditPrice,
          canGiveDiscount: formData.canGiveDiscount,
          canDeleteSale: formData.canDeleteSale,
          canViewProfit: formData.canViewProfit,
          canManageStock: formData.canManageStock,
          canManagePO: formData.canManagePO,
          canViewRecords: formData.canViewRecords,
          canEditSale: formData.canEditSale,
          canEditProduct: formData.canEditProduct,
          canViewExpiry: formData.canViewExpiry,
          requirePinOnSale: isOtherAdmin ? (user.requirePinOnSale ?? false) : formData.requirePinOnSale,
        };

        const updatedUser = await usersService.update(user.id, updatePayload);

        const currentActiveId = appCurrentUser?.id || localStorage.getItem('pos_active_user_id');
        if (user.id === currentActiveId) {
          useUsersStore.getState().setCurrentUser(updatedUser);
          await refreshProfile();
        }

        useUsersStore.getState().setUsers(appUsers.map(u => (u.id === user.id ? updatedUser : u)));
        sonner.success('User updated successfully');
      } else {
        // Create new user
        if (!formData.pin || formData.pin.length < 4 || formData.pin.length > 12) {
          sonner.error('PIN must be between 4 and 12 digits');
          setLoading(false);
          return;
        }
        if (formData.pin !== formData.confirmPin) {
          sonner.error('PIN and Confirm PIN do not match');
          setLoading(false);
          return;
        }

        const newUser = await usersService.create({
          username: cleanUsername,
          name: formData.name.trim(),
          email: formData.email.trim(),
          pin: formData.pin,
          role: formData.role,
          active: formData.active,
          avatar: formData.avatar || undefined,
          canEditPrice: formData.canEditPrice,
          canGiveDiscount: formData.canGiveDiscount,
          canDeleteSale: formData.canDeleteSale,
          canViewProfit: formData.canViewProfit,
          canManageStock: formData.canManageStock,
          canManagePO: formData.canManagePO,
          canViewRecords: formData.canViewRecords,
          canEditSale: formData.canEditSale,
          canEditProduct: formData.canEditProduct,
          canViewExpiry: formData.canViewExpiry,
          requirePinOnSale: formData.requirePinOnSale,
        });

        useUsersStore.getState().setUsers([...appUsers, newUser]);
        sonner.success('New operator created successfully');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      const msg = error?.message || 'Failed to save user';
      sonner.error(`Error saving user: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return {
    appCurrentUser,
    appUsers,
    loading,
    formData,
    setFormData,
    showPin,
    setShowPin,
    pin: formData.pin,
    setPin: (val: string) => setFormData(prev => ({ ...prev, pin: val })),
    confirmPin: formData.confirmPin,
    setConfirmPin: (val: string) => setFormData(prev => ({ ...prev, confirmPin: val })),
    showMediaLibrary,
    setShowMediaLibrary,
    handleSubmit,
    handleChange,
    handleRoleChange,
  };
}
