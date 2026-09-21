import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { sonner } from '../lib/sonner';
import { initDb, queryOne, execute, TABLES } from '../lib/db';
import {
  isFirstLaunch as checkFirstLaunch,
  loginWithPin,
  mapDbRowToUser,
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
        const firstLaunch = await checkFirstLaunch();
        if (!mounted) return;

        if (firstLaunch) {
          setIsFirstLaunch(true);
          setLoading(false);
          return;
        }

        // Check if there was a saved session
        const savedUserId = localStorage.getItem('pos_active_user_id');
        if (savedUserId) {
          const row = await queryOne(
            `SELECT * FROM ${TABLES.USERS} WHERE id = ? AND active = 1;`,
            [savedUserId]
          );
          if (row) {
            const restoredUser = mapDbRowToUser(row);
            applyUserSession(restoredUser);
          } else {
            applyUserSession(null);
          }
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
    const { hashPin } = await import('../lib/auth/pinCrypto');
    const { fullHash } = await hashPin(newPin);
    await execute(
      `UPDATE ${TABLES.USERS} SET pin_hash = ?, updated_at = ? WHERE id = ?;`,
      [fullHash, Date.now(), profile.id]
    );
    sonner.success('PIN updated successfully.');
  };

  const refreshProfile = async (): Promise<void> => {
    if (!profile) return;
    const row = await queryOne(`SELECT * FROM ${TABLES.USERS} WHERE id = ?;`, [profile.id]);
    if (row) {
      applyUserSession(mapDbRowToUser(row));
    }
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
