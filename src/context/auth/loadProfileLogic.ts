import { supabase } from '../../lib/supabase';
import { can } from '../../lib/permissions';
import { sonner } from '../../lib/sonner';
import { User } from '../../types';
import { signOutLogic } from './signOutLogic';

export async function loadProfileLogic(userId: string, setProfile: any, setUser: any, setLoading: any) {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (data) {
      if (data.active === false) {
        await signOutLogic(setLoading, () => {}, setUser, setProfile);
        sonner.error('Your account has been deactivated by an administrator.');
        return;
      }
      const pData = data as any;
      const profileData: User = {
        id: pData.id, username: pData.username, name: pData.name, email: pData.email,
        role: pData.role as any,
        canEditPrice: can(pData.role, 'edit_price'), canGiveDiscount: can(pData.role, 'give_discount'),
        canDeleteSale: can(pData.role, 'delete_sale'), canViewProfit: can(pData.role, 'view_profit'),
        canManageStock: can(pData.role, 'manage_stock'), canManagePO: can(pData.role, 'manage_po'),
        canViewRecords: can(pData.role, 'view_records'), canEditSale: can(pData.role, 'edit_sale'),
        canEditProduct: can(pData.role, 'manage_stock'),
        active: pData.active ?? true, lastLogin: pData.last_login ? new Date(pData.last_login) : undefined,
        avatar: pData.avatar || undefined,
      };
      setProfile(profileData);
      
      const actionHash = localStorage.getItem(`action_hash_${profileData.email}`) || undefined;
      localStorage.setItem('pos_actor_profile', JSON.stringify({
        id: profileData.id,
        role: profileData.role,
        email: profileData.email,
        actionHash: actionHash
      }));

      const { enableFullAuthInit } = await import('../../lib/supabase');
      enableFullAuthInit();
      setLoading(false);
    } else {
      await signOutLogic(setLoading, () => {}, setUser, setProfile);
      sonner.error('Your account no longer exists. Please sign in again.');
    }
  } catch (error: any) {
    const isNetworkError = !navigator.onLine || error?.toString().includes('Failed to fetch') || error?.toString().includes('ERR_NAME_NOT_RESOLVED');
    if (isNetworkError) {
      sonner.error('Network error. Please check your internet connection and try again.');
      setLoading(false);
      return;
    }
    await signOutLogic(setLoading, () => {}, setUser, setProfile);
    sonner.error('Failed to load user profile. Please try logging in again.');
  }
}
