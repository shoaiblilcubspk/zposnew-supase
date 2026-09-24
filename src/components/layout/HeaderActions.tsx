import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { can } from '../../lib/permissions';
import { RealIcon } from '../../shared/ui';
import { useSyncStatusStore } from '../../lib/sync/syncStatusStore';
import { executeHardRefresh } from '../../lib/utils/hardRefresh';
import { sonner } from '../../lib/sonner';

interface HeaderActionsProps {
  appSettings: any;
  appCurrentUser: any;
  toggleTheme: () => void;
  handleLogout: () => void;
  onLockTerminal?: () => void;
  onShowMobileMenu?: () => void;
  forceSync: () => Promise<void>;
}

export function HeaderActions({
  appSettings,
  appCurrentUser,
  toggleTheme,
  handleLogout,
  onLockTerminal,
  onShowMobileMenu,
  forceSync,
}: HeaderActionsProps) {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pendingCount = useSyncStatusStore((s) => s.pendingOutboxCount);
  const connectedPeers = useSyncStatusStore((s) => s.connectedPeersCount);
  const isSyncing = useSyncStatusStore((s) => s.isSyncing);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('pos_hard_refresh_toast') === '1') {
        sessionStorage.removeItem('pos_hard_refresh_toast');
        sonner.success('System refreshed & synchronized');
      }
    } catch {
      // ignore
    }
  }, []);

  const onHardRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await executeHardRefresh(forceSync);
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
      {/* Unified Apple Control Cluster — Compact on Mobile, Spacious on Desktop */}
      <div className="flex items-center h-8.5 md:h-10 px-1 md:px-1.5 rounded-full bg-neutral-100/80 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.1] shadow-xs backdrop-blur-md">
        {/* Lock Terminal Button */}
        <button
          type="button"
          onClick={onLockTerminal}
          title="Lock Terminal (⌘L)"
          className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 lg:w-8.5 lg:h-8.5 rounded-full hover:bg-white dark:hover:bg-white/10 active:scale-90 transition-all duration-150 cursor-pointer text-neutral-700 dark:text-neutral-300"
        >
          <RealIcon name="lock" size={20} className="w-4.5 h-4.5 md:w-5 md:h-5" />
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={appSettings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 lg:w-8.5 lg:h-8.5 rounded-full hover:bg-white dark:hover:bg-white/10 active:scale-90 transition-all duration-150 cursor-pointer text-neutral-700 dark:text-neutral-300"
        >
          <RealIcon
            name={appSettings.theme === 'dark' ? 'sun' : 'moon'}
            size={20}
            className="w-4.5 h-4.5 md:w-5 md:h-5"
          />
        </button>

        {/* Hard Refresh Button — All Platforms (macOS DMG, Windows EXE, Linux, Browser, Android APK, iOS) */}
        <button
          type="button"
          onClick={onHardRefresh}
          disabled={isRefreshing}
          aria-label="Hard Refresh"
          title="Hard Refresh & Clean Resync"
          className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 lg:w-8.5 lg:h-8.5 rounded-full hover:bg-white dark:hover:bg-white/10 active:scale-90 transition-all duration-150 cursor-pointer text-neutral-700 dark:text-neutral-300 group"
        >
          <div className={isRefreshing ? 'animate-spin' : 'transition-transform duration-300 group-hover:rotate-180'}>
            <RealIcon name="refresh" size={20} className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </div>
        </button>

        {/* Desktop Only: Settings & Exit */}
        {can(appCurrentUser?.role, 'view_settings') && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/settings');
            }}
            aria-label="Settings"
            title="Settings"
            className="hidden md:flex items-center justify-center w-8 h-8 lg:w-8.5 lg:h-8.5 rounded-full hover:bg-white dark:hover:bg-white/10 active:scale-90 transition-all duration-150 cursor-pointer text-neutral-700 dark:text-neutral-300"
          >
            <RealIcon name="settings" size={20} className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLogout();
          }}
          aria-label="Sign out"
          title="Sign Out"
          className="hidden md:flex items-center justify-center w-8 h-8 lg:w-8.5 lg:h-8.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/15 text-neutral-600 hover:text-rose-600 dark:text-neutral-300 dark:hover:text-rose-400 active:scale-90 transition-all duration-150 cursor-pointer"
        >
          <RealIcon name="exit" size={20} className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="h-4 md:h-5 w-px bg-neutral-200/80 dark:bg-white/10 mx-0.5 md:mx-1 shrink-0" />

        {/* Profile Trigger — Compact on Mobile, Spacious & Refined on Desktop */}
        <button
          type="button"
          onClick={() => onShowMobileMenu?.()}
          title={`${appCurrentUser?.name || 'User'} (${appCurrentUser?.role || 'Admin'}) · ${connectedPeers > 0 ? `${connectedPeers} Peers` : 'Local Terminal'}`}
          className="group relative flex items-center gap-1.5 md:gap-2 pl-0.5 pr-2 md:pr-3 h-7 md:h-8.5 rounded-full hover:bg-white dark:hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
        >
          {/* Avatar with cleanly positioned external status dot */}
          <div className="relative shrink-0 flex items-center justify-center w-6 h-6 md:w-7.5 md:h-7.5 lg:w-8 lg:h-8 rounded-full ring-1 md:ring-1.5 ring-neutral-200 dark:ring-white/15 overflow-visible bg-neutral-200 dark:bg-white/10">
            {appCurrentUser?.avatar ? (
              <img
                src={appCurrentUser.avatar}
                alt={appCurrentUser?.name || 'User'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-emerald-400 text-white font-bold text-[10px] md:text-[11px] flex items-center justify-center">
                {(appCurrentUser?.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            {/* Embedded Status indicator — positioned outside the avatar to prevent clipping */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 md:w-2.5 h-2 md:h-2.5 rounded-full ring-1.5 md:ring-2 ring-white dark:ring-[#121214] ${
                isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
          </div>

          {/* User Name & Discrete Status */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[11.5px] md:text-[13px] font-semibold text-neutral-800 dark:text-white tracking-tight truncate max-w-[65px] sm:max-w-[120px]">
              {appCurrentUser?.name || 'Shoaib'}
            </span>

            {/* Micro Sync Status or Pending Count */}
            {pendingCount > 0 ? (
              <span
                className="px-1.5 py-0.5 text-[8.5px] md:text-[9.5px] font-mono font-bold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 tabular-nums leading-none"
                title={`${pendingCount} pending events`}
              >
                {pendingCount}
              </span>
            ) : (
              <span className="text-[9.5px] md:text-[10px] font-medium text-neutral-400 dark:text-neutral-500 hidden sm:inline capitalize">
                • {appCurrentUser?.role || 'Admin'}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
