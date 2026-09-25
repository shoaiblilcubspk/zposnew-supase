import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { sonner } from '../lib/sonner';
import { initDb } from '../lib/db';
import { initDataLayer, pullNow } from '../data';
import {
  isFirstLaunch as checkFirstLaunch,
  loginWithPin,
} from '../lib/auth/localAuthService';
import { useUsersStore } from '../stores/usersStore';

interface AuthContextType {
  user: any | null;
  profile: User | null;
  session: any | null;
  loading: boolean;
  isFirstLaunch: boolean;
  signInWithPin: (pin: string, userId?: string) => Promise<void>;
  signIn: (emailOrUsername: string, pinOrPassword: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isRecoveringPassword: boolean;
  setIsRecoveringPassword: (value: boolean) => void;
  onBootstrapComplete: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { hashPasswordString } from '../lib/authUtils';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const setCurrentUser = useUsersStore((s) => s.setCurrentUser);

  const applyUserSession = useCallback((userObj: User | null) => {
    setProfile(userObj);
    setCurrentUser(userObj);
    if (userObj) {
      localStorage.setItem('pos_active_user_id', userObj.id);
      localStorage.setItem('pos_session_start', new Date().toISOString());
    } else {
      localStorage.removeItem('pos_active_user_id');
      localStorage.removeItem('pos_session_start');
    }
  }, [setCurrentUser]);

  // Bootstrapping local auth check on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        await initDb();
        // Bring up the Supabase-only data layer (mirror + push/pull workers). The initial pull
        // is time-boxed so boot never hangs offline.
        try {
          await initDataLayer();
        } catch (e) {
          console.warn('[dataLayer] init skipped:', (e as Error).message);
        }
        let firstLaunch = await checkFirstLaunch();

        // Guard against the "setup screen flashes on first load, gone after refresh" race:
        // a fresh device's local mirror is empty until the first pull lands staff_users. If we
        // look "first launch" but we're ONLINE, poll for a real pull (up to ~12s) before deciding
        // — only a genuinely empty cloud (or a truly offline fresh device) shows First-Time Setup.
        if (firstLaunch && typeof navigator !== 'undefined' && navigator.onLine) {
          const deadline = Date.now() + 12000;
          while (mounted && Date.now() < deadline) {
            try { await pullNow(); } catch { /* keep polling */ }
            firstLaunch = await checkFirstLaunch();
            if (!firstLaunch) break;
            await new Promise((r) => setTimeout(r, 700));
          }
        }
        if (!mounted) return;

        if (firstLaunch) {
          setIsFirstLaunch(true);
          setLoading(false);
          return;
        }

        // Check if there was a saved session
        const savedUserId = localStorage.getItem('pos_active_user_id');
        if (savedUserId) {
          const { getUserById } = await import('../lib/services/users/userRepository');
          const restoredUser = await getUserById(savedUserId);
          applyUserSession(restoredUser && restoredUser.active ? restoredUser : null);
        }
      } catch (err) {
        console.error('Local auth initialization error:', err);
        if (mounted) {
          setIsFirstLaunch(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, [applyUserSession]);

  const signInWithPin = async (pin: string, identifierOrUserId?: string): Promise<void> => {
    setLoading(true);
    try {
      const authenticatedUser = await loginWithPin(pin, identifierOrUserId);
      applyUserSession(authenticatedUser);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (emailOrUsername: string, pinOrPassword: string): Promise<void> => {
    return signInWithPin(pinOrPassword, emailOrUsername);
  };

  const signUp = async (
    _email: string,
    _password: string,
    _name: string,
    _username: string
  ): Promise<void> => {
    sonner.warning('User creation must be performed by an Admin in User Management.');
  };

  const signOut = async (): Promise<void> => {
    applyUserSession(null);
    sonner.info('Signed out successfully.');
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!profile) return;
    const { updateUser } = await import('../lib/services/users/userRepository');
    const updated = await updateUser(profile.id, updates);
    applyUserSession(updated);
  };

  const updatePassword = async (newPin: string): Promise<void> => {
    if (!profile) return;
    const { resetUserPin } = await import('../lib/services/users/userRepository');
    await resetUserPin(profile.id, newPin);
    sonner.success('Password updated successfully.');
  };

  const refreshProfile = async (): Promise<void> => {
    if (!profile) return;
    const { getUserById } = await import('../lib/services/users/userRepository');
    const fresh = await getUserById(profile.id);
    if (fresh) applyUserSession(fresh);
  };

  const onBootstrapComplete = (adminUser: User) => {
    setIsFirstLaunch(false);
    applyUserSession(adminUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user: profile as any,
        profile,
        session: profile ? ({ user: profile } as any) : null,
        loading,
        isFirstLaunch,
        signInWithPin,
        signIn,
        signUp,
        signOut,
        updateProfile,
        updatePassword,
        refreshProfile,
        isRecoveringPassword,
        setIsRecoveringPassword,
        onBootstrapComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
