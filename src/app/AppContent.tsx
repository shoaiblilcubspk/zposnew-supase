import { useSettingsStore, useUsersStore } from '../stores';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/SupabaseAppContext';
import { useTouchKeyboard } from '../providers/TouchKeyboardProvider';
import { useState, useEffect, Suspense } from 'react';
import { PinLoginPage } from '../components/auth/PinLoginPage';
import { FirstLaunchSetupModal } from '../components/auth/FirstLaunchSetupModal';
import { FastLockModal } from '../components/auth/FastLockModal';
import { Header } from '../components/layout/Header';
import { SkeletonLoader } from '../shared/ui/SkeletonLoader';
import { Toaster } from 'sonner';
import { DialogProvider } from '../shared/ui/DialogProvider';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { AppRoutes } from '../appRoutes';
import { LoadingView } from './LoadingView';
import { useAppGlobalEffects } from './useAppGlobalEffects';

export function AppContent() {
  const appSettings = useSettingsStore(s => s.settings);
  const appLoading = useSettingsStore(s => s.loading);
  const appSyncProgress = useSettingsStore(s => s.syncProgress);
  const appCurrentUser = useUsersStore(s => s.currentUser);

  const { user, loading, isFirstLaunch, onBootstrapComplete } = useAuth();
  useApp();
  useTouchKeyboard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState(() => {
    return localStorage.getItem('pos_terminal_locked') === 'true';
  });
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleLockTerminal = () => {
    localStorage.setItem('pos_terminal_locked', 'true');
    setIsTerminalLocked(true);
  };

  const handleUnlockTerminal = () => {
    localStorage.removeItem('pos_terminal_locked');
    setIsTerminalLocked(false);
  };

  // Global fast-lock shortcut: ⌘L or Ctrl+L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e?.key && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLockTerminal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isLoggedIn = Boolean(user && appCurrentUser && appCurrentUser.active);
  // P2P mesh removed (Supabase-only cloud-direct). Sync now runs via initDataLayer() at boot.
  useAppGlobalEffects();

  return (
    <>
      <Toaster
        className="!z-[999999]"
        position="top-center"
        expand={false}
        visibleToasts={1}
        closeButton={false}
        duration={3500}
        theme="dark"
        toastOptions={{
          className: '!rounded-[20px] !px-4 !py-2.5 !bg-neutral-900/95 dark:!bg-[#1a1a1e]/95 !backdrop-blur-xl !border !border-white/10 !text-white !shadow-2xl !text-[13px] !font-medium !tracking-tight flex items-center gap-2.5 !max-w-[min(calc(100vw-28px),760px)] !w-auto',
        }}
        style={{ zIndex: 999999 }}
      />

      {isOffline && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] md:bottom-3 left-1/2 -translate-x-1/2 z-[999998] flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 dark:bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 shadow-2xl">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-medium text-white tracking-tight">Offline — saved locally, will sync when back online</span>
        </div>
      )}

      {loading || (user && !appCurrentUser && appLoading) ? (
        <SkeletonLoader type="list" count={8} />
      ) : (
        <div dir="ltr" className="fixed inset-0 w-full bg-gray-50 dark:bg-app flex flex-col overflow-hidden">
          {isFirstLaunch ? (
            <FirstLaunchSetupModal open={isFirstLaunch} onComplete={onBootstrapComplete} />
          ) : !user || !appCurrentUser || !appCurrentUser.active ? (
            <PinLoginPage />
          ) : (
        <>
          <DialogProvider />
          <FastLockModal isOpen={isTerminalLocked} onUnlock={handleUnlockTerminal} />
          <Header
            onShowMobileMenu={() => setIsMobileMenuOpen(true)}
            isMobileMenuOpen={isMobileMenuOpen}
            onHideMobileMenu={() => setIsMobileMenuOpen(false)}
            onLockTerminal={handleLockTerminal}
          />
          <main className="flex-1 min-h-0 relative overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-app pb-[calc(env(safe-area-inset-bottom,0px)+96px)] md:pb-0" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              <ErrorBoundary>
              <Suspense fallback={<LoadingView />}>
                <AppRoutes />
              </Suspense>
             </ErrorBoundary>

            {appLoading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/80 z-[100] flex items-center justify-center animate-in fade-in">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 bg-primary/10 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  {appSyncProgress && (
                    <div className="bg-white dark:bg-surface px-6 py-5 rounded-md shadow-lg border border-neutral-200 dark:border-white/[0.08] flex flex-col items-center min-w-[320px]">
                      <p className="text-[11px] font-medium text-primary uppercase tracking-wider mb-1">{appSyncProgress.status}</p>
                      <div className="w-full h-1 bg-neutral-100 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 ease-out"
                          style={{ width: `${(appSyncProgress.current / appSyncProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between w-full mt-2 text-[11px] font-mono text-neutral-500">
                        <span>STAGE {appSyncProgress.current}/{appSyncProgress.total}</span>
                        {appSyncProgress.size && <span>{appSyncProgress.size}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
          <MobileBottomNav onShowMenu={() => setIsMobileMenuOpen(true)} />
        </>
      )}
      </div>
      )}
    </>
  );
}
