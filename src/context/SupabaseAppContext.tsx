import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useUsersStore, useProductsStore, useSettingsStore } from '../stores';
import { localDb } from '../lib/localDb';
import { seedPaymentModes, seedMissingBarcodes } from '../lib/services';
import { useAppLoadData } from './useAppLoadData';
// Realtime disabled — single-tenant POS, saves bandwidth. Data loads on page load / manual refresh.
// import { useAppRealtime } from './useAppRealtime';
import { useAppPersistence } from './useAppPersistence';
import { supabase } from '../lib/supabase';
import { sonner } from '../lib/sonner';

const AppContext = createContext<{
  loadData: (silent?: boolean, forceCloudSync?: boolean) => Promise<void>;
  forceSync: () => Promise<void>;
  loadMoreSales: (offset: number, limit?: number) => Promise<boolean>;
  searchSales: (term: string) => Promise<void>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [_reconnectTrigger, _setReconnectTrigger] = useState(0);

  const appUsers = useUsersStore(s => s.users);
  const appProducts = useProductsStore(s => s.products);
  const hasBooted = useRef(false);

  const { loadData, loadMoreSales, searchSales } = useAppLoadData(initialized, setInitialized);

  // 💾 POS State Persistence hooks
  useAppPersistence();

  // 🔄 REALTIME SYNC — DISABLED (single-tenant, saves bandwidth)
  // useAppRealtime(subscriptionsInitialized, reconnectTrigger, setReconnectTrigger);

  // If the current user is blocked/deactivated on another device, force logout.
  useEffect(() => {
    const handleUserBlocked = () => {
      console.warn('[Auth] User blocked — signing out.');
      sonner.error('Your account has been deactivated by the administrator.');
      supabase.auth.signOut().catch(() => { });
      localStorage.removeItem('pos_session_start');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    };
    window.addEventListener('user-blocked', handleUserBlocked);
    return () => window.removeEventListener('user-blocked', handleUserBlocked);
  }, []);

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (user && profile && !initialized && !hasBooted.current) {
      hasBooted.current = true;
      loadData().catch(err => {
        console.error('[loadData] unhandled rejection on login:', err);
        hasBooted.current = false;
      });
    } else if (!user) {
      hasBooted.current = false;
      setInitialized(false);
      useSettingsStore.getState().setLoading(false);
    }
  }, [user, profile, initialized, loadData]);

  // Auto-seed missing barcodes on app load
  const autoSeedDone = useRef(false);
  useEffect(() => {
    if (user && profile && appProducts.length > 0 && !autoSeedDone.current) {
      autoSeedDone.current = true;
      seedMissingBarcodes()
        .then((res) => {
          if (res && res.updated.length > 0) {
            localDb.products.toArray()
              .then((all) => useProductsStore.getState().setProducts(all as any))
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [user, profile, appProducts]);

  // Auto-Pull on Reconnect
  useEffect(() => {
    const handleOnline = () => {
      if (user && profile) {
        console.log('[App] Reconnected to internet. Pulling latest data...');
        setTimeout(() => {
          loadData(true, true).catch(err => console.error('[loadData] unhandled rejection on reconnect:', err));
        }, 2000);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, profile, loadData]);

  // Set current user from auth profile and keep it synced with users list
  useEffect(() => {
    if (profile) {
      const latestUserRecord = appUsers.find(u => u.id === profile.id);
      useUsersStore.getState().setCurrentUser(latestUserRecord || profile);
    }
  }, [profile, appUsers]);

  // Seed default payment wallets
  useEffect(() => {
    if (!user) return;
    seedPaymentModes().catch(e => console.warn('[paymentModes] seed failed', e));
  }, [user]);

  const forceSync = async () => {
    if (!user) return;
    try {
      await loadData(false, true);
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{ loadData, forceSync, loadMoreSales, searchSales }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
