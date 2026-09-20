import React from 'react';
import { cn } from '../../lib/utils';
import { RealIcon, type RealIconName } from '../icons/realIcons';
import { ScrollableTabBar } from './ScrollableTabBar';

/**
 * SubTabBar — the single standardized chip-style tab bar for all non-POS
 * routes. Wraps the existing `.chip-nav-container` / `.chip-nav-item` CSS
 * classes.
 */
export interface SubTab {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  realIcon?: RealIconName;
}

export interface SubTabBarProps {
  tabs: SubTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  containerClassName?: string;
}

export function SubTabBar({ tabs, value, onChange, className, containerClassName }: SubTabBarProps) {
  return (
    <ScrollableTabBar className={className} containerClassName={containerClassName}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'group relative whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-2 px-3 h-8 rounded-full text-[12px] font-medium tracking-tight active:scale-95 border cursor-pointer select-none',
              active
                ? 'bg-primary text-white font-semibold border-primary shadow-xs'
                : 'bg-white dark:bg-white/[0.05] text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.08]'
            )}
          >
            {tab.realIcon ? (
              <div className="shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                <RealIcon name={tab.realIcon} size={20} />
              </div>
            ) : tab.icon ? (
              <span className="shrink-0">{tab.icon}</span>
            ) : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </ScrollableTabBar>
  );
}
