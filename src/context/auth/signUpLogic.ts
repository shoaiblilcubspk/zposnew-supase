import { supabase } from '../../lib/supabase';
import { can } from '../../lib/permissions';
import { sonner } from '../../lib/sonner';
import { getAuthErrorMessage } from '../../lib/authUtils';
import { User } from '../../types';

export async function signUpLogic(
  email: string, password: string, name: string, username: string,
  setLoading: (l: boolean) => void,
  setProfile: (p: User | null) => void
) {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, username } } });
    if (error) throw error;
    if (data.user && !data.session) {
      setLoading(false);
      sonner.success('Account created! ✅ Please check your email and click the confirmation link to activate your account.');
      return;
    }
    if (data.user) {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const isFirstUser = (count ?? 1) === 0;
      const userRole = isFirstUser ? 'admin' : 'cashier';
      const profilePayload: any = {
        id: data.user.id, username, name, email, role: userRole,
        can_edit_price: isFirstUser, can_give_discount: true, can_delete_sale: isFirstUser, can_view_profit: isFirstUser,
        can_manage_stock: false, can_manage_po: false, can_view_records: true, active: true,
      };
      const { data: profileData } = await supabase.from('users').upsert(profilePayload, { onConflict: 'id' }).select().maybeSingle();
      const pData = profileData || profilePayload;
      if (pData) {
        setProfile({
          id: pData.id, username: pData.username, name: pData.name, email: pData.email, role: pData.role as any,
          canEditPrice: can(pData.role, 'edit_price'), canGiveDiscount: can(pData.role, 'give_discount'),
          canDeleteSale: can(pData.role, 'delete_sale'), canViewProfit: can(pData.role, 'view_profit'), canManageStock: can(pData.role, 'manage_stock'),
          canManagePO: can(pData.role, 'manage_po'), canViewRecords: can(pData.role, 'view_records'),
          canEditProduct: can(pData.role, 'manage_stock'), canEditSale: can(pData.role, 'edit_sale'),
          active: pData.active ?? true,
          lastLogin: pData.last_login ? new Date(pData.last_login) : undefined, avatar: pData.avatar || undefined,
        });
      }
      setLoading(false);
      sonner.success('Welcome! ✅ Account created successfully as Admin.');
      localStorage.setItem('pos_session_start', new Date().toISOString());
    }
    setLoading(false);
  } catch (error: any) {
    setLoading(false);
    const msg = error.message || error.toString();
    if (msg.includes('User already registered') || msg.includes('already been registered')) {
      sonner.error('This email is already registered. Please sign in instead.');
    } else if (msg.toLowerCase().includes('email')) {
      sonner.error('Please enter a valid email address.');
    } else {
      sonner.error(`Sign Up Failed: ${getAuthErrorMessage(msg)}`);
    }
    throw error;
  }
}
