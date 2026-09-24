import React, { useState } from 'react';
import { User, KeyRound, Shield, Camera, Save, Eye, EyeOff, UserCheck, X } from 'lucide-react';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { User as UserType } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { MediaLibrary } from '../../shared/MediaLibrary';
import { ProductThumb } from '../../shared/ui/ProductThumb';
import { Button, ToggleSwitch } from '../../shared/ui';
import { useUserModalData } from './useUserModalData';
import { UserPermissionsGrid } from './UserPermissionsGrid';
import { useCapsLock } from '../../hooks/useCapsLock';
import { CapsLockIndicator } from '../../shared/ui/CapsLockIndicator';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType | null;
  currentUser?: UserType | null;
  onSuccess?: () => void;
  defaultRole?: 'admin' | 'manager' | 'cashier' | 'salesman';
}

export function UserModal({ isOpen, onClose, user, currentUser: propCurrentUser, onSuccess, defaultRole }: UserModalProps) {
  const isCapsLock = useCapsLock();
  const {
    formData, setFormData,
    showPin, setShowPin,
    appCurrentUser,
    handleSubmit,
    handleRoleChange,
    handleChange,
  } = useUserModalData({ user, currentUser: propCurrentUser, onSuccess, onClose, defaultRole });

  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  if (!isOpen) return null;

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        className="h-8 px-3 text-[13px]"
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={(e) => handleSubmit(e as any)}
        className="h-8 px-3 text-[13px]"
        icon={<Save className="h-3.5 w-3.5" />}
      >
        {user ? 'Save Profile' : 'Create User'}
      </Button>
    </div>
  );

  const isOtherAdmin = user?.role === 'admin' && user?.id !== appCurrentUser?.id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit Staff Member' : 'New Staff Member'}
      size="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
        {/* Identity & Basic Info */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-surface border border-gray-200 dark:border-white/[0.08] rounded-md">
          <div className="relative shrink-0">
            <div
              onClick={() => setShowMediaLibrary(true)}
              className="h-14 w-14 bg-white dark:bg-black/40 rounded-md flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/[0.08] cursor-pointer hover:border-primary/50 transition-colors"
            >
              {formData.avatar ? (
                <ProductThumb image={formData.avatar} alt="Avatar" fallback={<User className="h-6 w-6 text-gray-400" />} />
              ) : (
                <User className="h-6 w-6 text-gray-400" />
              )}
            </div>
            {formData.avatar ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData(prev => ({ ...prev, avatar: '' }));
                }}
                title="Remove photo"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm border border-white/20 bg-neutral-900/80 hover:bg-rose-600 text-white z-10"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaLibrary(true)}
                aria-label="Upload photo"
                className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-zinc-800 rounded border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:text-primary shadow-sm"
              >
                <Camera className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
              {formData.name || 'New Staff Profile'}
            </p>
            <p className="text-[11px] text-gray-500 font-mono tracking-tight">
              @{formData.username || 'username'} • {formData.role.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full h-8 px-2.5 text-[13px] bg-white dark:bg-black/30 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Michael Chen"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={!!user}
              className="w-full h-8 px-2.5 text-[13px] bg-white dark:bg-black/30 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              placeholder="mchen"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full h-8 px-2.5 text-[13px] bg-white dark:bg-black/30 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
              placeholder="mchen@shop.local"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Role Authority *
            </label>
            <SearchableSelect
              label="SELECT ROLE"
              options={[
                { id: 'admin', label: 'Administrator (Full Access)' },
                { id: 'manager', label: 'Manager (Operations & Inventory)' },
                { id: 'cashier', label: 'Cashier (Billing & POS)' },
                { id: 'salesman', label: 'Salesman (Orders & Catalog)' },
              ]}
              value={formData.role}
              onChange={(val) => handleRoleChange(val as any)}
              icon={Shield}
              disabled={user?.id === appCurrentUser?.id}
            />
          </div>
        </div>

        {/* Security PIN Section */}
        <div className="p-3 bg-gray-50 dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-white">
                {user ? 'Reset Security PIN (Leave blank to keep current)' : 'Security PIN (4–12 Digits) *'}
              </span>
              {isCapsLock && <CapsLockIndicator variant="inline" />}
            </div>
            {!isOtherAdmin && (
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
              >
                {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {isOtherAdmin ? (
            <div className="p-2 bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] rounded text-[12px] text-neutral-500 dark:text-neutral-400">
              🔒 <strong>Security Protected:</strong> Only this Administrator can modify their own PIN.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <input
                type={showPin ? 'text' : 'password'}
                name="pin"
                autoComplete="new-password"
                inputMode="numeric"
                maxLength={12}
                value={formData.pin}
                onChange={handleChange}
                required={!user}
                className="h-8 px-2.5 text-[13px] font-mono tracking-widest bg-white dark:bg-black/30 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder={user ? 'New PIN (optional)' : 'Enter 4-12 digit PIN'}
              />
              <input
                type={showPin ? 'text' : 'password'}
                name="confirmPin"
                autoComplete="new-password"
                inputMode="numeric"
                maxLength={12}
                value={formData.confirmPin}
                onChange={handleChange}
                required={!user || Boolean(formData.pin)}
                className="h-8 px-2.5 text-[13px] font-mono tracking-widest bg-white dark:bg-black/30 border border-neutral-300 dark:border-white/[0.12] rounded text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder="Confirm PIN"
              />
            </div>
          )}
        </div>

        {/* Operational Permissions Grid */}
        <UserPermissionsGrid
          formData={formData}
          setFormData={setFormData}
          isOtherAdmin={isOtherAdmin}
        />

        {/* Status */}
        <div className="h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded-md">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">Account Active</span>
          </div>
          <ToggleSwitch
            checked={formData.active}
            onChange={(checked) => setFormData((prev: any) => ({ ...prev, active: checked }))}
            disabled={user?.id === appCurrentUser?.id}
            size="sm"
          />
        </div>
      </form>

      {showMediaLibrary && (
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={async (url) => {
            const { resolveImageRecord } = await import('../../lib/media/localImageStore');
            const img = await resolveImageRecord(url);
            setFormData((prev: any) => ({ ...prev, avatar: img.value ?? url }));
          }}
        />
      )}
    </Modal>
  );
}
