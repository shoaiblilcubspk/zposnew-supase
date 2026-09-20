import { useSettingsStore, useUsersStore } from '../../stores';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import { AppIcons } from '../../lib/icons';
import { settingsService } from '../../lib/services';
import { useApp } from '../../context/SupabaseAppContext';
import { useAuth } from '../../context/AuthContext';
import { sonner } from '../../lib/sonner';
import { can } from '../../lib/permissions';
import { Button } from '../../shared/ui';
import { RealIcon } from '../../shared/icons';
import { MAIN_NAV_ITEMS } from '../../shared/navigation/tabRegistry';
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { HeaderActions } from './HeaderActions';

export interface HeaderProps {
  onShowMobileMenu?: () => void;
  onHideMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onLockTerminal?: () => void;
}

export function Header({
  onShowMobileMenu,
  onHideMobileMenu,
  isMobileMenuOpen = false,
  onLockTerminal,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSettings = useSettingsStore(s => s.settings);
  const { forceSync } = useApp();
  const { signOut } = useAuth();
  const [renderDrawer, setRenderDrawer] = useState(isMobileMenuOpen);

  useEffect(() => {
    if (isMobileMenuOpen) {
      setRenderDrawer(true);
    } else {
      const timer = setTimeout(() => setRenderDrawer(false), 500); // 500ms slide-out transition
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen]);

  const {
    containerRef: navRef,
    canScrollLeft,
    canScrollRight,
    isDragging,
    scroll: scrollNav
  } = useHorizontalScroll<HTMLDivElement>({
    step: 220,
    enableDrag: true,
    enableWheel: true,
    activeItemSelector: '[data-active="true"]',
    activeDep: location.pathname
  });

  const toggleTheme = async () => {
    const current = appSettings.theme || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    useSettingsStore.getState().setSettings({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    try {
      const existing = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
      localStorage.setItem('pos_local_prefs', JSON.stringify({ ...existing, theme: newTheme }));
      settingsService.update({ theme: newTheme }).catch(() => { });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const handleLogout = async () => {
    const result = await sonner.confirm("Sign Out", "Are you sure you want to sign out?", "Sign Out");
    if (result.isConfirmed) {
      try { await signOut(); } catch { sonner.error('Failed to sign out. Please try again.'); }
    }
  };

  const getNavigationItems = () => {
    const role = appCurrentUser?.role;
    return MAIN_NAV_ITEMS.filter(item => !item.permission || can(role, item.permission));
  };

  const navigationItems = getNavigationItems();

  return (
    <header className={`bg-white dark:bg-app border-b border-gray-200 dark:border-white/[0.08] sticky top-0 overflow-visible ${isMobileMenuOpen ? 'z-[400]' : 'z-[40]'} lg:z-[40] pt-[env(safe-area-inset-top)] px-safe`}>
      <div className="flex items-center h-13 lg:h-14 px-3 md:px-6 gap-2 lg:gap-4">
        <div className="flex items-center gap-2.5 lg:gap-3 flex-shrink-0">
          <div className="rounded-lg border border-neutral-200 dark:border-white/[0.12] bg-white dark:bg-black/40 overflow-hidden flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 p-0.5 shrink-0 shadow-sm">
            {appSettings.storeLogo ? (
              <img src={appSettings.storeLogo} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <img src="/zaynahs-logo.svg" alt="POS" className="h-full w-full object-contain p-0.5" />
            )}
          </div>
          <div className="hidden xs:block leading-tight">
            <p className="text-[14px] font-bold text-neutral-900 dark:text-white tracking-tight truncate max-w-[140px] sm:max-w-[180px]">
              {appSettings.storeName}
            </p>
          </div>
        </div>

        <div className="hidden md:block h-5 w-px bg-gray-200 dark:border-white/[0.08] flex-shrink-0 mx-1" />

        <div className="hidden md:flex items-center flex-1 min-w-0 relative mr-2">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollNav('left')}
              aria-label="Scroll left"
              className="absolute -left-1 z-30 flex items-center justify-center w-7.5 h-7.5 rounded-full bg-white dark:bg-[#222226] text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/20 shadow-md hover:scale-110 hover:border-primary hover:text-primary active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
          <div
            ref={navRef}
            className={`flex items-center gap-1.5 lg:gap-2 xl:gap-2.5 overflow-x-auto no-scrollbar scrollbar-hide overscroll-x-contain touch-pan-x w-full px-2.5 py-2.5 ${
              isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
          >
            {navigationItems.map((item) => {
              const active = location.pathname === '/' + item.id || location.pathname.startsWith('/' + item.id + '/');
              return (
                <button
                  key={item.id}
                  data-active={active}
                  onClick={() => navigate('/' + item.id)}
                  className={`group relative whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-2 px-3 h-8 max-h-8 rounded-full text-[12.5px] font-semibold tracking-[-0.01em] active:scale-95 border cursor-pointer select-none overflow-visible ${
                    active
                      ? 'bg-primary text-white font-bold border-primary shadow-xs'
                      : 'bg-white dark:bg-white/[0.05] text-neutral-900 dark:text-neutral-100 border-neutral-200/90 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="shrink-0 w-7 h-7 flex items-center justify-center overflow-visible transition-transform duration-150 group-hover:scale-110">
                    <RealIcon name={item.realIcon} size={32} />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollNav('right')}
              aria-label="Scroll right"
              className="absolute -right-1 z-30 flex items-center justify-center w-7.5 h-7.5 rounded-full bg-white dark:bg-[#222226] text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/20 shadow-md hover:scale-110 hover:border-primary hover:text-primary active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>

        <div className="hidden md:block h-6 w-px bg-neutral-200 dark:border-white/[0.08] flex-shrink-0 mr-2" />

        <div className="flex-1 md:hidden" />

        <HeaderActions
          appSettings={appSettings}
          appCurrentUser={appCurrentUser}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
          onLockTerminal={onLockTerminal}
          onShowMobileMenu={onShowMobileMenu}
          forceSync={forceSync}
        />
      </div>

      {renderDrawer && (
        <MobileMenuDrawer
          isMobileMenuOpen={isMobileMenuOpen}
          onHideMobileMenu={onHideMobileMenu}
          appCurrentUser={appCurrentUser}
          appSettings={appSettings}
          navigationItems={navigationItems}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
          onLockTerminal={onLockTerminal}
        />
      )}
    </header>
  );
}
