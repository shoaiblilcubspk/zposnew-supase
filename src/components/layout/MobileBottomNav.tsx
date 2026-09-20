import { useUsersStore } from '../../stores';
import { useNavigate, useLocation } from 'react-router-dom';
import { RealIcon } from '../../shared/icons';
import { can } from '../../lib/permissions';

interface MobileBottomNavProps {
  onShowMenu: () => void;
}

export function MobileBottomNav({ onShowMenu }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const appCurrentUser = useUsersStore((s) => s.currentUser);
  const role = appCurrentUser?.role;

  const navItems = [
    { id: 'pos', label: 'POS', realIcon: 'pos' as const, perm: 'view_pos' as const },
    { id: 'transactions', label: 'Sales', realIcon: 'sales' as const, perm: 'view_transactions' as const },
    { id: 'inventory', label: 'Stock', realIcon: 'inventory' as const, perm: 'view_inventory' as const },
    { id: 'customers', label: 'Clients', realIcon: 'customers' as const, perm: 'view_customers' as const },
  ];

  const visibleItems = navItems.filter((item) => can(role, item.perm));

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] left-3 right-3 max-w-md mx-auto z-50 select-none"
    >
      <div className="relative flex items-center justify-between h-[58px] px-1.5 rounded-[24px] bg-white/80 dark:bg-[#121214]/85 backdrop-blur-2xl backdrop-saturate-[180%] border border-black/[0.07] dark:border-white/[0.12] shadow-[0_12px_36px_-4px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.65),0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]">
        {visibleItems.map((item) => {
          const active = location.pathname === '/' + item.id || location.pathname.startsWith('/' + item.id + '/');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate('/' + item.id)}
              className={`group relative flex-1 h-[48px] flex flex-col items-center justify-center rounded-[18px] transition-all duration-200 ease-out active:scale-90 cursor-pointer ${
                active
                  ? 'bg-black/[0.04] dark:bg-white/[0.08]'
                  : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
              }`}
            >
              <div
                className={`shrink-0 flex items-center justify-center transition-all duration-200 ease-out ${
                  active ? 'scale-105 -translate-y-0.5' : 'scale-95 opacity-75 group-hover:opacity-100'
                }`}
              >
                <RealIcon name={item.realIcon} size="sm" />
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none mt-0.5 transition-colors duration-150 ${
                  active
                    ? 'font-semibold text-neutral-900 dark:text-white'
                    : 'font-medium text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {item.label}
              </span>
              <span
                className={`w-1 h-1 rounded-full mt-0.5 transition-all duration-200 ${
                  active
                    ? 'bg-emerald-500 dark:bg-emerald-400 opacity-100 scale-100 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                    : 'bg-transparent opacity-0 scale-0'
                }`}
              />
            </button>
          );
        })}

        {/* Menu Drawer Toggle */}
        <button
          type="button"
          onClick={onShowMenu}
          aria-label="More Options"
          className="group relative flex-1 h-[48px] flex flex-col items-center justify-center rounded-[18px] transition-all duration-200 ease-out active:scale-90 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer"
        >
          <div className="shrink-0 flex items-center justify-center transition-all duration-200 ease-out scale-95 opacity-75 group-hover:opacity-100">
            <RealIcon name="more" size="sm" />
          </div>
          <span className="text-[10px] font-medium tracking-tight leading-none mt-0.5 text-neutral-500 dark:text-neutral-400">
            More
          </span>
          <span className="w-1 h-1 rounded-full mt-0.5 bg-transparent opacity-0 scale-0" />
        </button>
      </div>
    </nav>
  );
}

