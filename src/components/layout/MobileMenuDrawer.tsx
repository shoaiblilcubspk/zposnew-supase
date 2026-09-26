import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { Avatar, RealIcon } from '../../shared/ui';
import { can } from '../../lib/permissions';
import { executeHardRefresh } from '../../lib/utils/hardRefresh';

interface MobileMenuDrawerProps {
  isMobileMenuOpen: boolean;
  onHideMobileMenu?: () => void;
  appCurrentUser: any;
  appSettings: any;
  navigationItems: any[];
  toggleTheme: () => void;
  handleLogout: () => void;
  onLockTerminal?: () => void;
  forceSync?: () => Promise<void>;
}

export function MobileMenuDrawer({
  isMobileMenuOpen,
  onHideMobileMenu,
  appCurrentUser,
  appSettings,
  navigationItems,
  toggleTheme,
  handleLogout,
  onLockTerminal,
  forceSync,
}: MobileMenuDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`fixed inset-0 z-[300] overflow-hidden pointer-events-${isMobileMenuOpen ? 'auto' : 'none'}`}>
      {/* iOS Frosted Backdrop */}
      <div 
        onClick={() => onHideMobileMenu?.()}
        className={`absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* Modern Apple Sheet Drawer */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-[290px] sm:w-[325px] bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-2xl border-l border-neutral-200/80 dark:border-white/[0.08] shadow-[-8px_0_30px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_40px_rgba(0,0,0,0.5)] flex flex-col z-[300] transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Compact Apple Header */}
        <div 
          className="flex items-center justify-between px-3.5 pb-2 flex-shrink-0"
          style={{ paddingTop: 'calc(0.65rem + env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-primary rounded-full" />
            <h2 className="text-[13px] font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
              ZAYNAHSPOS.COM
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onHideMobileMenu?.()}
            aria-label="Close menu"
            className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-white/[0.08] hover:bg-neutral-200 dark:hover:bg-white/[0.14] active:scale-90 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {/* iOS Account / Profile Card */}
          <div className="mx-3 mb-2.5 p-2 rounded-2xl bg-neutral-100/70 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-2.5">
            <Avatar
              src={appCurrentUser?.avatar || undefined}
              name={appCurrentUser?.name || 'Z'}
              size="sm"
              shape="square"
              className="!h-9 !w-9 !rounded-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-neutral-900 dark:text-white tracking-tight truncate leading-tight">
                {appCurrentUser?.name || 'Admin User'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-primary font-medium uppercase">
                  @{appCurrentUser?.username || 'admin'}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase">
                  · {appCurrentUser?.role || 'admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Navigation */}
          <p className="px-3.5 mb-1.5 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Navigation
          </p>

          {/* Apple App Grid (3 Cols) — Full Size Icons Intact */}
          <nav className="grid grid-cols-3 gap-2 px-3 mb-3">
            {navigationItems.map((item) => {
              const active = location.pathname === '/' + item.id || location.pathname.startsWith('/' + item.id + '/');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate('/' + item.id);
                    onHideMobileMenu?.();
                  }}
                  className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-150 active:scale-[0.93] min-h-[76px] ${
                    active
                      ? 'bg-primary text-white border-primary shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
                      : 'bg-neutral-100/70 dark:bg-white/[0.04] text-neutral-800 dark:text-neutral-200 border-black/[0.04] dark:border-white/[0.06] hover:bg-neutral-100 dark:hover:bg-white/[0.08] shadow-sm'
                  }`}
                >
                  <div className="mb-1 shrink-0 flex items-center justify-center drop-shadow-sm transition-transform duration-150 group-hover:scale-110">
                    <RealIcon name={item.realIcon} size="lg" />
                  </div>
                  <span className={`text-[11px] tracking-tight text-center leading-tight truncate w-full px-0.5 ${
                    active ? 'text-white font-bold' : 'font-medium'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Section: Preferences & Security */}
          <p className="px-3.5 mb-1.5 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Preferences & Security
          </p>

          {/* Grouped iOS Settings Card */}
          <div className="mx-3 rounded-2xl bg-neutral-100/70 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.06] mb-2.5 shadow-sm">
            {onLockTerminal && (
              <button
                type="button"
                onClick={() => {
                  onHideMobileMenu?.();
                  onLockTerminal();
                }}
                className="flex items-center justify-between w-full h-10 px-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors active:bg-black/[0.06] dark:active:bg-white/[0.08] text-neutral-800 dark:text-neutral-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] shadow-xs flex items-center justify-center shrink-0">
                    <RealIcon name="lock" size={20} />
                  </div>
                  <span className="text-[12.5px] font-medium tracking-tight">Lock Terminal</span>
                </div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 dark:text-neutral-500 bg-neutral-200/60 dark:bg-white/[0.08] px-1.5 py-0.5 rounded">⌘L</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-between w-full h-10 px-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors active:bg-black/[0.06] dark:active:bg-white/[0.08] text-neutral-800 dark:text-neutral-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] shadow-xs flex items-center justify-center shrink-0">
                  <RealIcon
                    name={appSettings.theme === 'dark' ? 'sun' : 'moon'}
                    size={20}
                  />
                </div>
                <span className="text-[12.5px] font-medium tracking-tight">
                  {appSettings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase text-neutral-400 dark:text-neutral-500 bg-neutral-200/60 dark:bg-white/[0.08] px-1.5 py-0.5 rounded">
                {appSettings.theme || 'dark'}
              </span>
            </button>

            <button
              type="button"
              onClick={async () => {
                onHideMobileMenu?.();
                await executeHardRefresh(forceSync);
              }}
              className="flex items-center justify-between w-full h-10 px-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors active:bg-black/[0.06] dark:active:bg-white/[0.08] text-neutral-800 dark:text-neutral-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] shadow-xs flex items-center justify-center shrink-0">
                  <RealIcon name="refresh" size={20} />
                </div>
                <span className="text-[12.5px] font-medium tracking-tight">Hard Refresh</span>
              </div>
              <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Resync
              </span>
            </button>

            {can(appCurrentUser?.role, 'view_settings') && (
              <button
                type="button"
                onClick={() => {
                  navigate('/settings');
                  onHideMobileMenu?.();
                }}
                className="flex items-center justify-between w-full h-10 px-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors active:bg-black/[0.06] dark:active:bg-white/[0.08] text-neutral-800 dark:text-neutral-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] shadow-xs flex items-center justify-center shrink-0">
                    <RealIcon name="settings" size={20} />
                  </div>
                  <span className="text-[12.5px] font-medium tracking-tight">Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            )}
          </div>

          {/* Sign Out iOS Pill */}
          <button
            type="button"
            onClick={() => {
              onHideMobileMenu?.();
              handleLogout();
            }}
            className="mx-3 flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-rose-500/[0.08] hover:bg-rose-500/[0.14] active:scale-[0.98] border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-[12.5px] transition-all shadow-xs"
          >
            <RealIcon name="exit" size={18} />
            <span>Sign Out</span>
          </button>

          {/* Compact Smart Footer */}
          <div className="mt-auto pt-3 pb-1 text-center">
            <p className="text-[9.5px] font-mono text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
              ZAYNAHS POS • LOCAL-FIRST
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
