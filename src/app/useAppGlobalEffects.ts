import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores';
import { playPageSound } from '../lib/sounds';
import { updateDynamicManifest } from '../lib/dynamicManifest';

export function useAppGlobalEffects() {
  const appSettings = useSettingsStore(s => s.settings);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    if (path && path !== '/') {
      localStorage.setItem('pos_current_view', path.replace(/^\//, ''));
    }
  }, [location.pathname]);

  const prevPath = useRef(location.pathname);
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      playPageSound();
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!appSettings) return;
    const bizName = appSettings.storeName?.trim() || 'POS';

    const name = bizName.startsWith('POS') ? bizName : `POS - ${bizName}`;
    const shortName = bizName.length > 12 ? bizName.substring(0, 10) + '\u2026' : bizName;
    const title = `${bizName} - POS`;

    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) appleIcon.setAttribute('href', '/zaynahs-logo.svg');
    const favicons = document.querySelectorAll('link[rel*="icon"]');
    favicons.forEach(favicon => favicon.setAttribute('href', '/zaynahs-logo.svg'));

    document.title = title;

    let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitleMeta) {
      appleTitleMeta = document.createElement('meta');
      appleTitleMeta.setAttribute('name', 'apple-mobile-web-app-title');
      document.head.appendChild(appleTitleMeta);
    }
    appleTitleMeta.setAttribute('content', shortName);

    let appNameMeta = document.querySelector('meta[name="application-name"]');
    if (!appNameMeta) {
      appNameMeta = document.createElement('meta');
      appNameMeta.setAttribute('name', 'application-name');
      document.head.appendChild(appNameMeta);
    }
    appNameMeta.setAttribute('content', name);

    updateDynamicManifest({
      storeName: bizName,
      themeColor: '#10b981',
    });
  }, [appSettings, location.pathname]);

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        navigate('/' + customEvent.detail);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, [navigate]);

  useEffect(() => {
    if (navigator.onLine) {
      import('../lib/services').then(m => m.seedMissingBarcodes().catch(() => {})).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleWheel = (_e: WheelEvent) => {
      if (document.activeElement?.getAttribute('type') === 'number') {
        (document.activeElement as HTMLElement).blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const directTheme = localStorage.getItem('theme');
    const localPrefs = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
    const fallbackTheme = directTheme || localPrefs.theme;
    const theme = appSettings?.theme || fallbackTheme || 'light';
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'auto' && mediaQuery.matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#0A0A0A' : '#ffffff');
      }
      const appleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (appleStatus) {
        appleStatus.setAttribute('content', 'default');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [appSettings?.theme]);

  // Periodic check for automated cloud and local documents backups
  useEffect(() => {
    const timer = setTimeout(() => {
      import('../lib/backup/cloudBackupService')
        .then(m => m.checkAndTriggerScheduledCloudBackup())
        .catch(() => {});
      import('../lib/backup/localBackupService')
        .then(m => m.checkAndTriggerScheduledLocalBackup())
        .catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
}
